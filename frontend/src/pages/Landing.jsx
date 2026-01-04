import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiLogIn,
  FiUserPlus,
  FiBook,
  FiUsers,
  FiZap,
  FiAward,
} from "react-icons/fi";

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col safe-area-top safe-area-bottom">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12">
        <div className="max-w-6xl w-full">
          <motion.div
            className="text-center mb-8 sm:mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl sm:rounded-3xl 
                         flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: "spring" }}
            >
              <span className="text-white font-bold text-4xl sm:text-5xl md:text-6xl">
                Q
              </span>
            </motion.div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 px-2">
              Quiz Platform
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-3 sm:mb-4 px-3 sm:px-4">
              Create, Manage, and Take Quizzes with AI-Powered Question
              Generation
            </p>
            <p className="text-sm sm:text-base md:text-lg text-gray-400 max-w-2xl mx-auto px-3 sm:px-4">
              The ultimate quiz platform for teachers and students featuring
              real-time scoring, timer-based tests, and intelligent question
              generation using Google's Gemini AI.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center mb-10 sm:mb-16 px-3 sm:px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link to="/login" className="w-full sm:w-auto">
              <motion.button
                className="btn-primary px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg flex items-center gap-2 sm:gap-3 w-full justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiBook className="w-5 h-5 sm:w-6 sm:h-6" />
                Student Login
              </motion.button>
            </Link>

            <Link to="/teacher-login" className="w-full sm:w-auto">
              <motion.button
                className="btn-secondary px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg flex items-center gap-2 sm:gap-3 w-full justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiUsers className="w-5 h-5 sm:w-6 sm:h-6" />
                Teacher Portal
              </motion.button>
            </Link>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 px-2 sm:px-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="glass-card text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <FiZap className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                AI-Powered
              </h3>
              <p className="text-sm sm:text-base text-gray-400">
                Generate quiz questions instantly using Google's Gemini AI
                technology
              </p>
            </div>

            <div className="glass-card text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <FiUsers className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                Easy Management
              </h3>
              <p className="text-sm sm:text-base text-gray-400">
                Teachers can create quizzes, manage students, and track
                performance
              </p>
            </div>

            <div className="glass-card text-center sm:col-span-2 md:col-span-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <FiAward className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                Real-Time Results
              </h3>
              <p className="text-sm sm:text-base text-gray-400">
                Instant scoring and detailed performance analytics for students
              </p>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            className="text-center mt-10 sm:mt-16 text-gray-500 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <p className="text-sm sm:text-base">
              New teacher?{" "}
              <Link
                to="/register"
                className="text-blue-400 hover:text-blue-300"
              >
                Register here
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
