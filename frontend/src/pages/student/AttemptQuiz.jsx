import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiClock,
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiAlertTriangle,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import Loading from "../../components/Loading";
import { quizAPI, submissionAPI } from "../../services/api";

const AttemptQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
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
      setTimeLeft(response.data.data.quiz.duration * 60);
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error("You have already submitted this quiz");
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

      // Prepare answers array
      const answersArray = Object.entries(answers).map(
        ([questionId, selectedOption]) => ({
          questionId,
          selectedOption,
        })
      );

      try {
        const response = await submissionAPI.submit({
          quizId,
          answers: answersArray,
        });

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
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-white hidden sm:block">
                {quiz.title}
              </h2>
              <span className="text-sm text-gray-400">
                {answeredCount}/{questions.length} answered
              </span>
            </div>

            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeLeft <= 60
                  ? "bg-red-500/20 text-red-400"
                  : "bg-blue-500/20 text-blue-400"
              }`}
            >
              <FiClock className="w-5 h-5" />
              <span className="font-mono text-lg font-bold">
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

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Question Navigator */}
          <motion.div
            className="glass-card mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm text-gray-400 mb-3">Question Navigator</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((q, index) => (
                <motion.button
                  key={q._id}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
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
              <div className="flex items-center gap-3 mb-6">
                <span className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 font-bold">
                  {currentQuestion + 1}
                </span>
                <div className="flex-1">
                  <span className="text-sm text-gray-400">
                    Question {currentQuestion + 1} of {questions.length}
                  </span>
                </div>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                  {question.marks} mark{question.marks > 1 ? "s" : ""}
                </span>
              </div>

              <p className="text-xl text-white mb-8">{question.questionText}</p>

              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleSelectOption(question._id, index)}
                    className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-3 ${
                      answers[question._id] === index
                        ? "bg-blue-500/20 border-2 border-blue-500 text-white"
                        : "bg-white/5 border-2 border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/10"
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        answers[question._id] === index
                          ? "bg-blue-500 text-white"
                          : "bg-white/10 text-gray-400"
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{option}</span>
                    {answers[question._id] === index && (
                      <FiCheck className="w-5 h-5 text-blue-400" />
                    )}
                  </motion.button>
                ))}
              </div>

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
