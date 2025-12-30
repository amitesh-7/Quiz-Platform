import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiArrowLeft, FiPlus, FiEdit, FiTrash2, FiSave, FiX, 
  FiZap, FiClock, FiCheckCircle, FiAlertCircle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import Loading from '../../components/Loading';
import { quizAPI, questionAPI, geminiAPI } from '../../services/api';

const ManageQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Question form state
  const [questionForm, setQuestionForm] = useState({
    questionText: '',
    options: ['', '', '', ''],
    correctOption: 0,
    marks: 1
  });

  // Generate form state
  const [generateForm, setGenerateForm] = useState({
    topic: '',
    numberOfQuestions: 5,
    difficulty: 'medium'
  });
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);

  useEffect(() => {
    fetchQuizData();
  }, [quizId]);

  const fetchQuizData = async () => {
    try {
      const [quizRes, questionsRes] = await Promise.all([
        quizAPI.getOne(quizId),
        questionAPI.getByQuiz(quizId)
      ]);
      setQuiz(quizRes.data.data.quiz);
      setQuestions(questionsRes.data.data.questions);
    } catch (error) {
      toast.error('Failed to fetch quiz data');
      navigate('/teacher');
    } finally {
      setLoading(false);
    }
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      questionText: '',
      options: ['', '', '', ''],
      correctOption: 0,
      marks: 1
    });
    setEditingQuestion(null);
  };

  const handleAddQuestion = async () => {
    if (!questionForm.questionText.trim()) {
      toast.error('Question text is required');
      return;
    }

    if (questionForm.options.some(opt => !opt.trim())) {
      toast.error('All options are required');
      return;
    }

    try {
      if (editingQuestion) {
        await questionAPI.update(editingQuestion._id, questionForm);
        setQuestions(questions.map(q => 
          q._id === editingQuestion._id ? { ...q, ...questionForm } : q
        ));
        toast.success('Question updated');
      } else {
        const response = await questionAPI.create({
          quizId,
          ...questionForm
        });
        setQuestions([...questions, response.data.data.question]);
        toast.success('Question added');
      }
      
      // Update quiz total marks
      const newTotalMarks = questions.reduce((acc, q) => 
        q._id === editingQuestion?._id ? acc : acc + q.marks, 0
      ) + questionForm.marks;
      setQuiz({ ...quiz, totalMarks: newTotalMarks });
      
      setShowAddModal(false);
      resetQuestionForm();
    } catch (error) {
      toast.error('Failed to save question');
    }
  };

  const handleEditQuestion = (question) => {
    setQuestionForm({
      questionText: question.questionText,
      options: [...question.options],
      correctOption: question.correctOption,
      marks: question.marks
    });
    setEditingQuestion(question);
    setShowAddModal(true);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Delete this question?')) return;

    try {
      await questionAPI.delete(questionId);
      const deletedQuestion = questions.find(q => q._id === questionId);
      setQuestions(questions.filter(q => q._id !== questionId));
      setQuiz({ ...quiz, totalMarks: quiz.totalMarks - deletedQuestion.marks });
      toast.success('Question deleted');
    } catch (error) {
      toast.error('Failed to delete question');
    }
  };

  const handleGenerate = async () => {
    if (!generateForm.topic.trim()) {
      toast.error('Topic is required');
      return;
    }

    setGenerating(true);
    try {
      const response = await geminiAPI.generate(generateForm);
      setGeneratedQuestions(response.data.data.questions);
      toast.success(`Generated ${response.data.data.questions.length} questions`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate questions');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddGeneratedQuestions = async () => {
    if (generatedQuestions.length === 0) return;

    try {
      await questionAPI.bulkCreate({
        quizId,
        questions: generatedQuestions
      });
      
      await fetchQuizData(); // Refresh to get updated questions
      setShowGenerateModal(false);
      setGeneratedQuestions([]);
      setGenerateForm({ topic: '', numberOfQuestions: 5, difficulty: 'medium' });
      toast.success('Questions added to quiz');
    } catch (error) {
      toast.error('Failed to add questions');
    }
  };

  if (loading) {
    return <Loading message="Loading quiz..." />;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 pb-8">
        {/* Back Button */}
        <motion.button
          onClick={() => navigate('/teacher')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <FiArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </motion.button>

        {/* Quiz Info */}
        <motion.div
          className="glass-card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{quiz.title}</h1>
              <p className="text-gray-400 mb-4">{quiz.description || 'No description'}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <FiClock className="w-4 h-4" />
                  <span>{quiz.duration} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <FiCheckCircle className="w-4 h-4" />
                  <span>{quiz.totalMarks} total marks</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <FiAlertCircle className="w-4 h-4" />
                  <span>{questions.length} questions</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <motion.button
                onClick={() => setShowGenerateModal(true)}
                className="btn-secondary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiZap className="w-5 h-5 text-yellow-400" />
                Generate with AI
              </motion.button>
              <motion.button
                onClick={() => {
                  resetQuestionForm();
                  setShowAddModal(true);
                }}
                className="btn-primary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiPlus className="w-5 h-5" />
                Add Question
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Questions List */}
        {questions.length === 0 ? (
          <motion.div
            className="glass-card text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-6xl mb-4">❓</div>
            <h2 className="text-xl font-semibold text-white mb-2">No questions yet</h2>
            <p className="text-gray-400 mb-6">Add questions manually or generate with AI</p>
            <div className="flex justify-center gap-4">
              <motion.button
                onClick={() => setShowGenerateModal(true)}
                className="btn-secondary flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                <FiZap className="w-5 h-5 text-yellow-400" />
                Generate with AI
              </motion.button>
              <motion.button
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                <FiPlus className="w-5 h-5" />
                Add Manually
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <motion.div
                key={question._id}
                className="glass-card"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 font-bold">
                        {index + 1}
                      </span>
                      <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">
                        {question.marks} mark{question.marks > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-white mb-4">{question.questionText}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {question.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-3 rounded-lg ${
                            optIndex === question.correctOption
                              ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                              : 'bg-white/5 border border-white/10 text-gray-400'
                          }`}
                        >
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + optIndex)}.
                          </span>
                          {option}
                          {optIndex === question.correctOption && (
                            <FiCheckCircle className="inline ml-2 w-4 h-4" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => handleEditQuestion(question)}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FiEdit className="w-5 h-5" />
                    </motion.button>
                    <motion.button
                      onClick={() => handleDeleteQuestion(question._id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Add/Edit Question Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">
                    {editingQuestion ? 'Edit Question' : 'Add Question'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetQuestionForm();
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <FiX className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="form-group">
                    <label className="input-label">Question Text</label>
                    <textarea
                      value={questionForm.questionText}
                      onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                      className="glass-input min-h-[100px]"
                      placeholder="Enter your question..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="input-label">Options</label>
                    <div className="space-y-2">
                      {questionForm.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQuestionForm({ ...questionForm, correctOption: index })}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-colors ${
                              questionForm.correctOption === index
                                ? 'bg-green-500 text-white'
                                : 'bg-white/10 text-gray-400 hover:bg-white/20'
                            }`}
                          >
                            {String.fromCharCode(65 + index)}
                          </button>
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...questionForm.options];
                              newOptions[index] = e.target.value;
                              setQuestionForm({ ...questionForm, options: newOptions });
                            }}
                            className="glass-input flex-1"
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Click the letter button to mark the correct answer
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="input-label">Marks</label>
                    <input
                      type="number"
                      value={questionForm.marks}
                      onChange={(e) => setQuestionForm({ ...questionForm, marks: parseInt(e.target.value) || 1 })}
                      className="glass-input w-32"
                      min={1}
                      max={10}
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <motion.button
                      onClick={() => {
                        setShowAddModal(false);
                        resetQuestionForm();
                      }}
                      className="btn-secondary flex-1"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={handleAddQuestion}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FiSave className="w-5 h-5" />
                      {editingQuestion ? 'Update' : 'Add'} Question
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate Questions Modal */}
        <AnimatePresence>
          {showGenerateModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!generating) {
                  setShowGenerateModal(false);
                  setGeneratedQuestions([]);
                }
              }}
            >
              <motion.div
                className="glass-card w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiZap className="w-6 h-6 text-yellow-400" />
                    Generate Questions with AI
                  </h2>
                  <button
                    onClick={() => {
                      if (!generating) {
                        setShowGenerateModal(false);
                        setGeneratedQuestions([]);
                      }
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <FiX className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {generatedQuestions.length === 0 ? (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="input-label">Topic</label>
                      <input
                        type="text"
                        value={generateForm.topic}
                        onChange={(e) => setGenerateForm({ ...generateForm, topic: e.target.value })}
                        className="glass-input"
                        placeholder="e.g., JavaScript Arrays, World War II, Photosynthesis"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="input-label">Number of Questions</label>
                        <input
                          type="number"
                          value={generateForm.numberOfQuestions}
                          onChange={(e) => setGenerateForm({ 
                            ...generateForm, 
                            numberOfQuestions: parseInt(e.target.value) || 5 
                          })}
                          className="glass-input"
                          min={1}
                          max={20}
                        />
                      </div>

                      <div className="form-group">
                        <label className="input-label">Difficulty</label>
                        <select
                          value={generateForm.difficulty}
                          onChange={(e) => setGenerateForm({ ...generateForm, difficulty: e.target.value })}
                          className="glass-input"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                    </div>

                    <motion.button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {generating ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <FiZap className="w-5 h-5" />
                          Generate Questions
                        </>
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-300">
                      Generated {generatedQuestions.length} questions. Review and add them to your quiz.
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {generatedQuestions.map((question, index) => (
                        <div key={index} className="bg-white/5 rounded-lg p-4">
                          <p className="text-white mb-2">
                            <span className="text-blue-400 font-bold">Q{index + 1}.</span>{' '}
                            {question.questionText}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {question.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className={`p-2 rounded ${
                                  optIdx === question.correctOption
                                    ? 'bg-green-500/20 text-green-300'
                                    : 'bg-white/5 text-gray-400'
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}. {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-4">
                      <motion.button
                        onClick={() => {
                          setGeneratedQuestions([]);
                        }}
                        className="btn-secondary flex-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Regenerate
                      </motion.button>
                      <motion.button
                        onClick={handleAddGeneratedQuestions}
                        className="btn-success flex-1 flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FiPlus className="w-5 h-5" />
                        Add All to Quiz
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ManageQuiz;
