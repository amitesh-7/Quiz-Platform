import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiUser,
  FiSearch,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import Loading from "../../components/Loading";
import api from "../../services/api";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get("/auth/students");
      setStudents(response.data.data.students);
    } catch (error) {
      toast.error("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <Loading message="Loading students..." />;
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 pb-8">
        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Students</h1>
            <p className="text-gray-400">Create quizzes for your students</p>
          </div>

          <Link to="/teacher/students">
            <motion.button
              className="btn-secondary flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiUsers className="w-5 h-5" />
              Manage Students
            </motion.button>
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="glass-card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <FiUsers className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Students</p>
              <p className="text-3xl font-bold text-white">{students.length}</p>
            </div>
          </div>
        </motion.div>

        {/* Search Bar */}
        {students.length > 0 && (
          <motion.div
            className="glass-card mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input pl-12 w-full"
                placeholder="Search students..."
              />
            </div>
          </motion.div>
        )}

        {/* Students List */}
        {students.length === 0 ? (
          <motion.div
            className="glass-card text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <FiUsers className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-4">No students yet</p>
            <Link to="/teacher/students">
              <motion.button
                className="btn-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Add Students
              </motion.button>
            </Link>
          </motion.div>
        ) : filteredStudents.length === 0 ? (
          <motion.div
            className="glass-card text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-gray-400 text-lg">
              No students found matching "{searchTerm}"
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {filteredStudents.map((student, index) => (
              <motion.div
                key={student._id}
                className="glass-card hover:border-blue-500/50 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <FiUser className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {student.name}
                      </h3>
                      <p className="text-sm text-gray-400">Student</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <motion.button
                    onClick={() =>
                      navigate(
                        `/teacher/create-quiz?studentId=${
                          student._id
                        }&studentName=${encodeURIComponent(student.name)}`
                      )
                    }
                    className="btn-primary w-full flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiPlus className="w-5 h-5" />
                    Create Quiz
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      navigate(`/teacher/student/${student._id}/quizzes`)
                    }
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiEdit className="w-5 h-5" />
                    View Quizzes
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
