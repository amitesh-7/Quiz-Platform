import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiUserPlus,
  FiTrash2,
  FiUsers,
  FiSearch,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import Loading from "../../components/Loading";
import api from "../../services/api";

const ManageStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
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

  const handleAddStudent = async (e) => {
    e.preventDefault();

    if (newStudentName.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }

    setAdding(true);

    try {
      const response = await api.post("/auth/add-student", {
        name: newStudentName.trim(),
      });
      setStudents([...students, response.data.data.student]);
      setNewStudentName("");
      toast.success("Student added successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add student");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to remove ${studentName}?`)) {
      return;
    }

    try {
      await api.delete(`/auth/students/${studentId}`);
      setStudents(students.filter((s) => s._id !== studentId));
      toast.success("Student removed successfully");
    } catch (error) {
      toast.error("Failed to remove student");
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
        {/* Back Button */}
        <motion.button
          onClick={() => navigate("/teacher")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <FiArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </motion.button>

        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            Manage Students
          </h1>
          <p className="text-gray-400">Add and manage student accounts</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="glass-card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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

        {/* Add Student Form */}
        <motion.div
          className="glass-card mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold text-white mb-4">Add New Student</h2>
          <form onSubmit={handleAddStudent} className="flex gap-4">
            <input
              type="text"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              className="glass-input flex-1"
              placeholder="Enter student name"
              required
              minLength={2}
              maxLength={50}
            />
            <motion.button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={adding}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {adding ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Adding...
                </>
              ) : (
                <>
                  <FiUserPlus className="w-5 h-5" />
                  Add Student
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Search Bar */}
        {students.length > 0 && (
          <motion.div
            className="glass-card mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
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
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No students yet
            </h2>
            <p className="text-gray-400">
              Add your first student to get started
            </p>
          </motion.div>
        ) : filteredStudents.length === 0 ? (
          <motion.div
            className="glass-card text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No students found
            </h2>
            <p className="text-gray-400">Try a different search term</p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {filteredStudents.map((student, index) => (
              <motion.div
                key={student._id}
                className="glass-card"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full 
                                  flex items-center justify-center text-white text-lg font-bold"
                    >
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {student.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Added:{" "}
                        {new Date(student.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <motion.button
                    onClick={() =>
                      handleDeleteStudent(student._id, student.name)
                    }
                    className="p-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageStudents;
