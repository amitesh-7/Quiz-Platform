const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      sparse: true, // Allow multiple null values for students
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
      // Email only required for teachers
      required: function () {
        return this.role === "teacher";
      },
      // Unique only for teachers
      unique: function () {
        return this.role === "teacher";
      },
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      // Password only required for teachers
      required: function () {
        return this.role === "teacher";
      },
    },
    role: {
      type: String,
      enum: ["teacher", "student"],
      required: [true, "Role is required"],
      default: "student",
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving (only for teachers with passwords)
userSchema.pre("save", async function (next) {
  // Skip if password not modified or user is a student
  if (
    !this.isModified("password") ||
    this.role === "student" ||
    !this.password
  ) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method (only for teachers)
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (this.role === "student" || !this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON response
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
