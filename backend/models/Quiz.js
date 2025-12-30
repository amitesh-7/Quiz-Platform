const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Quiz title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Quiz creator is required"],
    },
    duration: {
      type: Number,
      required: [true, "Quiz duration is required"],
      min: [1, "Duration must be at least 1 minute"],
      max: [180, "Duration cannot exceed 180 minutes"],
    },
    totalMarks: {
      type: Number,
      default: 0,
      min: [0, "Total marks cannot be negative"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
quizSchema.index({ createdBy: 1 });
quizSchema.index({ isActive: 1 });

module.exports = mongoose.model("Quiz", quizSchema);
