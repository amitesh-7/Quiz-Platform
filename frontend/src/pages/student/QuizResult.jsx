import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiAward,
  FiCheckCircle,
  FiXCircle,
  FiHome,
  FiAlertCircle,
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
  const partialCount = result.detailedResults.filter((r) => r.isPartial).length;
  const incorrectCount = result.detailedResults.filter(
    (r) => !r.isCorrect && !r.isPartial && r.isAttempted
  ).length;
  const unansweredCount = result.detailedResults.filter(
    (r) => !r.isAttempted
  ).length;

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-3 sm:px-4 pb-6 sm:pb-8">
        {/* Back Button */}
        <motion.button
          onClick={() => navigate("/student")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <FiArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          Back to Dashboard
        </motion.button>

        {/* Result Summary */}
        <motion.div
          className="glass-card text-center mb-6 sm:mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div
            className={`w-16 h-16 sm:w-24 sm:h-24 ${gradeInfo.bg} rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4`}
          >
            <span className={`text-2xl sm:text-4xl font-bold ${gradeInfo.color}`}>
              {gradeInfo.grade}
            </span>
          </div>

          <h1 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
            {result.quiz.title}
          </h1>
          <p className="text-gray-400 text-sm sm:text-base mb-4 sm:mb-6">
            Submitted on {new Date(result.submittedAt).toLocaleString()}
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="glass p-2 sm:p-4 rounded-xl">
              <p className={`text-lg sm:text-2xl font-bold ${gradeInfo.color}`}>
                {result.percentage}%
              </p>
              <p className="text-xs sm:text-sm text-gray-400">Score</p>
            </div>
            <div className="glass p-2 sm:p-4 rounded-xl">
              <p className="text-lg sm:text-2xl font-bold text-white">
                {result.score}/{result.totalMarks}
              </p>
              <p className="text-xs sm:text-sm text-gray-400">Marks</p>
            </div>
            <div className="glass p-2 sm:p-4 rounded-xl">
              <p className="text-lg sm:text-2xl font-bold text-green-400">
                {correctCount}
              </p>
              <p className="text-xs sm:text-sm text-gray-400">Correct</p>
            </div>
            <div className="glass p-2 sm:p-4 rounded-xl">
              <p className="text-lg sm:text-2xl font-bold text-orange-400">
                {partialCount}
              </p>
              <p className="text-xs sm:text-sm text-gray-400">Partial</p>
            </div>
            <div className="glass p-2 sm:p-4 rounded-xl">
              <p className="text-lg sm:text-2xl font-bold text-red-400">
                {incorrectCount}
              </p>
              <p className="text-xs sm:text-sm text-gray-400">Wrong</p>
            </div>
            <div className="glass p-2 sm:p-4 rounded-xl">
              <p className="text-lg sm:text-2xl font-bold text-yellow-400">
                {unansweredCount}
              </p>
              <p className="text-xs sm:text-sm text-gray-400">Skipped</p>
            </div>
          </div>

          <Link to="/student">
            <motion.button
              className="btn-primary inline-flex items-center gap-2 text-sm sm:text-base"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiHome className="w-4 h-4 sm:w-5 sm:h-5" />
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
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
            Question Review
          </h2>

          <div className="space-y-3 sm:space-y-4">
            {result.detailedResults.map((item, index) => {
              // Determine border and icon color based on status
              const getBorderColor = () => {
                if (!item.isAttempted) return "border-yellow-500";
                if (item.isCorrect) return "border-green-500";
                if (item.isPartial) return "border-orange-500";
                return "border-red-500";
              };
              
              const getIconBg = () => {
                if (!item.isAttempted) return "bg-yellow-500/20 text-yellow-400";
                if (item.isCorrect) return "bg-green-500/20 text-green-400";
                if (item.isPartial) return "bg-orange-500/20 text-orange-400";
                return "bg-red-500/20 text-red-400";
              };

              const getStatusIcon = () => {
                if (!item.isAttempted) return <FiAlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />;
                if (item.isCorrect) return <FiCheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />;
                if (item.isPartial) return <FiAward className="w-4 h-4 sm:w-5 sm:h-5" />;
                return <FiXCircle className="w-4 h-4 sm:w-5 sm:h-5" />;
              };

              return (
              <motion.div
                key={item.questionId || index}
                className={`glass-card border-l-4 ${getBorderColor()}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <span
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getIconBg()}`}
                  >
                    {getStatusIcon()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                      <span className="text-gray-400 text-xs sm:text-sm">
                        Q{index + 1}
                      </span>
                      <span className="px-1.5 sm:px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                        {item.earnedMarks || 0}/{item.marks} marks
                      </span>
                      <span className="px-1.5 sm:px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs uppercase">
                        {item.questionType === "mcq" && "MCQ"}
                        {item.questionType === "written" && "Written"}
                        {item.questionType === "fillblank" && "Fill Blank"}
                        {item.questionType === "matching" && "Matching"}
                        {item.questionType === "truefalse" && "True/False"}
                      </span>
                      {!item.isAttempted && (
                        <span className="px-1.5 sm:px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                          Skipped
                        </span>
                      )}
                      {item.isPartial && (
                        <span className="px-1.5 sm:px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">
                          Partial
                        </span>
                      )}
                    </div>
                    <p className="text-white text-sm sm:text-base leading-relaxed">{item.questionText}</p>
                  </div>
                </div>

                {/* MCQ and True/False Questions */}
                {(item.questionType === "mcq" ||
                  item.questionType === "truefalse") && (
                  <div className="space-y-2">
                    {item.options && item.options.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {item.options.map((option, optIndex) => {
                          const isCorrect = optIndex === item.correctOption;
                          const isSelected = optIndex === item.selectedOption;
                          const hindiLabels = ["अ", "ब", "स", "द"];
                          const englishLabels = ["A", "B", "C", "D"];

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
                              className={`p-3 rounded-lg flex items-start gap-2 ${bgClass}`}
                            >
                              <span className="font-medium flex-shrink-0 w-8">
                                ({hindiLabels[optIndex] || englishLabels[optIndex]})
                              </span>
                              <span className="flex-1 text-sm sm:text-base">{option}</span>
                              {isCorrect && (
                                <FiCheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                              )}
                              {isSelected && !isCorrect && (
                                <FiXCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-yellow-400 text-sm">Options not available</p>
                    )}
                    
                    {/* Show what student selected if not visible in options */}
                    {item.selectedOption === null && (
                      <p className="text-yellow-400 text-sm mt-2">⚠️ Not answered</p>
                    )}
                  </div>
                )}

                {/* Written Answer Questions */}
                {item.questionType === "written" && (
                  <div className="space-y-3">
                    {/* Student's Answer */}
                    <div className="bg-white/5 p-4 rounded-lg">
                      <p className="text-sm text-gray-400 mb-2 font-medium">Your Answer:</p>
                      {item.studentAnswer ? (
                        <p className="text-white whitespace-pre-wrap leading-relaxed">
                          {item.studentAnswer}
                        </p>
                      ) : (
                        <p className="text-yellow-400 italic">Not answered</p>
                      )}
                    </div>

                    {/* Image indicator if uploaded */}
                    {item.imageUrl && (
                      <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/30 flex items-center gap-2">
                        <FiCheckCircle className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-blue-300">Answer extracted from uploaded image</span>
                      </div>
                    )}

                    {/* Expected Answer */}
                    {item.expectedAnswer && (
                      <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/30">
                        <p className="text-sm text-green-400 mb-2 font-medium">
                          Expected Answer:
                        </p>
                        <p className="text-green-300 whitespace-pre-wrap leading-relaxed">
                          {item.expectedAnswer}
                        </p>
                      </div>
                    )}

                    {/* AI Feedback */}
                    {item.feedback && (
                      <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
                        <p className="text-sm text-blue-400 mb-2 font-medium">AI Feedback:</p>
                        <p className="text-blue-300 leading-relaxed">{item.feedback}</p>
                      </div>
                    )}

                    {/* Marks awarded */}
                    <div className={`p-3 rounded-lg ${
                      item.isCorrect 
                        ? 'bg-green-500/10 border border-green-500/30' 
                        : item.isPartial 
                          ? 'bg-orange-500/10 border border-orange-500/30'
                          : 'bg-red-500/10 border border-red-500/30'
                    }`}>
                      <p className={`text-sm font-medium ${
                        item.isCorrect 
                          ? 'text-green-400' 
                          : item.isPartial 
                            ? 'text-orange-400'
                            : 'text-red-400'
                      }`}>
                        Marks Awarded: {item.earnedMarks || item.awardedMarks || 0}/{item.marks}
                        {item.isPartial && " (Partial Credit)"}
                      </p>
                    </div>
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

                {!item.isAttempted && (
                    <p className="text-yellow-400 text-sm mt-3">
                      ⚠️ This question was skipped
                    </p>
                  )}
                {item.isPartial && (
                    <p className="text-orange-400 text-sm mt-3">
                      📝 Partial marks awarded - answer was incomplete
                    </p>
                  )}
              </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default QuizResult;
