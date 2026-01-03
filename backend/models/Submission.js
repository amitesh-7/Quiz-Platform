const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
    },
    questionText: {
      type: String,
    },
    questionType: {
      type: String,
      enum: ["mcq", "written", "fillblank", "matching", "truefalse"],
      default: "mcq",
    },
    // MCQ fields
    options: {
      type: [String],
    },
    correctOption: {
      type: Number,
    },
    // Written answer fields
    correctAnswer: {
      type: String,
    },
    // Fill in blanks fields
    blanks: {
      type: [String],
    },
    // Matching fields
    matchPairs: [
      {
        left: String,
        right: String,
      },
    ],
    marks: {
      type: Number,
    },
    earnedMarks: {
      type: Number,
      default: 0,
    },
    selectedOption: {
      type: mongoose.Schema.Types.Mixed, // Can be number, string, array, or object
    },
    feedback: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      default: null,
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
    attemptNumber: {
      type: Number,
      default: 1,
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

// Index for efficient querying (removed unique constraint to allow multiple attempts)
submissionSchema.index({ quizId: 1, studentId: 1 });

module.exports = mongoose.model("Submission", submissionSchema);
