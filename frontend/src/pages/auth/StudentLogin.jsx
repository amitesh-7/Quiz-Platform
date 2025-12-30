import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiUser, FiLogIn, FiArrowLeft, FiUsers } from "react-icons/fi";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const StudentLogin = () => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser, setToken } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (name.trim().length < 2) {
      toast.error("Please enter your name");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/student-login", {
        name: name.trim(),
      });

      if (response.data.success) {
        const { token: newToken, user: userData } = response.data.data;

        localStorage.setItem("token", newToken);
        localStorage.setItem("user", JSON.stringify(userData));
        api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

        setToken(newToken);
        setUser(userData);

        toast.success("Login successful!");
        navigate("/student");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Login failed. Please check your name."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        className="glass-card w-full max-w-md"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl 
                       flex items-center justify-center mx-auto mb-4 shadow-lg"
            initial={{ rotate: 10 }}
            animate={{ rotate: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-white font-bold text-4xl">🎓</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Student Login</h1>
          <p className="text-gray-400">Enter your name to access quizzes</p>
        </div>

        {/* Teacher Login Button */}
        <div className="mb-6">
          <Link to="/teacher-login">
            <motion.button
              type="button"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiUsers className="w-5 h-5" />
              Login as Teacher
            </motion.button>
          </Link>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="form-group">
            <label className="input-label">Your Name</label>
            <div className="relative">
              <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="glass-input pl-12"
                placeholder="Enter your name"
                required
                minLength={2}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              ℹ️ Your name should be registered by your teacher
            </p>
          </div>

          <motion.button
            type="submit"
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl w-full flex items-center justify-center gap-2"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Signing in...
              </>
            ) : (
              <>
                <FiLogIn className="w-5 h-5" />
                Sign In
              </>
            )}
          </motion.button>
        </form>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Not registered yet? Contact your teacher to add you to the platform.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentLogin;
