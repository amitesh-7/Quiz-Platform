import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowLeft, FiAward, FiClock, FiEye } from "react-icons/fi";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import Loading from "../../components/Loading";
import { submissionAPI } from "../../services/api";

const MyResults = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await submissionAPI.getMy();
      setSubmissions(response.data.data.submissions);
    } catch (error) {
      toast.error("Failed to fetch results");
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

  const getGrade = (percentage) => {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
    return "F";
  };

  if (loading) {
    return <Loading message="Loading results..." />;
  }

  const averageScore =
    submissions.length > 0
      ? Math.round(
          submissions.reduce((acc, s) => acc + s.percentage, 0) /
            submissions.length
        )
      : 0;

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

        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">My Results</h1>
          <p className="text-gray-400">
            View all your quiz attempts and scores
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="glass-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <FiAward className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Quizzes Taken</p>
                <p className="text-2xl font-bold text-white">
                  {submissions.length}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Average Score</p>
                <p
                  className={`text-2xl font-bold ${getScoreColor(
                    averageScore
                  )}`}
                >
                  {averageScore}%
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <span className="text-xl">🏆</span>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Best Score</p>
                <p className="text-2xl font-bold text-white">
                  {submissions.length > 0
                    ? Math.max(...submissions.map((s) => s.percentage))
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Results List */}
        {submissions.length === 0 ? (
          <motion.div
            className="glass-card text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No results yet
            </h2>
            <p className="text-gray-400 mb-6">
              Take a quiz to see your results here
            </p>
            <Link to="/student">
              <motion.button
                className="btn-primary inline-flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                Browse Quizzes
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission, index) => (
              <motion.div
                key={submission.id}
                className="glass-card"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {submission.quiz?.title || "Quiz"}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <FiClock className="w-4 h-4" />
                        <span>
                          {new Date(submission.submittedAt).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        Score: {submission.score}/{submission.totalMarks}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p
                        className={`text-3xl font-bold ${getScoreColor(
                          submission.percentage
                        )}`}
                      >
                        {submission.percentage}%
                      </p>
                      <p className="text-sm text-gray-400">
                        Grade: {getGrade(submission.percentage)}
                      </p>
                    </div>

                    <Link to={`/student/result/${submission.quiz?._id}`}>
                      <motion.button
                        className="btn-secondary flex items-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FiEye className="w-5 h-5" />
                        View Details
                      </motion.button>
                    </Link>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full ${
                        submission.percentage >= 80
                          ? "bg-green-500"
                          : submission.percentage >= 60
                          ? "bg-yellow-500"
                          : submission.percentage >= 40
                          ? "bg-orange-500"
                          : "bg-red-500"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${submission.percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyResults;
