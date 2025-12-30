import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiAward, FiCheckCircle, FiXCircle, FiHome } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import Loading from '../../components/Loading';
import { resultAPI } from '../../services/api';

const QuizResult = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, [quizId]);

  const fetchResult = async () => {
    try {
      const response = await resultAPI.get(quizId);
      setResult(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch result');
      navigate('/student');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Loading result..." />;
  }

  const getGrade = (percentage) => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (percentage >= 80) return { grade: 'A', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (percentage >= 70) return { grade: 'B', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    if (percentage >= 60) return { grade: 'C', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (percentage >= 50) return { grade: 'D', color: 'text-orange-400', bg: 'bg-orange-500/20' };
    return { grade: 'F', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  const gradeInfo = getGrade(result.percentage);
  const correctCount = result.detailedResults.filter(r => r.isCorrect).length;
  const incorrectCount = result.detailedResults.filter(r => !r.isCorrect && r.selectedOption !== null).length;
  const unanswered = result.detailedResults.filter(r => r.selectedOption === null).length;

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 pb-8">
        {/* Back Button */}
        <motion.button
          onClick={() => navigate('/student')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <FiArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </motion.button>

        {/* Result Summary */}
        <motion.div
          className="glass-card text-center mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className={`w-24 h-24 ${gradeInfo.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <span className={`text-4xl font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">{result.quiz.title}</h1>
          <p className="text-gray-400 mb-6">
            Submitted on {new Date(result.submittedAt).toLocaleString()}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="glass p-4 rounded-xl">
              <p className={`text-3xl font-bold ${gradeInfo.color}`}>{result.percentage}%</p>
              <p className="text-sm text-gray-400">Score</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <p className="text-3xl font-bold text-white">{result.score}/{result.totalMarks}</p>
              <p className="text-sm text-gray-400">Marks</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <p className="text-3xl font-bold text-green-400">{correctCount}</p>
              <p className="text-sm text-gray-400">Correct</p>
            </div>
            <div className="glass p-4 rounded-xl">
              <p className="text-3xl font-bold text-red-400">{incorrectCount}</p>
              <p className="text-sm text-gray-400">Incorrect</p>
            </div>
          </div>

          <Link to="/student">
            <motion.button
              className="btn-primary inline-flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiHome className="w-5 h-5" />
              Back to Quizzes
            </motion.button>
          </Link>
        </motion.div>

        {/* Detailed Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-white mb-4">Question Review</h2>
          
          <div className="space-y-4">
            {result.detailedResults.map((item, index) => (
              <motion.div
                key={item.questionId}
                className={`glass-card border-l-4 ${
                  item.isCorrect ? 'border-green-500' : 'border-red-500'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    item.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {item.isCorrect ? <FiCheckCircle className="w-5 h-5" /> : <FiXCircle className="w-5 h-5" />}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-400 text-sm">Question {index + 1}</span>
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                        {item.marks} mark{item.marks > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-white">{item.questionText}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {item.options.map((option, optIndex) => {
                    const isCorrect = optIndex === item.correctOption;
                    const isSelected = optIndex === item.selectedOption;
                    
                    let bgClass = 'bg-white/5 text-gray-400';
                    if (isCorrect) {
                      bgClass = 'bg-green-500/20 text-green-300 border border-green-500/30';
                    } else if (isSelected && !isCorrect) {
                      bgClass = 'bg-red-500/20 text-red-300 border border-red-500/30';
                    }

                    return (
                      <div
                        key={optIndex}
                        className={`p-3 rounded-lg flex items-center gap-2 ${bgClass}`}
                      >
                        <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span>
                        <span className="flex-1">{option}</span>
                        {isCorrect && <FiCheckCircle className="w-4 h-4 text-green-400" />}
                        {isSelected && !isCorrect && <FiXCircle className="w-4 h-4 text-red-400" />}
                      </div>
                    );
                  })}
                </div>

                {item.selectedOption === null && (
                  <p className="text-yellow-400 text-sm mt-3">⚠️ Not answered</p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default QuizResult;
