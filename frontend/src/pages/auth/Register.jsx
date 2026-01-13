import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiUser, FiMail, FiLock, FiUserPlus, FiKey } from "react-icons/fi";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    secretKey: "",
    role: "teacher", // Changed to teacher as students are added by teachers
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!formData.secretKey.trim()) {
      toast.error("Secret key is required");
      return;
    }

    setLoading(true);

    const result = await register(
      formData.name,
      formData.email,
      formData.password,
      formData.role,
      formData.secretKey
    );

    if (result.success) {
      toast.success("Registration successful!");
      const redirectPath =
        result.user.role === "teacher" ? "/teacher" : "/student";
      navigate(redirectPath);
    } else {
      toast.error(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8 safe-area-top safe-area-bottom">
      <motion.div
        className="glass-card w-full max-w-md"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <motion.div
            className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-gray-200 to-white rounded-xl sm:rounded-2xl 
                       flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg"
            initial={{ rotate: 10 }}
            animate={{ rotate: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-gray-900 font-bold text-3xl sm:text-4xl">
              Q
            </span>
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
            Teacher Registration
          </h1>
          <p className="text-sm sm:text-base text-gray-400">
            Create your teacher account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="form-group">
            <label className="input-label text-sm sm:text-base">
              Full Name
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="glass-input pl-10 sm:pl-12 text-sm sm:text-base"
                placeholder="Enter your name"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label text-sm sm:text-base">
              Email Address
            </label>
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
                placeholder="Create a password"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label text-sm sm:text-base">
              Confirm Password
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="glass-input pl-10 sm:pl-12 text-sm sm:text-base"
                placeholder="Confirm your password"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label text-sm sm:text-base">
              Secret Key
            </label>
            <div className="relative">
              <FiKey className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="password"
                name="secretKey"
                value={formData.secretKey}
                onChange={handleChange}
                className="glass-input pl-10 sm:pl-12 text-sm sm:text-base"
                placeholder="Enter teacher registration secret key"
                required
              />
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">
              🔒 Contact administrator for the secret key
            </p>
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
                Creating account...
              </>
            ) : (
              <>
                <FiUserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                Create Teacher Account
              </>
            )}
          </motion.button>
        </form>

        {/* Login Link */}
        <div className="mt-4 sm:mt-6 text-center">
          <p className="text-gray-400 text-sm sm:text-base">
            Already have an account?{" "}
            <Link
              to="/teacher-login"
              className="text-gray-300 hover:text-gray-300 font-medium transition-colors"
            >
              Sign in as Teacher
            </Link>
          </p>
          <p className="text-gray-500 text-xs sm:text-sm mt-2 sm:mt-3">
            Students: Your teacher will create your account
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
