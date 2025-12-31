import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiMail, FiLock, FiLogIn, FiArrowLeft } from "react-icons/fi";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const TeacherLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.email, formData.password);

    if (result.success) {
      if (result.user.role !== "teacher") {
        toast.error("Please use student login");
        setLoading(false);
        return;
      }
      toast.success("Login successful!");
      navigate("/teacher");
    } else {
      toast.error(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 py-6 sm:py-0 safe-area-top safe-area-bottom">
      <motion.div
        className="glass-card w-full max-w-md"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <motion.div
            className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl 
                       flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg"
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-white font-bold text-3xl sm:text-4xl">👨‍🏫</span>
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Teacher Login</h1>
          <p className="text-sm sm:text-base text-gray-400">Sign in to manage your quizzes</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="form-group">
            <label className="input-label text-sm sm:text-base">Email Address</label>
            <div className="relative">
              <FiMail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="glass-input pl-10 sm:pl-12 text-sm sm:text-base"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label text-sm sm:text-base">Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="glass-input pl-10 sm:pl-12 text-sm sm:text-base"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <motion.button
            type="submit"
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm sm:text-base py-2.5 sm:py-3"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Signing in...
              </>
            ) : (
              <>
                <FiLogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                Sign In
              </>
            )}
          </motion.button>
        </form>

        {/* Register Link */}
        <div className="mt-4 sm:mt-6 text-center">
          <p className="text-gray-400 text-sm sm:text-base">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Register as Teacher
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default TeacherLogin;
