import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiClock,
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiAlertTriangle,
  FiUpload,
  FiImage,
  FiXCircle,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import Loading from "../../components/Loading";
import { quizAPI, submissionAPI, geminiAPI } from "../../services/api";

const AttemptQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionsData, setQuestionsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [answerImages, setAnswerImages] = useState({}); // Store image URLs
  const [answerSheets, setAnswerSheets] = useState([]); // Store multiple answer sheet images
  const [uploadingOCR, setUploadingOCR] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const response = await quizAPI.getOne(quizId);
      setQuiz(response.data.data.quiz);
      setQuestions(response.data.data.questions);
      setQuestionsData(response.data.data.questionsData || null);
      setTimeLeft(response.data.data.quiz.duration * 60);
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error(error.response?.data?.message || "Unable to load quiz");
        navigate("/student");
      } else {
        toast.error("Failed to load quiz");
        navigate("/student");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = useCallback(
    async (isTimeout = false) => {
      if (submitting) return;
      setSubmitting(true);

      // Prepare answers array with image URLs
      const answersArray = Object.entries(answers).map(
        ([questionId, selectedOption]) => ({
          questionId,
          selectedOption,
          imageUrl: answerImages[questionId] || null,
        })
      );

      try {
        const submitData = {
          quizId,
          answers: answersArray,
        };

        // Include questionsData if available (for unique per student quizzes)
        if (questionsData) {
          submitData.questionsData = questionsData;
        }

        const response = await submissionAPI.submit(submitData);

        if (isTimeout) {
          toast.success("Time's up! Quiz auto-submitted.");
        } else {
          toast.success("Quiz submitted successfully!");
        }

        navigate(`/student/result/${quizId}`);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to submit quiz");
        setSubmitting(false);
      }
    },
    [answers, quizId, navigate, submitting]
  );

  // Timer effect
  useEffect(() => {
    if (!started || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, handleSubmit]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleSelectOption = (questionId, optionIndex) => {
    setAnswers({
      ...answers,
      [questionId]: optionIndex,
    });
  };

  const handleTextAnswer = (questionId, text) => {
    setAnswers({
      ...answers,
      [questionId]: text,
    });
  };

  const handleFillBlank = (questionId, blankIndex, value) => {
    const currentBlanks = answers[questionId] || [];
    const newBlanks = [...currentBlanks];
    newBlanks[blankIndex] = value;
    setAnswers({
      ...answers,
      [questionId]: newBlanks,
    });
  };

  const handleMatching = (questionId, leftIndex, rightValue) => {
    const currentMatches = answers[questionId] || {};
    setAnswers({
      ...answers,
      [questionId]: {
        ...currentMatches,
        [leftIndex]: rightValue,
      },
    });
  };

  const handleImageUpload = async (questionId, file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploadingOCR(true);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = async () => {
        const base64 = reader.result.split(",")[1];

        // Call OCR API
        const response = await geminiAPI.ocr(base64, file.type);
        const extractedText = response.data.data.text;

        // Set the extracted text as the answer
        handleTextAnswer(questionId, extractedText);

        // Store image URL for submission
        setAnswerImages({
          ...answerImages,
          [questionId]: reader.result,
        });

        toast.success("Text extracted from image successfully!");
      };

      reader.onerror = () => {
        toast.error("Failed to read image file");
        setUploadingOCR(false);
      };
    } catch (error) {
      console.error("OCR error:", error);
      toast.error("Failed to extract text from image");
    } finally {
      setUploadingOCR(false);
    }
  };

  const handleAnswerSheetUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Check max 10 images
    if (answerSheets.length >= 10) {
      toast.error("Maximum 10 answer sheets allowed");
      return;
    }

    setUploadingOCR(true);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = async () => {
        const base64 = reader.result.split(",")[1];

        // Call OCR API
        const response = await geminiAPI.ocr(base64, file.type);
        const extractedText = response.data.data.text;

        // Parse answer numbers from the extracted text
        // Match patterns like: Ans32, Ans 32, Answer32, Q32, etc.
        // Use word boundaries to ensure exact number matching
        const answerPattern =
          /(?:Ans(?:wer)?|Q(?:uestion)?)\s*(\d+)\s*[:.\-]?\s*([^\n]+(?:\n(?!(?:Ans(?:wer)?|Q(?:uestion)?)\s*\d+)[^\n]+)*)/gi;
        const matches = [...extractedText.matchAll(answerPattern)];

        let mappedCount = 0;
        const mappingDetails = [];

        matches.forEach((match) => {
          const questionNumber = parseInt(match[1], 10);
          const answerText = match[2].trim();

          // Find the EXACT question at position (questionNumber - 1)
          // Question 32 means index 31 in the array
          const questionIndex = questionNumber - 1;

          if (questionIndex >= 0 && questionIndex < questions.length) {
            const question = questions[questionIndex];
            const questionId = question._id;
            const questionType = question.questionType;

            // Only map to written type questions
            if (questionType === "written") {
              setAnswers((prev) => ({
                ...prev,
                [questionId]: answerText,
              }));
              mappedCount++;
              mappingDetails.push(`Q${questionNumber}`);
            } else {
              // Log when question number exists but is not a written type
              console.log(
                `Question ${questionNumber} is not a written question (type: ${questionType})`
              );
            }
          } else {
            // Log when question number is out of range
            console.log(
              `Question ${questionNumber} not found in quiz (total: ${questions.length})`
            );
          }
        });

        // Store the answer sheet
        setAnswerSheets((prev) => [
          ...prev,
          {
            id: Date.now(),
            imageUrl: reader.result,
            fileName: file.name,
            extractedText,
            mappedAnswers: mappedCount,
            mappedQuestions: mappingDetails.join(", "),
          },
        ]);

        if (mappedCount > 0) {
          toast.success(
            `Mapped ${mappedCount} answer(s): ${mappingDetails.join(", ")}`
          );
        } else {
          toast.success(
            "Image uploaded! Please ensure answers are labeled with numbers (e.g., Ans1, Ans32)"
          );
        }
      };

      reader.onerror = () => {
        toast.error("Failed to read image file");
        setUploadingOCR(false);
      };
    } catch (error) {
      console.error("OCR error:", error);
      toast.error("Failed to extract text from image");
    } finally {
      setUploadingOCR(false);
    }
  };

  const removeAnswerSheet = (sheetId) => {
    setAnswerSheets((prev) => prev.filter((sheet) => sheet.id !== sheetId));
    toast.success("Answer sheet removed");
  };

  const handleConfirmSubmit = () => {
    const unanswered = questions.length - Object.keys(answers).length;

    if (unanswered > 0) {
      if (
        !window.confirm(
          `You have ${unanswered} unanswered question(s). Are you sure you want to submit?`
        )
      ) {
        return;
      }
    } else {
      if (!window.confirm("Are you sure you want to submit?")) {
        return;
      }
    }

    handleSubmit(false);
  };

  if (loading) {
    return <Loading message="Loading quiz..." />;
  }

  if (!started) {
    return (
      <div className="min-h-screen">
        <Navbar />

        <div className="container mx-auto px-4 pb-8">
          <motion.div
            className="max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="glass-card text-center">
              <div
                className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl 
                             flex items-center justify-center mx-auto mb-6 shadow-lg"
              >
                <span className="text-white font-bold text-4xl">📝</span>
              </div>

              <h1 className="text-3xl font-bold text-white mb-4">
                {quiz.title}
              </h1>
              <p className="text-gray-400 mb-6">
                {quiz.description || "No description"}
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="glass p-4 rounded-xl">
                  <p className="text-2xl font-bold text-white">
                    {questions.length}
                  </p>
                  <p className="text-sm text-gray-400">Questions</p>
                </div>
                <div className="glass p-4 rounded-xl">
                  <p className="text-2xl font-bold text-white">
                    {quiz.duration}
                  </p>
                  <p className="text-sm text-gray-400">Minutes</p>
                </div>
                <div className="glass p-4 rounded-xl">
                  <p className="text-2xl font-bold text-white">
                    {quiz.totalMarks}
                  </p>
                  <p className="text-sm text-gray-400">Total Marks</p>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <FiAlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Important Instructions</span>
                </div>
                <ul className="text-sm text-gray-400 text-left list-disc list-inside space-y-1">
                  <li>Timer will start once you begin the quiz</li>
                  <li>Quiz will auto-submit when time runs out</li>
                  <li>You can only submit once</li>
                  <li>Make sure you have a stable internet connection</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <motion.button
                  onClick={() => navigate("/student")}
                  className="btn-secondary flex-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Go Back
                </motion.button>
                <motion.button
                  onClick={() => setStarted(true)}
                  className="btn-primary flex-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Start Quiz
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen">
      {/* Timer Bar */}
      <motion.div
        className="glass sticky top-0 z-50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
      >
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <h2 className="text-sm sm:text-lg font-semibold text-white truncate hidden sm:block">
                {quiz.title}
              </h2>
              <span className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">
                {answeredCount}/{questions.length}
              </span>
            </div>

            <div
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg ${
                timeLeft <= 60
                  ? "bg-red-500/20 text-red-400"
                  : "bg-blue-500/20 text-blue-400"
              }`}
            >
              <FiClock className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-mono text-sm sm:text-lg font-bold">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/10 rounded-full h-1 mt-3">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${((currentQuestion + 1) / questions.length) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-3xl mx-auto">
          {/* Question Navigator */}
          <motion.div
            className="glass-card mb-4 sm:mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs sm:text-sm text-gray-400 mb-3">
              Question Navigator
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {questions.map((q, index) => (
                <motion.button
                  key={q._id}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg font-medium text-sm sm:text-base transition-colors ${
                    currentQuestion === index
                      ? "bg-blue-500 text-white"
                      : answers[q._id] !== undefined
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-white/10 text-gray-400 hover:bg-white/20"
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {index + 1}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              className="glass-card"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {/* Section Header - if available */}
              {question.section && (
                <div className="mb-4 -mx-6 -mt-6 px-6 py-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-b border-yellow-500/30 rounded-t-xl">
                  <p className="text-yellow-300 font-semibold text-sm">{question.section}</p>
                </div>
              )}

              <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <span className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg flex-shrink-0">
                  {currentQuestion + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm text-gray-400">
                      प्रश्न {currentQuestion + 1} / {questions.length}
                    </span>
                    <span className="px-2 sm:px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs sm:text-sm font-medium">
                      {question.marks} अंक
                    </span>
                  </div>
                </div>
              </div>

              {/* Question Text - Formatted for bilingual with clear separation */}
              <div className="mb-6 sm:mb-8">
                {(() => {
                  // Split bilingual text by " / " to separate Hindi and English
                  const questionText = question.questionText || "";
                  const parts = questionText.split(" / ");
                  
                  // Check if it's bilingual (has both Hindi and English)
                  const isBilingual = parts.length >= 2 && /[\u0900-\u097F]/.test(parts[0]);
                  
                  // Function to format text with sub-parts on new lines
                  const formatWithSubParts = (text) => {
                    if (!text) return text;
                    
                    let formatted = text;
                    
                    // Handle Roman numerals: i), ii), iii), iv), v) - with or without space before
                    formatted = formatted.replace(/(?:^|\s)(i\))/gim, '\n\n$1');
                    formatted = formatted.replace(/(?:^|\s)(ii\))/gim, '\n\n$1');
                    formatted = formatted.replace(/(?:^|\s)(iii\))/gim, '\n\n$1');
                    formatted = formatted.replace(/(?:^|\s)(iv\))/gim, '\n\n$1');
                    formatted = formatted.replace(/(?:^|\s)(v\))/gim, '\n\n$1');
                    
                    // Handle Hindi sub-parts: (क), (ख), (ग), (घ), क), ख), ग), घ)
                    formatted = formatted.replace(/(?:^|\s)(\(क\))/gm, '\n\n   $1');
                    formatted = formatted.replace(/(?:^|\s)(\(ख\))/gm, '\n\n   $1');
                    formatted = formatted.replace(/(?:^|\s)(\(ग\))/gm, '\n\n   $1');
                    formatted = formatted.replace(/(?:^|\s)(\(घ\))/gm, '\n\n   $1');
                    formatted = formatted.replace(/(?:^|\s)(क\))/gm, '\n\n   $1');
                    formatted = formatted.replace(/(?:^|\s)(ख\))/gm, '\n\n   $1');
                    formatted = formatted.replace(/(?:^|\s)(ग\))/gm, '\n\n   $1');
                    formatted = formatted.replace(/(?:^|\s)(घ\))/gm, '\n\n   $1');
                    
                    // Handle English sub-parts: (a), (b), (c), (d), a), b), c), d)
                    formatted = formatted.replace(/(?:^|\s)(\(a\))/gim, '\n\n   $1');
                    formatted = formatted.replace(/(?:^|\s)(\(b\))/gim, '\n\n   $1');
                    formatted = formatted.replace(/(?:^|\s)(\(c\))/gim, '\n\n   $1');
                    formatted = formatted.replace(/(?:^|\s)(\(d\))/gim, '\n\n   $1');
                    formatted = formatted.replace(/(?:^|\s)(a\))/gim, '\n\n   $1');
                    formatted = formatted.replace(/(?:^|\s)(b\))/gim, '\n\n   $1');
                    formatted = formatted.replace(/(?:^|\s)(c\))/gim, '\n\n   $1');
                    formatted = formatted.replace(/(?:^|\s)(d\))/gim, '\n\n   $1');
                    
                    // Clean up multiple newlines
                    formatted = formatted.replace(/\n{3,}/g, '\n\n');
                    
                    return formatted.trim();
                  };
                  
                  if (isBilingual) {
                    return (
                      <div className="space-y-4">
                        {/* Hindi Part */}
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-xl border-l-4 border-orange-400">
                          <p className="text-xs text-orange-400 mb-3 font-medium uppercase tracking-wide">हिंदी में</p>
                          <p className="text-base sm:text-lg text-white leading-loose whitespace-pre-line">
                            {formatWithSubParts(parts[0].trim())}
                          </p>
                        </div>
                        
                        {/* English Part */}
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border-l-4 border-blue-400">
                          <p className="text-xs text-blue-400 mb-3 font-medium uppercase tracking-wide">In English</p>
                          <p className="text-base sm:text-lg text-white leading-loose whitespace-pre-line">
                            {formatWithSubParts(parts.slice(1).join(" / ").trim())}
                          </p>
                        </div>
                      </div>
                    );
                  } else {
                    // Single language - just display normally
                    return (
                      <div className="p-4 sm:p-5 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-base sm:text-lg text-white leading-loose whitespace-pre-line">
                          {formatWithSubParts(questionText)}
                        </p>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Sub-parts if available */}
              {question.subParts && question.subParts.length > 0 && (
                <div className="mb-6 space-y-3">
                  <p className="text-sm text-gray-400 font-medium">उप-प्रश्न / Sub-questions:</p>
                  {question.subParts.map((part, idx) => {
                    const subText = part.question || "";
                    const subParts = subText.split(" / ");
                    const isSubBilingual = subParts.length >= 2 && /[\u0900-\u097F]/.test(subParts[0]);
                    
                    return (
                      <div key={idx} className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-8 h-8 bg-blue-500/30 rounded-lg flex items-center justify-center text-blue-300 font-bold text-sm">
                            {part.part}
                          </span>
                          <span className="text-blue-400 text-sm font-medium">({part.marks} अंक / marks)</span>
                        </div>
                        {isSubBilingual ? (
                          <div className="space-y-2 ml-10">
                            <p className="text-white text-sm leading-relaxed">{subParts[0].trim()}</p>
                            <p className="text-gray-300 text-sm leading-relaxed">{subParts.slice(1).join(" / ").trim()}</p>
                          </div>
                        ) : (
                          <p className="text-white text-sm ml-10 leading-relaxed">{subText}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Alternative Question (OR) if available */}
              {question.hasAlternative && question.alternativeQuestion && (
                <div className="mb-6 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="h-px flex-1 bg-orange-500/30"></div>
                    <span className="text-orange-400 font-bold px-4 py-1 bg-orange-500/20 rounded-full">अथवा / OR</span>
                    <div className="h-px flex-1 bg-orange-500/30"></div>
                  </div>
                  {(() => {
                    const altText = question.alternativeQuestion || "";
                    const altParts = altText.split(" / ");
                    const isAltBilingual = altParts.length >= 2 && /[\u0900-\u097F]/.test(altParts[0]);
                    
                    if (isAltBilingual) {
                      return (
                        <div className="space-y-3">
                          <p className="text-white leading-relaxed">{altParts[0].trim()}</p>
                          <p className="text-gray-300 leading-relaxed">{altParts.slice(1).join(" / ").trim()}</p>
                        </div>
                      );
                    } else {
                      return <p className="text-white leading-relaxed whitespace-pre-line">{altText}</p>;
                    }
                  })()}
                </div>
              )}

              {/* Render based on question type */}
              {(question.questionType === "mcq" || question.questionType === "truefalse" || !question.questionType) && (
                <div className="space-y-3 sm:space-y-4">
                  {question.options?.map((option, index) => {
                    const hindiLabels = ["अ", "ब", "स", "द"];
                    const englishLabels = ["A", "B", "C", "D"];
                    
                    // Split option text for bilingual
                    const optionParts = (option || "").split(" / ");
                    const isOptionBilingual = optionParts.length >= 2 && /[\u0900-\u097F]/.test(optionParts[0]);
                    
                    return (
                    <motion.button
                      key={index}
                      onClick={() => handleSelectOption(question._id, index)}
                      className={`w-full p-4 sm:p-5 rounded-xl text-left transition-all flex items-start gap-3 sm:gap-4 ${
                        answers[question._id] === index
                          ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400 text-white shadow-lg shadow-green-500/10"
                          : "bg-white/5 border-2 border-white/10 text-gray-300 hover:border-blue-400/50 hover:bg-blue-500/5"
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <span
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center font-bold flex-shrink-0 ${
                          answers[question._id] === index
                            ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg"
                            : "bg-white/10 text-gray-400"
                        }`}
                      >
                        <span className="text-sm sm:text-base">{hindiLabels[index] || englishLabels[index]}</span>
                        <span className="text-xs opacity-60">{englishLabels[index]}</span>
                      </span>
                      <div className="flex-1 pt-1">
                        {isOptionBilingual ? (
                          <div className="space-y-1">
                            <p className="text-sm sm:text-base leading-relaxed">{optionParts[0].trim()}</p>
                            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">({optionParts.slice(1).join(" / ").trim()})</p>
                          </div>
                        ) : (
                          <p className="text-sm sm:text-base leading-relaxed">{option}</p>
                        )}
                      </div>
                      {answers[question._id] === index && (
                        <FiCheck className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                      )}
                    </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Written Answer */}
              {question.questionType === "written" && (
                <div className="space-y-4">
                  {/* Image Upload Section */}
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleImageUpload(question._id, file);
                        }}
                        className="hidden"
                        disabled={uploadingOCR}
                      />
                      <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                        {uploadingOCR ? (
                          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <FiUpload className="w-6 h-6 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          Upload Answer Image
                        </p>
                        <p className="text-sm text-gray-400">
                          {uploadingOCR
                            ? "Extracting text..."
                            : "Take a photo of your handwritten answer"}
                        </p>
                      </div>
                    </label>

                    {answerImages[question._id] && (
                      <div className="mt-3 pt-3 border-t border-blue-500/30">
                        <div className="flex items-center gap-2 text-green-400">
                          <FiImage className="w-4 h-4" />
                          <span className="text-sm">Image uploaded</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Extracted/Edited Text */}
                  <div>
                    <label className="input-label mb-2">
                      Your Answer (Extracted or Type Manually)
                    </label>
                    <textarea
                      value={answers[question._id] || ""}
                      onChange={(e) =>
                        handleTextAnswer(question._id, e.target.value)
                      }
                      className="glass-input min-h-[200px] resize-y w-full font-mono"
                      placeholder="Write your answer here or upload an image of your handwritten answer..."
                    />
                    <p className="text-sm text-gray-400 mt-2">
                      Tip: Write your answer on paper, take a clear photo, and
                      upload it. AI will extract and evaluate your answer.
                    </p>
                  </div>
                </div>
              )}

              {/* Fill in the Blanks */}
              {question.questionType === "fillblank" && (
                <div className="space-y-4">
                  {Array.from({ length: question.blanksCount || 1 }).map(
                    (_, index) => (
                      <div key={index}>
                        <label className="text-sm text-gray-400 mb-2 block">
                          Blank {index + 1}
                        </label>
                        <input
                          type="text"
                          value={(answers[question._id] || [])[index] || ""}
                          onChange={(e) =>
                            handleFillBlank(question._id, index, e.target.value)
                          }
                          className="glass-input w-full"
                          placeholder={`Enter answer for blank ${index + 1}`}
                        />
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Match the Following */}
              {question.questionType === "matching" && (
                <div className="space-y-4">
                  <p className="text-gray-300 text-sm mb-4">
                    Match each item on the left with the correct option on the
                    right
                  </p>
                  {question.matchPairs?.map((pair, index) => (
                    <div key={index} className="glass p-4 rounded-xl">
                      <p className="text-white font-medium mb-3">{pair.left}</p>
                      <select
                        value={(answers[question._id] || {})[index] || ""}
                        onChange={(e) =>
                          handleMatching(question._id, index, e.target.value)
                        }
                        className="glass-input w-full"
                      >
                        <option value="">Select match</option>
                        {question.matchPairs?.map((matchPair, rIndex) => (
                          <option key={rIndex} value={matchPair.right}>
                            {matchPair.right}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* Image Upload Section - After Last Question */}
              {isLastQuestion && (
                <div className="mt-8 p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl">
                  <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <FiImage className="w-5 h-5 text-blue-400" />
                    Upload Answer Sheets ({answerSheets.length}/10)
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Upload images of your answer sheets. Label answers with
                    numbers (e.g., Ans1, Ans2, Ans29, Ans30) for automatic
                    extraction.
                  </p>

                  <label className="flex items-center gap-4 p-4 bg-white/5 rounded-lg cursor-pointer group hover:bg-white/10 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          handleAnswerSheetUpload(file);
                          e.target.value = ""; // Reset input
                        }
                      }}
                      className="hidden"
                      disabled={uploadingOCR || answerSheets.length >= 10}
                    />
                    <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                      {uploadingOCR ? (
                        <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <FiUpload className="w-8 h-8 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium text-lg">
                        {uploadingOCR
                          ? "Processing..."
                          : answerSheets.length >= 10
                          ? "Max Limit Reached"
                          : "Choose Image"}
                      </p>
                      <p className="text-sm text-gray-400">
                        {uploadingOCR
                          ? "Extracting and mapping answers..."
                          : `Upload answer sheet images (Max 10, 5MB each)`}
                      </p>
                    </div>
                  </label>

                  {/* Uploaded Sheets List */}
                  {answerSheets.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-gray-400 font-medium">
                        Uploaded Answer Sheets:
                      </p>
                      {answerSheets.map((sheet) => (
                        <div
                          key={sheet.id}
                          className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3"
                        >
                          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <FiCheck className="w-4 h-4 text-green-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-green-400 font-medium text-sm">
                              {sheet.fileName}
                            </p>
                            <p className="text-xs text-gray-400">
                              {sheet.mappedAnswers > 0
                                ? `${sheet.mappedAnswers} answer(s) extracted`
                                : "No answers detected with numbers"}
                            </p>
                          </div>
                          <button
                            onClick={() => removeAnswerSheet(sheet.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <FiXCircle className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-300 mb-1">
                      💡 Tips for best results:
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                      <li>
                        Label each answer with its number: Ans1, Ans29, etc.
                      </li>
                      <li>Write clearly on white paper with dark ink</li>
                      <li>Take photos in good lighting without shadows</li>
                      <li>
                        Upload up to 10 sheets to cover all written questions
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-4 mt-8 pt-6 border-t border-white/10">
                <motion.button
                  onClick={() =>
                    setCurrentQuestion(Math.max(0, currentQuestion - 1))
                  }
                  disabled={currentQuestion === 0}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiArrowLeft className="w-5 h-5" />
                  Previous
                </motion.button>

                {isLastQuestion ? (
                  <motion.button
                    onClick={handleConfirmSubmit}
                    disabled={submitting}
                    className="btn-success flex-1 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FiCheck className="w-5 h-5" />
                        Submit Quiz
                      </>
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={() =>
                      setCurrentQuestion(
                        Math.min(questions.length - 1, currentQuestion + 1)
                      )
                    }
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Next
                    <FiArrowRight className="w-5 h-5" />
                  </motion.button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AttemptQuiz;
