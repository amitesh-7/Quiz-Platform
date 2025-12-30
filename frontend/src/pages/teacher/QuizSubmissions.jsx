import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiUser,
  FiAward,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import Loading from "../../components/Loading";
import { submissionAPI } from "../../services/api";

const QuizSubmissions = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, [quizId]);

  const fetchSubmissions = async () => {
    try {
      const response = await submissionAPI.getByQuiz(quizId);
      setData(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch submissions");
      navigate("/teacher");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Loading submissions..." />;
  }

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return "text-green-400";
    if (percentage >= 60) return "text-yellow-400";
    if (percentage >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const averageScore =
    data.submissions.length > 0
      ? Math.round(
          data.submissions.reduce((acc, s) => acc + s.percentage, 0) /
            data.submissions.length
        )
      : 0;

  const highestScore =
    data.submissions.length > 0
      ? Math.max(...data.submissions.map((s) => s.percentage))
      : 0;

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
          <h1 className="text-2xl font-bold text-white mb-2">
            {data.quiz.title}
          </h1>
          <p className="text-gray-400">Total Marks: {data.quiz.totalMarks}</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="glass-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <FiUser className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Submissions</p>
                <p className="text-2xl font-bold text-white">
                  {data.submissions.length}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <FiCheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Average Score</p>
                <p className="text-2xl font-bold text-white">{averageScore}%</p>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <FiAward className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Highest Score</p>
                <p className="text-2xl font-bold text-white">{highestScore}%</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Submissions List */}
        {data.submissions.length === 0 ? (
          <motion.div
            className="glass-card text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No submissions yet
            </h2>
            <p className="text-gray-400">
              Students haven't attempted this quiz yet
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="glass-card overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-4 text-gray-400 font-medium">
                      #
                    </th>
                    <th className="text-left py-4 px-4 text-gray-400 font-medium">
                      Student
                    </th>
                    <th className="text-left py-4 px-4 text-gray-400 font-medium">
                      Email
                    </th>
                    <th className="text-center py-4 px-4 text-gray-400 font-medium">
                      Score
                    </th>
                    <th className="text-center py-4 px-4 text-gray-400 font-medium">
                      Percentage
                    </th>
                    <th className="text-right py-4 px-4 text-gray-400 font-medium">
                      Submitted
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.submissions.map((submission, index) => (
                    <motion.tr
                      key={submission.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <td className="py-4 px-4 text-gray-400">{index + 1}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {submission.student?.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white">
                            {submission.student?.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-400">
                        {submission.student?.email}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-white font-medium">
                          {submission.score} / {submission.totalMarks}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`font-bold ${getScoreColor(
                            submission.percentage
                          )}`}
                        >
                          {submission.percentage}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-gray-400">
                        <div className="flex items-center justify-end gap-1">
                          <FiClock className="w-4 h-4" />
                          {new Date(submission.submittedAt).toLocaleString()}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default QuizSubmissions;
