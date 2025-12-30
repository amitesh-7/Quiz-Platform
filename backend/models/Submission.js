const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    selectedOption: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: [true, "Quiz ID is required"],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student ID is required"],
    },
    answers: {
      type: [answerSchema],
      required: [true, "Answers are required"],
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one submission per student per quiz
submissionSchema.index({ quizId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Submission", submissionSchema);
