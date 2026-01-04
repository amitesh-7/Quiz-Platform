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
    console.log(
      "QuestionsData:",
      questionsData ? `${questionsData.length} items` : "null (manual mode)"
    );

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
    if (
      questionsData &&
      Array.isArray(questionsData) &&
      questionsData.length > 0
    ) {
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
        console.log(
          `Mapped ${q._id.toString()}:`,
          q.questionText?.substring(0, 50)
        );
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
        if (
          answer.questionId &&
          answer.questionId.startsWith &&
          answer.questionId.startsWith("temp_")
        ) {
          idx = parseInt(answer.questionId.replace("temp_", ""));
        }
        if (questionsData[idx]) {
          question = questionsData[idx];
          console.log(`Found by index ${idx}`);
        }
      }

      console.log(
        `Question found:`,
        question ? "YES" : "NO",
        question ? `type: ${question.questionType}` : ""
      );

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
        console.log(
          `Answer processed: earned ${earnedMarks}/${question.marks}, total score: ${score}`
        );
      } else {
        // Question not found - still save the answer with basic info for debugging
        console.log(
          `WARNING: Question not found for answer ${i}, saving with limited info`
        );

        // Create a minimal answer record so the submission isn't incomplete
        const fallbackAnswerData = {
          questionId: answer.questionId,
          questionText: `Question ${i + 1} (data not available)`,
          questionType: "mcq",
          marks: 0,
          earnedMarks: 0,
          selectedOption: answer.selectedOption,
          feedback: "Question data was not found during submission",
          imageUrl: answer.imageUrl || null,
        };
        processedAnswers.push(fallbackAnswerData);
      }
    }

    console.log("=== FINAL RESULTS ===");
    console.log("Processed answers:", processedAnswers.length);
    console.log("Total score:", score);

    // Calculate total marks
    const totalMarks = processedAnswers.reduce((sum, a) => sum + a.marks, 0);

    // Check previous attempts to determine attempt number
    const previousAttempts = await Submission.find({
      quizId,
      studentId: req.user._id,
    }).sort({ attemptNumber: -1 });

    const attemptNumber =
      previousAttempts.length > 0 ? previousAttempts[0].attemptNumber + 1 : 1;

    // Always create a new submission for each attempt (don't update existing)
    const submission = await Submission.create({
      quizId,
      studentId: req.user._id,
      answers: processedAnswers,
      score,
      attemptNumber,
      submittedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message:
        attemptNumber > 1
          ? `Quiz resubmitted successfully. This is attempt #${attemptNumber}.`
          : "Quiz submitted successfully",
      data: {
        submission: {
          id: submission._id,
          quizId: submission.quizId,
          score: submission.score,
          attemptNumber: submission.attemptNumber,
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

    // Get submission with all stored answer data
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

    // Get all questions for this quiz to show attempted and unattempted
    const allQuestions = await Question.find({ quizId });

    let detailedResults;

    // If no questions in DB (AI-generated quiz), use answers stored in submission
    if (allQuestions.length === 0 && submission.answers.length > 0) {
      // For AI-generated quizzes, build results from stored answers
      detailedResults = submission.answers.map((answer, index) => {
        const result = {
          questionId: answer.questionId || `q_${index}`,
          questionText: answer.questionText || `Question ${index + 1}`,
          questionType: answer.questionType || "mcq",
          marks: answer.marks || 0,
          earnedMarks: answer.earnedMarks || 0,
          isCorrect: answer.earnedMarks === answer.marks,
          isPartial:
            answer.earnedMarks > 0 && answer.earnedMarks < answer.marks,
          isAttempted: true,
          selectedOption: answer.selectedOption ?? null,
          feedback: answer.feedback || "",
          imageUrl: answer.imageUrl || null,
        };

        // Add type-specific fields from stored answer
        if (
          answer.questionType === "mcq" ||
          answer.questionType === "truefalse"
        ) {
          result.options = answer.options || [];
          result.correctOption = answer.correctOption;
        } else if (answer.questionType === "written") {
          result.studentAnswer = answer.selectedOption || "";
          result.expectedAnswer = answer.correctAnswer || "";
          result.awardedMarks = answer.earnedMarks || 0;
        } else if (answer.questionType === "fillblank") {
          result.studentAnswer = answer.selectedOption
            ? Array.isArray(answer.selectedOption)
              ? answer.selectedOption.join(", ")
              : answer.selectedOption
            : "";
          result.correctAnswer = Array.isArray(answer.blanks)
            ? answer.blanks.join(", ")
            : answer.blanks || "";
        } else if (answer.questionType === "matching") {
          if (answer.matchPairs) {
            if (typeof answer.selectedOption === "object") {
              result.studentMatches = answer.matchPairs.map((pair, idx) => ({
                left: pair.left,
                right: answer.selectedOption[idx] || "Not matched",
              }));
            } else {
              result.studentMatches = null;
            }
            result.correctMatches = answer.matchPairs.map((pair) => ({
              left: pair.left,
              right: pair.right,
            }));
          }
        }

        return result;
      });
    } else {
      // For manual quizzes, use questions from DB
      // Create a map of submitted answers by questionId
      const answersMap = new Map();
      submission.answers.forEach((answer) => {
        answersMap.set(answer.questionId?.toString(), answer);
      });

      // Build detailed results including all questions
      detailedResults = allQuestions.map((question, index) => {
        const answer = answersMap.get(question._id.toString());
        const isAttempted = !!answer;

        const result = {
          questionId: question._id,
          questionText: question.questionText,
          questionType: question.questionType || "mcq",
          marks: question.marks || 0,
          earnedMarks: answer?.earnedMarks || 0,
          isCorrect: answer ? answer.earnedMarks === answer.marks : false,
          isPartial: answer
            ? answer.earnedMarks > 0 && answer.earnedMarks < answer.marks
            : false,
          isAttempted: isAttempted,
          selectedOption: answer?.selectedOption ?? null,
          feedback: answer?.feedback || "",
          imageUrl: answer?.imageUrl || null,
        };

        // Add type-specific fields from question (always include these)
        if (
          question.questionType === "mcq" ||
          question.questionType === "truefalse"
        ) {
          result.options = question.options || [];
          result.correctOption = question.correctOption;
        } else if (question.questionType === "written") {
          result.studentAnswer = answer?.selectedOption || "";
          result.expectedAnswer = question.correctAnswer || "";
          result.awardedMarks = answer?.earnedMarks || 0;
        } else if (question.questionType === "fillblank") {
          result.studentAnswer = answer?.selectedOption
            ? Array.isArray(answer.selectedOption)
              ? answer.selectedOption.join(", ")
              : answer.selectedOption
            : "";
          result.correctAnswer = Array.isArray(question.blanks)
            ? question.blanks.join(", ")
            : question.blanks || "";
        } else if (question.questionType === "matching") {
          // Format student matches
          if (question.matchPairs) {
            if (answer && typeof answer.selectedOption === "object") {
              result.studentMatches = question.matchPairs.map((pair, idx) => ({
                left: pair.left,
                right: answer.selectedOption[idx] || "Not matched",
              }));
            } else {
              result.studentMatches = null;
            }
            result.correctMatches = question.matchPairs.map((pair) => ({
              left: pair.left,
              right: pair.right,
            }));
          }
        }

        return result;
      });
    }

    // Calculate total marks and earned marks
    const totalMarks = allQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
    const earnedMarks = submission.answers.reduce(
      (sum, a) => sum + (a.earnedMarks || 0),
      0
    );

    res.status(200).json({
      success: true,
      data: {
        quiz: submission.quizId,
        score: earnedMarks,
        totalMarks: totalMarks || submission.quizId?.totalMarks || 0,
        percentage:
          totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0,
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
      attemptNumber: sub.attemptNumber || 1,
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

    // Get all questions for this quiz to show both attempted and unattempted
    const allQuestions = await Question.find({ quizId: submission.quizId });

    // Create a map of submitted answers by questionId
    const answersMap = new Map();
    submission.answers.forEach((answer) => {
      answersMap.set(answer.questionId?.toString(), answer);
    });

    let detailedAnswers;
    let totalMarks = 0;
    let earnedMarks = 0;

    // If questions exist in DB (manual quiz), show all questions
    if (allQuestions.length > 0) {
      detailedAnswers = allQuestions.map((question, index) => {
        const answer = answersMap.get(question._id.toString());
        const isAttempted = !!answer;

        totalMarks += question.marks || 0;
        earnedMarks += answer?.earnedMarks || 0;

        return {
          questionId: question._id.toString(),
          questionText: question.questionText,
          questionType: question.questionType || "mcq",
          options: question.options,
          correctOption: question.correctOption,
          correctAnswer: question.correctAnswer,
          blanks: question.blanks,
          matchPairs: question.matchPairs,
          selectedOption: answer?.selectedOption ?? null,
          marks: question.marks,
          earnedMarks: answer?.earnedMarks || 0,
          isCorrect: isAttempted && answer.earnedMarks === question.marks,
          isAttempted: isAttempted,
          feedback: answer?.feedback || "",
          imageUrl: answer?.imageUrl || null,
        };
      });
    } else {
      // For AI-generated quizzes, use stored answers only
      detailedAnswers = submission.answers.map((answer, index) => {
        totalMarks += answer.marks || 0;
        earnedMarks += answer.earnedMarks || 0;

        return {
          questionId: answer.questionId?.toString() || `ai-${index}`,
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
          isAttempted: true,
          feedback: answer.feedback,
          imageUrl: answer.imageUrl,
        };
      });
    }

    res.status(200).json({
      success: true,
      data: {
        submission: {
          id: submission._id,
          student: submission.studentId,
          quiz: submission.quizId,
          score: submission.score,
          attemptNumber: submission.attemptNumber || 1,
          totalMarks: totalMarks,
          percentage:
            totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0,
          submittedAt: submission.submittedAt,
          answers: detailedAnswers,
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

// @desc    Update marks for a submission (Teacher only)
// @route   PATCH /api/submissions/:submissionId/marks
// @access  Private (Teacher only)
const updateSubmissionMarks = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { updatedAnswers } = req.body;

    console.log("=== UPDATE MARKS DEBUG ===");
    console.log("submissionId:", submissionId);
    console.log("updatedAnswers:", JSON.stringify(updatedAnswers, null, 2));

    if (!Array.isArray(updatedAnswers) || updatedAnswers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Updated answers array is required",
      });
    }

    const submission = await Submission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    console.log("Found submission with", submission.answers.length, "answers");
    console.log(
      "Answer questionIds:",
      submission.answers.map((a, i) => `[${i}]: ${a.questionId}`)
    );

    // Update marks for each answer
    updatedAnswers.forEach((update) => {
      let answerIndex = -1;

      // Check if it's an AI-generated question ID (format: ai-0, ai-1, etc.)
      if (update.questionId?.startsWith("ai-")) {
        const indexNum = parseInt(update.questionId.replace("ai-", ""), 10);
        console.log(`AI format detected: ai-${indexNum}`);
        if (
          !isNaN(indexNum) &&
          indexNum >= 0 &&
          indexNum < submission.answers.length
        ) {
          answerIndex = indexNum;
        }
      } else {
        // Regular questionId lookup
        console.log(`Regular questionId lookup: ${update.questionId}`);
        answerIndex = submission.answers.findIndex(
          (a) => a.questionId?.toString() === update.questionId?.toString()
        );
      }

      console.log(`answerIndex found: ${answerIndex}`);

      if (answerIndex !== -1) {
        // Update earned marks if provided
        if (update.earnedMarks !== undefined) {
          const maxMarks = submission.answers[answerIndex].marks || 0;
          // Ensure earned marks don't exceed maximum marks for the question
          const cappedMarks = Math.min(update.earnedMarks, maxMarks);
          submission.answers[answerIndex].earnedMarks = Math.max(
            0,
            cappedMarks
          );
        }

        // Update correct option for MCQ questions
        if (update.correctOption !== undefined) {
          submission.answers[answerIndex].correctOption = update.correctOption;
        }

        // Update correct answer for written/fill-blank questions
        if (update.correctAnswer !== undefined) {
          submission.answers[answerIndex].correctAnswer = update.correctAnswer;
        }
      } else if (update.questionId && !update.questionId.startsWith("ai-")) {
        // Answer not found - this is an unattempted question, create a new entry
        console.log(
          `Creating new answer entry for unattempted question: ${update.questionId}`
        );

        // The marks will be set properly from frontend's maxMarks
        const newAnswer = {
          questionId: update.questionId,
          marks: update.maxMarks || 1,
          earnedMarks: Math.max(
            0,
            Math.min(update.earnedMarks || 0, update.maxMarks || 1)
          ),
        };

        if (update.correctOption !== undefined) {
          newAnswer.correctOption = update.correctOption;
        }
        if (update.correctAnswer !== undefined) {
          newAnswer.correctAnswer = update.correctAnswer;
        }

        submission.answers.push(newAnswer);
        console.log(`Added new answer entry:`, newAnswer);
      }
    });

    // Recalculate total score from ALL answers
    const totalScore = submission.answers.reduce(
      (sum, answer) => sum + (answer.earnedMarks || 0),
      0
    );
    submission.score = totalScore;

    await submission.save();

    res.status(200).json({
      success: true,
      message: "Marks updated successfully",
      data: {
        submission: {
          id: submission._id,
          score: submission.score,
        },
      },
    });
  } catch (error) {
    console.error("Update marks error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating marks",
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
  updateSubmissionMarks,
  submitValidation,
};
