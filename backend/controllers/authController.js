const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const User = require("../models/User");

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Validation rules for registration
const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be 2-50 characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["teacher", "student"])
    .withMessage("Role must be teacher or student"),
  body("secretKey")
    .notEmpty()
    .withMessage("Secret key is required for teacher registration"),
];

// Validation rules for login
const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, role, secretKey } = req.body;

    // Validate secret key for teacher registration
    if (role === "teacher") {
      if (!secretKey) {
        return res.status(400).json({
          success: false,
          message: "Secret key is required for teacher registration",
        });
      }

      if (secretKey !== process.env.TEACHER_SECRET_KEY) {
        return res.status(403).json({
          success: false,
          message:
            "Invalid secret key. Contact administrator for the correct key.",
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Student login with name only
// @route   POST /api/auth/student-login
// @access  Public
const studentLogin = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please enter your name (minimum 2 characters)",
      });
    }

    // Find student by name (case-insensitive)
    const student = await User.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      role: "student",
    });

    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Student not found. Please contact your teacher to register.",
      });
    }

    // Generate token
    const token = generateToken(student._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: student._id,
          name: student.name,
          role: student.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Student login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Add student (Teacher only)
// @route   POST /api/auth/add-student
// @access  Private (Teacher)
const addStudent = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters",
      });
    }

    // Check if student already exists (case-insensitive)
    const existingStudent = await User.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      role: "student",
    });

    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: "A student with this name already exists",
      });
    }

    // Create student account (no password required)
    const student = await User.create({
      name: name.trim(),
      role: "student",
    });

    res.status(201).json({
      success: true,
      message: "Student added successfully",
      data: {
        student: {
          _id: student._id,
          name: student.name,
          role: student.role,
          createdAt: student.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Add student error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding student",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get all students (Teacher only)
// @route   GET /api/auth/students
// @access  Private (Teacher)
const getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student" })
      .select("name createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        students,
        count: students.length,
      },
    });
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching students",
    });
  }
};

// @desc    Delete student (Teacher only)
// @route   DELETE /api/auth/students/:id
// @access  Private (Teacher)
const deleteStudent = async (req, res) => {
  try {
    const student = await User.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (student.role !== "student") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete non-student user",
      });
    }

    await student.deleteOne();

    res.status(200).json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting student",
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  studentLogin,
  addStudent,
  getStudents,
  deleteStudent,
  registerValidation,
  loginValidation,
};
