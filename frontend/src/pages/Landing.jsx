import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  GraduationCap,
  Users,
  UserPlus,
  Sun,
  Moon,
  CheckCircle,
  Clock,
  Brain,
  FileText,
  BarChart3,
  Shield,
} from "lucide-react";
import { NavBar } from "../components/ui/tubelight-navbar";
import { FiZap, FiAward, FiUsers, FiBook, FiCheck } from "react-icons/fi";

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
    <div className="min-h-screen safe-area-top safe-area-bottom">
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
          <Moon className="w-5 h-5 text-gray-600" />
        )}
      </motion.button>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-4 sm:px-6 pt-20 pb-16">
        <div className="max-w-6xl w-full">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
              Quiz Platform
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto">
              Create, Manage, and Take Quizzes with AI-Powered Question
              Generation
            </p>
            <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto">
              The ultimate platform for teachers and students featuring
              real-time scoring, timer-based tests, and intelligent question
              generation using Google's Gemini AI.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link to="/login" className="w-full sm:w-auto">
              <motion.button
                className="btn-primary px-8 py-4 text-lg flex items-center gap-3 w-full justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiBook className="w-6 h-6" />
                Student Login
              </motion.button>
            </Link>

            <Link to="/teacher-login" className="w-full sm:w-auto">
              <motion.button
                className="btn-secondary px-8 py-4 text-lg flex items-center gap-3 w-full justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiUsers className="w-6 h-6" />
                Teacher Portal
              </motion.button>
            </Link>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="glass-card text-center py-6">
              <p className="text-3xl sm:text-4xl font-bold text-white mb-1">
                5+
              </p>
              <p className="text-sm text-gray-400">Question Types</p>
            </div>
            <div className="glass-card text-center py-6">
              <p className="text-3xl sm:text-4xl font-bold text-white mb-1">
                AI
              </p>
              <p className="text-sm text-gray-400">Powered</p>
            </div>
            <div className="glass-card text-center py-6">
              <p className="text-3xl sm:text-4xl font-bold text-white mb-1">
                ∞
              </p>
              <p className="text-sm text-gray-400">Quiz Attempts</p>
            </div>
            <div className="glass-card text-center py-6">
              <p className="text-3xl sm:text-4xl font-bold text-white mb-1">
                24/7
              </p>
              <p className="text-sm text-gray-400">Available</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Powerful Features
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Everything you need to create, manage, and take quizzes
              effectively
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <motion.div
              className="glass-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                <Brain className="w-7 h-7 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                AI Question Generation
              </h3>
              <p className="text-gray-400">
                Generate diverse quiz questions on any topic instantly using
                Google's Gemini AI. Support for multiple question types
                including MCQ, written, fill-in-the-blank, and more.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              className="glass-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-7 h-7 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Timer-Based Tests
              </h3>
              <p className="text-gray-400">
                Set custom time limits for each quiz. Real-time countdown timer
                with automatic submission when time expires. Perfect for exam
                simulations.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              className="glass-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-7 h-7 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Real-Time Analytics
              </h3>
              <p className="text-gray-400">
                Instant scoring with detailed performance analytics. Track
                student progress, view submission history, and identify areas
                for improvement.
              </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div
              className="glass-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">PDF Export</h3>
              <p className="text-gray-400">
                Download question papers in board exam format with answer keys.
                Support for UP Board patterns for Science, English, Hindi,
                Sanskrit, and more.
              </p>
            </motion.div>

            {/* Feature 5 */}
            <motion.div
              className="glass-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle className="w-7 h-7 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Multiple Attempts
              </h3>
              <p className="text-gray-400">
                Students can retake quizzes unlimited times. Each attempt is
                tracked separately with full history preserved for review and
                comparison.
              </p>
            </motion.div>

            {/* Feature 6 */}
            <motion.div
              className="glass-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
            >
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Secure & Reliable
              </h3>
              <p className="text-gray-400">
                JWT-based authentication with role-based access control. Your
                data is secure with encrypted passwords and protected API
                routes.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Get started in minutes with our simple workflow
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-white/20">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Create Account
              </h3>
              <p className="text-gray-400">
                Teachers register to create quizzes. Students are added by
                teachers and can login with their name.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-white/20">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Create Quizzes
              </h3>
              <p className="text-gray-400">
                Add questions manually or let AI generate them. Set time limits,
                marks, and activate when ready.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-white/20">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Take & Review
              </h3>
              <p className="text-gray-400">
                Students attempt quizzes with real-time timer. Get instant
                results and detailed feedback.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Question Types Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Supported Question Types
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Create diverse quizzes with multiple question formats
            </p>
          </motion.div>

          <motion.div
            className="glass-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-white">A</span>
                </div>
                <p className="text-sm font-medium text-white">MCQ</p>
                <p className="text-xs text-gray-500">Multiple Choice</p>
              </div>
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-white">✎</span>
                </div>
                <p className="text-sm font-medium text-white">Written</p>
                <p className="text-xs text-gray-500">Long Answer</p>
              </div>
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-white">_</span>
                </div>
                <p className="text-sm font-medium text-white">Fill Blanks</p>
                <p className="text-xs text-gray-500">Complete Text</p>
              </div>
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-white">⇄</span>
                </div>
                <p className="text-sm font-medium text-white">Matching</p>
                <p className="text-xs text-gray-500">Pair Items</p>
              </div>
              <div className="text-center py-4 col-span-2 md:col-span-1">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-white">✓✗</span>
                </div>
                <p className="text-sm font-medium text-white">True/False</p>
                <p className="text-xs text-gray-500">Binary Choice</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 mb-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="glass-card text-center py-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Join teachers and students already using our platform for
              effective quiz management and learning.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <motion.button
                  className="btn-primary px-8 py-3 text-base"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Register as Teacher
                </motion.button>
              </Link>
              <Link to="/login">
                <motion.button
                  className="btn-secondary px-8 py-3 text-base"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Student Login
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10 mb-16 sm:mb-0">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-500 text-sm">
            Quiz Platform — Built with React, Node.js, and Google Gemini AI
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
