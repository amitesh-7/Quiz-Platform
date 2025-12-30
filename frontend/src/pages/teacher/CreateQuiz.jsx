import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiSave,
  FiClock,
  FiFileText,
  FiCpu,
  FiEdit3,
  FiGlobe,
  FiUser,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import { quizAPI } from "../../services/api";

const CreateQuiz = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get("studentId");
  const studentName = searchParams.get("studentName");

  useEffect(() => {
    if (!studentId || !studentName) {
      toast.error("Student information is missing");
      navigate("/teacher");
    }
  }, [studentId, studentName, navigate]);

  const [creationMode, setCreationMode] = useState("manual"); // 'manual' or 'ai'
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: 30,
    language: "english",
    subject: "",
    chapters: "",
  });
  const [aiData, setAiData] = useState({
    topic: "",
    numberOfQuestions: 10,
    difficulty: "medium",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "duration" ? parseInt(value) || 0 : value,
    });
  };

  const handleAiChange = (e) => {
    const { name, value } = e.target;
    setAiData({
      ...aiData,
      [name]: name === "numberOfQuestions" ? parseInt(value) || 0 : value,
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

    if (creationMode === "ai" && !aiData.topic.trim()) {
      toast.error("Please enter a topic for AI generation");
      return;
    }

    setLoading(true);

    try {
      const response = await quizAPI.create({
        ...formData,
        assignedTo: studentId,
        creationMode,
        ...(creationMode === "ai" && { aiData }),
      });
      toast.success(`Quiz created successfully for ${studentName}!`);
      navigate("/teacher");
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
            <h1 className="text-2xl font-bold text-white mb-2">
              Create New Quiz
            </h1>

            {/* Student Info */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg">
              <p className="text-white flex items-center gap-2">
                <FiUser className="w-5 h-5" />
                <span className="font-semibold">Creating quiz for:</span>
                <span className="text-blue-300">{studentName}</span>
              </p>
            </div>

            {/* Info Banner */}
            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300 flex items-center gap-2">
                <FiCpu className="w-4 h-4" />
                🎯 This student will receive unique questions for this quiz
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Creation Mode Selection */}
              <div className="form-group">
                <label className="input-label mb-3">Quiz Creation Method</label>
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    type="button"
                    onClick={() => setCreationMode("manual")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      creationMode === "manual"
                        ? "border-blue-500 bg-blue-500/20"
                        : "border-white/20 bg-white/5 hover:border-white/40"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiEdit3 className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                    <div className="font-semibold text-white">Manual</div>
                    <div className="text-sm text-gray-400 mt-1">
                      Add questions manually
                    </div>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setCreationMode("ai")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      creationMode === "ai"
                        ? "border-purple-500 bg-purple-500/20"
                        : "border-white/20 bg-white/5 hover:border-white/40"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiCpu className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                    <div className="font-semibold text-white">AI Generate</div>
                    <div className="text-sm text-gray-400 mt-1">
                      Auto-generate with AI
                    </div>
                  </motion.button>
                </div>
              </div>

              {/* Language Selection */}
              <div className="form-group">
                <label className="input-label flex items-center gap-2">
                  <FiGlobe className="w-4 h-4" />
                  Quiz Language
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="glass-input"
                  required
                >
                  <option value="english">English</option>
                  <option value="hindi">हिंदी (Hindi)</option>
                  <option value="sanskrit">संस्कृत (Sanskrit)</option>
                </select>
              </div>

              {/* Subject */}
              <div className="form-group">
                <label className="input-label flex items-center gap-2">
                  <FiFileText className="w-4 h-4" />
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="glass-input"
                  placeholder="e.g., Mathematics, Science, History"
                  maxLength={100}
                />
              </div>

              {/* Chapters */}
              <div className="form-group">
                <label className="input-label flex items-center gap-2">
                  <FiFileText className="w-4 h-4" />
                  Chapters
                </label>
                <input
                  type="text"
                  name="chapters"
                  value={formData.chapters}
                  onChange={handleChange}
                  className="glass-input"
                  placeholder="e.g., 2,3 or 1-5 or 1-10"
                  maxLength={50}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter chapter numbers (e.g., 2,3 or 1-5 or 1-10)
                </p>
              </div>

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

              {/* AI-Specific Fields */}
              {creationMode === "ai" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6"
                >
                  <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <p className="text-sm text-purple-300 flex items-center gap-2">
                      <FiCpu className="w-4 h-4" />
                      AI will generate questions based on your preferences
                    </p>
                  </div>

                  {/* Topic */}
                  <div className="form-group">
                    <label className="input-label">
                      Topic for AI Generation
                    </label>
                    <input
                      type="text"
                      name="topic"
                      value={aiData.topic}
                      onChange={handleAiChange}
                      className="glass-input"
                      placeholder="e.g., JavaScript Fundamentals, Indian History, Vedic Mathematics"
                      required={creationMode === "ai"}
                    />
                  </div>

                  {/* Number of Questions */}
                  <div className="form-group">
                    <label className="input-label">Number of Questions</label>
                    <input
                      type="number"
                      name="numberOfQuestions"
                      value={aiData.numberOfQuestions}
                      onChange={handleAiChange}
                      className="glass-input"
                      min={5}
                      max={50}
                      required={creationMode === "ai"}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Between 5 and 50 questions
                    </p>
                  </div>

                  {/* Difficulty Level */}
                  <div className="form-group">
                    <label className="input-label">Difficulty Level</label>
                    <select
                      name="difficulty"
                      value={aiData.difficulty}
                      onChange={handleAiChange}
                      className="glass-input"
                      required={creationMode === "ai"}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </motion.div>
              )}

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
                      {creationMode === "manual"
                        ? "Create Quiz"
                        : "Generate Quiz with AI"}
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
