import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiXCircle,
  FiAward,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import Loading from "../../components/Loading";
import { submissionAPI } from "../../services/api";

const SubmissionDetails = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissionDetails();
  }, [submissionId]);

  const fetchSubmissionDetails = async () => {
    try {
      const response = await submissionAPI.getDetails(submissionId);
      setSubmission(response.data.data.submission);
    } catch (error) {
      toast.error("Failed to fetch submission details");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return "text-green-400";
    if (percentage >= 60) return "text-yellow-400";
    if (percentage >= 40) return "text-orange-400";
    return "text-red-400";
  };

  if (loading) {
    return <Loading message="Loading submission details..." />;
  }

  if (!submission) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-gray-400">Submission not found</p>
        </div>
      </div>
    );
  }

  const correctCount = submission.answers?.filter((a) => a.isCorrect).length || 0;
  const totalQuestions = submission.answers?.length || 0;

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 pb-8">
        {/* Back Button */}
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <FiArrowLeft className="w-5 h-5" />
          Back to Submissions
        </motion.button>

        {/* Header */}
        <motion.div
          className="glass-card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {submission.student?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {submission.student?.name}
                </h1>
                <p className="text-gray-400">{submission.quiz?.title}</p>
                <p className="text-sm text-gray-500">
                  Submitted: {new Date(submission.submittedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="glass-card text-center">
            <FiAward className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Score</p>
            <p className="text-2xl font-bold text-white">
              {submission.score} / {submission.totalMarks}
            </p>
          </div>

          <div className="glass-card text-center">
            <div className={`text-3xl font-bold ${getScoreColor(submission.percentage)}`}>
              {submission.percentage}%
            </div>
            <p className="text-gray-400 text-sm mt-1">Percentage</p>
          </div>

          <div className="glass-card text-center">
            <FiCheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Correct</p>
            <p className="text-2xl font-bold text-white">{correctCount}</p>
          </div>

          <div className="glass-card text-center">
            <FiXCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Wrong</p>
            <p className="text-2xl font-bold text-white">{totalQuestions - correctCount}</p>
          </div>
        </motion.div>

        {/* Questions & Answers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold text-white mb-4">Question-wise Results</h2>

          {!submission.answers || submission.answers.length === 0 ? (
            <div className="glass-card text-center py-8">
              <p className="text-gray-400">No answer details available for this submission.</p>
              <p className="text-gray-500 text-sm mt-2">
                This may be an older submission before detailed tracking was enabled.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {submission.answers.map((answer, index) => (
                <motion.div
                  key={index}
                  className={`glass-card border-l-4 ${
                    answer.isCorrect
                      ? "border-l-green-500"
                      : answer.earnedMarks > 0
                      ? "border-l-yellow-500"
                      : "border-l-red-500"
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {/* Question Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 font-bold">
                        {index + 1}
                      </span>
                      <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">
                        {answer.questionType === "mcq" && "📝 MCQ"}
                        {answer.questionType === "written" && "✍️ Written"}
                        {answer.questionType === "fillblank" && "📄 Fill Blank"}
                        {answer.questionType === "matching" && "🔗 Matching"}
                        {answer.questionType === "truefalse" && "✓✗ True/False"}
                        {!answer.questionType && "📝 MCQ"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {answer.isCorrect ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <FiCheckCircle className="w-5 h-5" />
                          Correct
                        </span>
                      ) : answer.earnedMarks > 0 ? (
                        <span className="flex items-center gap-1 text-yellow-400">
                          <FiCheckCircle className="w-5 h-5" />
                          Partial
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400">
                          <FiXCircle className="w-5 h-5" />
                          Wrong
                        </span>
                      )}
                      <span className={`font-bold px-3 py-1 rounded-lg ${
                        answer.isCorrect 
                          ? "bg-green-500/20 text-green-400" 
                          : answer.earnedMarks > 0 
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        {answer.earnedMarks || 0} / {answer.marks || 1}
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <p className="text-white text-lg mb-4">{answer.questionText}</p>

                  {/* MCQ / True-False Options */}
                  {(answer.questionType === "mcq" || answer.questionType === "truefalse" || !answer.questionType) && answer.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {answer.options.map((option, optIdx) => {
                        const isCorrect = optIdx === answer.correctOption;
                        const isSelected = optIdx === answer.selectedOption;
                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-lg flex items-center gap-2 ${
                              isCorrect
                                ? "bg-green-500/20 border border-green-500/50 text-green-300"
                                : isSelected
                                ? "bg-red-500/20 border border-red-500/50 text-red-300"
                                : "bg-white/5 border border-white/10 text-gray-400"
                            }`}
                          >
                            <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="flex-1">{option}</span>
                            {isCorrect && <FiCheckCircle className="w-5 h-5 text-green-400" />}
                            {isSelected && !isCorrect && <FiXCircle className="w-5 h-5 text-red-400" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Written Answer */}
                  {answer.questionType === "written" && (
                    <div className="space-y-3">
                      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-xs text-gray-400 mb-2 font-medium">Student's Answer:</p>
                        <p className="text-white">{answer.selectedOption || "No answer provided"}</p>
                      </div>
                      <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                        <p className="text-xs text-green-400 mb-2 font-medium">Expected Answer:</p>
                        <p className="text-green-300">{answer.correctAnswer}</p>
                      </div>
                      {answer.feedback && (
                        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                          <p className="text-xs text-blue-400 mb-2 font-medium">AI Feedback:</p>
                          <p className="text-blue-300">{answer.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fill in Blanks */}
                  {answer.questionType === "fillblank" && answer.blanks && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400 mb-2">Blanks:</p>
                      {answer.blanks.map((blank, idx) => {
                        const studentAnswer = Array.isArray(answer.selectedOption) 
                          ? answer.selectedOption[idx] 
                          : "";
                        const isCorrect = studentAnswer?.toLowerCase().trim() === blank.toLowerCase().trim();
                        return (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                            <span className="text-gray-400">Blank {idx + 1}:</span>
                            <span className={`${isCorrect ? "text-green-400" : "text-red-400"}`}>
                              {studentAnswer || "—"}
                            </span>
                            {!isCorrect && (
                              <>
                                <span className="text-gray-500">→</span>
                                <span className="text-green-400">{blank}</span>
                              </>
                            )}
                            {isCorrect ? (
                              <FiCheckCircle className="w-4 h-4 text-green-400 ml-auto" />
                            ) : (
                              <FiXCircle className="w-4 h-4 text-red-400 ml-auto" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Matching */}
                  {answer.questionType === "matching" && answer.matchPairs && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400 mb-2">Correct Pairs:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {answer.matchPairs.map((pair, idx) => (
                          <div key={idx} className="p-3 bg-white/5 rounded-lg flex items-center gap-2">
                            <span className="text-blue-400 font-medium">{pair.left}</span>
                            <span className="text-gray-500">→</span>
                            <span className="text-green-400">{pair.right}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SubmissionDetails;
