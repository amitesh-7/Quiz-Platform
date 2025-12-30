import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiAward,
  FiCheckCircle,
  FiXCircle,
  FiHome,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import Loading from "../../components/Loading";
import { resultAPI } from "../../services/api";

const QuizResult = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, [quizId]);

  const fetchResult = async () => {
    try {
      const response = await resultAPI.get(quizId);
      setResult(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch result");
      navigate("/student");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Loading result..." />;
  }

  const getGrade = (percentage) => {
    if (percentage >= 90)
      return { grade: "A+", color: "text-green-400", bg: "bg-green-500/20" };
    if (percentage >= 80)
      return { grade: "A", color: "text-green-400", bg: "bg-green-500/20" };
    if (percentage >= 70)
      return { grade: "B", color: "text-blue-400", bg: "bg-blue-500/20" };
    if (percentage >= 60)
      return { grade: "C", color: "text-yellow-400", bg: "bg-yellow-500/20" };
    if (percentage >= 50)
      return { grade: "D", color: "text-orange-400", bg: "bg-orange-500/20" };
    return { grade: "F", color: "text-red-400", bg: "bg-red-500/20" };
  };

  const gradeInfo = getGrade(result.percentage);
  const correctCount = result.detailedResults.filter((r) => r.isCorrect).length;
  const incorrectCount = result.detailedResults.filter(
    (r) => !r.isCorrect && r.selectedOption !== null
  ).length;
  const unanswered = result.detailedResults.filter(
    (r) => r.selectedOption === null
  ).length;

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 pb-8">
        {/* Back Button */}
        <motion.button
          onClick={() => navigate("/student")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <FiArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </motion.button>

        {/* Result Summary */}
        <motion.div
          className="glass-card text-center mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div
            className={`w-24 h-24 ${gradeInfo.bg} rounded-full flex items-center justify-center mx-auto mb-4`}
          >
            <span className={`text-4xl font-bold ${gradeInfo.color}`}>
              {gradeInfo.grade}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            {result.quiz.title}
          </h1>
          <p className="text-gray-400 mb-6">
            Submitted on {new Date(result.submittedAt).toLocaleString()}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="glass p-4 rounded-xl">
              <p className={`text-3xl font-bold ${gradeInfo.color}`}>
                {result.percentage}%
              </p>
              <p className="text-sm text-gray-400">Score</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <p className="text-3xl font-bold text-white">
                {result.score}/{result.totalMarks}
              </p>
              <p className="text-sm text-gray-400">Marks</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <p className="text-3xl font-bold text-green-400">
                {correctCount}
              </p>
              <p className="text-sm text-gray-400">Correct</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <p className="text-3xl font-bold text-red-400">
                {incorrectCount}
              </p>
              <p className="text-sm text-gray-400">Incorrect</p>
            </div>
          </div>

          <Link to="/student">
            <motion.button
              className="btn-primary inline-flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiHome className="w-5 h-5" />
              Back to Quizzes
            </motion.button>
          </Link>
        </motion.div>

        {/* Detailed Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-white mb-4">
            Question Review
          </h2>

          <div className="space-y-4">
            {result.detailedResults.map((item, index) => (
              <motion.div
                key={item.questionId}
                className={`glass-card border-l-4 ${
                  item.isCorrect ? "border-green-500" : "border-red-500"
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      item.isCorrect
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {item.isCorrect ? (
                      <FiCheckCircle className="w-5 h-5" />
                    ) : (
                      <FiXCircle className="w-5 h-5" />
                    )}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-gray-400 text-sm">
                        Question {index + 1}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                        {item.marks} mark{item.marks > 1 ? "s" : ""}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs uppercase">
                        {item.questionType === "mcq" && "MCQ"}
                        {item.questionType === "written" && "Written"}
                        {item.questionType === "fillblank" && "Fill Blank"}
                        {item.questionType === "matching" && "Matching"}
                        {item.questionType === "truefalse" && "True/False"}
                      </span>
                    </div>
                    <p className="text-white">{item.questionText}</p>
                  </div>
                </div>

                {/* MCQ and True/False Questions */}
                {(item.questionType === "mcq" ||
                  item.questionType === "truefalse") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {item.options.map((option, optIndex) => {
                      const isCorrect = optIndex === item.correctOption;
                      const isSelected = optIndex === item.selectedOption;

                      let bgClass = "bg-white/5 text-gray-400";
                      if (isCorrect) {
                        bgClass =
                          "bg-green-500/20 text-green-300 border border-green-500/30";
                      } else if (isSelected && !isCorrect) {
                        bgClass =
                          "bg-red-500/20 text-red-300 border border-red-500/30";
                      }

                      return (
                        <div
                          key={optIndex}
                          className={`p-3 rounded-lg flex items-center gap-2 ${bgClass}`}
                        >
                          <span className="font-medium">
                            {String.fromCharCode(65 + optIndex)}.
                          </span>
                          <span className="flex-1">{option}</span>
                          {isCorrect && (
                            <FiCheckCircle className="w-4 h-4 text-green-400" />
                          )}
                          {isSelected && !isCorrect && (
                            <FiXCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Written Answer Questions */}
                {item.questionType === "written" && (
                  <div className="space-y-3">
                    <div className="bg-white/5 p-4 rounded-lg">
                      <p className="text-sm text-gray-400 mb-1">Your Answer:</p>
                      <p className="text-white whitespace-pre-wrap">
                        {item.studentAnswer || "Not answered"}
                      </p>
                    </div>
                    {item.expectedAnswer && (
                      <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/30">
                        <p className="text-sm text-green-400 mb-1">
                          Expected Answer:
                        </p>
                        <p className="text-green-300 whitespace-pre-wrap">
                          {item.expectedAnswer}
                        </p>
                      </div>
                    )}
                    {item.feedback && (
                      <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
                        <p className="text-sm text-blue-400 mb-1">Feedback:</p>
                        <p className="text-blue-300">{item.feedback}</p>
                      </div>
                    )}
                    {item.awardedMarks !== undefined && (
                      <div className="text-sm text-gray-400">
                        Awarded: {item.awardedMarks}/{item.marks} marks
                      </div>
                    )}
                  </div>
                )}

                {/* Fill in the Blank Questions */}
                {item.questionType === "fillblank" && (
                  <div className="space-y-3">
                    <div className="bg-white/5 p-4 rounded-lg">
                      <p className="text-sm text-gray-400 mb-1">Your Answer:</p>
                      <p className="text-white">
                        {item.studentAnswer || "Not answered"}
                      </p>
                    </div>
                    <div
                      className={`p-4 rounded-lg border ${
                        item.isCorrect
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-red-500/10 border-red-500/30"
                      }`}
                    >
                      <p
                        className={`text-sm mb-1 ${
                          item.isCorrect ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        Correct Answer:
                      </p>
                      <p
                        className={
                          item.isCorrect ? "text-green-300" : "text-red-300"
                        }
                      >
                        {item.correctAnswer}
                      </p>
                    </div>
                  </div>
                )}

                {/* Matching Questions */}
                {item.questionType === "matching" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Student's Matches */}
                      <div className="bg-white/5 p-4 rounded-lg">
                        <p className="text-sm text-gray-400 mb-3 font-medium">
                          Your Matches:
                        </p>
                        <div className="space-y-2">
                          {item.studentMatches &&
                            item.studentMatches.map((match, idx) => (
                              <div
                                key={idx}
                                className="text-sm bg-white/5 p-2 rounded"
                              >
                                <span className="text-blue-400">
                                  {match.left}
                                </span>
                                <span className="text-gray-500 mx-2">→</span>
                                <span className="text-purple-400">
                                  {match.right}
                                </span>
                              </div>
                            ))}
                          {!item.studentMatches && (
                            <p className="text-yellow-400 text-sm">
                              Not answered
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Correct Matches */}
                      <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/30">
                        <p className="text-sm text-green-400 mb-3 font-medium">
                          Correct Matches:
                        </p>
                        <div className="space-y-2">
                          {item.correctMatches &&
                            item.correctMatches.map((match, idx) => (
                              <div
                                key={idx}
                                className="text-sm bg-green-500/10 p-2 rounded"
                              >
                                <span className="text-green-300">
                                  {match.left}
                                </span>
                                <span className="text-gray-500 mx-2">→</span>
                                <span className="text-green-300">
                                  {match.right}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {item.selectedOption === null &&
                  !item.studentAnswer &&
                  !item.studentMatches && (
                    <p className="text-yellow-400 text-sm mt-3">
                      ⚠️ Not answered
                    </p>
                  )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default QuizResult;
