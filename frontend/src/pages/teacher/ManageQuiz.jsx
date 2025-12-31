import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowLeft,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiSave,
  FiX,
  FiZap,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiFileText,
  FiDownload,
  FiPrinter,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import Loading from "../../components/Loading";
import { quizAPI, questionAPI, geminiAPI } from "../../services/api";

const ManageQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Question form state
  const [questionForm, setQuestionForm] = useState({
    questionType: "mcq",
    questionText: "",
    options: ["", "", "", ""],
    correctOption: 0,
    correctAnswer: "",
    blanks: [""],
    matchPairs: [{ left: "", right: "" }],
    marks: 1,
    section: "",
    subParts: [],
    hasAlternative: false,
    alternativeQuestion: "",
    alternativeAnswer: "",
  });

  // Generate form state
  const [generateForm, setGenerateForm] = useState({
    topic: "",
    numberOfQuestions: 5,
    difficulty: "medium",
    language: "english",
    questionTypes: ["mcq"],
    description: "",
    examFormat: "general",
  });
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);

  // Bulk process state
  const [bulkForm, setBulkForm] = useState({
    rawQuestions: "",
    maxMarks: 50,
    marksDistribution: "",
    numberOfQuestions: "",
    language: "english",
  });
  const [processingBulk, setProcessingBulk] = useState(false);
  const [processedQuestions, setProcessedQuestions] = useState([]);

  // Image extraction state
  const [imageForm, setImageForm] = useState({
    image: null,
    imagePreview: null,
    maxMarks: 50,
    marksDistribution: "",
    additionalInstructions: "",
    language: "english",
  });
  const [extracting, setExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState([]);

  useEffect(() => {
    fetchQuizData();
  }, [quizId]);

  const fetchQuizData = async () => {
    try {
      const [quizRes, questionsRes] = await Promise.all([
        quizAPI.getOne(quizId),
        questionAPI.getByQuiz(quizId),
      ]);
      setQuiz(quizRes.data.data.quiz);
      setQuestions(questionsRes.data.data.questions);
    } catch (error) {
      toast.error("Failed to fetch quiz data");
      navigate("/teacher");
    } finally {
      setLoading(false);
    }
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      questionType: "mcq",
      questionText: "",
      options: ["", "", "", ""],
      correctOption: 0,
      correctAnswer: "",
      blanks: [""],
      matchPairs: [{ left: "", right: "" }],
      marks: 1,
      section: "",
      subParts: [],
      hasAlternative: false,
      alternativeQuestion: "",
      alternativeAnswer: "",
    });
    setEditingQuestion(null);
  };

  const handleAddQuestion = async () => {
    if (!questionForm.questionText.trim()) {
      toast.error("Question text is required");
      return;
    }

    // Validate based on question type
    if (questionForm.questionType === "mcq") {
      if (questionForm.options.some((opt) => !opt.trim())) {
        toast.error("All options are required");
        return;
      }
    } else if (questionForm.questionType === "truefalse") {
      // True/False uses fixed options, just ensure correctOption is set
      if (
        questionForm.correctOption !== 0 &&
        questionForm.correctOption !== 1
      ) {
        toast.error("Please select True or False as the correct answer");
        return;
      }
    } else if (questionForm.questionType === "written") {
      if (!questionForm.correctAnswer.trim()) {
        toast.error("Expected answer is required");
        return;
      }
    } else if (questionForm.questionType === "fillblank") {
      if (questionForm.blanks.some((b) => !b.trim())) {
        toast.error("All blanks must be filled");
        return;
      }
    } else if (questionForm.questionType === "matching") {
      if (
        questionForm.matchPairs.some((p) => !p.left.trim() || !p.right.trim())
      ) {
        toast.error("All matching pairs must be filled");
        return;
      }
    }

    try {
      if (editingQuestion) {
        await questionAPI.update(editingQuestion._id, questionForm);
        setQuestions(
          questions.map((q) =>
            q._id === editingQuestion._id ? { ...q, ...questionForm } : q
          )
        );
        toast.success("Question updated");
      } else {
        const response = await questionAPI.create({
          quizId,
          ...questionForm,
        });
        setQuestions([...questions, response.data.data.question]);
        toast.success("Question added");
      }

      // Update quiz total marks
      const newTotalMarks =
        questions.reduce(
          (acc, q) => (q._id === editingQuestion?._id ? acc : acc + q.marks),
          0
        ) + questionForm.marks;
      setQuiz({ ...quiz, totalMarks: newTotalMarks });

      setShowAddModal(false);
      resetQuestionForm();
    } catch (error) {
      toast.error("Failed to save question");
    }
  };

  const handleEditQuestion = (question) => {
    setQuestionForm({
      questionType: question.questionType || "mcq",
      questionText: question.questionText,
      options: question.options || ["", "", "", ""],
      correctOption: question.correctOption || 0,
      correctAnswer: question.correctAnswer || "",
      blanks: question.blanks || [""],
      matchPairs: question.matchPairs || [{ left: "", right: "" }],
      marks: question.marks,
      section: question.section || "",
      subParts: question.subParts || [],
      hasAlternative: question.hasAlternative || false,
      alternativeQuestion: question.alternativeQuestion || "",
      alternativeAnswer: question.alternativeAnswer || "",
    });
    setEditingQuestion(question);
    setShowAddModal(true);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Delete this question?")) return;

    try {
      await questionAPI.delete(questionId);
      const deletedQuestion = questions.find((q) => q._id === questionId);
      setQuestions(questions.filter((q) => q._id !== questionId));
      setQuiz({ ...quiz, totalMarks: quiz.totalMarks - deletedQuestion.marks });
      toast.success("Question deleted");
    } catch (error) {
      toast.error("Failed to delete question");
    }
  };

  const handleDeleteAllQuestions = async () => {
    if (questions.length === 0) {
      toast.error("No questions to delete");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete all ${questions.length} questions? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete all questions one by one
      const deletePromises = questions.map((q) => questionAPI.delete(q._id));
      await Promise.all(deletePromises);
      
      setQuestions([]);
      setQuiz({ ...quiz, totalMarks: 0 });
      toast.success(`Deleted all ${questions.length} questions`);
    } catch (error) {
      toast.error("Failed to delete some questions");
      fetchQuizData(); // Refresh to get current state
    }
  };

  // PDF Download Function - Direct download with board style
  const handleDownloadPDF = async () => {
    if (questions.length === 0) {
      toast.error("No questions to download");
      return;
    }

    toast.loading("PDF बन रहा है...", { id: "pdf-gen" });

    // Group questions by section
    const sections = {};
    questions.forEach((q, idx) => {
      const section = q.section || "General";
      if (!sections[section]) sections[section] = [];
      sections[section].push({ ...q, qNum: idx + 1 });
    });

    // Build questions HTML
    let questionsHTML = "";
    Object.entries(sections).forEach(([sectionName, sectionQuestions]) => {
      if (sectionName !== "General") {
        questionsHTML += `
          <div class="section-break"></div>
          <div class="section-header">${sectionName}</div>
          <div class="section-gap"></div>
        `;
      }
      sectionQuestions.forEach((q) => {
        questionsHTML += `
          <div class="question">
            <div class="q-line">
              <span class="q-num">प्रश्न ${q.qNum}.</span>
              <span class="q-marks">[${q.marks} अंक]</span>
            </div>
            <div class="q-text">${q.questionText || ""}</div>
        `;
        
        if (q.subParts && q.subParts.length > 0) {
          q.subParts.forEach((part) => {
            questionsHTML += `<div class="sub-part">${part.part} ${part.question} (${part.marks} अंक)</div>`;
          });
        }
        
        if ((q.questionType === "mcq" || q.questionType === "truefalse") && q.options) {
          questionsHTML += `
            <div class="options">
              <div class="opt-row">
                <span class="opt">(अ) ${q.options[0] || ""}</span>
                <span class="opt">(ब) ${q.options[1] || ""}</span>
              </div>
              <div class="opt-row">
                <span class="opt">(स) ${q.options[2] || ""}</span>
                <span class="opt">(द) ${q.options[3] || ""}</span>
              </div>
            </div>
          `;
        }
        
        if (q.hasAlternative && q.alternativeQuestion) {
          questionsHTML += `
            <div class="or-section">
              <div class="or-text">अथवा</div>
              <div class="q-text">${q.alternativeQuestion}</div>
            </div>
          `;
        }
        
        questionsHTML += `</div>`;
      });
    });

    // Build answers HTML
    let answersHTML = "";
    Object.entries(sections).forEach(([sectionName, sectionQuestions]) => {
      if (sectionName !== "General") {
        answersHTML += `
          <div class="section-break"></div>
          <div class="ans-section-header">${sectionName}</div>
          <div class="section-gap"></div>
        `;
      }
      sectionQuestions.forEach((q) => {
        answersHTML += `<div class="answer"><div class="ans-num">उत्तर ${q.qNum}. [${q.marks} अंक]</div>`;
        
        if ((q.questionType === "mcq" || q.questionType === "truefalse") && q.options) {
          const optLabels = ["अ", "ब", "स", "द"];
          answersHTML += `<div class="ans-text correct">(${optLabels[q.correctOption || 0]}) ${q.options[q.correctOption] || ""}</div>`;
        }
        
        if (q.questionType === "written" && q.correctAnswer) {
          answersHTML += `<div class="ans-text">${q.correctAnswer}</div>`;
        }
        
        if (q.subParts && q.subParts.length > 0) {
          q.subParts.forEach((part) => {
            answersHTML += `<div class="sub-ans"><b>${part.part}</b> ${part.answer || ""}</div>`;
          });
        }
        
        if (q.questionType === "fillblank" && q.blanks) {
          answersHTML += `<div class="ans-text correct">${q.blanks.join(", ")}</div>`;
        }
        
        if (q.questionType === "matching" && q.matchPairs) {
          answersHTML += `<div class="match-ans">`;
          q.matchPairs.forEach((pair, idx) => {
            answersHTML += `${idx + 1}. ${pair.left} → ${pair.right}<br/>`;
          });
          answersHTML += `</div>`;
        }
        
        if (q.hasAlternative && q.alternativeAnswer) {
          answersHTML += `<div class="or-ans"><b>अथवा:</b><br/>${q.alternativeAnswer}</div>`;
        }
        
        answersHTML += `</div>`;
      });
    });

    const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap');
@page { size: A4; margin: 15mm 12mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Noto Sans Devanagari', serif; font-size: 12px; line-height: 1.5; color: #000; }
.header { text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 15px; }
.header h1 { font-size: 18px; font-weight: 700; margin-bottom: 5px; }
.header h2 { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.header-info { display: flex; justify-content: space-between; font-size: 11px; border-top: 1px solid #000; padding-top: 8px; margin-top: 8px; }
.header-info div { text-align: left; }

.section-break { height: 8px; }
.section-gap { height: 12px; }
.section-header { 
  font-size: 13px; font-weight: 700; text-align: center; 
  border: 1px solid #000; padding: 6px 10px; 
  background: #f5f5f5; margin: 10px 0;
}

.question { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dotted #ccc; }
.q-line { display: flex; justify-content: space-between; margin-bottom: 4px; }
.q-num { font-weight: 700; font-size: 12px; }
.q-marks { font-size: 11px; color: #333; }
.q-text { font-size: 12px; line-height: 1.6; margin: 4px 0 6px 20px; white-space: pre-wrap; }

.options { margin: 6px 0 0 20px; }
.opt-row { display: flex; margin-bottom: 3px; }
.opt { width: 50%; font-size: 11px; padding: 2px 0; }

.sub-part { font-size: 11px; margin: 4px 0 4px 30px; line-height: 1.5; }

.or-section { margin: 10px 0 0 20px; padding: 8px; border: 1px dashed #666; background: #fafafa; }
.or-text { font-weight: 700; text-align: center; margin-bottom: 5px; font-size: 12px; }

.page-break { page-break-before: always; }

.ans-header { text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 15px; background: #f0f0f0; }
.ans-header h1 { font-size: 16px; font-weight: 700; }

.ans-section-header { 
  font-size: 12px; font-weight: 700; text-align: center; 
  border: 1px solid #000; padding: 5px 10px; 
  background: #e8f5e9; margin: 10px 0;
}

.answer { margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px dotted #ccc; }
.ans-num { font-weight: 700; font-size: 11px; margin-bottom: 3px; }
.ans-text { font-size: 11px; line-height: 1.6; margin-left: 15px; white-space: pre-wrap; text-align: justify; }
.ans-text.correct { font-weight: 600; color: #1b5e20; background: #e8f5e9; padding: 3px 8px; display: inline-block; border-radius: 3px; }
.sub-ans { font-size: 11px; margin: 4px 0 4px 25px; line-height: 1.5; }
.match-ans { font-size: 11px; margin-left: 15px; line-height: 1.6; }
.or-ans { margin: 8px 0 0 15px; padding: 6px; background: #fff8e1; border: 1px dashed #f9a825; font-size: 11px; line-height: 1.5; }

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .question, .answer { break-inside: avoid; }
}
</style>
</head>
<body>

<div class="header">
  <h1>${quiz.title || "प्रश्न पत्र"}</h1>
  <h2>विषय: विज्ञान</h2>
  <div class="header-info">
    <div><b>समय:</b> ${quiz.duration} मिनट</div>
    <div><b>पूर्णांक:</b> ${quiz.totalMarks} अंक</div>
    <div><b>प्रश्न:</b> ${questions.length}</div>
  </div>
</div>

<div class="instructions" style="font-size:10px;margin-bottom:12px;padding:6px;border:1px solid #ddd;background:#fafafa;">
  <b>निर्देश:</b> (i) सभी प्रश्न अनिवार्य हैं। (ii) प्रत्येक प्रश्न के अंक उसके सामने अंकित हैं।
</div>

${questionsHTML}

<div class="page-break"></div>

<div class="ans-header">
  <h1>उत्तर कुंजी / Answer Key</h1>
  <div style="font-size:11px;margin-top:5px;">${quiz.title || ""}</div>
</div>

${answersHTML}

</body>
</html>`;

    try {
      // Create blob and download
      const blob = new Blob([fullHTML], { type: "text/html;charset=utf-8" });
      
      // Create iframe for printing to PDF
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(fullHTML);
      iframeDoc.close();

      // Wait for content and fonts to load
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      };

      toast.success("Print dialog opened - Save as PDF", { id: "pdf-gen" });
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("PDF generation failed", { id: "pdf-gen" });
    }
  };

  const handleGenerate = async () => {
    if (!generateForm.topic.trim()) {
      toast.error("Topic is required");
      return;
    }

    setGenerating(true);
    try {
      const response = await geminiAPI.generate(generateForm);
      setGeneratedQuestions(response.data.data.questions);
      toast.success(
        `Generated ${response.data.data.questions.length} questions`
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to generate questions"
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleAddGeneratedQuestions = async () => {
    if (generatedQuestions.length === 0) return;

    try {
      await questionAPI.bulkCreate({
        quizId,
        questions: generatedQuestions,
      });

      await fetchQuizData(); // Refresh to get updated questions
      setShowGenerateModal(false);
      setGeneratedQuestions([]);
      setGenerateForm({
        topic: "",
        numberOfQuestions: 5,
        difficulty: "medium",
        language: "english",
        questionTypes: ["mcq"],
        description: "",
        examFormat: "general",
      });
      toast.success("Questions added successfully");
    } catch (error) {
      toast.error("Failed to add questions");
    }
  };

  // Bulk process questions
  const handleProcessBulk = async () => {
    if (!bulkForm.rawQuestions.trim()) {
      toast.error("Please enter questions to process");
      return;
    }

    setProcessingBulk(true);
    try {
      const response = await geminiAPI.processQuestions({
        rawQuestions: bulkForm.rawQuestions,
        maxMarks: bulkForm.maxMarks,
        marksDistribution: bulkForm.marksDistribution,
        numberOfQuestions: bulkForm.numberOfQuestions
          ? parseInt(bulkForm.numberOfQuestions)
          : null,
        language: bulkForm.language,
      });
      setProcessedQuestions(response.data.data.questions);
      toast.success(
        `Processed ${response.data.data.questions.length} questions`
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to process questions"
      );
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleAddProcessedQuestions = async () => {
    if (processedQuestions.length === 0) return;

    try {
      await questionAPI.bulkCreate({
        quizId,
        questions: processedQuestions,
      });

      await fetchQuizData();
      setShowBulkModal(false);
      setProcessedQuestions([]);
      setBulkForm({
        rawQuestions: "",
        maxMarks: 50,
        marksDistribution: "",
        numberOfQuestions: "",
        language: "english",
      });
      toast.success("Questions added to quiz");
    } catch (error) {
      toast.error("Failed to add questions");
    }
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageForm({
        ...imageForm,
        image: reader.result,
        imagePreview: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleExtractFromImage = async () => {
    if (!imageForm.image) {
      toast.error("Please upload an image first");
      return;
    }

    setExtracting(true);
    try {
      const response = await geminiAPI.extractQuestionsFromImage({
        image: imageForm.image,
        maxMarks: imageForm.maxMarks,
        marksDistribution: imageForm.marksDistribution,
        additionalInstructions: imageForm.additionalInstructions,
        language: imageForm.language,
      });
      setExtractedQuestions(response.data.data.questions);
      toast.success(
        `Extracted ${response.data.data.questions.length} questions`
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to extract questions from image"
      );
    } finally {
      setExtracting(false);
    }
  };

  const handleAddExtractedQuestions = async () => {
    if (extractedQuestions.length === 0) return;

    try {
      await questionAPI.bulkCreate({
        quizId,
        questions: extractedQuestions,
      });

      await fetchQuizData();
      setShowImageModal(false);
      setExtractedQuestions([]);
      setImageForm({
        image: null,
        imagePreview: null,
        maxMarks: 50,
        marksDistribution: "",
        additionalInstructions: "",
        language: "english",
      });
      toast.success("Questions added to quiz");
    } catch (error) {
      toast.error("Failed to add questions");
    }
  };

  if (loading) {
    return <Loading message="Loading quiz..." />;
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 pb-8">
        {/* Back Button */}
        <motion.button
          onClick={() => navigate("/teacher")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <FiArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </motion.button>

        {/* Quiz Info */}
        <motion.div
          className="glass-card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {quiz.title}
              </h1>
              <p className="text-gray-400 mb-4">
                {quiz.description || "No description"}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <FiClock className="w-4 h-4" />
                  <span>{quiz.duration} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <FiCheckCircle className="w-4 h-4" />
                  <span>{quiz.totalMarks} total marks</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <FiAlertCircle className="w-4 h-4" />
                  <span>{questions.length} questions</span>
                </div>
                {questions.length > 0 && (
                  <motion.button
                    onClick={handleDeleteAllQuestions}
                    className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Delete All
                  </motion.button>
                )}
                {questions.length > 0 && (
                  <motion.button
                    onClick={handleDownloadPDF}
                    className="text-green-400 hover:text-green-300 text-sm flex items-center gap-1 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiDownload className="w-4 h-4" />
                    Download PDF
                  </motion.button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <motion.button
                onClick={() => setShowImageModal(true)}
                className="btn-secondary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiFileText className="w-5 h-5 text-blue-400" />
                Extract from Image
              </motion.button>
              <motion.button
                onClick={() => setShowBulkModal(true)}
                className="btn-secondary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiFileText className="w-5 h-5 text-green-400" />
                Bulk Process
              </motion.button>
              <motion.button
                onClick={() => setShowGenerateModal(true)}
                className="btn-secondary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiZap className="w-5 h-5 text-yellow-400" />
                Generate with AI
              </motion.button>
              <motion.button
                onClick={() => {
                  resetQuestionForm();
                  setShowAddModal(true);
                }}
                className="btn-primary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiPlus className="w-5 h-5" />
                Add Question
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Questions List */}
        {questions.length === 0 ? (
          <motion.div
            className="glass-card text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-6xl mb-4">❓</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No questions yet
            </h2>
            <p className="text-gray-400 mb-6">
              Add questions manually or generate with AI
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.button
                onClick={() => setShowImageModal(true)}
                className="btn-secondary flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                <FiFileText className="w-5 h-5 text-blue-400" />
                Extract from Image
              </motion.button>
              <motion.button
                onClick={() => setShowBulkModal(true)}
                className="btn-secondary flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                <FiFileText className="w-5 h-5 text-green-400" />
                Bulk Process
              </motion.button>
              <motion.button
                onClick={() => setShowGenerateModal(true)}
                className="btn-secondary flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                <FiZap className="w-5 h-5 text-yellow-400" />
                Generate with AI
              </motion.button>
              <motion.button
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                <FiPlus className="w-5 h-5" />
                Add Manually
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Group questions by section */}
            {(() => {
              const sections = {};
              questions.forEach((q, idx) => {
                const section = q.section || "Questions";
                if (!sections[section]) sections[section] = [];
                sections[section].push({ ...q, originalIndex: idx });
              });
              
              return Object.entries(sections).map(([sectionName, sectionQuestions]) => (
                <div key={sectionName}>
                  {/* Section Header - only show if section exists and is not default */}
                  {sectionName !== "Questions" && (
                    <motion.div 
                      className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-4 mb-4"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <p className="text-yellow-300 font-bold">{sectionName}</p>
                      <p className="text-xs text-yellow-400/70 mt-1">
                        {sectionQuestions.length} questions • {sectionQuestions.reduce((sum, q) => sum + q.marks, 0)} marks
                      </p>
                    </motion.div>
                  )}
                  
                  {/* Questions in this section */}
                  {sectionQuestions.map((question) => (
              <motion.div
                key={question._id}
                className="glass-card"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: question.originalIndex * 0.05 }}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 font-bold">
                        {question.originalIndex + 1}
                      </span>
                      <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">
                        {question.marks} mark{question.marks > 1 ? "s" : ""}
                      </span>
                      <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                        {question.questionType === "mcq" && "📝 MCQ"}
                        {question.questionType === "written" && "✍️ Written"}
                        {question.questionType === "fillblank" &&
                          "📄 Fill Blank"}
                        {question.questionType === "matching" && "🔗 Matching"}
                        {question.questionType === "truefalse" &&
                          "✓✗ True/False"}
                      </span>
                      {question.hasAlternative && (
                        <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full">
                          अथवा/OR
                        </span>
                      )}
                    </div>
                    <p className="text-white mb-4 whitespace-pre-line">{question.questionText}</p>

                    {/* Sub-parts for multi-part questions */}
                    {question.subParts && question.subParts.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {question.subParts.map((part, idx) => (
                          <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                            <p className="text-blue-400 font-medium">{part.part} ({part.marks} marks)</p>
                            <p className="text-white text-sm mt-1">{part.question}</p>
                            <p className="text-green-400 text-sm mt-1">Answer: {part.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* MCQ and True/False options */}
                    {(question.questionType === "mcq" ||
                      question.questionType === "truefalse") &&
                      question.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {question.options.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className={`p-3 rounded-lg ${
                                optIndex === question.correctOption
                                  ? "bg-green-500/20 border border-green-500/30 text-green-300"
                                  : "bg-white/5 border border-white/10 text-gray-400"
                              }`}
                            >
                              <span className="font-medium mr-2">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              {option}
                              {optIndex === question.correctOption && (
                                <FiCheckCircle className="inline ml-2 w-4 h-4" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                    {/* Written answer */}
                    {question.questionType === "written" &&
                      question.correctAnswer && (
                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300 text-sm">
                          <span className="font-medium">Expected Answer: </span>
                          <span className="whitespace-pre-line">{question.correctAnswer}</span>
                        </div>
                      )}

                    {/* Alternative question (OR) */}
                    {question.hasAlternative && question.alternativeQuestion && (
                      <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                        <p className="text-orange-400 font-medium mb-2">अथवा / OR:</p>
                        <p className="text-white text-sm whitespace-pre-line">{question.alternativeQuestion}</p>
                        {question.alternativeAnswer && (
                          <p className="text-green-400 text-sm mt-2">
                            <span className="font-medium">Answer: </span>
                            <span className="whitespace-pre-line">{question.alternativeAnswer}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Fill in blanks */}
                    {question.questionType === "fillblank" &&
                      question.blanks && (
                        <div className="flex flex-wrap gap-2">
                          {question.blanks.map((blank, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-sm"
                            >
                              Blank {idx + 1}: {blank}
                            </span>
                          ))}
                        </div>
                      )}

                    {/* Matching pairs */}
                    {question.questionType === "matching" &&
                      question.matchPairs && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {question.matchPairs.map((pair, idx) => (
                            <div
                              key={idx}
                              className="p-2 bg-white/5 border border-white/10 rounded-lg text-sm flex items-center gap-2"
                            >
                              <span className="text-blue-400">{pair.left}</span>
                              <span className="text-gray-500">→</span>
                              <span className="text-green-400">
                                {pair.right}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>

                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => handleEditQuestion(question)}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FiEdit className="w-5 h-5" />
                    </motion.button>
                    <motion.button
                      onClick={() => handleDeleteQuestion(question._id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
                  ))}
                </div>
              ));
            })()}
          </div>
        )}

        {/* Add/Edit Question Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-white">
                    {editingQuestion ? "Edit Question" : "Add Question"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetQuestionForm();
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <FiX className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Question Type Selection */}
                  <div className="form-group">
                    <label className="input-label text-sm mb-2">
                      Question Type
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        {
                          value: "mcq",
                          label: "📝 MCQ",
                          title: "Multiple Choice",
                        },
                        {
                          value: "written",
                          label: "✍️ Written",
                          title: "Written Answer",
                        },
                        {
                          value: "fillblank",
                          label: "📄 Fill",
                          title: "Fill in Blanks",
                        },
                        {
                          value: "matching",
                          label: "🔗 Match",
                          title: "Match Following",
                        },
                        {
                          value: "truefalse",
                          label: "✓✗ T/F",
                          title: "True or False",
                        },
                      ].map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() =>
                            setQuestionForm({
                              ...questionForm,
                              questionType: type.value,
                            })
                          }
                          className={`p-2 rounded-lg text-xs font-medium transition-all ${
                            questionForm.questionType === type.value
                              ? "bg-blue-500 text-white border-2 border-blue-400"
                              : "bg-white/10 text-gray-400 border-2 border-white/10 hover:border-white/30"
                          }`}
                          title={type.title}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="form-group">
                    <label className="input-label text-sm">Question Text</label>
                    <textarea
                      value={questionForm.questionText}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          questionText: e.target.value,
                        })
                      }
                      className="glass-input h-20 resize-none"
                      placeholder="Enter your question..."
                    />
                  </div>

                  {/* Type-Specific Fields */}
                  {questionForm.questionType === "mcq" && (
                    <div className="form-group">
                      <label className="input-label text-sm">Options</label>
                      <div className="space-y-2">
                        {questionForm.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setQuestionForm({
                                  ...questionForm,
                                  correctOption: index,
                                })
                              }
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                                questionForm.correctOption === index
                                  ? "bg-green-500 text-white"
                                  : "bg-white/10 text-gray-400 hover:bg-white/20"
                              }`}
                            >
                              {String.fromCharCode(65 + index)}
                            </button>
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...questionForm.options];
                                newOptions[index] = e.target.value;
                                setQuestionForm({
                                  ...questionForm,
                                  options: newOptions,
                                });
                              }}
                              className="glass-input flex-1 py-1.5 text-sm"
                              placeholder={`Option ${String.fromCharCode(
                                65 + index
                              )}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {questionForm.questionType === "written" && (
                    <div className="form-group">
                      <label className="input-label text-sm">
                        Expected Answer
                      </label>
                      <textarea
                        value={questionForm.correctAnswer}
                        onChange={(e) =>
                          setQuestionForm({
                            ...questionForm,
                            correctAnswer: e.target.value,
                          })
                        }
                        className="glass-input h-24 resize-none text-sm"
                        placeholder="Enter the expected answer or key points..."
                      />
                    </div>
                  )}

                  {questionForm.questionType === "fillblank" && (
                    <div className="form-group">
                      <label className="input-label text-sm">
                        Correct Answers for Blanks
                      </label>
                      <div className="space-y-2">
                        {questionForm.blanks.map((blank, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={blank}
                              onChange={(e) => {
                                const newBlanks = [...questionForm.blanks];
                                newBlanks[index] = e.target.value;
                                setQuestionForm({
                                  ...questionForm,
                                  blanks: newBlanks,
                                });
                              }}
                              className="glass-input flex-1 py-1.5 text-sm"
                              placeholder={`Answer for blank ${index + 1}`}
                            />
                            {questionForm.blanks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newBlanks = questionForm.blanks.filter(
                                    (_, i) => i !== index
                                  );
                                  setQuestionForm({
                                    ...questionForm,
                                    blanks: newBlanks,
                                  });
                                }}
                                className="btn-secondary px-3 py-1.5 text-sm"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setQuestionForm({
                              ...questionForm,
                              blanks: [...questionForm.blanks, ""],
                            })
                          }
                          className="btn-secondary w-full py-1.5 text-sm"
                        >
                          + Add Blank
                        </button>
                      </div>
                    </div>
                  )}

                  {questionForm.questionType === "matching" && (
                    <div className="form-group">
                      <label className="input-label text-sm">
                        Matching Pairs
                      </label>
                      <div className="space-y-2">
                        {questionForm.matchPairs.map((pair, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={pair.left}
                              onChange={(e) => {
                                const newPairs = [...questionForm.matchPairs];
                                newPairs[index].left = e.target.value;
                                setQuestionForm({
                                  ...questionForm,
                                  matchPairs: newPairs,
                                });
                              }}
                              className="glass-input flex-1 py-1.5 text-sm"
                              placeholder="Left item"
                            />
                            <span className="text-gray-400 self-center">→</span>
                            <input
                              type="text"
                              value={pair.right}
                              onChange={(e) => {
                                const newPairs = [...questionForm.matchPairs];
                                newPairs[index].right = e.target.value;
                                setQuestionForm({
                                  ...questionForm,
                                  matchPairs: newPairs,
                                });
                              }}
                              className="glass-input flex-1 py-1.5 text-sm"
                              placeholder="Right match"
                            />
                            {questionForm.matchPairs.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newPairs =
                                    questionForm.matchPairs.filter(
                                      (_, i) => i !== index
                                    );
                                  setQuestionForm({
                                    ...questionForm,
                                    matchPairs: newPairs,
                                  });
                                }}
                                className="btn-secondary px-3 py-1.5 text-sm"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setQuestionForm({
                              ...questionForm,
                              matchPairs: [
                                ...questionForm.matchPairs,
                                { left: "", right: "" },
                              ],
                            })
                          }
                          className="btn-secondary w-full py-1.5 text-sm"
                        >
                          + Add Pair
                        </button>
                      </div>
                    </div>
                  )}

                  {questionForm.questionType === "truefalse" && (
                    <div className="form-group">
                      <label className="input-label text-sm">
                        Correct Answer
                      </label>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            setQuestionForm({
                              ...questionForm,
                              correctOption: 0,
                              options: ["True", "False"],
                            })
                          }
                          className={`flex-1 p-3 rounded-lg text-sm font-medium transition-all ${
                            questionForm.correctOption === 0
                              ? "bg-green-500 text-white border-2 border-green-400"
                              : "bg-white/10 text-gray-400 border-2 border-white/10 hover:border-white/30"
                          }`}
                        >
                          ✓ True
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setQuestionForm({
                              ...questionForm,
                              correctOption: 1,
                              options: ["True", "False"],
                            })
                          }
                          className={`flex-1 p-3 rounded-lg text-sm font-medium transition-all ${
                            questionForm.correctOption === 1
                              ? "bg-red-500 text-white border-2 border-red-400"
                              : "bg-white/10 text-gray-400 border-2 border-white/10 hover:border-white/30"
                          }`}
                        >
                          ✗ False
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Marks */}
                  <div className="form-group">
                    <label className="input-label text-sm">Marks</label>
                    <input
                      type="number"
                      value={questionForm.marks}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          marks: parseInt(e.target.value) || 1,
                        })
                      }
                      className="glass-input w-24 py-1.5 text-sm"
                      min={1}
                      max={10}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <motion.button
                      onClick={() => {
                        setShowAddModal(false);
                        resetQuestionForm();
                      }}
                      className="btn-secondary flex-1 py-2 text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={handleAddQuestion}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FiSave className="w-4 h-4" />
                      {editingQuestion ? "Update" : "Add"} Question
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate Questions Modal */}
        <AnimatePresence>
          {showGenerateModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!generating) {
                  setShowGenerateModal(false);
                  setGeneratedQuestions([]);
                }
              }}
            >
              <motion.div
                className="glass-card w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiZap className="w-6 h-6 text-yellow-400" />
                    Generate Questions with AI
                  </h2>
                  <button
                    onClick={() => {
                      if (!generating) {
                        setShowGenerateModal(false);
                        setGeneratedQuestions([]);
                      }
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <FiX className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {generatedQuestions.length === 0 ? (
                  <div className="space-y-4">
                    {/* Exam Format Selection - First */}
                    <div className="form-group">
                      <label className="input-label">Exam Format *</label>
                      <select
                        value={generateForm.examFormat || "general"}
                        onChange={(e) => {
                          const format = e.target.value;
                          if (format === "upboard_science") {
                            // Auto-configure for UP Board Science
                            setGenerateForm({
                              ...generateForm,
                              examFormat: format,
                              language: "bilingual",
                              questionTypes: ["mcq", "written"],
                              numberOfQuestions: 30, // 20 MCQ + 10 descriptive
                            });
                          } else {
                            setGenerateForm({
                              ...generateForm,
                              examFormat: format,
                            });
                          }
                        }}
                        className="glass-input"
                      >
                        <option value="general">General (Custom)</option>
                        <option value="upboard_science">UP Board Science (Class 10)</option>
                      </select>
                    </div>

                    {/* UP Board Science - Simplified UI */}
                    {generateForm.examFormat === "upboard_science" ? (
                      <>
                        {/* UP Board Info Box */}
                        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg p-4">
                          <p className="text-blue-300 font-medium mb-3">📋 UP Board Science Paper - 70 Marks (31 Questions)</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-yellow-400 font-medium mb-2">खण्ड-अ (Part A) - 20 Marks</p>
                              <ul className="text-xs text-gray-400 space-y-1">
                                <li>• उप-भाग I: 7 MCQs × 1 = 7 marks</li>
                                <li>• उप-भाग II: 6 MCQs × 1 = 6 marks</li>
                                <li>• उप-भाग III: 7 MCQs × 1 = 7 marks</li>
                              </ul>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-green-400 font-medium mb-2">खण्ड-ब (Part B) - 50 Marks</p>
                              <ul className="text-xs text-gray-400 space-y-1">
                                <li>• उप-भाग I: 4 × (2+2) = 16 marks</li>
                                <li>• उप-भाग II: 4 × 4 = 16 marks</li>
                                <li>• उप-भाग III: 3 × 6 = 18 marks (OR)</li>
                              </ul>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-xs text-gray-400">
                              ✓ 31 questions = 70 marks • ✓ Bilingual (Hindi/English) • ✓ Section headers • ✓ Single or multiple topics
                            </p>
                          </div>
                        </div>

                        {/* Topic Input */}
                        <div className="form-group">
                          <label className="input-label">Topic / Chapter(s) *</label>
                          <input
                            type="text"
                            value={generateForm.topic}
                            onChange={(e) =>
                              setGenerateForm({
                                ...generateForm,
                                topic: e.target.value,
                              })
                            }
                            className="glass-input"
                            placeholder="e.g., प्रकाश - परावर्तन और अपवर्तन OR प्रकाश, रासायनिक अभिक्रियाएं, जीवन प्रक्रियाएं"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Enter single topic OR multiple topics (comma-separated) - questions will be distributed evenly
                          </p>
                        </div>

                        {/* Difficulty Only */}
                        <div className="form-group">
                          <label className="input-label">Difficulty Level</label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { value: "easy", label: "Easy", desc: "Basic concepts", icon: "🟢" },
                              { value: "medium", label: "Medium", desc: "Board level", icon: "🟡" },
                              { value: "hard", label: "Hard", desc: "Competitive", icon: "🔴" },
                            ].map((level) => (
                              <button
                                key={level.value}
                                type="button"
                                onClick={() =>
                                  setGenerateForm({
                                    ...generateForm,
                                    difficulty: level.value,
                                  })
                                }
                                className={`p-3 rounded-lg border text-center transition-all ${
                                  generateForm.difficulty === level.value
                                    ? "bg-blue-500/30 border-blue-500 text-white"
                                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                }`}
                              >
                                <span className="text-xl">{level.icon}</span>
                                <p className="font-medium mt-1">{level.label}</p>
                                <p className="text-xs opacity-70">{level.desc}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* General Format - Full Options */}
                        {/* Topic */}
                        <div className="form-group">
                          <label className="input-label">Topic *</label>
                          <input
                            type="text"
                            value={generateForm.topic}
                            onChange={(e) =>
                              setGenerateForm({
                                ...generateForm,
                                topic: e.target.value,
                              })
                            }
                            className="glass-input"
                            placeholder="e.g., JavaScript Arrays, World War II, Photosynthesis"
                          />
                        </div>

                        {/* Number, Difficulty, Language Row */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="form-group">
                            <label className="input-label">No. of Questions</label>
                            <input
                              type="number"
                              value={generateForm.numberOfQuestions}
                              onChange={(e) =>
                                setGenerateForm({
                                  ...generateForm,
                                  numberOfQuestions: parseInt(e.target.value) || 5,
                                })
                              }
                              className="glass-input"
                              min={1}
                              max={50}
                            />
                          </div>

                          <div className="form-group">
                            <label className="input-label">Difficulty</label>
                            <select
                              value={generateForm.difficulty}
                              onChange={(e) =>
                                setGenerateForm({
                                  ...generateForm,
                                  difficulty: e.target.value,
                                })
                              }
                              className="glass-input"
                            >
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="input-label">Language</label>
                            <select
                              value={generateForm.language || "english"}
                              onChange={(e) =>
                                setGenerateForm({
                                  ...generateForm,
                                  language: e.target.value,
                                })
                              }
                              className="glass-input"
                            >
                              <option value="english">English</option>
                              <option value="hindi">हिंदी (Hindi)</option>
                              <option value="bilingual">द्विभाषी (Bilingual)</option>
                              <option value="sanskrit">संस्कृत (Sanskrit)</option>
                              <option value="spanish">Español (Spanish)</option>
                              <option value="french">Français (French)</option>
                              <option value="german">Deutsch (German)</option>
                            </select>
                          </div>
                        </div>

                    {/* Question Types */}
                    <div className="form-group">
                      <label className="input-label mb-2">Question Types</label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[
                          { value: "mcq", label: "MCQ", icon: "📝" },
                          { value: "written", label: "Written", icon: "✍️" },
                          { value: "fillblank", label: "Fill Blanks", icon: "📄" },
                          { value: "matching", label: "Matching", icon: "🔗" },
                          { value: "truefalse", label: "True/False", icon: "✓✗" },
                        ].map((type) => (
                          <label
                            key={type.value}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                              (generateForm.questionTypes || ["mcq"]).includes(type.value)
                                ? "bg-yellow-500/30 border border-yellow-500"
                                : "bg-white/5 border border-white/10 hover:bg-white/10"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={(generateForm.questionTypes || ["mcq"]).includes(type.value)}
                              onChange={() => {
                                const currentTypes = generateForm.questionTypes || ["mcq"];
                                const newTypes = currentTypes.includes(type.value)
                                  ? currentTypes.filter((t) => t !== type.value)
                                  : [...currentTypes, type.value];
                                setGenerateForm({
                                  ...generateForm,
                                  questionTypes: newTypes.length > 0 ? newTypes : ["mcq"],
                                });
                              }}
                              className="hidden"
                            />
                            <span>{type.icon}</span>
                            <span className="text-white">{type.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Additional Instructions */}
                    <div className="form-group">
                      <label className="input-label">Additional Instructions (Optional)</label>
                      <textarea
                        value={generateForm.description || ""}
                        onChange={(e) =>
                          setGenerateForm({
                            ...generateForm,
                            description: e.target.value,
                          })
                        }
                        className="glass-input h-24 resize-none"
                        placeholder="e.g., Focus on chapter 5, include questions about key dates, avoid complex calculations, make questions suitable for beginners..."
                        maxLength={1000}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Give specific instructions to guide AI question generation
                      </p>
                    </div>
                      </>
                    )}

                    <motion.button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {generating ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <FiZap className="w-5 h-5" />
                          Generate Questions
                        </>
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-300">
                      Generated {generatedQuestions.length} questions. Review
                      and add them to your quiz.
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {/* Group questions by section for UP Board format */}
                      {(() => {
                        const sections = {};
                        generatedQuestions.forEach((q, idx) => {
                          const section = q.section || "Questions";
                          if (!sections[section]) sections[section] = [];
                          sections[section].push({ ...q, originalIndex: idx });
                        });
                        
                        return Object.entries(sections).map(([sectionName, sectionQuestions]) => (
                          <div key={sectionName} className="mb-4">
                            {/* Section Header */}
                            {sectionName !== "Questions" && (
                              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-3 mb-3">
                                <p className="text-yellow-300 font-bold text-sm">{sectionName}</p>
                              </div>
                            )}
                            
                            {/* Questions in this section */}
                            {sectionQuestions.map((question) => (
                              <div key={question.originalIndex} className="bg-white/5 rounded-lg p-4 mb-2">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className="text-blue-400 font-bold">Q{question.originalIndex + 1}.</span>
                                  <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                                    {question.questionType === "mcq" && "📝 MCQ"}
                                    {question.questionType === "written" && "✍️ Written"}
                                    {question.questionType === "fillblank" && "📄 Fill Blank"}
                                    {question.questionType === "matching" && "🔗 Matching"}
                                    {question.questionType === "truefalse" && "✓✗ True/False"}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                                    {question.marks} mark{question.marks > 1 ? "s" : ""}
                                  </span>
                                </div>
                                <p className="text-white mb-2 whitespace-pre-line">{question.questionText}</p>
                                
                                {/* MCQ/TrueFalse Options */}
                                {(question.questionType === "mcq" || question.questionType === "truefalse") && question.options && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    {question.options.map((opt, optIdx) => (
                                      <div
                                        key={optIdx}
                                        className={`p-2 rounded ${
                                          optIdx === question.correctOption
                                            ? "bg-green-500/20 text-green-300 border border-green-500/30"
                                            : "bg-white/5 text-gray-400"
                                        }`}
                                      >
                                        {String.fromCharCode(65 + optIdx)}. {opt}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Written Answer */}
                                {question.questionType === "written" && question.correctAnswer && (
                                  <div className="p-2 bg-green-500/10 border border-green-500/30 rounded text-green-300 text-sm mt-2">
                                    <span className="font-medium">Expected: </span>
                                    <span className="whitespace-pre-line">{question.correctAnswer}</span>
                                  </div>
                                )}

                                {/* Fill Blanks */}
                                {question.questionType === "fillblank" && question.blanks && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {question.blanks.map((blank, idx) => (
                                      <span key={idx} className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-sm">
                                        Blank {idx + 1}: {blank}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Matching */}
                                {question.questionType === "matching" && question.matchPairs && (
                                  <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                                    {question.matchPairs.map((pair, idx) => (
                                      <div key={idx} className="p-2 bg-white/5 rounded flex items-center gap-2">
                                        <span className="text-blue-400">{pair.left}</span>
                                        <span className="text-gray-500">→</span>
                                        <span className="text-green-400">{pair.right}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ));
                      })()}
                    </div>

                    <div className="flex gap-4">
                      <motion.button
                        onClick={() => {
                          setGeneratedQuestions([]);
                        }}
                        className="btn-secondary flex-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Regenerate
                      </motion.button>
                      <motion.button
                        onClick={handleAddGeneratedQuestions}
                        className="btn-success flex-1 flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FiPlus className="w-5 h-5" />
                        Add All to Quiz
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk Process Modal */}
        <AnimatePresence>
          {showBulkModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!processingBulk) {
                  setShowBulkModal(false);
                  setProcessedQuestions([]);
                }
              }}
            >
              <motion.div
                className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiFileText className="w-6 h-6 text-green-400" />
                    Bulk Process Questions
                  </h2>
                  <button
                    onClick={() => {
                      if (!processingBulk) {
                        setShowBulkModal(false);
                        setProcessedQuestions([]);
                      }
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <FiX className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {processedQuestions.length === 0 ? (
                  <div className="space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-blue-300 text-sm">
                      <p className="font-semibold mb-2">📋 How it works:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Paste your raw questions below (any format)</li>
                        <li>One-word answers will be converted to MCQ</li>
                        <li>Word meanings will get random distractors</li>
                        <li>
                          AI will auto-detect True/False, Fill-in-blanks, etc.
                        </li>
                        <li>
                          Marks will be distributed based on your instructions
                        </li>
                      </ul>
                    </div>

                    <div className="form-group">
                      <label className="input-label">Raw Questions</label>
                      <textarea
                        value={bulkForm.rawQuestions}
                        onChange={(e) =>
                          setBulkForm({
                            ...bulkForm,
                            rawQuestions: e.target.value,
                          })
                        }
                        className="glass-input h-40 resize-none font-mono text-sm"
                        placeholder={`Paste your questions here in any format...

Example:
1. What is photosynthesis? (2 marks)
2. Define osmosis.
3. Water freezes at _____ degrees Celsius.
4. True/False: Plants need sunlight to grow.
5. Match: Vitamin C - Citrus fruits, Vitamin A - Carrots
6. Meaning of "benevolent"
7. Capital of France?`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="input-label">
                          Maximum Total Marks
                        </label>
                        <input
                          type="number"
                          value={bulkForm.maxMarks}
                          onChange={(e) =>
                            setBulkForm({
                              ...bulkForm,
                              maxMarks: parseInt(e.target.value) || 50,
                            })
                          }
                          className="glass-input"
                          min={10}
                          max={200}
                        />
                      </div>

                      <div className="form-group">
                        <label className="input-label">
                          Questions to Pick{" "}
                          <span className="text-gray-500">
                            (optional, leave empty for all)
                          </span>
                        </label>
                        <input
                          type="number"
                          value={bulkForm.numberOfQuestions}
                          onChange={(e) =>
                            setBulkForm({
                              ...bulkForm,
                              numberOfQuestions: e.target.value,
                            })
                          }
                          className="glass-input"
                          min={1}
                          placeholder="All questions"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="input-label">
                        Marks Distribution Instructions{" "}
                        <span className="text-gray-500">(optional)</span>
                      </label>
                      <textarea
                        value={bulkForm.marksDistribution}
                        onChange={(e) =>
                          setBulkForm({
                            ...bulkForm,
                            marksDistribution: e.target.value,
                          })
                        }
                        className="glass-input h-20 resize-none text-sm"
                        placeholder={`Examples:
- MCQs: 1 mark each, Written: 3-5 marks each
- Easy questions: 1 mark, Medium: 2 marks, Hard: 3 marks
- Distribute marks equally among all questions`}
                      />
                    </div>

                    <div className="form-group">
                      <label className="input-label">Language</label>
                      <select
                        value={bulkForm.language}
                        onChange={(e) =>
                          setBulkForm({
                            ...bulkForm,
                            language: e.target.value,
                          })
                        }
                        className="glass-input"
                      >
                        <option value="english">English</option>
                        <option value="hindi">Hindi</option>
                        <option value="spanish">Spanish</option>
                        <option value="french">French</option>
                        <option value="german">German</option>
                        <option value="chinese">Chinese</option>
                        <option value="japanese">Japanese</option>
                        <option value="arabic">Arabic</option>
                      </select>
                    </div>

                    <motion.button
                      onClick={handleProcessBulk}
                      disabled={processingBulk || !bulkForm.rawQuestions.trim()}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {processingBulk ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Processing with AI...
                        </>
                      ) : (
                        <>
                          <FiZap className="w-5 h-5" />
                          Process Questions
                        </>
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-300">
                      <p className="font-semibold">
                        ✓ Processed {processedQuestions.length} questions (
                        {processedQuestions.reduce(
                          (sum, q) => sum + q.marks,
                          0
                        )}{" "}
                        total marks)
                      </p>
                      <p className="text-sm mt-1 text-green-400">
                        Review the questions below and add them to your quiz.
                      </p>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {processedQuestions.map((question, index) => (
                        <div key={index} className="bg-white/5 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-white flex-1">
                              <span className="text-blue-400 font-bold">
                                Q{index + 1}.
                              </span>{" "}
                              {question.questionText}
                            </p>
                            <div className="flex gap-2 ml-2">
                              <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full whitespace-nowrap">
                                {question.marks} mark
                                {question.marks > 1 ? "s" : ""}
                              </span>
                              <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full whitespace-nowrap">
                                {question.questionType}
                              </span>
                            </div>
                          </div>

                          {/* Show options for MCQ and True/False */}
                          {(question.questionType === "mcq" ||
                            question.questionType === "truefalse") && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {question.options.map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  className={`p-2 rounded ${
                                    optIdx === question.correctOption
                                      ? "bg-green-500/20 text-green-300"
                                      : "bg-white/5 text-gray-400"
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIdx)}. {opt}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Show answer for written */}
                          {question.questionType === "written" && (
                            <div className="text-sm text-gray-400 mt-2">
                              <span className="text-green-400">Answer: </span>
                              {question.correctAnswer}
                            </div>
                          )}

                          {/* Show blanks for fill-in-blank */}
                          {question.questionType === "fillblank" && (
                            <div className="text-sm text-gray-400 mt-2">
                              <span className="text-green-400">Blanks: </span>
                              {question.blanks?.join(", ")}
                            </div>
                          )}

                          {/* Show match pairs */}
                          {question.questionType === "matching" && (
                            <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                              {question.matchPairs?.map((pair, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="flex items-center gap-2 text-gray-400"
                                >
                                  <span className="text-blue-400">
                                    {pair.left}
                                  </span>
                                  <span>→</span>
                                  <span className="text-green-400">
                                    {pair.right}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-4">
                      <motion.button
                        onClick={() => {
                          setProcessedQuestions([]);
                        }}
                        className="btn-secondary flex-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Reprocess
                      </motion.button>
                      <motion.button
                        onClick={handleAddProcessedQuestions}
                        className="btn-success flex-1 flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FiPlus className="w-5 h-5" />
                        Add All to Quiz
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Extract from Image Modal */}
        <AnimatePresence>
          {showImageModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!extracting) {
                  setShowImageModal(false);
                  setExtractedQuestions([]);
                }
              }}
            >
              <motion.div
                className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiFileText className="w-6 h-6 text-blue-400" />
                    Extract Questions from Image
                  </h2>
                  <button
                    onClick={() => {
                      if (!extracting) {
                        setShowImageModal(false);
                        setExtractedQuestions([]);
                      }
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <FiX className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {extractedQuestions.length === 0 ? (
                  <div className="space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-blue-300 text-sm">
                      <p className="font-semibold mb-2">📸 How it works:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          Upload an image with questions (test paper, worksheet,
                          etc.)
                        </li>
                        <li>AI will detect and extract all questions</li>
                        <li>
                          Auto-converts to appropriate formats (MCQ, Written,
                          etc.)
                        </li>
                        <li>Add instructions for marks distribution</li>
                      </ul>
                    </div>

                    {/* Image Upload */}
                    <div className="form-group">
                      <label className="input-label">Upload Image</label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="glass-input cursor-pointer flex items-center justify-center p-8 text-center hover:bg-white/10 transition-colors"
                        >
                          {imageForm.imagePreview ? (
                            <img
                              src={imageForm.imagePreview}
                              alt="Preview"
                              className="max-h-64 rounded-lg"
                            />
                          ) : (
                            <div>
                              <FiPlus className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                              <p className="text-gray-400">
                                Click to upload image
                              </p>
                              <p className="text-gray-500 text-sm mt-1">
                                Supports JPG, PNG, JPEG
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="input-label">
                          Maximum Total Marks
                        </label>
                        <input
                          type="number"
                          value={imageForm.maxMarks}
                          onChange={(e) =>
                            setImageForm({
                              ...imageForm,
                              maxMarks: parseInt(e.target.value) || 50,
                            })
                          }
                          className="glass-input"
                          min={10}
                          max={200}
                        />
                      </div>

                      <div className="form-group">
                        <label className="input-label">Language</label>
                        <select
                          value={imageForm.language}
                          onChange={(e) =>
                            setImageForm({
                              ...imageForm,
                              language: e.target.value,
                            })
                          }
                          className="glass-input"
                        >
                          <option value="english">English</option>
                          <option value="hindi">Hindi</option>
                          <option value="spanish">Spanish</option>
                          <option value="french">French</option>
                          <option value="german">German</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="input-label">
                        Marks Distribution{" "}
                        <span className="text-gray-500">(optional)</span>
                      </label>
                      <textarea
                        value={imageForm.marksDistribution}
                        onChange={(e) =>
                          setImageForm({
                            ...imageForm,
                            marksDistribution: e.target.value,
                          })
                        }
                        className="glass-input h-20 resize-none text-sm"
                        placeholder="E.g., MCQs: 1 mark, Written: 3-5 marks, Easy: 1 mark, Hard: 3 marks"
                      />
                    </div>

                    <div className="form-group">
                      <label className="input-label">
                        Additional Instructions{" "}
                        <span className="text-gray-500">(optional)</span>
                      </label>
                      <textarea
                        value={imageForm.additionalInstructions}
                        onChange={(e) =>
                          setImageForm({
                            ...imageForm,
                            additionalInstructions: e.target.value,
                          })
                        }
                        className="glass-input h-20 resize-none text-sm"
                        placeholder="E.g., Convert one-word answers to MCQ, Skip diagram questions, etc."
                      />
                    </div>

                    <motion.button
                      onClick={handleExtractFromImage}
                      disabled={extracting || !imageForm.image}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {extracting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Extracting...
                        </>
                      ) : (
                        <>
                          <FiZap className="w-5 h-5" />
                          Extract Questions
                        </>
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-300">
                      <p className="font-semibold">
                        ✓ Extracted {extractedQuestions.length} questions (
                        {extractedQuestions.reduce(
                          (sum, q) => sum + q.marks,
                          0
                        )}{" "}
                        total marks)
                      </p>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {extractedQuestions.map((question, index) => (
                        <div key={index} className="bg-white/5 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-white flex-1">
                              <span className="text-blue-400 font-bold">
                                Q{index + 1}.
                              </span>{" "}
                              {question.questionText}
                            </p>
                            <div className="flex gap-2 ml-2">
                              <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full whitespace-nowrap">
                                {question.marks} mark
                                {question.marks > 1 ? "s" : ""}
                              </span>
                              <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full whitespace-nowrap">
                                {question.questionType}
                              </span>
                            </div>
                          </div>

                          {/* Show options for MCQ and True/False */}
                          {(question.questionType === "mcq" ||
                            question.questionType === "truefalse") && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {question.options.map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  className={`p-2 rounded ${
                                    optIdx === question.correctOption
                                      ? "bg-green-500/20 text-green-300"
                                      : "bg-white/5 text-gray-400"
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIdx)}. {opt}
                                </div>
                              ))}
                            </div>
                          )}

                          {question.questionType === "written" && (
                            <div className="text-sm text-gray-400 mt-2">
                              <span className="text-green-400">Answer: </span>
                              {question.correctAnswer}
                            </div>
                          )}

                          {question.questionType === "fillblank" && (
                            <div className="text-sm text-gray-400 mt-2">
                              <span className="text-green-400">Blanks: </span>
                              {question.blanks?.join(", ")}
                            </div>
                          )}

                          {question.questionType === "matching" && (
                            <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                              {question.matchPairs?.map((pair, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="flex items-center gap-2 text-gray-400"
                                >
                                  <span className="text-blue-400">
                                    {pair.left}
                                  </span>
                                  <span>→</span>
                                  <span className="text-green-400">
                                    {pair.right}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-4">
                      <motion.button
                        onClick={() => {
                          setExtractedQuestions([]);
                        }}
                        className="btn-secondary flex-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Re-extract
                      </motion.button>
                      <motion.button
                        onClick={handleAddExtractedQuestions}
                        className="btn-success flex-1 flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FiPlus className="w-5 h-5" />
                        Add All to Quiz
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ManageQuiz;
