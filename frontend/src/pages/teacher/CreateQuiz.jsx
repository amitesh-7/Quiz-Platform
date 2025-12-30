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
    questionTypes: ["mcq"],
    language: "english",
    description: "",
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

  const handleQuestionTypeToggle = (type) => {
    setAiData((prev) => {
      const types = prev.questionTypes.includes(type)
        ? prev.questionTypes.filter((t) => t !== type)
        : [...prev.questionTypes, type];
      return { ...prev, questionTypes: types };
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Creation Mode Selection */}
              <div className="form-group">
                <label className="input-label mb-2">Quiz Creation Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    type="button"
                    onClick={() => setCreationMode("manual")}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      creationMode === "manual"
                        ? "border-blue-500 bg-blue-500/20"
                        : "border-white/20 bg-white/5 hover:border-white/40"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiEdit3 className="w-6 h-6 mx-auto mb-1 text-blue-400" />
                    <div className="font-medium text-white text-sm">Manual</div>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setCreationMode("ai")}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      creationMode === "ai"
                        ? "border-purple-500 bg-purple-500/20"
                        : "border-white/20 bg-white/5 hover:border-white/40"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiCpu className="w-6 h-6 mx-auto mb-1 text-purple-400" />
                    <div className="font-medium text-white text-sm">
                      AI Generate
                    </div>
                  </motion.button>
                </div>
              </div>

              {/* Row 1: Title & Language */}
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="input-label flex items-center gap-1 text-sm">
                    <FiFileText className="w-3 h-3" />
                    Quiz Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="glass-input py-2"
                    placeholder="Enter quiz title"
                    required
                    maxLength={100}
                  />
                </div>

                <div className="form-group">
                  <label className="input-label flex items-center gap-1 text-sm">
                    <FiGlobe className="w-3 h-3" />
                    Language
                  </label>
                  <select
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    className="glass-input py-2"
                    required
                  >
                    <option value="english">English</option>
                    <option value="hindi">हिंदी (Hindi)</option>
                    <option value="sanskrit">संस्कृत (Sanskrit)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Subject, Chapters, Duration */}
              <div className="grid grid-cols-3 gap-3">
                <div className="form-group">
                  <label className="input-label text-sm">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="glass-input py-2"
                    placeholder="e.g., Math"
                    maxLength={50}
                  />
                </div>

                <div className="form-group">
                  <label className="input-label text-sm">Chapters</label>
                  <input
                    type="text"
                    name="chapters"
                    value={formData.chapters}
                    onChange={handleChange}
                    className="glass-input py-2"
                    placeholder="e.g., 1-5"
                    maxLength={20}
                  />
                </div>

                <div className="form-group">
                  <label className="input-label flex items-center gap-1 text-sm">
                    <FiClock className="w-3 h-3" />
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    className="glass-input py-2"
                    min={1}
                    max={180}
                    required
                  />
                </div>
              </div>

              {/* Description - Compact */}
              <div className="form-group">
                <label className="input-label text-sm">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="glass-input py-2 h-16 resize-none"
                  placeholder="Brief quiz description..."
                  maxLength={200}
                />
              </div>

              {/* AI-Specific Fields */}
              {creationMode === "ai" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg"
                >
                  <p className="text-xs text-purple-300 flex items-center gap-2">
                    <FiCpu className="w-3 h-3" />
                    AI will generate unique questions for this student
                  </p>

                  {/* Topic & Language Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="input-label text-sm">Topic *</label>
                      <input
                        type="text"
                        name="topic"
                        value={aiData.topic}
                        onChange={handleAiChange}
                        className="glass-input py-2"
                        placeholder="e.g., Algebra, World War 2"
                        required={creationMode === "ai"}
                      />
                    </div>

                    <div className="form-group">
                      <label className="input-label flex items-center gap-1 text-sm">
                        <FiGlobe className="w-3 h-3" />
                        AI Language
                      </label>
                      <select
                        name="language"
                        value={aiData.language}
                        onChange={handleAiChange}
                        className="glass-input py-2"
                      >
                        <option value="english">English</option>
                        <option value="hindi">हिंदी (Hindi)</option>
                        <option value="sanskrit">संस्कृत (Sanskrit)</option>
                        <option value="spanish">Español (Spanish)</option>
                        <option value="french">Français (French)</option>
                        <option value="german">Deutsch (German)</option>
                      </select>
                    </div>
                  </div>

                  {/* Questions, Difficulty Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="input-label text-sm">No. of Questions</label>
                      <input
                        type="number"
                        name="numberOfQuestions"
                        value={aiData.numberOfQuestions}
                        onChange={handleAiChange}
                        className="glass-input py-2"
                        min={1}
                        max={50}
                        required={creationMode === "ai"}
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label text-sm">Difficulty</label>
                      <select
                        name="difficulty"
                        value={aiData.difficulty}
                        onChange={handleAiChange}
                        className="glass-input py-2"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  {/* Question Types - Compact Grid */}
                  <div className="form-group">
                    <label className="input-label text-sm mb-2">
                      Question Types
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { value: "mcq", label: "MCQ", icon: "📝" },
                        { value: "written", label: "Written", icon: "✍️" },
                        {
                          value: "fillblank",
                          label: "Fill Blanks",
                          icon: "📄",
                        },
                        { value: "matching", label: "Matching", icon: "🔗" },
                        {
                          value: "truefalse",
                          label: "True/False",
                          icon: "✓✗",
                        },
                      ].map((type) => (
                        <label
                          key={type.value}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                            aiData.questionTypes.includes(type.value)
                              ? "bg-purple-500/30 border border-purple-500"
                              : "bg-white/5 border border-white/10 hover:bg-white/10"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={aiData.questionTypes.includes(type.value)}
                            onChange={() =>
                              handleQuestionTypeToggle(type.value)
                            }
                            className="hidden"
                          />
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* AI Description/Instructions */}
                  <div className="form-group">
                    <label className="input-label text-sm">
                      Additional Instructions (Optional)
                    </label>
                    <textarea
                      name="description"
                      value={aiData.description}
                      onChange={handleAiChange}
                      className="glass-input py-2 h-20 resize-none"
                      placeholder="e.g., Focus on chapter 5, include questions about key dates, avoid complex calculations..."
                      maxLength={1000}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Give specific instructions to guide AI question generation
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <motion.button
                  type="button"
                  onClick={() => navigate("/teacher")}
                  className="btn-secondary flex-1 py-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>

                <motion.button
                  type="submit"
                  className="btn-primary flex-1 flex items-center justify-center gap-2 py-2"
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
