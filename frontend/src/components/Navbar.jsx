import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiLogOut,
  FiHome,
  FiUser,
  FiSun,
  FiMoon,
  FiMenu,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const dashboardPath = user?.role === "teacher" ? "/teacher" : "/student";

  return (
    <motion.nav
      className="glass sticky top-0 z-50 mb-6"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link to={dashboardPath} className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg sm:text-xl">Q</span>
            </div>
            <span className="text-lg sm:text-xl font-bold text-white">
              Quiz Platform
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            <Link
              to={dashboardPath}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <FiHome className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>

            <div className="flex items-center gap-2 px-3 py-2 glass rounded-lg">
              <FiUser className="w-5 h-5 text-blue-400" />
              <span className="text-gray-300">{user?.name}</span>
              <span className="text-xs px-2 py-1 bg-blue-500/30 rounded-full text-blue-300 capitalize">
                {user?.role}
              </span>
            </div>

            <motion.button
              onClick={toggleTheme}
              className="p-2 glass rounded-lg hover:bg-white/30 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isDark ? (
                <FiSun className="w-5 h-5 text-yellow-400" />
              ) : (
                <FiMoon className="w-5 h-5 text-indigo-600" />
              )}
            </motion.button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 
                         text-red-300 rounded-lg transition-colors"
            >
              <FiLogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 glass rounded-lg"
            whileTap={{ scale: 0.95 }}
          >
            {mobileMenuOpen ? (
              <FiX className="w-6 h-6 text-white" />
            ) : (
              <FiMenu className="w-6 h-6 text-white" />
            )}
          </motion.button>
        </div>

        {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden mt-4 space-y-3"
            >
              <Link
                to={dashboardPath}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 glass rounded-lg text-gray-300 hover:text-white transition-colors"
              >
                <FiHome className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>

              <div className="flex items-center gap-3 p-3 glass rounded-lg">
                <FiUser className="w-5 h-5 text-blue-400" />
                <div className="flex-1">
                  <p className="text-white font-medium">{user?.name}</p>
                  <p className="text-xs text-gray-400 capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>

              <motion.button
                onClick={() => {
                  toggleTheme();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 glass rounded-lg text-gray-300 hover:text-white transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                {isDark ? (
                  <>
                    <FiSun className="w-5 h-5 text-yellow-400" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <FiMoon className="w-5 h-5 text-purple-400" />
                    <span>Dark Mode</span>
                  </>
                )}
              </motion.button>

              <motion.button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 bg-red-500/20 hover:bg-red-500/30 
                           text-red-400 rounded-lg transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                <FiLogOut className="w-5 h-5" />
                <span>Logout</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;
