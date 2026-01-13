import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, GraduationCap, Users, UserPlus, Sun, Moon } from "lucide-react";
import { NavBar } from "../components/ui/tubelight-navbar";
import { FiZap, FiAward, FiUsers, FiBook } from "react-icons/fi";

const Landing = () => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDark(savedTheme === "dark");
      document.documentElement.classList.toggle(
        "light",
        savedTheme === "light"
      );
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setIsDark(!isDark);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("light", newTheme === "light");
  };

  const navItems = [
    { name: "Home", url: "/", icon: Home },
    { name: "Student", url: "/login", icon: GraduationCap },
    { name: "Teacher", url: "/teacher-login", icon: Users },
    { name: "Register", url: "/register", icon: UserPlus },
  ];

  return (
    <div className="min-h-screen flex flex-col safe-area-top safe-area-bottom">
      {/* Tubelight Navbar */}
      <NavBar items={navItems} />

      {/* Theme Toggle Button - Fixed position */}
      <motion.button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 glass rounded-full hover:bg-white/20 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Toggle theme"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-yellow-400" />
        ) : (
          <Moon className="w-5 h-5 text-indigo-600" />
        )}
      </motion.button>

      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-3 sm:px-4 pt-20 pb-4">
        <div className="max-w-6xl w-full">
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 px-2">
              Quiz Platform
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-2 sm:mb-3 px-3 sm:px-4">
              Create, Manage, and Take Quizzes with AI-Powered Question
              Generation
            </p>
            <p className="text-sm sm:text-base text-gray-500 max-w-2xl mx-auto px-3 sm:px-4">
              Real-time scoring, timer-based tests, and intelligent question
              generation using Google's Gemini AI.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 px-3 sm:px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link to="/login" className="w-full sm:w-auto">
              <motion.button
                className="btn-primary px-6 sm:px-8 py-3 text-base flex items-center gap-2 w-full justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiBook className="w-5 h-5" />
                Student Login
              </motion.button>
            </Link>

            <Link to="/teacher-login" className="w-full sm:w-auto">
              <motion.button
                className="btn-secondary px-6 sm:px-8 py-3 text-base flex items-center gap-2 w-full justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiUsers className="w-5 h-5" />
                Teacher Portal
              </motion.button>
            </Link>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 px-2 sm:px-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="glass-card text-center py-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <FiZap className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                AI-Powered
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                Generate questions with Gemini AI
              </p>
            </div>

            <div className="glass-card text-center py-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                Easy Management
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                Create quizzes & track performance
              </p>
            </div>

            <div className="glass-card text-center py-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <FiAward className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                Real-Time Results
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                Instant scoring & analytics
              </p>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            className="text-center mt-6 text-gray-600 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <p className="text-sm">
              New teacher?{" "}
              <Link
                to="/register"
                className="text-gray-400 hover:text-white transition-colors"
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
