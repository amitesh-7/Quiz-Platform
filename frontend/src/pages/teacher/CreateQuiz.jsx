import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowLeft, FiSave, FiClock, FiFileText } from "react-icons/fi";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import { quizAPI } from "../../services/api";

const CreateQuiz = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: 30,
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "duration" ? parseInt(value) || 0 : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.title.length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }

    if (formData.duration < 1 || formData.duration > 180) {
      toast.error("Duration must be between 1 and 180 minutes");
      return;
    }

    setLoading(true);

    try {
      const response = await quizAPI.create(formData);
      toast.success("Quiz created successfully!");
      navigate(`/teacher/quiz/${response.data.data.quiz._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create quiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 pb-8">
        {/* Back Button */}
        <motion.button
          onClick={() => navigate("/teacher")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <FiArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </motion.button>

        <motion.div
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="glass-card">
            <h1 className="text-2xl font-bold text-white mb-6">
              Create New Quiz
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="form-group">
                <label className="input-label flex items-center gap-2">
                  <FiFileText className="w-4 h-4" />
                  Quiz Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="glass-input"
                  placeholder="Enter quiz title"
                  required
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="input-label">Description (Optional)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="glass-input min-h-[120px] resize-y"
                  placeholder="Enter quiz description..."
                  maxLength={500}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.description.length}/500 characters
                </p>
              </div>

              {/* Duration */}
              <div className="form-group">
                <label className="input-label flex items-center gap-2">
                  <FiClock className="w-4 h-4" />
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="glass-input"
                  min={1}
                  max={180}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Between 1 and 180 minutes
                </p>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <motion.button
                  type="button"
                  onClick={() => navigate("/teacher")}
                  className="btn-secondary flex-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>

                <motion.button
                  type="submit"
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <FiSave className="w-5 h-5" />
                      Create Quiz
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateQuiz;
