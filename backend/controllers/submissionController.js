const { body } = require("express-validator");
const Submission = require("../models/Submission");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const { evaluateWrittenAnswer } = require("../config/gemini");

// Validation rules for submitting a quiz
const submitValidation = [
  body("quizId")
    .notEmpty()
    .withMessage("Quiz ID is required")
    .isMongoId()
    .withMessage("Invalid Quiz ID"),
  body("answers").isArray().withMessage("Answers must be an array"),
];

// @desc    Submit a quiz
// @route   POST /api/submissions
// @access  Private (Student only)
const submitQuiz = async (req, res) => {
  try {
    const { quizId, answers, questionsData } = req.body;

    console.log("=== SUBMISSION DEBUG ===");
    console.log("QuizId:", quizId);
    console.log("Answers count:", answers?.length);
    console.log("QuestionsData:", questionsData ? `${questionsData.length} items` : "null (manual mode)");

    // Check if quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Check if quiz is active
    if (!quiz.isActive) {
      return res.status(400).json({
        success: false,
        message: "This quiz is no longer active",
      });
    }

    // Check if student has already submitted - allow multiple attempts
    const existingSubmission = await Submission.findOne({
      quizId,
      studentId: req.user._id,
    });

    let questions;
    let questionMap = new Map();

    // If questionsData provided (unique per student), use it
    if (questionsData && Array.isArray(questionsData) && questionsData.length > 0) {
      console.log("Using questionsData (AI mode)");
      questions = questionsData;
      questions.forEach((q, index) => {
        // Map by temp_index for AI-generated questions
        questionMap.set(`temp_${index}`, q);
        console.log(`Mapped temp_${index}:`, q.questionText?.substring(0, 50));
      });
    } else {
      // Otherwise, get stored questions for manual quizzes
      console.log("Using stored questions (manual mode)");
      questions = await Question.find({ quizId });
      console.log("Found questions:", questions.length);

      if (questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: "This quiz has no questions",
        });
      }

      questions.forEach((q) => {
        questionMap.set(q._id.toString(), q);
        console.log(`Mapped ${q._id.toString()}:`, q.questionText?.substring(0, 50));
      });
    }

    // Calculate score
    let score = 0;
    const processedAnswers = [];

    // Process answers - handle both indexed and ID-based answers
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      let question = null;
      
      console.log(`Processing answer ${i}: questionId=${answer.questionId}`);
      
      // Try to find question by questionId first
      if (answer.questionId) {
        question = questionMap.get(answer.questionId);
        
        // If not found, try as MongoDB ObjectId string
        if (!question) {
          question = questionMap.get(answer.questionId.toString());
        }
      }
      
      // If still not found and we have questionsData, try by index
      if (!question && questionsData && questionsData.length > 0) {
        // Extract index from temp_X format or use loop index
        let idx = i;
        if (answer.questionId && answer.questionId.startsWith && answer.questionId.startsWith('temp_')) {
          idx = parseInt(answer.questionId.replace('temp_', ''));
        }
        if (questionsData[idx]) {
          question = questionsData[idx];
          console.log(`Found by index ${idx}`);
        }
      }
      
      console.log(`Question found:`, question ? "YES" : "NO", question ? `type: ${question.questionType}` : "");

      if (question) {
        let isCorrect = false;
        let earnedMarks = 0;
        let feedback = "";
        const questionType = question.questionType || "mcq";

        // Check answer based on question type
        switch (questionType) {
          case "mcq":
          case "truefalse":
            // MCQ and True/False both use correctOption
            isCorrect = answer.selectedOption === question.correctOption;
            earnedMarks = isCorrect ? question.marks : 0;
            break;

          case "written":
            // For written answers, use AI semantic matching
            if (answer.selectedOption && question.correctAnswer) {
              try {
                const threshold = answer.threshold || 0.7;
                const evaluation = await evaluateWrittenAnswer(
                  answer.selectedOption,
                  question.correctAnswer,
                  question.marks,
                  threshold
                );
                earnedMarks = evaluation.score;
                feedback = evaluation.feedback;
                isCorrect = evaluation.percentage >= threshold * 100;
              } catch (error) {
                console.error("Written answer evaluation error:", error);
                earnedMarks = 0;
                feedback = "Answer pending manual review";
              }
            }
            break;

          case "fillblank":
            // Check if all blanks are filled correctly (case-insensitive)
            if (
              Array.isArray(answer.selectedOption) &&
              Array.isArray(question.blanks)
            ) {
              isCorrect = question.blanks.every((blank, idx) => {
                const studentAnswer = (answer.selectedOption[idx] || "")
                  .trim()
                  .toLowerCase();
                const correctAnswer = blank.trim().toLowerCase();
                return studentAnswer === correctAnswer;
              });
              earnedMarks = isCorrect ? question.marks : 0;
            }
            break;

          case "matching":
            // Check if all matches are correct
            if (
              typeof answer.selectedOption === "object" &&
              Array.isArray(question.matchPairs)
            ) {
              const studentMatches = answer.selectedOption;
              isCorrect = question.matchPairs.every((pair, idx) => {
                return studentMatches[idx] === pair.right;
              });
              earnedMarks = isCorrect ? question.marks : 0;
            }
            break;
        }

        // Store complete question data in submission
        const answerData = {
          questionId: answer.questionId,
          questionText: question.questionText,
          questionType: questionType,
          marks: question.marks,
          earnedMarks: earnedMarks,
          selectedOption: answer.selectedOption,
          feedback: feedback,
          imageUrl: answer.imageUrl || null,
        };

        // Add type-specific fields
        if (questionType === "mcq" || questionType === "truefalse") {
          answerData.options = question.options;
          answerData.correctOption = question.correctOption;
        } else if (questionType === "written") {
          answerData.correctAnswer = question.correctAnswer;
        } else if (questionType === "fillblank") {
          answerData.blanks = question.blanks;
        } else if (questionType === "matching") {
          answerData.matchPairs = question.matchPairs;
        }

        processedAnswers.push(answerData);
        score += earnedMarks;
        console.log(`Answer processed: earned ${earnedMarks}/${question.marks}, total score: ${score}`);
      } else {
        console.log(`WARNING: Question not found for answer ${i}`);
      }
    }

    console.log("=== FINAL RESULTS ===");
    console.log("Processed answers:", processedAnswers.length);
    console.log("Total score:", score);

    // Calculate total marks
    const totalMarks = processedAnswers.reduce((sum, a) => sum + a.marks, 0);

    // Update existing submission or create new one
    let submission;
    if (existingSubmission) {
      // Update existing submission with new attempt
      submission = await Submission.findByIdAndUpdate(
        existingSubmission._id,
        {
          answers: processedAnswers,
          score,
          submittedAt: new Date(),
        },
        { new: true }
      );
    } else {
      // Create new submission
      submission = await Submission.create({
        quizId,
        studentId: req.user._id,
        answers: processedAnswers,
        score,
        submittedAt: new Date(),
      });
    }

    res.status(201).json({
      success: true,
      message: existingSubmission
        ? "Quiz resubmitted successfully. Your result has been updated."
        : "Quiz submitted successfully",
      data: {
        submission: {
          id: submission._id,
          quizId: submission.quizId,
          score: submission.score,
          totalMarks: totalMarks,
          percentage:
            totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0,
          submittedAt: submission.submittedAt,
        },
      },
    });
  } catch (error) {
    console.error("Submit quiz error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while submitting quiz",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get result for a specific quiz
// @route   GET /api/results/:quizId
// @access  Private (Student only)
const getResult = async (req, res) => {
  try {
    const { quizId } = req.params;

    // Get submission
    const submission = await Submission.findOne({
      quizId,
      studentId: req.user._id,
    }).populate("quizId", "title totalMarks duration");

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "No submission found for this quiz",
      });
    }

    // Get questions with correct answers for review
    const questions = await Question.find({ quizId });

    // Build detailed results
    const detailedResults = questions.map((question) => {
      const studentAnswer = submission.answers.find(
        (a) => a.questionId.toString() === question._id.toString()
      );

      return {
        questionId: question._id,
        questionText: question.questionText,
        options: question.options,
        correctOption: question.correctOption,
        selectedOption: studentAnswer ? studentAnswer.selectedOption : null,
        isCorrect: studentAnswer
          ? studentAnswer.selectedOption === question.correctOption
          : false,
        marks: question.marks,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        quiz: submission.quizId,
        score: submission.score,
        totalMarks: submission.quizId.totalMarks,
        percentage:
          submission.quizId.totalMarks > 0
            ? Math.round(
                (submission.score / submission.quizId.totalMarks) * 100
              )
            : 0,
        submittedAt: submission.submittedAt,
        detailedResults,
      },
    });
  } catch (error) {
    console.error("Get result error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching result",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get all submissions for a student
// @route   GET /api/submissions/my
// @access  Private (Student only)
const getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.user._id })
      .populate("quizId", "title totalMarks duration")
      .sort({ submittedAt: -1 });

    const formattedSubmissions = submissions.map((sub) => ({
      id: sub._id,
      quiz: sub.quizId,
      score: sub.score,
      totalMarks: sub.quizId?.totalMarks || 0,
      percentage:
        sub.quizId?.totalMarks > 0
          ? Math.round((sub.score / sub.quizId.totalMarks) * 100)
          : 0,
      submittedAt: sub.submittedAt,
    }));

    res.status(200).json({
      success: true,
      data: { submissions: formattedSubmissions },
    });
  } catch (error) {
    console.error("Get submissions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching submissions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get all submissions for a quiz (Teacher view)
// @route   GET /api/submissions/quiz/:quizId
// @access  Private (Teacher only)
const getQuizSubmissions = async (req, res) => {
  try {
    const { quizId } = req.params;

    // Verify quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Any teacher can view submissions for any quiz

    const submissions = await Submission.find({ quizId })
      .populate("studentId", "name email")
      .sort({ submittedAt: -1 });

    const formattedSubmissions = submissions.map((sub) => ({
      id: sub._id,
      student: sub.studentId,
      score: sub.score,
      totalMarks: quiz.totalMarks,
      percentage:
        quiz.totalMarks > 0
          ? Math.round((sub.score / quiz.totalMarks) * 100)
          : 0,
      submittedAt: sub.submittedAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          totalMarks: quiz.totalMarks,
        },
        submissions: formattedSubmissions,
      },
    });
  } catch (error) {
    console.error("Get quiz submissions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching submissions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get detailed submission by ID (Teacher view)
// @route   GET /api/submissions/:submissionId
// @access  Private (Teacher only)
const getSubmissionDetails = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await Submission.findById(submissionId)
      .populate("studentId", "name email")
      .populate("quizId", "title totalMarks duration");

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // Calculate total marks from answers
    const totalMarks = submission.answers.reduce((sum, a) => sum + (a.marks || 0), 0);
    const earnedMarks = submission.answers.reduce((sum, a) => sum + (a.earnedMarks || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        submission: {
          id: submission._id,
          student: submission.studentId,
          quiz: submission.quizId,
          score: submission.score,
          totalMarks: totalMarks,
          percentage: totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0,
          submittedAt: submission.submittedAt,
          answers: submission.answers.map((answer) => ({
            questionText: answer.questionText,
            questionType: answer.questionType || "mcq",
            options: answer.options,
            correctOption: answer.correctOption,
            correctAnswer: answer.correctAnswer,
            blanks: answer.blanks,
            matchPairs: answer.matchPairs,
            selectedOption: answer.selectedOption,
            marks: answer.marks,
            earnedMarks: answer.earnedMarks,
            isCorrect: answer.earnedMarks === answer.marks,
            feedback: answer.feedback,
            imageUrl: answer.imageUrl,
          })),
        },
      },
    });
  } catch (error) {
    console.error("Get submission details error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching submission details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  submitQuiz,
  getResult,
  getMySubmissions,
  getQuizSubmissions,
  getSubmissionDetails,
  submitValidation,
};
