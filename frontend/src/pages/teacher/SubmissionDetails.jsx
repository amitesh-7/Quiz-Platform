import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiXCircle,
  FiAward,
  FiAlertCircle,
  FiEdit3,
  FiSave,
  FiX,
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
  const [editMode, setEditMode] = useState(false);
  const [editedMarks, setEditedMarks] = useState({});
  const [editedCorrectAnswers, setEditedCorrectAnswers] = useState({});
  const [saving, setSaving] = useState(false);

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

  const handleEditMarks = (questionId, currentMarks, maxMarks) => {
    // Validate marks don't exceed maximum
    const marks = parseFloat(currentMarks);
    const cappedMarks = marks > maxMarks ? maxMarks : marks;

    setEditedMarks((prev) => ({
      ...prev,
      [questionId]: cappedMarks,
    }));
  };

  const handleEditCorrectAnswer = (questionId, value, type = "option") => {
    setEditedCorrectAnswers((prev) => ({
      ...prev,
      [questionId]: { value, type },
    }));
  };

  const handleSaveMarks = async () => {
    try {
      setSaving(true);
      const updatedAnswers = Object.keys({
        ...editedMarks,
        ...editedCorrectAnswers,
      }).map((questionId) => {
        const update = { questionId };

        if (editedMarks[questionId] !== undefined) {
          update.earnedMarks = parseFloat(editedMarks[questionId]);
        }

        if (editedCorrectAnswers[questionId]) {
          const { value, type } = editedCorrectAnswers[questionId];
          if (type === "option") {
            update.correctOption = parseInt(value);
          } else if (type === "answer") {
            update.correctAnswer = value;
          }
        }

        return update;
      });

      await submissionAPI.updateMarks(submissionId, { updatedAnswers });

      toast.success("Marks and answers updated successfully");
      setEditMode(false);
      setEditedMarks({});
      setEditedCorrectAnswers({});
      fetchSubmissionDetails();
    } catch (error) {
      toast.error("Failed to update marks and answers");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedMarks({});
    setEditedCorrectAnswers({});
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

  const correctCount =
    submission.answers?.filter((a) => a.isCorrect).length || 0;
  const totalQuestions = submission.answers?.length || 0;
  const attemptedCount =
    submission.answers?.filter((a) => a.isAttempted).length || 0;
  const unattemptedCount = totalQuestions - attemptedCount;

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
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-white">
                    {submission.student?.name}
                  </h1>
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium">
                    Attempt #{submission.attemptNumber || 1}
                  </span>
                </div>
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
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6"
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
            <div
              className={`text-3xl font-bold ${getScoreColor(
                submission.percentage
              )}`}
            >
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
            <p className="text-2xl font-bold text-white">
              {attemptedCount - correctCount}
            </p>
          </div>

          <div className="glass-card text-center">
            <FiAlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Unattempted</p>
            <p className="text-2xl font-bold text-white">{unattemptedCount}</p>
          </div>
        </motion.div>

        {/* Questions & Answers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              Question-wise Results
            </h2>

            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <FiEdit3 className="w-4 h-4" />
                Edit Marks
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveMarks}
                  disabled={saving || Object.keys(editedMarks).length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiSave className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <FiX className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          {!submission.answers || submission.answers.length === 0 ? (
            <div className="glass-card text-center py-8">
              <p className="text-gray-400">
                No answer details available for this submission.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                This may be an older submission before detailed tracking was
                enabled.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {submission.answers.map((answer, index) => {
                // Use questionId if available, otherwise use index-based fallback
                const uniqueId = answer.questionId || `fallback-${index}`;
                return (
                  <motion.div
                    key={uniqueId}
                    className={`glass-card border-l-4 ${
                      !answer.isAttempted
                        ? "border-l-gray-500"
                        : answer.isCorrect
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
                          {answer.questionType === "fillblank" &&
                            "📄 Fill Blank"}
                          {answer.questionType === "matching" && "🔗 Matching"}
                          {answer.questionType === "truefalse" &&
                            "✓✗ True/False"}
                          {!answer.questionType && "📝 MCQ"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {!answer.isAttempted ? (
                          <span className="flex items-center gap-1 text-gray-400">
                            <FiAlertCircle className="w-5 h-5" />
                            Not Attempted
                          </span>
                        ) : answer.isCorrect ? (
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
                        {editMode ? (
                          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/20">
                            <input
                              type="number"
                              min="0"
                              max={answer.marks || 1}
                              step="0.5"
                              value={
                                editedMarks[uniqueId] !== undefined
                                  ? editedMarks[uniqueId]
                                  : answer.earnedMarks || 0
                              }
                              onChange={(e) =>
                                handleEditMarks(
                                  uniqueId,
                                  e.target.value,
                                  answer.marks || 1
                                )
                              }
                              className="w-16 px-2 py-1 bg-white/10 text-white rounded text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <span className="text-blue-400 font-bold">
                              / {answer.marks || 1}
                            </span>
                          </div>
                        ) : (
                          <span
                            className={`font-bold px-3 py-1 rounded-lg ${
                              !answer.isAttempted
                                ? "bg-gray-500/20 text-gray-400"
                                : answer.isCorrect
                                ? "bg-green-500/20 text-green-400"
                                : answer.earnedMarks > 0
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {answer.earnedMarks || 0} / {answer.marks || 1}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-xs text-gray-400 mb-2 font-medium">
                        Question:
                      </p>
                      <div className="text-white text-base whitespace-pre-wrap break-words max-h-[500px] overflow-y-auto leading-relaxed">
                        {answer.questionText}
                      </div>
                    </div>

                    {/* MCQ / True-False Options */}
                    {(answer.questionType === "mcq" ||
                      answer.questionType === "truefalse" ||
                      !answer.questionType) &&
                      answer.options && (
                        <>
                          {!answer.isAttempted && (
                            <div className="mb-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                              <p className="text-orange-400 text-sm font-medium flex items-center gap-2">
                                <FiAlertCircle className="w-4 h-4" />
                                No answer submitted by student
                              </p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 gap-2 mb-3">
                            {answer.options.map((option, optIdx) => {
                              const currentCorrect =
                                editedCorrectAnswers[uniqueId]?.value !==
                                undefined
                                  ? parseInt(
                                      editedCorrectAnswers[uniqueId].value
                                    )
                                  : answer.correctOption;
                              const isCorrect = optIdx === currentCorrect;
                              const isSelected =
                                optIdx === answer.selectedOption;
                              return (
                                <div
                                  key={optIdx}
                                  className={`p-3 rounded-lg flex items-start gap-2 ${
                                    isCorrect
                                      ? "bg-green-500/20 border border-green-500/50 text-green-300"
                                      : isSelected
                                      ? "bg-red-500/20 border border-red-500/50 text-red-300"
                                      : "bg-white/5 border border-white/10 text-gray-400"
                                  }`}
                                  onClick={() =>
                                    editMode &&
                                    handleEditCorrectAnswer(
                                      uniqueId,
                                      optIdx,
                                      "option"
                                    )
                                  }
                                  style={{
                                    cursor: editMode ? "pointer" : "default",
                                  }}
                                >
                                  <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span className="flex-1 whitespace-pre-wrap break-words">
                                    {option}
                                  </span>
                                  {isCorrect && (
                                    <span className="flex items-center gap-1">
                                      <FiCheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                                      <span className="text-xs text-green-400">
                                        Correct Answer
                                      </span>
                                    </span>
                                  )}
                                  {isSelected && !isCorrect && (
                                    <span className="flex items-center gap-1">
                                      <FiXCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                      <span className="text-xs text-red-400">
                                        Student Selected
                                      </span>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}

                    {/* Written Answer */}
                    {answer.questionType === "written" && (
                      <div className="space-y-3">
                        {!answer.isAttempted && (
                          <div className="mb-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                            <p className="text-orange-400 text-sm font-medium flex items-center gap-2">
                              <FiAlertCircle className="w-4 h-4" />
                              No answer submitted by student
                            </p>
                          </div>
                        )}
                        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                          <p className="text-xs text-gray-400 mb-2 font-medium">
                            Student's Answer:
                          </p>
                          <div className="text-white whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto leading-relaxed">
                            {answer.selectedOption || (
                              <span className="text-gray-500 italic">
                                No answer provided
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                          <p className="text-xs text-green-400 mb-2 font-medium">
                            Expected Answer:
                          </p>
                          {editMode ? (
                            <textarea
                              value={
                                editedCorrectAnswers[uniqueId]?.value !==
                                undefined
                                  ? editedCorrectAnswers[uniqueId].value
                                  : answer.correctAnswer
                              }
                              onChange={(e) =>
                                handleEditCorrectAnswer(
                                  uniqueId,
                                  e.target.value,
                                  "answer"
                                )
                              }
                              className="w-full px-3 py-2 bg-white/10 text-green-300 rounded border border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-400 min-h-[100px] resize-y"
                              placeholder="Enter correct answer"
                            />
                          ) : (
                            <div className="text-green-300 whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto leading-relaxed">
                              {answer.correctAnswer}
                            </div>
                          )}
                        </div>
                        {answer.feedback && (
                          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                            <p className="text-xs text-blue-400 mb-2 font-medium">
                              AI Feedback:
                            </p>
                            <div className="text-blue-300 whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto leading-relaxed">
                              {answer.feedback}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fill in Blanks */}
                    {answer.questionType === "fillblank" && answer.blanks && (
                      <div className="space-y-2">
                        {!answer.isAttempted && (
                          <div className="mb-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                            <p className="text-orange-400 text-sm font-medium flex items-center gap-2">
                              <FiAlertCircle className="w-4 h-4" />
                              No answer submitted by student
                            </p>
                          </div>
                        )}
                        <p className="text-sm text-gray-400 mb-2">Blanks:</p>
                        {answer.blanks.map((blank, idx) => {
                          const studentAnswer = Array.isArray(
                            answer.selectedOption
                          )
                            ? answer.selectedOption[idx]
                            : "";
                          const isCorrect =
                            studentAnswer?.toLowerCase().trim() ===
                            blank.toLowerCase().trim();
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                            >
                              <span className="text-gray-400">
                                Blank {idx + 1}:
                              </span>
                              <span
                                className={`${
                                  studentAnswer
                                    ? isCorrect
                                      ? "text-green-400"
                                      : "text-red-400"
                                    : "text-gray-500 italic"
                                }`}
                              >
                                {studentAnswer || "Not filled"}
                              </span>
                              {!isCorrect && (
                                <>
                                  <span className="text-gray-500">→</span>
                                  <span className="text-green-400">
                                    {blank}
                                  </span>
                                </>
                              )}
                              {studentAnswer &&
                                (isCorrect ? (
                                  <FiCheckCircle className="w-4 h-4 text-green-400 ml-auto" />
                                ) : (
                                  <FiXCircle className="w-4 h-4 text-red-400 ml-auto" />
                                ))}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Matching */}
                    {answer.questionType === "matching" &&
                      answer.matchPairs && (
                        <div className="space-y-2">
                          {!answer.isAttempted && (
                            <div className="mb-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                              <p className="text-orange-400 text-sm font-medium flex items-center gap-2">
                                <FiAlertCircle className="w-4 h-4" />
                                No answer submitted by student
                              </p>
                            </div>
                          )}
                          <p className="text-sm text-gray-400 mb-2">
                            Correct Pairs:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {answer.matchPairs.map((pair, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-white/5 rounded-lg flex items-center gap-2"
                              >
                                <span className="text-blue-400 font-medium">
                                  {pair.left}
                                </span>
                                <span className="text-gray-500">→</span>
                                <span className="text-green-400">
                                  {pair.right}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SubmissionDetails;
