import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit, FiTrash2, FiUsers, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import Loading from '../../components/Loading';
import { quizAPI } from '../../services/api';

const TeacherDashboard = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const response = await quizAPI.getAll();
      setQuizzes(response.data.data.quizzes);
    } catch (error) {
      toast.error('Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    setDeleteLoading(quizId);
    try {
      await quizAPI.delete(quizId);
      setQuizzes(quizzes.filter(q => q._id !== quizId));
      toast.success('Quiz deleted successfully');
    } catch (error) {
      toast.error('Failed to delete quiz');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleToggleActive = async (quiz) => {
    try {
      await quizAPI.update(quiz._id, { isActive: !quiz.isActive });
      setQuizzes(quizzes.map(q => 
        q._id === quiz._id ? { ...q, isActive: !q.isActive } : q
      ));
      toast.success(`Quiz ${!quiz.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error('Failed to update quiz');
    }
  };

  if (loading) {
    return <Loading message="Loading quizzes..." />;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 pb-8">
        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Quizzes</h1>
            <p className="text-gray-400">Create and manage your quizzes</p>
          </div>
          
          <Link to="/teacher/create-quiz">
            <motion.button
              className="btn-primary flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiPlus className="w-5 h-5" />
              Create Quiz
            </motion.button>
          </Link>
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
                <FiEdit className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Quizzes</p>
                <p className="text-2xl font-bold text-white">{quizzes.length}</p>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <FiCheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Active Quizzes</p>
                <p className="text-2xl font-bold text-white">
                  {quizzes.filter(q => q.isActive).length}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <FiUsers className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Marks</p>
                <p className="text-2xl font-bold text-white">
                  {quizzes.reduce((acc, q) => acc + q.totalMarks, 0)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quiz List */}
        {quizzes.length === 0 ? (
          <motion.div
            className="glass-card text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-semibold text-white mb-2">No quizzes yet</h2>
            <p className="text-gray-400 mb-6">Create your first quiz to get started</p>
            <Link to="/teacher/create-quiz">
              <motion.button
                className="btn-primary inline-flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiPlus className="w-5 h-5" />
                Create Your First Quiz
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {quizzes.map((quiz, index) => (
              <motion.div
                key={quiz._id}
                className="glass-card"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{quiz.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        quiz.isActive 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {quiz.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-gray-400 mb-4 line-clamp-2">
                      {quiz.description || 'No description'}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <FiClock className="w-4 h-4" />
                        <span>{quiz.duration} mins</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FiCheckCircle className="w-4 h-4" />
                        <span>{quiz.totalMarks} marks</span>
                      </div>
                      <div className="text-gray-500">
                        Created: {new Date(quiz.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <motion.button
                      onClick={() => handleToggleActive(quiz)}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                        quiz.isActive
                          ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {quiz.isActive ? (
                        <>
                          <FiXCircle className="w-4 h-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <FiCheckCircle className="w-4 h-4" />
                          Activate
                        </>
                      )}
                    </motion.button>

                    <Link to={`/teacher/quiz/${quiz._id}/submissions`}>
                      <motion.button
                        className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg 
                                   flex items-center gap-2 hover:bg-purple-500/30 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FiUsers className="w-4 h-4" />
                        Submissions
                      </motion.button>
                    </Link>

                    <Link to={`/teacher/quiz/${quiz._id}`}>
                      <motion.button
                        className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg 
                                   flex items-center gap-2 hover:bg-blue-500/30 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FiEdit className="w-4 h-4" />
                        Manage
                      </motion.button>
                    </Link>

                    <motion.button
                      onClick={() => handleDelete(quiz._id)}
                      disabled={deleteLoading === quiz._id}
                      className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg 
                                 flex items-center gap-2 hover:bg-red-500/30 transition-colors
                                 disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {deleteLoading === quiz._id ? (
                        <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                      ) : (
                        <FiTrash2 className="w-4 h-4" />
                      )}
                      Delete
                    </motion.button>
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

export default TeacherDashboard;
