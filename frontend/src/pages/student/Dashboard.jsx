import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiPlay,
  FiClock,
  FiCheckCircle,
  FiAward,
  FiBook,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import Loading from "../../components/Loading";
import { quizAPI } from "../../services/api";

const StudentDashboard = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const response = await quizAPI.getAll();
      setQuizzes(response.data.data.quizzes);
    } catch (error) {
      toast.error("Failed to fetch quizzes");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Loading quizzes..." />;
  }

  const availableQuizzes = quizzes.filter((q) => !q.hasSubmitted);
  const completedQuizzes = quizzes.filter((q) => q.hasSubmitted);

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 pb-8">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            Available Quizzes
          </h1>
          <p className="text-gray-400">Select a quiz to start attempting</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="glass-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <FiBook className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Quizzes</p>
                <p className="text-2xl font-bold text-white">
                  {quizzes.length}
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
                <p className="text-gray-400 text-sm">Completed</p>
                <p className="text-2xl font-bold text-white">
                  {completedQuizzes.length}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <FiAward className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-2xl font-bold text-white">
                  {availableQuizzes.length}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* My Results Link */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Link to="/student/results">
            <motion.button
              className="btn-secondary flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiAward className="w-5 h-5" />
              View My Results
            </motion.button>
          </Link>
        </motion.div>

        {/* Available Quizzes */}
        {quizzes.length === 0 ? (
          <motion.div
            className="glass-card text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No quizzes available
            </h2>
            <p className="text-gray-400">Check back later for new quizzes</p>
          </motion.div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz, index) => (
              <motion.div
                key={quiz._id}
                className="glass-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="text-xl font-semibold text-white line-clamp-2">
                        {quiz.title}
                      </h3>
                      {quiz.hasSubmitted && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium whitespace-nowrap">
                          Completed
                        </span>
                      )}
                    </div>

                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {quiz.description || "No description available"}
                    </p>

                    <div className="flex flex-wrap gap-3 mb-4">
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <FiClock className="w-4 h-4" />
                        <span>{quiz.duration} mins</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <FiCheckCircle className="w-4 h-4" />
                        <span>{quiz.totalMarks} marks</span>
                      </div>
                    </div>

                    {quiz.createdBy && (
                      <p className="text-xs text-gray-500">
                        By: {quiz.createdBy.name}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex gap-2">
                      <Link to={`/student/quiz/${quiz._id}`} className="flex-1">
                        <motion.button
                          className={`w-full flex items-center justify-center gap-2 ${
                            quiz.hasSubmitted ? "btn-secondary" : "btn-primary"
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <FiPlay className="w-5 h-5" />
                          {quiz.hasSubmitted ? "Retake Quiz" : "Start Quiz"}
                        </motion.button>
                      </Link>
                      {quiz.hasSubmitted && (
                        <Link to={`/student/result/${quiz._id}`}>
                          <motion.button
                            className="btn-secondary px-4 flex items-center justify-center gap-2"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <FiAward className="w-5 h-5" />
                            Result
                          </motion.button>
                        </Link>
                      )}
                    </div>
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

export default StudentDashboard;
