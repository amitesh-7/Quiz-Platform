import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowLeft,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiSave,
  FiX,
  FiZap,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiFileText,
  FiDownload,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import Loading from "../../components/Loading";
import { quizAPI, questionAPI, geminiAPI } from "../../services/api";

const ManageQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Question form state
  const [questionForm, setQuestionForm] = useState({
    questionType: "mcq",
    questionText: "",
    options: ["", "", "", ""],
    correctOption: 0,
    correctAnswer: "",
    blanks: [""],
    matchPairs: [{ left: "", right: "" }],
    marks: 1,
    section: "",
    subParts: [],
    hasAlternative: false,
    alternativeQuestion: "",
    alternativeAnswer: "",
  });

  // Generate form state
  const [generateForm, setGenerateForm] = useState({
    topic: "",
    numberOfQuestions: 5,
    difficulty: "medium",
    language: "english",
    questionTypes: ["mcq"],
    description: "",
    examFormat: "general",
  });
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);

  // Bulk process state
  const [bulkForm, setBulkForm] = useState({
    rawQuestions: "",
    maxMarks: 50,
    marksDistribution: "",
    numberOfQuestions: "",
    language: "english",
    examFormat: "general",
    difficulty: "medium",
  });
  const [processingBulk, setProcessingBulk] = useState(false);
  const [processedQuestions, setProcessedQuestions] = useState([]);

  // Image extraction state
  const [imageForm, setImageForm] = useState({
    images: [], // Array of {data: base64, preview: url}
    maxMarks: 50,
    marksDistribution: "",
    additionalInstructions: "",
    language: "english",
    examFormat: "general",
    difficulty: "medium",
  });
  const [extracting, setExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState([]);

  useEffect(() => {
    fetchQuizData();
  }, [quizId]);

  const fetchQuizData = async () => {
    try {
      const [quizRes, questionsRes] = await Promise.all([
        quizAPI.getOne(quizId),
        questionAPI.getByQuiz(quizId),
      ]);
      setQuiz(quizRes.data.data.quiz);
      setQuestions(questionsRes.data.data.questions);
    } catch (error) {
      toast.error("Failed to fetch quiz data");
      navigate("/teacher");
    } finally {
      setLoading(false);
    }
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      questionType: "mcq",
      questionText: "",
      options: ["", "", "", ""],
      correctOption: 0,
      correctAnswer: "",
      blanks: [""],
      matchPairs: [{ left: "", right: "" }],
      marks: 1,
      section: "",
      subParts: [],
      hasAlternative: false,
      alternativeQuestion: "",
      alternativeAnswer: "",
    });
    setEditingQuestion(null);
  };

  const handleAddQuestion = async () => {
    if (!questionForm.questionText.trim()) {
      toast.error("Question text is required");
      return;
    }

    // Validate based on question type
    if (questionForm.questionType === "mcq") {
      if (questionForm.options.some((opt) => !opt.trim())) {
        toast.error("All options are required");
        return;
      }
    } else if (questionForm.questionType === "truefalse") {
      // True/False uses fixed options, just ensure correctOption is set
      if (
        questionForm.correctOption !== 0 &&
        questionForm.correctOption !== 1
      ) {
        toast.error("Please select True or False as the correct answer");
        return;
      }
    } else if (questionForm.questionType === "written") {
      if (!questionForm.correctAnswer.trim()) {
        toast.error("Expected answer is required");
        return;
      }
    } else if (questionForm.questionType === "fillblank") {
      if (questionForm.blanks.some((b) => !b.trim())) {
        toast.error("All blanks must be filled");
        return;
      }
    } else if (questionForm.questionType === "matching") {
      if (
        questionForm.matchPairs.some((p) => !p.left.trim() || !p.right.trim())
      ) {
        toast.error("All matching pairs must be filled");
        return;
      }
    }

    try {
      if (editingQuestion) {
        await questionAPI.update(editingQuestion._id, questionForm);
        setQuestions(
          questions.map((q) =>
            q._id === editingQuestion._id ? { ...q, ...questionForm } : q
          )
        );
        toast.success("Question updated");
      } else {
        const response = await questionAPI.create({
          quizId,
          ...questionForm,
        });
        setQuestions([...questions, response.data.data.question]);
        toast.success("Question added");
      }

      // Update quiz total marks
      const newTotalMarks =
        questions.reduce(
          (acc, q) => (q._id === editingQuestion?._id ? acc : acc + q.marks),
          0
        ) + questionForm.marks;
      setQuiz({ ...quiz, totalMarks: newTotalMarks });

      setShowAddModal(false);
      resetQuestionForm();
    } catch (error) {
      toast.error("Failed to save question");
    }
  };

  const handleEditQuestion = (question) => {
    setQuestionForm({
      questionType: question.questionType || "mcq",
      questionText: question.questionText,
      options: question.options || ["", "", "", ""],
      correctOption: question.correctOption || 0,
      correctAnswer: question.correctAnswer || "",
      blanks: question.blanks || [""],
      matchPairs: question.matchPairs || [{ left: "", right: "" }],
      marks: question.marks,
      section: question.section || "",
      subParts: question.subParts || [],
      hasAlternative: question.hasAlternative || false,
      alternativeQuestion: question.alternativeQuestion || "",
      alternativeAnswer: question.alternativeAnswer || "",
    });
    setEditingQuestion(question);
    setShowAddModal(true);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Delete this question?")) return;

    try {
      await questionAPI.delete(questionId);
      const deletedQuestion = questions.find((q) => q._id === questionId);
      setQuestions(questions.filter((q) => q._id !== questionId));
      setQuiz({ ...quiz, totalMarks: quiz.totalMarks - deletedQuestion.marks });
      toast.success("Question deleted");
    } catch (error) {
      toast.error("Failed to delete question");
    }
  };

  const handleDeleteAllQuestions = async () => {
    if (questions.length === 0) {
      toast.error("No questions to delete");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete all ${questions.length} questions? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      // Delete all questions one by one
      const deletePromises = questions.map((q) => questionAPI.delete(q._id));
      await Promise.all(deletePromises);

      setQuestions([]);
      setQuiz({ ...quiz, totalMarks: 0 });
      toast.success(`Deleted all ${questions.length} questions`);
    } catch (error) {
      toast.error("Failed to delete some questions");
      fetchQuizData(); // Refresh to get current state
    }
  };

  // PDF Download Function - Direct download with board style
  const handleDownloadPDF = async () => {
    if (questions.length === 0) {
      toast.error("No questions to download");
      return;
    }

    toast.loading("PDF बन रहा है...", { id: "pdf-gen" });

    // Group questions by section
    const sections = {};
    questions.forEach((q, idx) => {
      const section = q.section || "General";
      if (!sections[section]) sections[section] = [];
      sections[section].push({ ...q, qNum: idx + 1 });
    });

    // Build questions HTML
    let questionsHTML = "";
    Object.entries(sections).forEach(([sectionName, sectionQuestions]) => {
      if (sectionName !== "General") {
        questionsHTML += `
          <div class="section-break"></div>
          <div class="section-header">${sectionName}</div>
          <div class="section-gap"></div>
        `;
      }
      sectionQuestions.forEach((q) => {
        questionsHTML += `
          <div class="question">
            <div class="q-line">
              <span class="q-num">प्रश्न ${q.qNum}.</span>
              <span class="q-marks">[${q.marks} अंक]</span>
            </div>
            <div class="q-text">${q.questionText || ""}</div>
        `;

        if (q.subParts && q.subParts.length > 0) {
          q.subParts.forEach((part) => {
            questionsHTML += `<div class="sub-part">${part.part} ${part.question} (${part.marks} अंक)</div>`;
          });
        }

        if (
          (q.questionType === "mcq" || q.questionType === "truefalse") &&
          q.options
        ) {
          questionsHTML += `
            <div class="options">
              <div class="opt-row">
                <span class="opt">(अ) ${q.options[0] || ""}</span>
                <span class="opt">(ब) ${q.options[1] || ""}</span>
              </div>
              <div class="opt-row">
                <span class="opt">(स) ${q.options[2] || ""}</span>
                <span class="opt">(द) ${q.options[3] || ""}</span>
              </div>
            </div>
          `;
        }

        if (q.hasAlternative && q.alternativeQuestion) {
          questionsHTML += `
            <div class="or-section">
              <div class="or-text">अथवा</div>
              <div class="q-text">${q.alternativeQuestion}</div>
            </div>
          `;
        }

        questionsHTML += `</div>`;
      });
    });

    // Build answers HTML
    let answersHTML = "";
    Object.entries(sections).forEach(([sectionName, sectionQuestions]) => {
      if (sectionName !== "General") {
        answersHTML += `
          <div class="section-break"></div>
          <div class="ans-section-header">${sectionName}</div>
          <div class="section-gap"></div>
        `;
      }
      sectionQuestions.forEach((q) => {
        answersHTML += `<div class="answer"><div class="ans-num">उत्तर ${q.qNum}. [${q.marks} अंक]</div>`;

        if (
          (q.questionType === "mcq" || q.questionType === "truefalse") &&
          q.options
        ) {
          const optLabels = ["अ", "ब", "स", "द"];
          answersHTML += `<div class="ans-text correct">(${
            optLabels[q.correctOption || 0]
          }) ${q.options[q.correctOption] || ""}</div>`;
        }

        if (q.questionType === "written" && q.correctAnswer) {
          answersHTML += `<div class="ans-text">${q.correctAnswer}</div>`;
        }

        if (q.subParts && q.subParts.length > 0) {
          q.subParts.forEach((part) => {
            answersHTML += `<div class="sub-ans"><b>${part.part}</b> ${
              part.answer || ""
            }</div>`;
          });
        }

        if (q.questionType === "fillblank" && q.blanks) {
          answersHTML += `<div class="ans-text correct">${q.blanks.join(
            ", "
          )}</div>`;
        }

        if (q.questionType === "matching" && q.matchPairs) {
          answersHTML += `<div class="match-ans">`;
          q.matchPairs.forEach((pair, idx) => {
            answersHTML += `${idx + 1}. ${pair.left} → ${pair.right}<br/>`;
          });
          answersHTML += `</div>`;
        }

        if (q.hasAlternative && q.alternativeAnswer) {
          answersHTML += `<div class="or-ans"><b>अथवा:</b><br/>${q.alternativeAnswer}</div>`;
        }

        answersHTML += `</div>`;
      });
    });

    const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap');
@page { size: A4; margin: 15mm 12mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Noto Sans Devanagari', serif; font-size: 12px; line-height: 1.5; color: #000; }
.header { text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 15px; }
.header h1 { font-size: 18px; font-weight: 700; margin-bottom: 5px; }
.header h2 { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.header-info { display: flex; justify-content: space-between; font-size: 11px; border-top: 1px solid #000; padding-top: 8px; margin-top: 8px; }
.header-info div { text-align: left; }

.section-break { height: 8px; }
.section-gap { height: 12px; }
.section-header { 
  font-size: 13px; font-weight: 700; text-align: center; 
  border: 1px solid #000; padding: 6px 10px; 
  background: #f5f5f5; margin: 10px 0;
}

.question { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dotted #ccc; }
.q-line { display: flex; justify-content: space-between; margin-bottom: 4px; }
.q-num { font-weight: 700; font-size: 12px; }
.q-marks { font-size: 11px; color: #333; }
.q-text { font-size: 12px; line-height: 1.6; margin: 4px 0 6px 20px; white-space: pre-wrap; }

.options { margin: 6px 0 0 20px; }
.opt-row { display: flex; margin-bottom: 3px; }
.opt { width: 50%; font-size: 11px; padding: 2px 0; }

.sub-part { font-size: 11px; margin: 4px 0 4px 30px; line-height: 1.5; }

.or-section { margin: 10px 0 0 20px; padding: 8px; border: 1px dashed #666; background: #fafafa; }
.or-text { font-weight: 700; text-align: center; margin-bottom: 5px; font-size: 12px; }

.page-break { page-break-before: always; }

.ans-header { text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 15px; background: #f0f0f0; }
.ans-header h1 { font-size: 16px; font-weight: 700; }

.ans-section-header { 
  font-size: 12px; font-weight: 700; text-align: center; 
  border: 1px solid #000; padding: 5px 10px; 
  background: #e8f5e9; margin: 10px 0;
}

.answer { margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px dotted #ccc; }
.ans-num { font-weight: 700; font-size: 11px; margin-bottom: 3px; }
.ans-text { font-size: 11px; line-height: 1.6; margin-left: 15px; white-space: pre-wrap; text-align: justify; }
.ans-text.correct { font-weight: 600; color: #1b5e20; background: #e8f5e9; padding: 3px 8px; display: inline-block; border-radius: 3px; }
.sub-ans { font-size: 11px; margin: 4px 0 4px 25px; line-height: 1.5; }
.match-ans { font-size: 11px; margin-left: 15px; line-height: 1.6; }
.or-ans { margin: 8px 0 0 15px; padding: 6px; background: #fff8e1; border: 1px dashed #f9a825; font-size: 11px; line-height: 1.5; }

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .question, .answer { break-inside: avoid; }
}
</style>
</head>
<body>

<div class="header">
  <h1>${quiz.title || "प्रश्न पत्र"}</h1>
  <h2>विषय: विज्ञान</h2>
  <div class="header-info">
    <div><b>समय:</b> ${quiz.duration} मिनट</div>
    <div><b>पूर्णांक:</b> ${quiz.totalMarks} अंक</div>
    <div><b>प्रश्न:</b> ${questions.length}</div>
  </div>
</div>

<div class="instructions" style="font-size:10px;margin-bottom:12px;padding:6px;border:1px solid #ddd;background:#fafafa;">
  <b>निर्देश:</b> (i) सभी प्रश्न अनिवार्य हैं। (ii) प्रत्येक प्रश्न के अंक उसके सामने अंकित हैं।
</div>

${questionsHTML}

<div class="page-break"></div>

<div class="ans-header">
  <h1>उत्तर कुंजी / Answer Key</h1>
  <div style="font-size:11px;margin-top:5px;">${quiz.title || ""}</div>
</div>

${answersHTML}

</body>
</html>`;

    try {
      // Create blob and download
      const blob = new Blob([fullHTML], { type: "text/html;charset=utf-8" });

      // Create iframe for printing to PDF
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(fullHTML);
      iframeDoc.close();

      // Wait for content and fonts to load
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      };

      toast.success("Print dialog opened - Save as PDF", { id: "pdf-gen" });
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("PDF generation failed", { id: "pdf-gen" });
    }
  };

  const handleGenerate = async () => {
    if (!generateForm.topic.trim()) {
      toast.error("Topic is required");
      return;
    }

    setGenerating(true);
    try {
      const response = await geminiAPI.generate(generateForm);
      setGeneratedQuestions(response.data.data.questions);
      toast.success(
        `Generated ${response.data.data.questions.length} questions`
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to generate questions"
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleAddGeneratedQuestions = async () => {
    if (generatedQuestions.length === 0) return;

    try {
      console.log("Adding questions to quiz:", {
        quizId,
        count: generatedQuestions.length,
      });
      await questionAPI.bulkCreate({
        quizId,
        questions: generatedQuestions,
      });

      toast.success(
        `Successfully added ${generatedQuestions.length} questions`
      );
      await fetchQuizData(); // Refresh to get updated questions
      setShowGenerateModal(false);
      setGeneratedQuestions([]);
      setGenerateForm({
        topic: "",
        numberOfQuestions: 5,
        difficulty: "medium",
        language: "english",
        questionTypes: ["mcq"],
        description: "",
        examFormat: "general",
      });
      toast.success("Questions added successfully");
    } catch (error) {
      console.error("Failed to add questions:", error.response?.data);
      const errorMsg =
        error.response?.data?.message || "Failed to add questions";
      const validationErrors = error.response?.data?.errors;

      if (validationErrors && validationErrors.length > 0) {
        console.error("Validation errors:", validationErrors);
        toast.error(`${errorMsg}: ${validationErrors[0].message}`);
      } else {
        toast.error(errorMsg);
      }
    }
  };

  // Bulk process questions
  const handleProcessBulk = async () => {
    if (!bulkForm.rawQuestions.trim()) {
      toast.error("Please enter questions to process");
      return;
    }

    setProcessingBulk(true);
    try {
      const payload = {
        rawQuestions: bulkForm.rawQuestions,
        maxMarks: bulkForm.maxMarks || 50,
        marksDistribution: bulkForm.marksDistribution || "",
        numberOfQuestions: bulkForm.numberOfQuestions
          ? parseInt(bulkForm.numberOfQuestions)
          : null,
        language: bulkForm.language || "english",
        examFormat: bulkForm.examFormat || "general",
        difficulty: bulkForm.difficulty || "medium",
      };
      console.log("Bulk Process Payload:", payload);
      const response = await geminiAPI.processQuestions(payload);
      setProcessedQuestions(response.data.data.questions);
      toast.success(
        `Processed ${response.data.data.questions.length} questions`
      );
    } catch (error) {
      console.error("Bulk Process Error:", error.response?.data || error);
      toast.error(
        error.response?.data?.message || "Failed to process questions"
      );
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleAddProcessedQuestions = async () => {
    if (processedQuestions.length === 0) return;

    try {
      await questionAPI.bulkCreate({
        quizId,
        questions: processedQuestions,
      });

      await fetchQuizData();
      setShowBulkModal(false);
      setProcessedQuestions([]);
      setBulkForm({
        rawQuestions: "",
        maxMarks: 50,
        marksDistribution: "",
        numberOfQuestions: "",
        language: "english",
        examFormat: "general",
        difficulty: "medium",
      });
      toast.success("Questions added to quiz");
    } catch (error) {
      toast.error("Failed to add questions");
    }
  };

  // Handle image upload - supports multiple images (max 5)
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Check current count + new files
    const currentCount = imageForm.images?.length || 0;
    const remainingSlots = 5 - currentCount;

    if (remainingSlots <= 0) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.error(`Only ${remainingSlots} more image(s) can be added (max 5)`);
    }

    // Validate all files are images
    const invalidFiles = filesToProcess.filter(
      (f) => !f.type.startsWith("image/")
    );
    if (invalidFiles.length > 0) {
      toast.error("Please upload only image files (JPG, PNG, JPEG)");
      return;
    }

    // Process each file
    const processFile = (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            data: reader.result,
            preview: reader.result,
            name: file.name,
          });
        };
        reader.readAsDataURL(file);
      });
    };

    Promise.all(filesToProcess.map(processFile)).then((newImages) => {
      setImageForm({
        ...imageForm,
        images: [...(imageForm.images || []), ...newImages],
      });
      toast.success(`Added ${newImages.length} image(s)`);
    });

    // Reset input to allow selecting same file again
    e.target.value = "";
  };

  // Remove a specific image
  const handleRemoveImage = (index) => {
    const newImages = imageForm.images.filter((_, i) => i !== index);
    setImageForm({
      ...imageForm,
      images: newImages,
    });
  };

  const handleExtractFromImage = async () => {
    if (!imageForm.images || imageForm.images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    setExtracting(true);
    try {
      const response = await geminiAPI.extractQuestionsFromImage({
        images: imageForm.images.map((img) => img.data), // Send array of base64 images
        maxMarks: imageForm.maxMarks,
        marksDistribution: imageForm.marksDistribution,
        additionalInstructions: imageForm.additionalInstructions,
        language: imageForm.language,
        examFormat: imageForm.examFormat,
        difficulty: imageForm.difficulty,
      });
      setExtractedQuestions(response.data.data.questions);
      toast.success(
        `Extracted ${response.data.data.questions.length} questions`
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to extract questions from image"
      );
    } finally {
      setExtracting(false);
    }
  };

  // PDF Download for Extracted Questions
  const handleDownloadExtractedPDF = () => {
    if (extractedQuestions.length === 0) {
      toast.error("No questions to download");
      return;
    }

    toast.loading("PDF बन रहा है...", { id: "pdf-gen" });

    // Group questions by section
    const sections = {};
    extractedQuestions.forEach((q, idx) => {
      const section = q.section || "General";
      if (!sections[section]) sections[section] = [];
      sections[section].push({ ...q, qNum: idx + 1 });
    });

    // Build questions HTML
    let questionsHTML = "";
    Object.entries(sections).forEach(([sectionName, sectionQuestions]) => {
      if (sectionName !== "General") {
        questionsHTML += `
          <div class="section-break"></div>
          <div class="section-header">${sectionName}</div>
          <div class="section-gap"></div>
        `;
      }
      sectionQuestions.forEach((q) => {
        questionsHTML += `
          <div class="question">
            <div class="q-line">
              <span class="q-num">प्रश्न ${q.qNum}.</span>
              <span class="q-marks">[${q.marks} अंक]</span>
            </div>
            <div class="q-text">${q.questionText || ""}</div>
        `;

        if (
          (q.questionType === "mcq" || q.questionType === "truefalse") &&
          q.options
        ) {
          questionsHTML += `
            <div class="options">
              <div class="opt-row">
                <span class="opt">(अ) ${q.options[0] || ""}</span>
                <span class="opt">(ब) ${q.options[1] || ""}</span>
              </div>
              <div class="opt-row">
                <span class="opt">(स) ${q.options[2] || ""}</span>
                <span class="opt">(द) ${q.options[3] || ""}</span>
              </div>
            </div>
          `;
        }

        if (q.hasAlternative && q.alternativeQuestion) {
          questionsHTML += `
            <div class="or-section">
              <div class="or-text">अथवा / OR</div>
              <div class="q-text">${q.alternativeQuestion}</div>
            </div>
          `;
        }

        questionsHTML += `</div>`;
      });
    });

    // Build answers HTML
    let answersHTML = "";
    Object.entries(sections).forEach(([sectionName, sectionQuestions]) => {
      if (sectionName !== "General") {
        answersHTML += `
          <div class="section-break"></div>
          <div class="ans-section-header">${sectionName}</div>
          <div class="section-gap"></div>
        `;
      }
      sectionQuestions.forEach((q) => {
        answersHTML += `<div class="answer"><div class="ans-num">उत्तर ${q.qNum}. [${q.marks} अंक]</div>`;

        if (
          (q.questionType === "mcq" || q.questionType === "truefalse") &&
          q.options
        ) {
          const optLabels = ["अ", "ब", "स", "द"];
          answersHTML += `<div class="ans-text correct">(${
            optLabels[q.correctOption || 0]
          }) ${q.options[q.correctOption] || ""}</div>`;
        }

        if (q.questionType === "written" && q.correctAnswer) {
          answersHTML += `<div class="ans-text">${q.correctAnswer}</div>`;
        }

        if (q.questionType === "fillblank" && q.blanks) {
          answersHTML += `<div class="ans-text correct">${q.blanks.join(
            ", "
          )}</div>`;
        }

        if (q.hasAlternative && q.alternativeAnswer) {
          answersHTML += `<div class="or-ans"><b>अथवा:</b><br/>${q.alternativeAnswer}</div>`;
        }

        answersHTML += `</div>`;
      });
    });

    const totalMarks = extractedQuestions.reduce((sum, q) => sum + q.marks, 0);

    const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap');
@page { size: A4; margin: 15mm 12mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Noto Sans Devanagari', serif; font-size: 12px; line-height: 1.5; color: #000; }
.header { text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 15px; }
.header h1 { font-size: 18px; font-weight: 700; margin-bottom: 5px; }
.header h2 { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.header-info { display: flex; justify-content: space-between; font-size: 11px; border-top: 1px solid #000; padding-top: 8px; margin-top: 8px; }

.section-break { height: 8px; }
.section-gap { height: 12px; }
.section-header { 
  font-size: 13px; font-weight: 700; text-align: center; 
  border: 1px solid #000; padding: 6px 10px; 
  background: #f5f5f5; margin: 10px 0;
}

.question { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dotted #ccc; }
.q-line { display: flex; justify-content: space-between; margin-bottom: 4px; }
.q-num { font-weight: 700; font-size: 12px; }
.q-marks { font-size: 11px; color: #333; }
.q-text { font-size: 12px; line-height: 1.6; margin: 4px 0 6px 20px; white-space: pre-wrap; }

.options { margin: 6px 0 0 20px; }
.opt-row { display: flex; margin-bottom: 3px; }
.opt { width: 50%; font-size: 11px; padding: 2px 0; }

.or-section { margin: 10px 0 0 20px; padding: 8px; border: 1px dashed #666; background: #fafafa; }
.or-text { font-weight: 700; text-align: center; margin-bottom: 5px; font-size: 12px; }

.page-break { page-break-before: always; }

.ans-header { text-align: center; border: 2px solid #000; padding: 10px; margin-bottom: 15px; background: #f0f0f0; }
.ans-header h1 { font-size: 16px; font-weight: 700; }

.ans-section-header { 
  font-size: 12px; font-weight: 700; text-align: center; 
  border: 1px solid #000; padding: 5px 10px; 
  background: #e8f5e9; margin: 10px 0;
}

.answer { margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px dotted #ccc; }
.ans-num { font-weight: 700; font-size: 11px; margin-bottom: 3px; }
.ans-text { font-size: 11px; line-height: 1.6; margin-left: 15px; white-space: pre-wrap; text-align: justify; }
.ans-text.correct { font-weight: 600; color: #1b5e20; background: #e8f5e9; padding: 3px 8px; display: inline-block; border-radius: 3px; }
.or-ans { margin: 8px 0 0 15px; padding: 6px; background: #fff8e1; border: 1px dashed #f9a825; font-size: 11px; line-height: 1.5; }

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .question, .answer { break-inside: avoid; }
}
</style>
</head>
<body>

<div class="header">
  <h1>प्रश्न पत्र / Question Paper</h1>
  <h2>विषय: विज्ञान / Subject: Science</h2>
  <div class="header-info">
    <div><b>पूर्णांक:</b> ${totalMarks} अंक</div>
    <div><b>प्रश्न:</b> ${extractedQuestions.length}</div>
  </div>
</div>

<div class="instructions" style="font-size:10px;margin-bottom:12px;padding:6px;border:1px solid #ddd;background:#fafafa;">
  <b>निर्देश:</b> (i) सभी प्रश्न अनिवार्य हैं। (ii) प्रत्येक प्रश्न के अंक उसके सामने अंकित हैं।
</div>

${questionsHTML}

<div class="page-break"></div>

<div class="ans-header">
  <h1>उत्तर कुंजी / Answer Key</h1>
</div>

${answersHTML}

</body>
</html>`;

    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(fullHTML);
      iframeDoc.close();

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      };

      toast.success("Print dialog opened - Save as PDF", { id: "pdf-gen" });
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("PDF generation failed", { id: "pdf-gen" });
    }
  };

  const handleAddExtractedQuestions = async () => {
    if (extractedQuestions.length === 0) return;

    try {
      await questionAPI.bulkCreate({
        quizId,
        questions: extractedQuestions,
      });

      await fetchQuizData();
      setShowImageModal(false);
      setExtractedQuestions([]);
      setImageForm({
        images: [],
        maxMarks: 50,
        marksDistribution: "",
        additionalInstructions: "",
        language: "english",
        examFormat: "general",
        difficulty: "medium",
      });
      toast.success("Questions added to quiz");
    } catch (error) {
      toast.error("Failed to add questions");
    }
  };

  if (loading) {
    return <Loading message="Loading quiz..." />;
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

        {/* Quiz Info */}
        <motion.div
          className="glass-card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {quiz.title}
              </h1>
              <p className="text-gray-400 mb-4">
                {quiz.description || "No description"}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <FiClock className="w-4 h-4" />
                  <span>{quiz.duration} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <FiCheckCircle className="w-4 h-4" />
                  <span>{quiz.totalMarks} total marks</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <FiAlertCircle className="w-4 h-4" />
                  <span>{questions.length} questions</span>
                </div>
                {questions.length > 0 && (
                  <motion.button
                    onClick={handleDeleteAllQuestions}
                    className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Delete All
                  </motion.button>
                )}
                {questions.length > 0 && (
                  <motion.button
                    onClick={handleDownloadPDF}
                    className="text-green-400 hover:text-green-300 text-sm flex items-center gap-1 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiDownload className="w-4 h-4" />
                    Download PDF
                  </motion.button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <motion.button
                onClick={() => setShowImageModal(true)}
                className="btn-secondary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiFileText className="w-5 h-5 text-blue-400" />
                Extract from Image
              </motion.button>
              <motion.button
                onClick={() => setShowBulkModal(true)}
                className="btn-secondary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiFileText className="w-5 h-5 text-green-400" />
                Bulk Process
              </motion.button>
              <motion.button
                onClick={() => setShowGenerateModal(true)}
                className="btn-secondary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiZap className="w-5 h-5 text-yellow-400" />
                Generate with AI
              </motion.button>
              <motion.button
                onClick={() => {
                  resetQuestionForm();
                  setShowAddModal(true);
                }}
                className="btn-primary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiPlus className="w-5 h-5" />
                Add Question
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Questions List */}
        {questions.length === 0 ? (
          <motion.div
            className="glass-card text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-6xl mb-4">❓</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No questions yet
            </h2>
            <p className="text-gray-400 mb-6">
              Add questions manually or generate with AI
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.button
                onClick={() => setShowImageModal(true)}
                className="btn-secondary flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                <FiFileText className="w-5 h-5 text-blue-400" />
                Extract from Image
              </motion.button>
              <motion.button
                onClick={() => setShowBulkModal(true)}
                className="btn-secondary flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                <FiFileText className="w-5 h-5 text-green-400" />
                Bulk Process
              </motion.button>
              <motion.button
                onClick={() => setShowGenerateModal(true)}
                className="btn-secondary flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                <FiZap className="w-5 h-5 text-yellow-400" />
                Generate with AI
              </motion.button>
              <motion.button
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                <FiPlus className="w-5 h-5" />
                Add Manually
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Group questions by section */}
            {(() => {
              const sections = {};
              questions.forEach((q, idx) => {
                const section = q.section || "Questions";
                if (!sections[section]) sections[section] = [];
                sections[section].push({ ...q, originalIndex: idx });
              });

              return Object.entries(sections).map(
                ([sectionName, sectionQuestions]) => (
                  <div key={sectionName}>
                    {/* Section Header - only show if section exists and is not default */}
                    {sectionName !== "Questions" && (
                      <motion.div
                        className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-4 mb-4"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <p className="text-yellow-300 font-bold">
                          {sectionName}
                        </p>
                        <p className="text-xs text-yellow-400/70 mt-1">
                          {sectionQuestions.length} questions •{" "}
                          {sectionQuestions.reduce(
                            (sum, q) => sum + q.marks,
                            0
                          )}{" "}
                          marks
                        </p>
                      </motion.div>
                    )}

                    {/* Questions in this section */}
                    {sectionQuestions.map((question) => (
                      <motion.div
                        key={question._id}
                        className="glass-card"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: question.originalIndex * 0.05 }}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <span className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 font-bold">
                                {question.originalIndex + 1}
                              </span>
                              <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">
                                {question.marks} mark
                                {question.marks > 1 ? "s" : ""}
                              </span>
                              <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                                {question.questionType === "mcq" && "📝 MCQ"}
                                {question.questionType === "written" &&
                                  "✍️ Written"}
                                {question.questionType === "fillblank" &&
                                  "📄 Fill Blank"}
                                {question.questionType === "matching" &&
                                  "🔗 Matching"}
                                {question.questionType === "truefalse" &&
                                  "✓✗ True/False"}
                              </span>
                              {question.hasAlternative && (
                                <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full">
                                  अथवा/OR
                                </span>
                              )}
                            </div>
                            <p className="text-white mb-4 whitespace-pre-line">
                              {question.questionText}
                            </p>

                            {/* Sub-parts for multi-part questions */}
                            {question.subParts &&
                              question.subParts.length > 0 && (
                                <div className="mb-4 space-y-2">
                                  {question.subParts.map((part, idx) => (
                                    <div
                                      key={idx}
                                      className="p-3 bg-white/5 border border-white/10 rounded-lg"
                                    >
                                      <p className="text-blue-400 font-medium">
                                        {part.part} ({part.marks} marks)
                                      </p>
                                      <p className="text-white text-sm mt-1">
                                        {part.question}
                                      </p>
                                      <p className="text-green-400 text-sm mt-1">
                                        Answer: {part.answer}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}

                            {/* MCQ and True/False options */}
                            {(question.questionType === "mcq" ||
                              question.questionType === "truefalse") &&
                              question.options && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {question.options.map((option, optIndex) => (
                                    <div
                                      key={optIndex}
                                      className={`p-3 rounded-lg ${
                                        optIndex === question.correctOption
                                          ? "bg-green-500/20 border border-green-500/30 text-green-300"
                                          : "bg-white/5 border border-white/10 text-gray-400"
                                      }`}
                                    >
                                      <span className="font-medium mr-2">
                                        {String.fromCharCode(65 + optIndex)}.
                                      </span>
                                      {option}
                                      {optIndex === question.correctOption && (
                                        <FiCheckCircle className="inline ml-2 w-4 h-4" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                            {/* Written answer */}
                            {question.questionType === "written" &&
                              question.correctAnswer && (
                                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300 text-sm">
                                  <span className="font-medium">
                                    Expected Answer:{" "}
                                  </span>
                                  <span className="whitespace-pre-line">
                                    {question.correctAnswer}
                                  </span>
                                </div>
                              )}

                            {/* Alternative question (OR) */}
                            {question.hasAlternative &&
                              question.alternativeQuestion && (
                                <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                  <p className="text-orange-400 font-medium mb-2">
                                    अथवा / OR:
                                  </p>
                                  <p className="text-white text-sm whitespace-pre-line">
                                    {question.alternativeQuestion}
                                  </p>
                                  {question.alternativeAnswer && (
                                    <p className="text-green-400 text-sm mt-2">
                                      <span className="font-medium">
                                        Answer:{" "}
                                      </span>
                                      <span className="whitespace-pre-line">
                                        {question.alternativeAnswer}
                                      </span>
                                    </p>
                                  )}
                                </div>
                              )}

                            {/* Fill in blanks */}
                            {question.questionType === "fillblank" &&
                              question.blanks && (
                                <div className="flex flex-wrap gap-2">
                                  {question.blanks.map((blank, idx) => (
                                    <span
                                      key={idx}
                                      className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-sm"
                                    >
                                      Blank {idx + 1}: {blank}
                                    </span>
                                  ))}
                                </div>
                              )}

                            {/* Matching pairs */}
                            {question.questionType === "matching" &&
                              question.matchPairs && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {question.matchPairs.map((pair, idx) => (
                                    <div
                                      key={idx}
                                      className="p-2 bg-white/5 border border-white/10 rounded-lg text-sm flex items-center gap-2"
                                    >
                                      <span className="text-blue-400">
                                        {pair.left}
                                      </span>
                                      <span className="text-gray-500">→</span>
                                      <span className="text-green-400">
                                        {pair.right}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>

                          <div className="flex gap-2">
                            <motion.button
                              onClick={() => handleEditQuestion(question)}
                              className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <FiEdit className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                              onClick={() => handleDeleteQuestion(question._id)}
                              className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <FiTrash2 className="w-5 h-5" />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              );
            })()}
          </div>
        )}

        {/* Add/Edit Question Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-white">
                    {editingQuestion ? "Edit Question" : "Add Question"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetQuestionForm();
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <FiX className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Question Type Selection */}
                  <div className="form-group">
                    <label className="input-label text-sm mb-2">
                      Question Type
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        {
                          value: "mcq",
                          label: "📝 MCQ",
                          title: "Multiple Choice",
                        },
                        {
                          value: "written",
                          label: "✍️ Written",
                          title: "Written Answer",
                        },
                        {
                          value: "fillblank",
                          label: "📄 Fill",
                          title: "Fill in Blanks",
                        },
                        {
                          value: "matching",
                          label: "🔗 Match",
                          title: "Match Following",
                        },
                        {
                          value: "truefalse",
                          label: "✓✗ T/F",
                          title: "True or False",
                        },
                      ].map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() =>
                            setQuestionForm({
                              ...questionForm,
                              questionType: type.value,
                            })
                          }
                          className={`p-2 rounded-lg text-xs font-medium transition-all ${
                            questionForm.questionType === type.value
                              ? "bg-blue-500 text-white border-2 border-blue-400"
                              : "bg-white/10 text-gray-400 border-2 border-white/10 hover:border-white/30"
                          }`}
                          title={type.title}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="form-group">
                    <label className="input-label text-sm">Question Text</label>
                    <textarea
                      value={questionForm.questionText}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          questionText: e.target.value,
                        })
                      }
                      className="glass-input h-20 resize-none"
                      placeholder="Enter your question..."
                    />
                  </div>

                  {/* Type-Specific Fields */}
                  {questionForm.questionType === "mcq" && (
                    <div className="form-group">
                      <label className="input-label text-sm">Options</label>
                      <div className="space-y-2">
                        {questionForm.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setQuestionForm({
                                  ...questionForm,
                                  correctOption: index,
                                })
                              }
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                                questionForm.correctOption === index
                                  ? "bg-green-500 text-white"
                                  : "bg-white/10 text-gray-400 hover:bg-white/20"
                              }`}
                            >
                              {String.fromCharCode(65 + index)}
                            </button>
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...questionForm.options];
                                newOptions[index] = e.target.value;
                                setQuestionForm({
                                  ...questionForm,
                                  options: newOptions,
                                });
                              }}
                              className="glass-input flex-1 py-1.5 text-sm"
                              placeholder={`Option ${String.fromCharCode(
                                65 + index
                              )}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {questionForm.questionType === "written" && (
                    <div className="form-group">
                      <label className="input-label text-sm">
                        Expected Answer
                      </label>
                      <textarea
                        value={questionForm.correctAnswer}
                        onChange={(e) =>
                          setQuestionForm({
                            ...questionForm,
                            correctAnswer: e.target.value,
                          })
                        }
                        className="glass-input h-24 resize-none text-sm"
                        placeholder="Enter the expected answer or key points..."
                      />
                    </div>
                  )}

                  {questionForm.questionType === "fillblank" && (
                    <div className="form-group">
                      <label className="input-label text-sm">
                        Correct Answers for Blanks
                      </label>
                      <div className="space-y-2">
                        {questionForm.blanks.map((blank, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={blank}
                              onChange={(e) => {
                                const newBlanks = [...questionForm.blanks];
                                newBlanks[index] = e.target.value;
                                setQuestionForm({
                                  ...questionForm,
                                  blanks: newBlanks,
                                });
                              }}
                              className="glass-input flex-1 py-1.5 text-sm"
                              placeholder={`Answer for blank ${index + 1}`}
                            />
                            {questionForm.blanks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newBlanks = questionForm.blanks.filter(
                                    (_, i) => i !== index
                                  );
                                  setQuestionForm({
                                    ...questionForm,
                                    blanks: newBlanks,
                                  });
                                }}
                                className="btn-secondary px-3 py-1.5 text-sm"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setQuestionForm({
                              ...questionForm,
                              blanks: [...questionForm.blanks, ""],
                            })
                          }
                          className="btn-secondary w-full py-1.5 text-sm"
                        >
                          + Add Blank
                        </button>
                      </div>
                    </div>
                  )}

                  {questionForm.questionType === "matching" && (
                    <div className="form-group">
                      <label className="input-label text-sm">
                        Matching Pairs
                      </label>
                      <div className="space-y-2">
                        {questionForm.matchPairs.map((pair, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={pair.left}
                              onChange={(e) => {
                                const newPairs = [...questionForm.matchPairs];
                                newPairs[index].left = e.target.value;
                                setQuestionForm({
                                  ...questionForm,
                                  matchPairs: newPairs,
                                });
                              }}
                              className="glass-input flex-1 py-1.5 text-sm"
                              placeholder="Left item"
                            />
                            <span className="text-gray-400 self-center">→</span>
                            <input
                              type="text"
                              value={pair.right}
                              onChange={(e) => {
                                const newPairs = [...questionForm.matchPairs];
                                newPairs[index].right = e.target.value;
                                setQuestionForm({
                                  ...questionForm,
                                  matchPairs: newPairs,
                                });
                              }}
                              className="glass-input flex-1 py-1.5 text-sm"
                              placeholder="Right match"
                            />
                            {questionForm.matchPairs.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newPairs =
                                    questionForm.matchPairs.filter(
                                      (_, i) => i !== index
                                    );
                                  setQuestionForm({
                                    ...questionForm,
                                    matchPairs: newPairs,
                                  });
                                }}
                                className="btn-secondary px-3 py-1.5 text-sm"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setQuestionForm({
                              ...questionForm,
                              matchPairs: [
                                ...questionForm.matchPairs,
                                { left: "", right: "" },
                              ],
                            })
                          }
                          className="btn-secondary w-full py-1.5 text-sm"
                        >
                          + Add Pair
                        </button>
                      </div>
                    </div>
                  )}

                  {questionForm.questionType === "truefalse" && (
                    <div className="form-group">
                      <label className="input-label text-sm">
                        Correct Answer
                      </label>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            setQuestionForm({
                              ...questionForm,
                              correctOption: 0,
                              options: ["True", "False"],
                            })
                          }
                          className={`flex-1 p-3 rounded-lg text-sm font-medium transition-all ${
                            questionForm.correctOption === 0
                              ? "bg-green-500 text-white border-2 border-green-400"
                              : "bg-white/10 text-gray-400 border-2 border-white/10 hover:border-white/30"
                          }`}
                        >
                          ✓ True
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setQuestionForm({
                              ...questionForm,
                              correctOption: 1,
                              options: ["True", "False"],
                            })
                          }
                          className={`flex-1 p-3 rounded-lg text-sm font-medium transition-all ${
                            questionForm.correctOption === 1
                              ? "bg-red-500 text-white border-2 border-red-400"
                              : "bg-white/10 text-gray-400 border-2 border-white/10 hover:border-white/30"
                          }`}
                        >
                          ✗ False
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Marks */}
                  <div className="form-group">
                    <label className="input-label text-sm">Marks</label>
                    <input
                      type="number"
                      value={questionForm.marks}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          marks: parseInt(e.target.value) || 1,
                        })
                      }
                      className="glass-input w-24 py-1.5 text-sm"
                      min={1}
                      max={10}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <motion.button
                      onClick={() => {
                        setShowAddModal(false);
                        resetQuestionForm();
                      }}
                      className="btn-secondary flex-1 py-2 text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={handleAddQuestion}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FiSave className="w-4 h-4" />
                      {editingQuestion ? "Update" : "Add"} Question
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate Questions Modal */}
        <AnimatePresence>
          {showGenerateModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!generating) {
                  setShowGenerateModal(false);
                  setGeneratedQuestions([]);
                }
              }}
            >
              <motion.div
                className="glass-card w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiZap className="w-6 h-6 text-yellow-400" />
                    Generate Questions with AI
                  </h2>
                  <button
                    onClick={() => {
                      if (!generating) {
                        setShowGenerateModal(false);
                        setGeneratedQuestions([]);
                      }
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <FiX className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {generatedQuestions.length === 0 ? (
                  <div className="space-y-4">
                    {/* Exam Format Selection - First */}
                    <div className="form-group">
                      <label className="input-label">Exam Format *</label>
                      <select
                        value={generateForm.examFormat || "general"}
                        onChange={(e) => {
                          const format = e.target.value;
                          if (format === "upboard_science") {
                            // Auto-configure for UP Board Science
                            setGenerateForm({
                              ...generateForm,
                              examFormat: format,
                              language: "bilingual",
                              questionTypes: ["mcq", "written"],
                              numberOfQuestions: 31,
                            });
                          } else if (format === "upboard_english") {
                            // Auto-configure for UP Board English
                            setGenerateForm({
                              ...generateForm,
                              examFormat: format,
                              language: "english",
                              questionTypes: ["mcq", "written"],
                              numberOfQuestions: 31,
                            });
                          } else if (format === "upboard_hindi") {
                            // Auto-configure for UP Board Hindi
                            setGenerateForm({
                              ...generateForm,
                              examFormat: format,
                              language: "hindi",
                              questionTypes: ["mcq", "written"],
                              numberOfQuestions: 30,
                            });
                          } else if (format === "upboard_maths") {
                            // Auto-configure for UP Board Mathematics
                            setGenerateForm({
                              ...generateForm,
                              examFormat: format,
                              language: "bilingual",
                              questionTypes: ["mcq", "written"],
                              numberOfQuestions: 25,
                            });
                          } else if (format === "upboard_socialscience") {
                            // Auto-configure for UP Board Social Science
                            setGenerateForm({
                              ...generateForm,
                              examFormat: format,
                              language: "bilingual",
                              questionTypes: ["mcq", "written"],
                              numberOfQuestions: 30,
                            });
                          } else if (format === "upboard_biology") {
                            // Auto-configure for UP Board Biology (Class 12)
                            setGenerateForm({
                              ...generateForm,
                              examFormat: format,
                              language: "bilingual",
                              questionTypes: ["mcq", "written"],
                              numberOfQuestions: 29,
                            });
                          } else if (format === "upboard_englishclass12") {
                            // Auto-configure for UP Board English (Class 12)
                            setGenerateForm({
                              ...generateForm,
                              examFormat: format,
                              language: "english",
                              questionTypes: ["mcq", "written"],
                              numberOfQuestions: 20,
                            });
                          } else if (format === "upboard_hindiclass12") {
                            // Auto-configure for UP Board Hindi (Class 12)
                            setGenerateForm({
                              ...generateForm,
                              examFormat: format,
                              language: "hindi",
                              questionTypes: ["mcq", "written"],
                              numberOfQuestions: 20,
                            });
                          } else if (format === "upboard_chemistryclass12") {
                            // Auto-configure for UP Board Chemistry (Class 12)
                            setGenerateForm({
                              ...generateForm,
                              examFormat: format,
                              language: "bilingual",
                              questionTypes: ["mcq", "written"],
                              numberOfQuestions: 12,
                            });
                          } else if (format === "upboard_sanskrit") {
                            // Auto-configure for UP Board Sanskrit
                            setGenerateForm({
                              ...generateForm,
                              examFormat: format,
                              language: "sanskrit",
                              questionTypes: ["mcq", "written"],
                              numberOfQuestions: 31,
                            });
                          } else {
                            setGenerateForm({
                              ...generateForm,
                              examFormat: format,
                            });
                          }
                        }}
                        className="glass-input"
                      >
                        <option value="general">General (Custom)</option>
                        <option value="upboard_science">
                          UP Board Science (Class 10)
                        </option>
                        <option value="upboard_english">
                          UP Board English (Class 10)
                        </option>
                        <option value="upboard_hindi">
                          UP Board Hindi (Class 10)
                        </option>
                        <option value="upboard_sanskrit">
                          UP Board Sanskrit (Class 10)
                        </option>
                        <option value="upboard_maths">
                          UP Board Mathematics (Class 10)
                        </option>
                        <option value="upboard_socialscience">
                          UP Board Social Science (Class 10)
                        </option>
                        <option value="upboard_biology">
                          UP Board Biology (Class 12)
                        </option>
                        <option value="upboard_englishclass12">
                          UP Board English (Class 12)
                        </option>
                        <option value="upboard_hindiclass12">
                          UP Board Hindi (Class 12)
                        </option>
                        <option value="upboard_chemistryclass12">
                          UP Board Chemistry (Class 12) - 70 Marks
                        </option>
                      </select>
                    </div>
                    {/* UP Board Biology Info Box */}
                    {generateForm.examFormat === "upboard_biology" && (
                      <div className="rounded-lg bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-4 border border-green-200 dark:border-green-700">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                          🧬 UP Board Biology Paper (Class 12) - 70 अंक
                        </h4>
                        <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                          <p>📋 Paper Code: 348(KH)</p>
                          <p>
                            ✓ Q1: 4 MCQs (1 mark each) = 4 marks - Bilingual
                          </p>
                          <p>✓ Q2: Very Short Answer (5×1) = 5 marks</p>
                          <p>✓ Q3: Short Answer Type I (5×2) = 10 marks</p>
                          <p>✓ Q4-Q6: Short Answer Type II (12×3) = 36 marks</p>
                          <p>
                            ✓ Q7-Q9: Long Answer (3×5) = 15 marks with OR
                            options
                          </p>
                          <p className="font-medium mt-2 text-green-900 dark:text-green-100">
                            Topics: Reproduction, Genetics, Evolution,
                            Biotechnology, Ecology
                          </p>
                          <p className="text-xs mt-2 text-green-700 dark:text-green-300">
                            💡 Enter "Biology" for variety or specific topic
                            like "DNA Replication"
                          </p>
                        </div>
                      </div>
                    )}
                    {/* UP Board English Class 12 Info Box */}
                    {generateForm.examFormat === "upboard_englishclass12" && (
                      <div className="rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 border border-blue-200 dark:border-blue-700">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                          📖 UP Board English Paper (Class 12) - 100 अंक | 20
                          Questions
                        </h4>
                        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                          <p>📋 Paper Code: 316(HV)</p>
                          <p>
                            ✓ Section A: Reading (25 marks) - 5 questions
                            (comprehension + vocabulary)
                          </p>
                          <p>
                            ✓ Section B: Writing (20 marks) - 2 questions
                            (Article 10m + Letter/Application 10m)
                          </p>
                          <p>
                            ✓ Section C: Grammar (15 marks) - 6 questions (5
                            MCQs × 2m + Translation 5m)
                          </p>
                          <p>
                            ✓ Section D: Literature (40 marks) - 7 questions
                            (Prose 3 + Poetry 2 + Vistas 2)
                          </p>
                          <p className="font-medium mt-2 text-blue-900 dark:text-blue-100">
                            Topics: Flamingo (The Last Lesson, Lost Spring, Deep
                            Water) & Vistas (The Tiger King)
                          </p>
                          <p className="text-xs mt-2 text-blue-700 dark:text-blue-300">
                            💡 Enter "English" for variety or specific "My
                            Mother at Sixty-six"
                          </p>
                        </div>
                      </div>
                    )}
                    {/* UP Board Hindi Class 12 Info Box */}
                    {generateForm.examFormat === "upboard_hindiclass12" && (
                      <div className="rounded-lg bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 border border-orange-200 dark:border-orange-700">
                        <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2 flex items-center gap-2">
                          📝 UP Board Hindi Paper (Class 12) - 100 अंक | 20
                          Questions
                        </h4>
                        <div className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                          <p>📋 Paper Code: 301(HA)</p>
                          <p>
                            ✓ खण्ड-क (55 marks) - 10 questions (MCQs, गद्यांश,
                            पद्यांश, लेखक/कवि परिचय)
                          </p>
                          <p>
                            ✓ खण्ड-ख (45 marks) - 10 questions (संस्कृत, निबंध,
                            व्याकरण, पत्र)
                          </p>
                          <p className="font-medium mt-2 text-orange-900 dark:text-orange-100">
                            Topics: जैनेन्द्रकुमार, पं. दीनदयाल उपाध्याय,
                            कामायनी, रश्मिरथी
                          </p>
                          <p className="text-xs mt-2 text-orange-700 dark:text-orange-300">
                            💡 Enter "Hindi" for variety or specific "कामायनी"
                            or "जैनेन्द्रकुमार"
                          </p>
                        </div>
                      </div>
                    )}
                    {/* UP Board Chemistry Class 12 Info Box */}
                    {generateForm.examFormat === "upboard_chemistryclass12" && (
                      <div className="rounded-lg bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-4 border border-green-200 dark:border-green-700">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                          🧪 UP Board Chemistry Paper (Class 12) - 70 Marks | 12
                          Questions
                        </h4>
                        <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                          <p>📋 Paper Code: 347(JZ)</p>
                          <p>
                            ✓ Q1-Q6: Individual MCQs (1 mark each) = 6 marks -
                            Physical, Organic, Inorganic
                          </p>
                          <p>
                            ✓ Q7-Q8: Short answers (8 marks each) = 16 marks
                          </p>
                          <p>
                            ✓ Q9-Q10: Numerical & theory (12 marks each) = 24
                            marks
                          </p>
                          <p>
                            ✓ Q11-Q12: Organic chemistry (12 marks each) = 24
                            marks
                          </p>
                          <p className="font-medium mt-2 text-green-900 dark:text-green-100">
                            Topics: Solutions, Electrochemistry, Kinetics,
                            Coordination Compounds, Haloalkanes, Aldehydes,
                            Amines, Biomolecules
                          </p>
                          <p className="text-xs mt-2 text-green-700 dark:text-green-300">
                            💡 Enter "Chemistry" for variety or specific
                            "Electrochemistry", "Coordination Compounds",
                            "Aldehydes and Ketones"
                          </p>
                        </div>
                      </div>
                    )}
                    {/* UP Board Social Science Info Box */}
                    {generateForm.examFormat === "upboard_socialscience" && (
                      <div className="rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-4 border border-purple-200 dark:border-purple-700">
                        <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                          🌍 UP Board Social Science Paper - 70 अंक
                        </h4>
                        <div className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                          <p>📋 Paper Code: 825(BAS)</p>
                          <p>
                            ✓ Part A: 20 MCQs (1 mark each) = 20 marks -
                            Bilingual
                          </p>
                          <p>
                            ✓ Part B: Descriptive Questions (2+2, 2+4, 6 marks)
                            with OR options
                          </p>
                          <p>
                            ✓ Map Work: History Map (5 marks) + Geography Map (5
                            marks)
                          </p>
                          <p className="font-medium mt-2 text-purple-900 dark:text-purple-100">
                            Topics: History, Geography, Civics, Economics
                          </p>
                          <p className="text-xs mt-2 text-purple-700 dark:text-purple-300">
                            💡 Enter "Social Science" for variety or specific
                            topic like "French Revolution"
                          </p>
                        </div>
                      </div>
                    )}
                    {/* UP Board Mathematics Info Box */}
                    {generateForm.examFormat === "upboard_maths" && (
                      <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-4">
                        <p className="text-blue-300 font-medium mb-3">
                          📐 UP Board Mathematics Paper - 70 अंक (25 प्रश्न)
                        </p>
                        <p className="text-xs text-gray-400 mb-2">
                          Paper Code: 822(BV)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-yellow-400 font-medium mb-2">
                              खण्ड 'अ' - 20 अंक
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• प्र.1-20: MCQs (20 अंक)</li>
                              <li>
                                • Topics: संख्याएं, बहुपद, समीकरण, AP, ज्यामिति,
                                त्रिकोणमिति
                              </li>
                            </ul>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-green-400 font-medium mb-2">
                              खण्ड 'ब' - 50 अंक
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• प्र.21: 6×2=12 अंक (सभी करें)</li>
                              <li>• प्र.22: 5×4=20 अंक (6 में से 5)</li>
                              <li>• प्र.23-25: 3×6=18 अंक (अथवा सहित)</li>
                            </ul>
                          </div>
                        </div>
                        <p className="text-xs text-blue-400 mt-3">
                          📝 Note: Diagram questions include [चित्र आवश्यक] tag
                          - add diagrams manually
                        </p>
                      </div>
                    )}
                    {/* UP Board Sanskrit - Simplified UI */}
                    {generateForm.examFormat === "upboard_sanskrit" ? (
                      <>
                        {/* UP Board Sanskrit Info Box */}
                        <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-lg p-4">
                          <p className="text-amber-300 font-medium mb-3">
                            📋 UP Board Sanskrit Paper - 70 अंक (31 प्रश्न)
                          </p>
                          <p className="text-xs text-gray-400 mb-2">
                            Paper Code: 818(BP)
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-yellow-400 font-medium mb-2">
                                खण्ड 'अ' - 20 अंक
                              </p>
                              <ul className="text-xs text-gray-400 space-y-1">
                                <li>• प्र.1-6: गद्यांश MCQs (6 अंक)</li>
                                <li>• प्र.7-20: व्याकरण MCQs (14 अंक)</li>
                                <li>• संधि, समास, विभक्ति, लकार, प्रत्याहार</li>
                              </ul>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-green-400 font-medium mb-2">
                                खण्ड 'ब' - 50 अंक
                              </p>
                              <ul className="text-xs text-gray-400 space-y-1">
                                <li>
                                  • गद्यांश • श्लोक • सारांश • चरित्र (23 अंक)
                                </li>
                                <li>• विभक्ति • प्रत्यय (4) • वाच्य (3)</li>
                                <li>
                                  • अनुवाद (6) • निबन्ध (8) • पद प्रयोग (4)
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Topic Input for Sanskrit */}
                        <div className="form-group">
                          <label className="input-label">विषय / Topic *</label>
                          <input
                            type="text"
                            value={generateForm.topic}
                            onChange={(e) =>
                              setGenerateForm({
                                ...generateForm,
                                topic: e.target.value,
                              })
                            }
                            placeholder="जैसे: व्याकरण, गद्य, पद्य, निबन्ध..."
                            className="glass-input"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            एक या अधिक विषय दर्ज करें (comma से अलग करें)
                          </p>
                        </div>

                        {/* Difficulty for Sanskrit */}
                        <div className="form-group">
                          <label className="input-label">कठिनाई स्तर</label>
                          <select
                            value={generateForm.difficulty || "medium"}
                            onChange={(e) =>
                              setGenerateForm({
                                ...generateForm,
                                difficulty: e.target.value,
                              })
                            }
                            className="glass-input"
                          >
                            <option value="easy">सरल (Board Level)</option>
                            <option value="medium">मध्यम (Competitive)</option>
                            <option value="hard">कठिन (Advanced)</option>
                          </select>
                        </div>
                      </>
                    ) : generateForm.examFormat === "upboard_hindi" ? (
                      <>
                        {/* UP Board Hindi Info Box */}
                        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-4">
                          <p className="text-orange-300 font-medium mb-3">
                            📋 UP Board Hindi Paper - 70 अंक (30 प्रश्न)
                          </p>
                          <p className="text-xs text-gray-400 mb-2">
                            Paper Code: 801(BA)
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-yellow-400 font-medium mb-2">
                                खण्ड 'अ' - 20 अंक
                              </p>
                              <ul className="text-xs text-gray-400 space-y-1">
                                <li>• प्र.1-20: 20 MCQs × 1 = 20 अंक</li>
                                <li>
                                  • साहित्य, व्याकरण, रस, अलंकार, छंद, समास
                                </li>
                              </ul>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-green-400 font-medium mb-2">
                                खण्ड 'ब' - 50 अंक
                              </p>
                              <ul className="text-xs text-gray-400 space-y-1">
                                <li>• गद्यांश (6), पद्यांश (6)</li>
                                <li>• संस्कृत अनुवाद (5+5)</li>
                                <li>• खण्डकाव्य (3), लेखक/कवि (10)</li>
                                <li>
                                  • श्लोक (2), पत्र (4), संस्कृत प्रश्न (2)
                                </li>
                                <li>• निबन्ध (7)</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Topic Input for Hindi */}
                        <div className="form-group">
                          <label className="input-label">विषय / Topic *</label>
                          <input
                            type="text"
                            value={generateForm.topic}
                            onChange={(e) =>
                              setGenerateForm({
                                ...generateForm,
                                topic: e.target.value,
                              })
                            }
                            placeholder="जैसे: काव्य खण्ड, गद्य खण्ड, व्याकरण..."
                            className="glass-input"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            एक या अधिक विषय दर्ज करें (comma से अलग करें)
                          </p>
                        </div>

                        {/* Difficulty for Hindi */}
                        <div className="form-group">
                          <label className="input-label">कठिनाई स्तर</label>
                          <select
                            value={generateForm.difficulty || "medium"}
                            onChange={(e) =>
                              setGenerateForm({
                                ...generateForm,
                                difficulty: e.target.value,
                              })
                            }
                            className="glass-input"
                          >
                            <option value="easy">सरल (Board Level)</option>
                            <option value="medium">मध्यम (Competitive)</option>
                            <option value="hard">कठिन (Advanced)</option>
                          </select>
                        </div>
                      </>
                    ) : generateForm.examFormat === "upboard_science" ? (
                      <>
                        {/* UP Board Info Box */}
                        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg p-4">
                          <p className="text-blue-300 font-medium mb-3">
                            📋 UP Board Science Paper - 70 Marks (31 Questions)
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-yellow-400 font-medium mb-2">
                                खण्ड-अ (Part A) - 20 Marks
                              </p>
                              <ul className="text-xs text-gray-400 space-y-1">
                                <li>• उप-भाग I: 7 MCQs × 1 = 7 marks</li>
                                <li>• उप-भाग II: 6 MCQs × 1 = 6 marks</li>
                                <li>• उप-भाग III: 7 MCQs × 1 = 7 marks</li>
                              </ul>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-green-400 font-medium mb-2">
                                खण्ड-ब (Part B) - 50 Marks
                              </p>
                              <ul className="text-xs text-gray-400 space-y-1">
                                <li>• उप-भाग I: 4 × (2+2) = 16 marks</li>
                                <li>• उप-भाग II: 4 × 4 = 16 marks</li>
                                <li>• उप-भाग III: 3 × 6 = 18 marks (OR)</li>
                              </ul>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-xs text-gray-400">
                              ✓ 31 questions = 70 marks • ✓ Bilingual
                              (Hindi/English) • ✓ Section headers • ✓ Single or
                              multiple topics
                            </p>
                          </div>
                        </div>

                        {/* Topic Input */}
                        <div className="form-group">
                          <label className="input-label">
                            Topic / Chapter(s) *
                          </label>
                          <input
                            type="text"
                            value={generateForm.topic}
                            onChange={(e) =>
                              setGenerateForm({
                                ...generateForm,
                                topic: e.target.value,
                              })
                            }
                            className="glass-input"
                            placeholder="e.g., प्रकाश - परावर्तन और अपवर्तन OR प्रकाश, रासायनिक अभिक्रियाएं, जीवन प्रक्रियाएं"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Enter single topic OR multiple topics
                            (comma-separated) - questions will be distributed
                            evenly
                          </p>
                        </div>

                        {/* Difficulty Only */}
                        <div className="form-group">
                          <label className="input-label">
                            Difficulty Level
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              {
                                value: "easy",
                                label: "Easy",
                                desc: "Basic concepts",
                                icon: "🟢",
                              },
                              {
                                value: "medium",
                                label: "Medium",
                                desc: "Board level",
                                icon: "🟡",
                              },
                              {
                                value: "hard",
                                label: "Hard",
                                desc: "Competitive",
                                icon: "🔴",
                              },
                            ].map((level) => (
                              <button
                                key={level.value}
                                type="button"
                                onClick={() =>
                                  setGenerateForm({
                                    ...generateForm,
                                    difficulty: level.value,
                                  })
                                }
                                className={`p-3 rounded-lg border text-center transition-all ${
                                  generateForm.difficulty === level.value
                                    ? "bg-blue-500/30 border-blue-500 text-white"
                                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                }`}
                              >
                                <span className="text-xl">{level.icon}</span>
                                <p className="font-medium mt-1">
                                  {level.label}
                                </p>
                                <p className="text-xs opacity-70">
                                  {level.desc}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : generateForm.examFormat === "upboard_english" ? (
                      <>
                        {/* UP Board English Info Box */}
                        <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 border border-green-500/30 rounded-lg p-4">
                          <p className="text-green-300 font-medium mb-3">
                            📋 UP Board English Paper - 70 Marks (31 Questions)
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-yellow-400 font-medium mb-2">
                                PART-A - 20 Marks
                              </p>
                              <ul className="text-xs text-gray-400 space-y-1">
                                <li>• Q1-Q20: 20 MCQs × 1 = 20 marks</li>
                              </ul>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                              <p className="text-green-400 font-medium mb-2">
                                PART-B - 50 Marks
                              </p>
                              <ul className="text-xs text-gray-400 space-y-1">
                                <li>• Q21: Reading (8 marks)</li>
                                <li>• Q22: Letter (4 marks) + OR</li>
                                <li>• Q23: Article/Essay (6 marks) + OR</li>
                                <li>• Q24-27: Grammar (4 × 2 = 8 marks)</li>
                                <li>• Q28-31: Literature (4 × 6 = 24 marks)</li>
                              </ul>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-xs text-gray-400">
                              ✓ 31 questions = 70 marks • ✓ English only • ✓
                              Long passages • ✓ Full letter format
                            </p>
                          </div>
                        </div>

                        {/* Topic Input */}
                        <div className="form-group">
                          <label className="input-label">
                            Topic / Chapter(s) *
                          </label>
                          <input
                            type="text"
                            value={generateForm.topic}
                            onChange={(e) =>
                              setGenerateForm({
                                ...generateForm,
                                topic: e.target.value,
                              })
                            }
                            className="glass-input"
                            placeholder="e.g., Reading Comprehension, Grammar, Letter Writing, First Flight Chapter 1"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Enter topic(s) - Grammar, Writing, Literature, or
                            specific chapters
                          </p>
                        </div>

                        {/* Difficulty Only */}
                        <div className="form-group">
                          <label className="input-label">
                            Difficulty Level
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              {
                                value: "easy",
                                label: "Easy",
                                desc: "Basic concepts",
                                icon: "🟢",
                              },
                              {
                                value: "medium",
                                label: "Medium",
                                desc: "Board level",
                                icon: "🟡",
                              },
                              {
                                value: "hard",
                                label: "Hard",
                                desc: "Competitive",
                                icon: "🔴",
                              },
                            ].map((level) => (
                              <button
                                key={level.value}
                                type="button"
                                onClick={() =>
                                  setGenerateForm({
                                    ...generateForm,
                                    difficulty: level.value,
                                  })
                                }
                                className={`p-3 rounded-lg border text-center transition-all ${
                                  generateForm.difficulty === level.value
                                    ? "bg-blue-500/30 border-blue-500 text-white"
                                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                }`}
                              >
                                <span className="text-xl">{level.icon}</span>
                                <p className="font-medium mt-1">
                                  {level.label}
                                </p>
                                <p className="text-xs opacity-70">
                                  {level.desc}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* General Format - Full Options */}
                        {/* Topic */}
                        <div className="form-group">
                          <label className="input-label">Topic *</label>
                          <input
                            type="text"
                            value={generateForm.topic}
                            onChange={(e) =>
                              setGenerateForm({
                                ...generateForm,
                                topic: e.target.value,
                              })
                            }
                            className="glass-input"
                            placeholder="e.g., JavaScript Arrays, World War II, Photosynthesis"
                          />
                        </div>

                        {/* Difficulty - Always visible */}
                        <div className="form-group">
                          <label className="input-label">Difficulty</label>
                          <select
                            value={generateForm.difficulty}
                            onChange={(e) =>
                              setGenerateForm({
                                ...generateForm,
                                difficulty: e.target.value,
                              })
                            }
                            className="glass-input"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>

                        {/* Show Number, Language, Question Types only for General format */}
                        {generateForm.examFormat === "general" && (
                          <>
                            {/* Number and Language Row */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="form-group">
                                <label className="input-label">
                                  No. of Questions
                                </label>
                                <input
                                  type="number"
                                  value={generateForm.numberOfQuestions}
                                  onChange={(e) =>
                                    setGenerateForm({
                                      ...generateForm,
                                      numberOfQuestions:
                                        parseInt(e.target.value) || 5,
                                    })
                                  }
                                  className="glass-input"
                                  min={1}
                                  max={50}
                                />
                              </div>

                              <div className="form-group">
                                <label className="input-label">Language</label>
                                <select
                                  value={generateForm.language || "english"}
                                  onChange={(e) =>
                                    setGenerateForm({
                                      ...generateForm,
                                      language: e.target.value,
                                    })
                                  }
                                  className="glass-input"
                                >
                                  <option value="english">English</option>
                                  <option value="hindi">हिंदी (Hindi)</option>
                                  <option value="bilingual">
                                    द्विभाषी (Bilingual)
                                  </option>
                                  <option value="sanskrit">
                                    संस्कृत (Sanskrit)
                                  </option>
                                  <option value="spanish">
                                    Español (Spanish)
                                  </option>
                                  <option value="french">
                                    Français (French)
                                  </option>
                                  <option value="german">
                                    Deutsch (German)
                                  </option>
                                </select>
                              </div>
                            </div>

                            {/* Question Types */}
                            <div className="form-group">
                              <label className="input-label mb-2">
                                Question Types
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {[
                                  { value: "mcq", label: "MCQ", icon: "📝" },
                                  {
                                    value: "written",
                                    label: "Written",
                                    icon: "✍️",
                                  },
                                  {
                                    value: "fillblank",
                                    label: "Fill Blanks",
                                    icon: "📄",
                                  },
                                  {
                                    value: "matching",
                                    label: "Matching",
                                    icon: "🔗",
                                  },
                                  {
                                    value: "truefalse",
                                    label: "True/False",
                                    icon: "✓✗",
                                  },
                                ].map((type) => (
                                  <label
                                    key={type.value}
                                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                                      (
                                        generateForm.questionTypes || ["mcq"]
                                      ).includes(type.value)
                                        ? "bg-yellow-500/30 border border-yellow-500"
                                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={(
                                        generateForm.questionTypes || ["mcq"]
                                      ).includes(type.value)}
                                      onChange={() => {
                                        const currentTypes =
                                          generateForm.questionTypes || ["mcq"];
                                        const newTypes = currentTypes.includes(
                                          type.value
                                        )
                                          ? currentTypes.filter(
                                              (t) => t !== type.value
                                            )
                                          : [...currentTypes, type.value];
                                        setGenerateForm({
                                          ...generateForm,
                                          questionTypes:
                                            newTypes.length > 0
                                              ? newTypes
                                              : ["mcq"],
                                        });
                                      }}
                                      className="hidden"
                                    />
                                    <span>{type.icon}</span>
                                    <span className="text-white">
                                      {type.label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Additional Instructions - Only for General format */}
                        {generateForm.examFormat === "general" && (
                          <div className="form-group">
                            <label className="input-label">
                              Additional Instructions (Optional)
                            </label>
                            <textarea
                              value={generateForm.description || ""}
                              onChange={(e) =>
                                setGenerateForm({
                                  ...generateForm,
                                  description: e.target.value,
                                })
                              }
                              className="glass-input h-24 resize-none"
                              placeholder="e.g., Focus on chapter 5, include questions about key dates, avoid complex calculations, make questions suitable for beginners..."
                              maxLength={1000}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Give specific instructions to guide AI question
                              generation
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    <motion.button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {generating ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <FiZap className="w-5 h-5" />
                          Generate Questions
                        </>
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-300">
                      Generated {generatedQuestions.length} questions. Review
                      and add them to your quiz.
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {/* Group questions by section for UP Board format */}
                      {(() => {
                        const sections = {};
                        generatedQuestions.forEach((q, idx) => {
                          const section = q.section || "Questions";
                          if (!sections[section]) sections[section] = [];
                          sections[section].push({ ...q, originalIndex: idx });
                        });

                        return Object.entries(sections).map(
                          ([sectionName, sectionQuestions]) => (
                            <div key={sectionName} className="mb-4">
                              {/* Section Header */}
                              {sectionName !== "Questions" && (
                                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-3 mb-3">
                                  <p className="text-yellow-300 font-bold text-sm">
                                    {sectionName}
                                  </p>
                                </div>
                              )}

                              {/* Questions in this section */}
                              {sectionQuestions.map((question) => (
                                <div
                                  key={question.originalIndex}
                                  className="bg-white/5 rounded-lg p-4 mb-2"
                                >
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="text-blue-400 font-bold">
                                      Q{question.originalIndex + 1}.
                                    </span>
                                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                                      {question.questionType === "mcq" &&
                                        "📝 MCQ"}
                                      {question.questionType === "written" &&
                                        "✍️ Written"}
                                      {question.questionType === "fillblank" &&
                                        "📄 Fill Blank"}
                                      {question.questionType === "matching" &&
                                        "🔗 Matching"}
                                      {question.questionType === "truefalse" &&
                                        "✓✗ True/False"}
                                    </span>
                                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                                      {question.marks} mark
                                      {question.marks > 1 ? "s" : ""}
                                    </span>
                                  </div>
                                  <p className="text-white mb-2 whitespace-pre-line">
                                    {question.questionText}
                                  </p>

                                  {/* MCQ/TrueFalse Options */}
                                  {(question.questionType === "mcq" ||
                                    question.questionType === "truefalse") &&
                                    question.options && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                        {question.options.map((opt, optIdx) => (
                                          <div
                                            key={optIdx}
                                            className={`p-2 rounded ${
                                              optIdx === question.correctOption
                                                ? "bg-green-500/20 text-green-300 border border-green-500/30"
                                                : "bg-white/5 text-gray-400"
                                            }`}
                                          >
                                            {String.fromCharCode(65 + optIdx)}.{" "}
                                            {opt}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                  {/* Written Answer */}
                                  {question.questionType === "written" &&
                                    question.correctAnswer && (
                                      <div className="p-2 bg-green-500/10 border border-green-500/30 rounded text-green-300 text-sm mt-2">
                                        <span className="font-medium">
                                          Expected:{" "}
                                        </span>
                                        <span className="whitespace-pre-line">
                                          {question.correctAnswer}
                                        </span>
                                      </div>
                                    )}

                                  {/* Fill Blanks */}
                                  {question.questionType === "fillblank" &&
                                    question.blanks && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {question.blanks.map((blank, idx) => (
                                          <span
                                            key={idx}
                                            className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-sm"
                                          >
                                            Blank {idx + 1}: {blank}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                  {/* Matching */}
                                  {question.questionType === "matching" &&
                                    question.matchPairs && (
                                      <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                                        {question.matchPairs.map(
                                          (pair, idx) => (
                                            <div
                                              key={idx}
                                              className="p-2 bg-white/5 rounded flex items-center gap-2"
                                            >
                                              <span className="text-blue-400">
                                                {pair.left}
                                              </span>
                                              <span className="text-gray-500">
                                                →
                                              </span>
                                              <span className="text-green-400">
                                                {pair.right}
                                              </span>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    )}
                                </div>
                              ))}
                            </div>
                          )
                        );
                      })()}
                    </div>

                    <div className="flex gap-4">
                      <motion.button
                        onClick={() => {
                          setGeneratedQuestions([]);
                        }}
                        className="btn-secondary flex-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Regenerate
                      </motion.button>
                      <motion.button
                        onClick={handleAddGeneratedQuestions}
                        className="btn-success flex-1 flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FiPlus className="w-5 h-5" />
                        Add All to Quiz
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk Process Modal */}
        <AnimatePresence>
          {showBulkModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!processingBulk) {
                  setShowBulkModal(false);
                  setProcessedQuestions([]);
                }
              }}
            >
              <motion.div
                className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiFileText className="w-6 h-6 text-green-400" />
                    Bulk Process Questions
                  </h2>
                  <button
                    onClick={() => {
                      if (!processingBulk) {
                        setShowBulkModal(false);
                        setProcessedQuestions([]);
                      }
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <FiX className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {processedQuestions.length === 0 ? (
                  <div className="space-y-4">
                    {/* Exam Format Selection */}
                    <div className="form-group">
                      <label className="input-label">Exam Format *</label>
                      <select
                        value={bulkForm.examFormat || "general"}
                        onChange={(e) => {
                          const format = e.target.value;
                          if (format === "upboard_science") {
                            setBulkForm({
                              ...bulkForm,
                              examFormat: format,
                              language: "bilingual",
                            });
                          } else if (format === "upboard_english") {
                            setBulkForm({
                              ...bulkForm,
                              examFormat: format,
                              language: "english",
                            });
                          } else if (format === "upboard_hindi") {
                            setBulkForm({
                              ...bulkForm,
                              examFormat: format,
                              language: "hindi",
                            });
                          } else if (format === "upboard_sanskrit") {
                            setBulkForm({
                              ...bulkForm,
                              examFormat: format,
                              language: "sanskrit",
                            });
                          } else if (format === "upboard_maths") {
                            setBulkForm({
                              ...bulkForm,
                              examFormat: format,
                              language: "bilingual",
                            });
                          } else if (format === "upboard_socialscience") {
                            setBulkForm({
                              ...bulkForm,
                              examFormat: format,
                              language: "bilingual",
                            });
                          } else if (format === "upboard_biology") {
                            setBulkForm({
                              ...bulkForm,
                              examFormat: format,
                              language: "bilingual",
                            });
                          } else if (format === "upboard_englishclass12") {
                            setBulkForm({
                              ...bulkForm,
                              examFormat: format,
                              language: "english",
                            });
                          } else if (format === "upboard_hindiclass12") {
                            setBulkForm({
                              ...bulkForm,
                              examFormat: format,
                              language: "hindi",
                            });
                          } else if (format === "upboard_chemistryclass12") {
                            setBulkForm({
                              ...bulkForm,
                              examFormat: format,
                              language: "bilingual",
                            });
                          } else {
                            setBulkForm({
                              ...bulkForm,
                              examFormat: format,
                            });
                          }
                        }}
                        className="glass-input"
                      >
                        <option value="general">General (Custom)</option>
                        <option value="upboard_science">
                          UP Board Science (Class 10)
                        </option>
                        <option value="upboard_english">
                          UP Board English (Class 10)
                        </option>
                        <option value="upboard_hindi">
                          UP Board Hindi (Class 10)
                        </option>
                        <option value="upboard_sanskrit">
                          UP Board Sanskrit (Class 10)
                        </option>
                        <option value="upboard_maths">
                          UP Board Mathematics (Class 10)
                        </option>
                        <option value="upboard_socialscience">
                          UP Board Social Science (Class 10)
                        </option>
                        <option value="upboard_biology">
                          UP Board Biology (Class 12)
                        </option>
                        <option value="upboard_englishclass12">
                          UP Board English (Class 12)
                        </option>
                        <option value="upboard_hindiclass12">
                          UP Board Hindi (Class 12)
                        </option>
                        <option value="upboard_chemistryclass12">
                          UP Board Chemistry (Class 12) - 70 Marks
                        </option>
                      </select>
                    </div>

                    {/* UP Board Biology Info Box */}
                    {bulkForm.examFormat === "upboard_biology" && (
                      <div className="rounded-lg bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-4 border border-green-200 dark:border-green-700">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                          🧬 UP Board Biology Paper (Class 12) - 70 अंक
                        </h4>
                        <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                          <p>📋 Paper Code: 348(KH)</p>
                          <p>
                            ✓ Q1: 4 MCQs (1 mark each) = 4 marks - Bilingual
                          </p>
                          <p>
                            ✓ Q2: Very Short (5×1) + Q3: Short I (5×2) = 15
                            marks
                          </p>
                          <p>✓ Q4-Q6: Short Answer Type II (12×3) = 36 marks</p>
                          <p>✓ Q7-Q9: Long Answer with OR (3×5) = 15 marks</p>
                          <p className="text-xs mt-2 text-green-700 dark:text-green-300">
                            💡 Enter questions with full context and details
                          </p>
                        </div>
                      </div>
                    )}

                    {/* UP Board English Class 12 Info Box */}
                    {bulkForm.examFormat === "upboard_englishclass12" && (
                      <div className="rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 border border-blue-200 dark:border-blue-700">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                          📖 UP Board English Paper (Class 12) - 100 अंक | 20
                          Questions
                        </h4>
                        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                          <p>📋 Paper Code: 316(HV)</p>
                          <p>✓ Section A: Reading (25 marks) - 5 questions</p>
                          <p>
                            ✓ Section B: Writing (20 marks) - 2 questions
                            (Article + Letter/Application with OR)
                          </p>
                          <p>
                            ✓ Section C: Grammar (15 marks) - 6 questions (MCQs
                            + Translation)
                          </p>
                          <p>
                            ✓ Section D: Literature (40 marks) - 7 questions
                            (Flamingo & Vistas with OR)
                          </p>
                          <p className="text-xs mt-2 text-blue-700 dark:text-blue-300">
                            💡 Paste all questions from your paper with sections
                          </p>
                        </div>
                      </div>
                    )}

                    {/* UP Board Hindi Class 12 Info Box */}
                    {bulkForm.examFormat === "upboard_hindiclass12" && (
                      <div className="rounded-lg bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 border border-orange-200 dark:border-orange-700">
                        <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2 flex items-center gap-2">
                          📝 UP Board Hindi Paper (Class 12) - 100 अंक | 20
                          Questions
                        </h4>
                        <div className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                          <p>📋 Paper Code: 301(HA)</p>
                          <p>
                            ✓ खण्ड-क: 10 questions (MCQs + passages + authors)
                          </p>
                          <p>
                            ✓ खण्ड-ख: 10 questions (Sanskrit + essay + grammar +
                            letter)
                          </p>
                          <p className="text-xs mt-2 text-orange-700 dark:text-orange-300">
                            💡 Paste your questions from all sections
                          </p>
                        </div>
                      </div>
                    )}

                    {/* UP Board Chemistry Class 12 Info Box */}
                    {bulkForm.examFormat === "upboard_chemistryclass12" && (
                      <div className="rounded-lg bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-4 border border-green-200 dark:border-green-700">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                          🧪 UP Board Chemistry Paper (Class 12) - 70 Marks | 12
                          Questions
                        </h4>
                        <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                          <p>📋 Paper Code: 347(JZ)</p>
                          <p>
                            ✓ Q1-Q6: Individual MCQs (1m each) = 6m - Physical,
                            Organic, Inorganic
                          </p>
                          <p>✓ Q7-Q8: Short answers (8m each) = 16m</p>
                          <p>✓ Q9-Q10: Numerical & theory (12m each) = 24m</p>
                          <p>✓ Q11-Q12: Organic chemistry (12m each) = 24m</p>
                          <p className="text-xs mt-2 text-green-700 dark:text-green-300">
                            💡 Paste questions with chemical equations and
                            formulas
                          </p>
                        </div>
                      </div>
                    )}

                    {/* UP Board Social Science Info Box */}
                    {bulkForm.examFormat === "upboard_socialscience" && (
                      <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-lg p-4">
                        <p className="text-purple-300 font-medium mb-3">
                          🌍 UP Board Social Science - 70 अंक
                        </p>
                        <div className="text-xs text-gray-400 space-y-2">
                          <p>📋 Paper Code: 825(BAS)</p>
                          <p>• Part A: 20 MCQs (Bilingual)</p>
                          <p>• Part B: Descriptive + Map Work</p>
                          <p className="text-indigo-300">
                            💡 History, Geography, Civics, Economics
                          </p>
                        </div>
                      </div>
                    )}

                    {/* UP Board Mathematics Info Box */}
                    {bulkForm.examFormat === "upboard_maths" && (
                      <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-4">
                        <p className="text-blue-300 font-medium mb-3">
                          📐 UP Board Mathematics Paper - 70 अंक (25 प्रश्न)
                        </p>
                        <p className="text-xs text-gray-400 mb-2">
                          Paper Code: 822(BV)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-yellow-400 font-medium mb-2">
                              खण्ड 'अ' - 20 अंक
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• प्र.1-20: MCQs (20 अंक)</li>
                            </ul>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-green-400 font-medium mb-2">
                              खण्ड 'ब' - 50 अंक
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• प्र.21-25: वर्णनात्मक (50 अंक)</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* UP Board Sanskrit Info Box */}
                    {bulkForm.examFormat === "upboard_sanskrit" && (
                      <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-lg p-4">
                        <p className="text-amber-300 font-medium mb-3">
                          📋 UP Board Sanskrit Paper - 70 अंक (31 प्रश्न)
                        </p>
                        <p className="text-xs text-gray-400 mb-2">
                          Paper Code: 818(BP)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-yellow-400 font-medium mb-2">
                              खण्ड 'अ' - 20 अंक
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• प्र.1-6: गद्यांश MCQs (6 अंक)</li>
                              <li>• प्र.7-20: व्याकरण MCQs (14 अंक)</li>
                            </ul>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-green-400 font-medium mb-2">
                              खण्ड 'ब' - 50 अंक
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>
                                • गद्यांश • श्लोक • सारांश • चरित्र (23 अंक)
                              </li>
                              <li>• व्याकरण • अनुवाद • निबन्ध (27 अंक)</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* UP Board Hindi Info Box */}
                    {bulkForm.examFormat === "upboard_hindi" && (
                      <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-4">
                        <p className="text-orange-300 font-medium mb-3">
                          📋 UP Board Hindi Paper - 70 अंक (30 प्रश्न)
                        </p>
                        <p className="text-xs text-gray-400 mb-2">
                          Paper Code: 801(BA)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-yellow-400 font-medium mb-2">
                              खण्ड 'अ' - 20 अंक
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• प्र.1-20: 20 MCQs × 1 = 20 अंक</li>
                            </ul>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-green-400 font-medium mb-2">
                              खण्ड 'ब' - 50 अंक
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• गद्यांश (6), पद्यांश (6)</li>
                              <li>• संस्कृत अनुवाद (5+5), खण्डकाव्य (3)</li>
                              <li>• लेखक/कवि (10), श्लोक (2), पत्र (4)</li>
                              <li>• संस्कृत प्रश्न (2), निबन्ध (7)</li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-gray-400">
                            ✓ 30 प्रश्न = 70 अंक • ✓ हिन्दी में • ✓ अथवा विकल्प
                            सहित
                          </p>
                        </div>
                      </div>
                    )}

                    {/* UP Board Info Box */}
                    {bulkForm.examFormat === "upboard_science" && (
                      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg p-4">
                        <p className="text-blue-300 font-medium mb-3">
                          📋 UP Board Science Paper - 70 Marks (31 Questions)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-yellow-400 font-medium mb-2">
                              खण्ड-अ (Part A) - 20 Marks
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• उप-भाग I: 7 MCQs × 1 = 7 marks</li>
                              <li>• उप-भाग II: 6 MCQs × 1 = 6 marks</li>
                              <li>• उप-भाग III: 7 MCQs × 1 = 7 marks</li>
                            </ul>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-green-400 font-medium mb-2">
                              खण्ड-ब (Part B) - 50 Marks
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• उप-भाग I: 4 × (2+2) = 16 marks</li>
                              <li>• उप-भाग II: 4 × 4 = 16 marks</li>
                              <li>• उप-भाग III: 3 × 6 = 18 marks (OR)</li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-gray-400">
                            ✓ 31 questions = 70 marks • ✓ Bilingual
                            (Hindi/English) • ✓ Section headers
                          </p>
                        </div>
                      </div>
                    )}

                    {/* UP Board English Info Box */}
                    {bulkForm.examFormat === "upboard_english" && (
                      <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 border border-green-500/30 rounded-lg p-4">
                        <p className="text-green-300 font-medium mb-3">
                          📋 UP Board English Paper - 70 Marks (31 Questions)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-yellow-400 font-medium mb-2">
                              PART-A - 20 Marks
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• Q1-Q20: 20 MCQs × 1 = 20 marks</li>
                            </ul>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-green-400 font-medium mb-2">
                              PART-B - 50 Marks
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• Q21: Reading (8 marks)</li>
                              <li>• Q22: Letter (4 marks) + OR</li>
                              <li>• Q23: Article/Essay (6 marks) + OR</li>
                              <li>• Q24-27: Grammar (4 × 2 = 8 marks)</li>
                              <li>• Q28-31: Literature (4 × 6 = 24 marks)</li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-gray-400">
                            ✓ 31 questions = 70 marks • ✓ English only • ✓ Long
                            passages • ✓ Full letter format
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Difficulty Selection */}
                    <div className="form-group">
                      <label className="input-label">Difficulty Level</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          {
                            value: "easy",
                            label: "Easy",
                            desc: "Board exam level",
                            icon: "🟢",
                          },
                          {
                            value: "medium",
                            label: "Medium",
                            desc: "Competitive level",
                            icon: "🟡",
                          },
                          {
                            value: "hard",
                            label: "Hard",
                            desc: "JEE/NEET/Olympiad",
                            icon: "🔴",
                          },
                        ].map((level) => (
                          <button
                            key={level.value}
                            type="button"
                            onClick={() =>
                              setBulkForm({
                                ...bulkForm,
                                difficulty: level.value,
                              })
                            }
                            className={`p-3 rounded-lg border text-center transition-all ${
                              bulkForm.difficulty === level.value
                                ? "bg-blue-500/30 border-blue-500 text-white"
                                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                            }`}
                          >
                            <span className="text-xl">{level.icon}</span>
                            <p className="font-medium mt-1">{level.label}</p>
                            <p className="text-xs opacity-70">{level.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Additional fields only for General format */}
                    {bulkForm.examFormat === "general" && (
                      <>
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-blue-300 text-sm">
                          <p className="font-semibold mb-2">📋 How it works:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Paste your raw questions below (any format)</li>
                            <li>One-word answers will be converted to MCQ</li>
                            <li>Word meanings will get random distractors</li>
                            <li>
                              AI will auto-detect True/False, Fill-in-blanks,
                              etc.
                            </li>
                            <li>
                              Marks will be distributed based on your
                              instructions
                            </li>
                          </ul>
                        </div>
                      </>
                    )}

                    <div className="form-group">
                      <label className="input-label">
                        Raw Questions / Topic
                      </label>
                      <textarea
                        value={bulkForm.rawQuestions}
                        onChange={(e) =>
                          setBulkForm({
                            ...bulkForm,
                            rawQuestions: e.target.value,
                          })
                        }
                        className="glass-input h-40 resize-none font-mono text-sm"
                        placeholder={
                          bulkForm.examFormat === "upboard_science"
                            ? `Enter topic(s) for UP Board Science paper...

Example (Single topic):
प्रकाश - परावर्तन और अपवर्तन

Example (Multiple topics - comma separated):
प्रकाश, रासायनिक अभिक्रियाएं, जीवन प्रक्रियाएं

OR paste raw questions in any format...`
                            : bulkForm.examFormat === "upboard_english"
                            ? `Enter topic(s) for UP Board English paper...

Example (Single topic):
Reading Comprehension

Example (Multiple topics - comma separated):
Grammar, Letter Writing, First Flight Chapter 1

OR paste raw questions in any format...`
                            : bulkForm.examFormat === "upboard_hindi"
                            ? `UP Board Hindi Paper के लिए विषय दर्ज करें...

उदाहरण (एक विषय):
काव्य खण्ड - तुलसीदास

उदाहरण (अनेक विषय - comma से अलग):
गद्य खण्ड, काव्य खण्ड, व्याकरण, संस्कृत

या कच्चे प्रश्न paste करें...`
                            : bulkForm.examFormat === "upboard_sanskrit"
                            ? `UP Board Sanskrit Paper के लिए विषय दर्ज करें...

उदाहरण (एक विषय):
व्याकरण - संधि, समास

उदाहरण (अनेक विषय - comma से अलग):
गद्य, पद्य, व्याकरण, निबन्ध

या कच्चे प्रश्न paste करें...`
                            : `Paste your questions here in any format...

Example:
1. What is photosynthesis? (2 marks)
2. Define osmosis.
3. Water freezes at _____ degrees Celsius.
4. True/False: Plants need sunlight to grow.
5. Match: Vitamin C - Citrus fruits, Vitamin A - Carrots
6. Meaning of "benevolent"
7. Capital of France?`
                        }
                      />
                    </div>

                    {/* Show these fields only for General format, not for UP Board */}
                    {bulkForm.examFormat !== "upboard_science" &&
                      bulkForm.examFormat !== "upboard_english" &&
                      bulkForm.examFormat !== "upboard_hindi" &&
                      bulkForm.examFormat !== "upboard_sanskrit" && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                              <label className="input-label">
                                Maximum Total Marks
                              </label>
                              <input
                                type="number"
                                value={bulkForm.maxMarks}
                                onChange={(e) =>
                                  setBulkForm({
                                    ...bulkForm,
                                    maxMarks: parseInt(e.target.value) || 50,
                                  })
                                }
                                className="glass-input"
                                min={10}
                                max={200}
                              />
                            </div>

                            <div className="form-group">
                              <label className="input-label">
                                Questions to Pick{" "}
                                <span className="text-gray-500">
                                  (optional, leave empty for all)
                                </span>
                              </label>
                              <input
                                type="number"
                                value={bulkForm.numberOfQuestions}
                                onChange={(e) =>
                                  setBulkForm({
                                    ...bulkForm,
                                    numberOfQuestions: e.target.value,
                                  })
                                }
                                className="glass-input"
                                min={1}
                                placeholder="All questions"
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="input-label">
                              Marks Distribution Instructions{" "}
                              <span className="text-gray-500">(optional)</span>
                            </label>
                            <textarea
                              value={bulkForm.marksDistribution}
                              onChange={(e) =>
                                setBulkForm({
                                  ...bulkForm,
                                  marksDistribution: e.target.value,
                                })
                              }
                              className="glass-input h-20 resize-none text-sm"
                              placeholder={`Examples:
- MCQs: 1 mark each, Written: 3-5 marks each
- Easy questions: 1 mark, Medium: 2 marks, Hard: 3 marks
- Distribute marks equally among all questions`}
                            />
                          </div>

                          <div className="form-group">
                            <label className="input-label">Language</label>
                            <select
                              value={bulkForm.language}
                              onChange={(e) =>
                                setBulkForm({
                                  ...bulkForm,
                                  language: e.target.value,
                                })
                              }
                              className="glass-input"
                            >
                              <option value="english">English</option>
                              <option value="hindi">हिंदी (Hindi)</option>
                              <option value="bilingual">
                                द्विभाषी (Bilingual)
                              </option>
                              <option value="spanish">Spanish</option>
                              <option value="french">French</option>
                              <option value="german">German</option>
                              <option value="chinese">Chinese</option>
                              <option value="japanese">Japanese</option>
                              <option value="arabic">Arabic</option>
                            </select>
                          </div>
                        </>
                      )}

                    <motion.button
                      onClick={handleProcessBulk}
                      disabled={processingBulk || !bulkForm.rawQuestions.trim()}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {processingBulk ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Processing with AI...
                        </>
                      ) : (
                        <>
                          <FiZap className="w-5 h-5" />
                          Process Questions
                        </>
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-300">
                      <p className="font-semibold">
                        ✓ Processed {processedQuestions.length} questions (
                        {processedQuestions.reduce(
                          (sum, q) => sum + q.marks,
                          0
                        )}{" "}
                        total marks)
                      </p>
                      <p className="text-sm mt-1 text-green-400">
                        Review the questions below and add them to your quiz.
                      </p>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {processedQuestions.map((question, index) => (
                        <div key={index} className="bg-white/5 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-white flex-1">
                              <span className="text-blue-400 font-bold">
                                Q{index + 1}.
                              </span>{" "}
                              {question.questionText}
                            </p>
                            <div className="flex gap-2 ml-2">
                              <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full whitespace-nowrap">
                                {question.marks} mark
                                {question.marks > 1 ? "s" : ""}
                              </span>
                              <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full whitespace-nowrap">
                                {question.questionType}
                              </span>
                            </div>
                          </div>

                          {/* Show options for MCQ and True/False */}
                          {(question.questionType === "mcq" ||
                            question.questionType === "truefalse") && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {question.options.map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  className={`p-2 rounded ${
                                    optIdx === question.correctOption
                                      ? "bg-green-500/20 text-green-300"
                                      : "bg-white/5 text-gray-400"
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIdx)}. {opt}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Show answer for written */}
                          {question.questionType === "written" && (
                            <div className="text-sm text-gray-400 mt-2">
                              <span className="text-green-400">Answer: </span>
                              {question.correctAnswer}
                            </div>
                          )}

                          {/* Show blanks for fill-in-blank */}
                          {question.questionType === "fillblank" && (
                            <div className="text-sm text-gray-400 mt-2">
                              <span className="text-green-400">Blanks: </span>
                              {question.blanks?.join(", ")}
                            </div>
                          )}

                          {/* Show match pairs */}
                          {question.questionType === "matching" && (
                            <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                              {question.matchPairs?.map((pair, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="flex items-center gap-2 text-gray-400"
                                >
                                  <span className="text-blue-400">
                                    {pair.left}
                                  </span>
                                  <span>→</span>
                                  <span className="text-green-400">
                                    {pair.right}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-4">
                      <motion.button
                        onClick={() => {
                          setProcessedQuestions([]);
                        }}
                        className="btn-secondary flex-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Reprocess
                      </motion.button>
                      <motion.button
                        onClick={handleAddProcessedQuestions}
                        className="btn-success flex-1 flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FiPlus className="w-5 h-5" />
                        Add All to Quiz
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Extract from Image Modal */}
        <AnimatePresence>
          {showImageModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!extracting) {
                  setShowImageModal(false);
                  setExtractedQuestions([]);
                }
              }}
            >
              <motion.div
                className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiFileText className="w-6 h-6 text-blue-400" />
                    Extract Questions from Image
                  </h2>
                  <button
                    onClick={() => {
                      if (!extracting) {
                        setShowImageModal(false);
                        setExtractedQuestions([]);
                      }
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <FiX className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {extractedQuestions.length === 0 ? (
                  <div className="space-y-4">
                    {/* Exam Format Selection */}
                    <div className="form-group">
                      <label className="input-label">Exam Format *</label>
                      <select
                        value={imageForm.examFormat || "general"}
                        onChange={(e) => {
                          const format = e.target.value;
                          if (format === "upboard_science") {
                            setImageForm({
                              ...imageForm,
                              examFormat: format,
                              language: "bilingual",
                            });
                          } else if (format === "upboard_english") {
                            setImageForm({
                              ...imageForm,
                              examFormat: format,
                              language: "english",
                            });
                          } else if (format === "upboard_hindi") {
                            setImageForm({
                              ...imageForm,
                              examFormat: format,
                              language: "hindi",
                            });
                          } else if (format === "upboard_sanskrit") {
                            setImageForm({
                              ...imageForm,
                              examFormat: format,
                              language: "sanskrit",
                            });
                          } else if (format === "upboard_maths") {
                            setImageForm({
                              ...imageForm,
                              examFormat: format,
                              language: "bilingual",
                            });
                          } else if (format === "upboard_socialscience") {
                            setImageForm({
                              ...imageForm,
                              examFormat: format,
                              language: "bilingual",
                            });
                          } else if (format === "upboard_biology") {
                            setImageForm({
                              ...imageForm,
                              examFormat: format,
                              language: "bilingual",
                            });
                          } else if (format === "upboard_englishclass12") {
                            setImageForm({
                              ...imageForm,
                              examFormat: format,
                              language: "english",
                            });
                          } else if (format === "upboard_hindiclass12") {
                            setImageForm({
                              ...imageForm,
                              examFormat: format,
                              language: "hindi",
                            });
                          } else if (format === "upboard_chemistryclass12") {
                            setImageForm({
                              ...imageForm,
                              examFormat: format,
                              language: "bilingual",
                            });
                          } else {
                            setImageForm({
                              ...imageForm,
                              examFormat: format,
                            });
                          }
                        }}
                        className="glass-input"
                      >
                        <option value="general">General (Custom)</option>
                        <option value="upboard_science">
                          UP Board Science (Class 10)
                        </option>
                        <option value="upboard_english">
                          UP Board English (Class 10)
                        </option>
                        <option value="upboard_hindi">
                          UP Board Hindi (Class 10)
                        </option>
                        <option value="upboard_sanskrit">
                          UP Board Sanskrit (Class 10)
                        </option>
                        <option value="upboard_maths">
                          UP Board Mathematics (Class 10)
                        </option>
                        <option value="upboard_socialscience">
                          UP Board Social Science (Class 10)
                        </option>
                        <option value="upboard_biology">
                          UP Board Biology (Class 12)
                        </option>
                        <option value="upboard_englishclass12">
                          UP Board English (Class 12)
                        </option>
                        <option value="upboard_hindiclass12">
                          UP Board Hindi (Class 12)
                        </option>
                        <option value="upboard_chemistryclass12">
                          UP Board Chemistry (Class 12) - 70 Marks
                        </option>
                      </select>
                    </div>

                    {/* UP Board Biology Info Box */}
                    {imageForm.examFormat === "upboard_biology" && (
                      <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 border border-green-500/30 rounded-lg p-4">
                        <p className="text-green-300 font-medium mb-3">
                          🧬 UP Board Biology (Class 12) - 70 अंक
                        </p>
                        <div className="text-xs text-gray-400 space-y-2">
                          <p>📋 Paper Code: 348(KH)</p>
                          <p>• Q1: 4 MCQs (Bilingual)</p>
                          <p>• Q2: Very Short Answer (5×1 = 5 marks)</p>
                          <p>• Q3: Short Type I (5×2 = 10 marks)</p>
                          <p>• Q4-Q6: Short Type II (12×3 = 36 marks)</p>
                          <p>• Q7-Q9: Long Answer (3×5 = 15 marks) with OR</p>
                          <p className="text-green-400 mt-2">
                            💡 Upload clear images of Biology question paper
                          </p>
                        </div>
                      </div>
                    )}

                    {/* UP Board English Class 12 Info Box */}
                    {imageForm.examFormat === "upboard_englishclass12" && (
                      <div className="rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 border border-blue-200 dark:border-blue-700">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                          📖 UP Board English Paper (Class 12) - 100 अंक | 20
                          Questions
                        </h4>
                        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                          <p>📋 Paper Code: 316(HV)</p>
                          <p>
                            ✓ Section A: Reading (25 marks) - 5 questions
                            (Passage + Questions)
                          </p>
                          <p>
                            ✓ Section B: Writing (20 marks) - 2 questions
                            (Article + Letter/Application)
                          </p>
                          <p>
                            ✓ Section C: Grammar (15 marks) - 6 questions (MCQs
                            + Translation)
                          </p>
                          <p>
                            ✓ Section D: Literature (40 marks) - 7 questions
                            (Flamingo & Vistas)
                          </p>
                          <p className="text-xs mt-2 text-blue-700 dark:text-blue-300">
                            💡 Upload clear images of all sections including
                            passages
                          </p>
                        </div>
                      </div>
                    )}

                    {/* UP Board Hindi Class 12 Info Box */}
                    {imageForm.examFormat === "upboard_hindiclass12" && (
                      <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-lg p-4">
                        <p className="text-orange-300 font-medium mb-3">
                          📚 UP Board Class 12 Hindi - 100 अंक
                        </p>
                        <div className="text-xs text-gray-400 space-y-2">
                          <p>📋 Paper Code: 301(HA) | 20 Questions Total</p>
                          <p>
                            ✓ खण्ड-क (55 अंक): MCQs, गद्यांश, पद्यांश, लेखक/कवि
                            परिचय, खण्डकाव्य
                          </p>
                          <p>
                            ✓ खण्ड-ख (45 अंक): संस्कृत, निबंध, व्याकरण
                            (संधि-विच्छेद, समास), पत्र
                          </p>
                          <p className="text-xs mt-2 text-orange-700 dark:text-orange-300">
                            💡 Upload clear images of all sections - both Hindi
                            and Sanskrit portions
                          </p>
                        </div>
                      </div>
                    )}

                    {/* UP Board Chemistry Class 12 Info Box */}
                    {imageForm.examFormat === "upboard_chemistryclass12" && (
                      <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 border border-green-500/30 rounded-lg p-4">
                        <p className="text-green-300 font-medium mb-3">
                          🧪 UP Board Class 12 Chemistry - 70 Marks
                        </p>
                        <div className="text-xs text-gray-400 space-y-2">
                          <p>📋 Paper Code: 347(JZ) | 12 Questions Total</p>
                          <p>
                            ✓ Q1-Q6: Individual MCQs (1 mark each) = 6 marks
                          </p>
                          <p>
                            ✓ Q7-Q8: Short answers (8m each) - Brief
                            explanations & numericals
                          </p>
                          <p>
                            ✓ Q9-Q10: Numerical & theory (12m each) -
                            Electrochemistry, kinetics
                          </p>
                          <p>
                            ✓ Q11-Q12: Organic chemistry (12m each) - IUPAC
                            names, reactions, mechanisms
                          </p>
                          <p className="text-xs mt-2 text-green-700 dark:text-green-300">
                            💡 Upload clear images showing all chemical
                            equations and structural formulas
                          </p>
                        </div>
                      </div>
                    )}

                    {/* UP Board Social Science Info Box */}
                    {imageForm.examFormat === "upboard_socialscience" && (
                      <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-lg p-4">
                        <p className="text-purple-300 font-medium mb-3">
                          🌍 UP Board Social Science - 70 अंक
                        </p>
                        <div className="text-xs text-gray-400 space-y-2">
                          <p>📋 Paper Code: 825(BAS)</p>
                          <p>• Part A: 20 MCQs (Bilingual)</p>
                          <p>• Part B: Descriptive + Map Work</p>
                          <p className="text-indigo-300">
                            💡 History, Geography, Civics, Economics
                          </p>
                        </div>
                      </div>
                    )}

                    {/* UP Board Mathematics Info Box */}
                    {imageForm.examFormat === "upboard_maths" && (
                      <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-4">
                        <p className="text-blue-300 font-medium mb-3">
                          📐 UP Board Mathematics Paper - 70 अंक (25 प्रश्न)
                        </p>
                        <p className="text-xs text-gray-400 mb-2">
                          Paper Code: 822(BV)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-yellow-400 font-medium mb-2">
                              खण्ड 'अ' - 20 अंक
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• प्र.1-20: MCQs (20 अंक)</li>
                            </ul>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-green-400 font-medium mb-2">
                              खण्ड 'ब' - 50 अंक
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• प्र.21-25: वर्णनात्मक (50 अंक)</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* UP Board Sanskrit Info Box */}
                    {imageForm.examFormat === "upboard_sanskrit" && (
                      <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-lg p-4">
                        <p className="text-amber-300 font-medium mb-3">
                          📋 UP Board Sanskrit Paper - 70 अंक (31 प्रश्न)
                        </p>
                        <p className="text-xs text-gray-400 mb-2">
                          Paper Code: 818(BP)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-yellow-400 font-medium mb-2">
                              खण्ड 'अ' - 20 अंक
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• प्र.1-6: गद्यांश MCQs (6 अंक)</li>
                              <li>• प्र.7-20: व्याकरण MCQs (14 अंक)</li>
                            </ul>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-green-400 font-medium mb-2">
                              खण्ड 'ब' - 50 अंक
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>
                                • गद्यांश • श्लोक • सारांश • चरित्र (23 अंक)
                              </li>
                              <li>• व्याकरण • अनुवाद • निबन्ध (27 अंक)</li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-gray-400">
                            ✓ 31 प्रश्न = 70 अंक • ✓ संस्कृत/हिन्दी • ✓ अथवा
                            विकल्प सहित
                          </p>
                        </div>
                      </div>
                    )}

                    {/* UP Board Info Box */}
                    {imageForm.examFormat === "upboard_science" && (
                      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg p-4">
                        <p className="text-blue-300 font-medium mb-3">
                          📋 UP Board Science Paper - 70 Marks (31 Questions)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-yellow-400 font-medium mb-2">
                              खण्ड-अ (Part A) - 20 Marks
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• उप-भाग I: 7 MCQs × 1 = 7 marks</li>
                              <li>• उप-भाग II: 6 MCQs × 1 = 6 marks</li>
                              <li>• उप-भाग III: 7 MCQs × 1 = 7 marks</li>
                            </ul>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-green-400 font-medium mb-2">
                              खण्ड-ब (Part B) - 50 Marks
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• उप-भाग I: 4 × (2+2) = 16 marks</li>
                              <li>• उप-भाग II: 4 × 4 = 16 marks</li>
                              <li>• उप-भाग III: 3 × 6 = 18 marks (OR)</li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-gray-400">
                            ✓ 31 questions = 70 marks • ✓ Bilingual
                            (Hindi/English) • ✓ Section headers
                          </p>
                        </div>
                      </div>
                    )}

                    {/* UP Board English Info Box */}
                    {imageForm.examFormat === "upboard_english" && (
                      <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 border border-green-500/30 rounded-lg p-4">
                        <p className="text-green-300 font-medium mb-3">
                          📋 UP Board English Paper - 70 Marks (31 Questions)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-yellow-400 font-medium mb-2">
                              PART-A - 20 Marks
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• Q1-Q20: 20 MCQs × 1 = 20 marks</li>
                            </ul>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-green-400 font-medium mb-2">
                              PART-B - 50 Marks
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• Q21: Reading (8 marks)</li>
                              <li>• Q22: Letter (4 marks) + OR</li>
                              <li>• Q23: Article/Essay (6 marks) + OR</li>
                              <li>• Q24-27: Grammar (4 × 2 = 8 marks)</li>
                              <li>• Q28-31: Literature (4 × 6 = 24 marks)</li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-gray-400">
                            ✓ 31 questions = 70 marks • ✓ English only • ✓ Long
                            passages • ✓ Full letter format
                          </p>
                        </div>
                      </div>
                    )}

                    {/* UP Board Hindi Info Box */}
                    {imageForm.examFormat === "upboard_hindi" && (
                      <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-4">
                        <p className="text-orange-300 font-medium mb-3">
                          📋 UP Board Hindi Paper - 70 अंक (30 प्रश्न)
                        </p>
                        <p className="text-xs text-gray-400 mb-2">
                          Paper Code: 801(BA)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-yellow-400 font-medium mb-2">
                              खण्ड 'अ' - 20 अंक
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• प्र.1-20: 20 MCQs × 1 = 20 अंक</li>
                            </ul>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-green-400 font-medium mb-2">
                              खण्ड 'ब' - 50 अंक
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                              <li>• गद्यांश (6), पद्यांश (6)</li>
                              <li>• संस्कृत अनुवाद (5+5), खण्डकाव्य (3)</li>
                              <li>• लेखक/कवि (10), श्लोक (2), पत्र (4)</li>
                              <li>• संस्कृत प्रश्न (2), निबन्ध (7)</li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-gray-400">
                            ✓ 30 प्रश्न = 70 अंक • ✓ हिन्दी में • ✓ अथवा विकल्प
                            सहित
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Difficulty Selection */}
                    <div className="form-group">
                      <label className="input-label">Difficulty Level</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          {
                            value: "easy",
                            label: "Easy",
                            desc: "Board exam level",
                            icon: "🟢",
                          },
                          {
                            value: "medium",
                            label: "Medium",
                            desc: "Competitive level",
                            icon: "🟡",
                          },
                          {
                            value: "hard",
                            label: "Hard",
                            desc: "JEE/NEET/Olympiad",
                            icon: "🔴",
                          },
                        ].map((level) => (
                          <button
                            key={level.value}
                            type="button"
                            onClick={() =>
                              setImageForm({
                                ...imageForm,
                                difficulty: level.value,
                              })
                            }
                            className={`p-3 rounded-lg border text-center transition-all ${
                              imageForm.difficulty === level.value
                                ? "bg-blue-500/30 border-blue-500 text-white"
                                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                            }`}
                          >
                            <span className="text-xl">{level.icon}</span>
                            <p className="font-medium mt-1">{level.label}</p>
                            <p className="text-xs opacity-70">{level.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Language - Only for General format */}
                    {imageForm.examFormat === "general" && (
                      <div className="form-group">
                        <label className="input-label">Language</label>
                        <select
                          value={imageForm.language || "english"}
                          onChange={(e) =>
                            setImageForm({
                              ...imageForm,
                              language: e.target.value,
                            })
                          }
                          className="glass-input"
                        >
                          <option value="english">English</option>
                          <option value="hindi">हिंदी (Hindi)</option>
                          <option value="bilingual">
                            द्विभाषी (Bilingual)
                          </option>
                          <option value="sanskrit">संस्कृत (Sanskrit)</option>
                          <option value="spanish">Español (Spanish)</option>
                          <option value="french">Français (French)</option>
                          <option value="german">Deutsch (German)</option>
                        </select>
                      </div>
                    )}

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-blue-300 text-sm">
                      <p className="font-semibold mb-2">📸 How it works:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          Upload an image with questions (test paper, worksheet,
                          etc.)
                        </li>
                        <li>AI will detect and extract all questions</li>
                        <li>
                          Auto-converts to appropriate formats (MCQ, Written,
                          etc.)
                        </li>
                        <li>Add instructions for marks distribution</li>
                      </ul>
                    </div>

                    {/* Image Upload - Multiple Images */}
                    <div className="form-group">
                      <label className="input-label">
                        Upload Images
                        <span className="text-gray-500 ml-2">
                          ({imageForm.images?.length || 0}/5 images)
                        </span>
                      </label>

                      {/* Image Previews Grid */}
                      {imageForm.images && imageForm.images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-3">
                          {imageForm.images.map((img, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={img.preview}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-white/20"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(index)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                ✕
                              </button>
                              <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                {index + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload Button */}
                      {(!imageForm.images || imageForm.images.length < 5) && (
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                            id="image-upload"
                          />
                          <label
                            htmlFor="image-upload"
                            className="glass-input cursor-pointer flex items-center justify-center p-6 text-center hover:bg-white/10 transition-colors border-2 border-dashed border-white/20 hover:border-blue-500/50"
                          >
                            <div>
                              <FiPlus className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                              <p className="text-gray-400">
                                {imageForm.images?.length > 0
                                  ? "Click to add more images"
                                  : "Click to upload images"}
                              </p>
                              <p className="text-gray-500 text-sm mt-1">
                                JPG, PNG, JPEG • Max 5 images
                              </p>
                            </div>
                          </label>
                        </div>
                      )}

                      {imageForm.images?.length === 5 && (
                        <p className="text-yellow-400 text-sm mt-2">
                          ✓ Maximum 5 images reached
                        </p>
                      )}
                    </div>

                    {/* Show these fields only for General format, not for UP Board */}
                    {imageForm.examFormat !== "upboard_science" &&
                      imageForm.examFormat !== "upboard_english" &&
                      imageForm.examFormat !== "upboard_hindi" &&
                      imageForm.examFormat !== "upboard_sanskrit" && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                              <label className="input-label">
                                Maximum Total Marks
                              </label>
                              <input
                                type="number"
                                value={imageForm.maxMarks}
                                onChange={(e) =>
                                  setImageForm({
                                    ...imageForm,
                                    maxMarks: parseInt(e.target.value) || 50,
                                  })
                                }
                                className="glass-input"
                                min={10}
                                max={200}
                              />
                            </div>

                            <div className="form-group">
                              <label className="input-label">Language</label>
                              <select
                                value={imageForm.language}
                                onChange={(e) =>
                                  setImageForm({
                                    ...imageForm,
                                    language: e.target.value,
                                  })
                                }
                                className="glass-input"
                              >
                                <option value="english">English</option>
                                <option value="hindi">हिंदी (Hindi)</option>
                                <option value="bilingual">
                                  द्विभाषी (Bilingual)
                                </option>
                                <option value="spanish">Spanish</option>
                                <option value="french">French</option>
                                <option value="german">German</option>
                              </select>
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="input-label">
                              Marks Distribution{" "}
                              <span className="text-gray-500">(optional)</span>
                            </label>
                            <textarea
                              value={imageForm.marksDistribution}
                              onChange={(e) =>
                                setImageForm({
                                  ...imageForm,
                                  marksDistribution: e.target.value,
                                })
                              }
                              className="glass-input h-20 resize-none text-sm"
                              placeholder="E.g., MCQs: 1 mark, Written: 3-5 marks, Easy: 1 mark, Hard: 3 marks"
                            />
                          </div>

                          <div className="form-group">
                            <label className="input-label">
                              Additional Instructions{" "}
                              <span className="text-gray-500">(optional)</span>
                            </label>
                            <textarea
                              value={imageForm.additionalInstructions}
                              onChange={(e) =>
                                setImageForm({
                                  ...imageForm,
                                  additionalInstructions: e.target.value,
                                })
                              }
                              className="glass-input h-20 resize-none text-sm"
                              placeholder="E.g., Convert one-word answers to MCQ, Skip diagram questions, etc."
                            />
                          </div>
                        </>
                      )}

                    <motion.button
                      onClick={handleExtractFromImage}
                      disabled={
                        extracting ||
                        !imageForm.images ||
                        imageForm.images.length === 0
                      }
                      className="btn-primary w-full flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {extracting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Extracting...
                        </>
                      ) : (
                        <>
                          <FiZap className="w-5 h-5" />
                          Extract Questions
                        </>
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-300 flex justify-between items-center">
                      <p className="font-semibold">
                        ✓ Extracted {extractedQuestions.length} questions (
                        {extractedQuestions.reduce(
                          (sum, q) => sum + q.marks,
                          0
                        )}{" "}
                        total marks)
                      </p>
                      <motion.button
                        onClick={() => handleDownloadExtractedPDF()}
                        className="text-green-400 hover:text-green-300 text-sm flex items-center gap-1"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <FiDownload className="w-4 h-4" />
                        Download PDF
                      </motion.button>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {/* Group by section if available */}
                      {(() => {
                        const sections = {};
                        extractedQuestions.forEach((q, idx) => {
                          const section = q.section || "Questions";
                          if (!sections[section]) sections[section] = [];
                          sections[section].push({ ...q, originalIndex: idx });
                        });

                        return Object.entries(sections).map(
                          ([sectionName, sectionQuestions]) => (
                            <div key={sectionName}>
                              {sectionName !== "Questions" && (
                                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-3 mb-3">
                                  <p className="text-yellow-300 font-bold text-sm">
                                    {sectionName}
                                  </p>
                                </div>
                              )}
                              {sectionQuestions.map((question) => (
                                <div
                                  key={question.originalIndex}
                                  className="bg-white/5 rounded-lg p-4 mb-2"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <p className="text-white flex-1">
                                      <span className="text-blue-400 font-bold">
                                        Q{question.originalIndex + 1}.
                                      </span>{" "}
                                      {question.questionText}
                                    </p>
                                    <div className="flex gap-2 ml-2">
                                      <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full whitespace-nowrap">
                                        {question.marks} mark
                                        {question.marks > 1 ? "s" : ""}
                                      </span>
                                      <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full whitespace-nowrap">
                                        {question.questionType}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Show options for MCQ and True/False */}
                                  {(question.questionType === "mcq" ||
                                    question.questionType === "truefalse") && (
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      {question.options?.map((opt, optIdx) => (
                                        <div
                                          key={optIdx}
                                          className={`p-2 rounded ${
                                            optIdx === question.correctOption
                                              ? "bg-green-500/20 text-green-300"
                                              : "bg-white/5 text-gray-400"
                                          }`}
                                        >
                                          {String.fromCharCode(65 + optIdx)}.{" "}
                                          {opt}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {question.questionType === "written" &&
                                    question.correctAnswer && (
                                      <div className="text-sm text-gray-400 mt-2 max-h-24 overflow-y-auto">
                                        <span className="text-green-400">
                                          Answer:{" "}
                                        </span>
                                        <span className="whitespace-pre-line">
                                          {question.correctAnswer.substring(
                                            0,
                                            200
                                          )}
                                          {question.correctAnswer.length > 200
                                            ? "..."
                                            : ""}
                                        </span>
                                      </div>
                                    )}

                                  {/* Show alternative question if exists */}
                                  {question.hasAlternative &&
                                    question.alternativeQuestion && (
                                      <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded text-sm">
                                        <span className="text-orange-400 font-medium">
                                          अथवा/OR:{" "}
                                        </span>
                                        <span className="text-gray-300">
                                          {question.alternativeQuestion}
                                        </span>
                                      </div>
                                    )}

                                  {question.questionType === "fillblank" && (
                                    <div className="text-sm text-gray-400 mt-2">
                                      <span className="text-green-400">
                                        Blanks:{" "}
                                      </span>
                                      {question.blanks?.join(", ")}
                                    </div>
                                  )}

                                  {question.questionType === "matching" && (
                                    <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                                      {question.matchPairs?.map(
                                        (pair, pIdx) => (
                                          <div
                                            key={pIdx}
                                            className="flex items-center gap-2 text-gray-400"
                                          >
                                            <span className="text-blue-400">
                                              {pair.left}
                                            </span>
                                            <span>→</span>
                                            <span className="text-green-400">
                                              {pair.right}
                                            </span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )
                        );
                      })()}
                    </div>

                    <div className="flex gap-4">
                      <motion.button
                        onClick={() => {
                          setExtractedQuestions([]);
                        }}
                        className="btn-secondary flex-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Re-extract
                      </motion.button>
                      <motion.button
                        onClick={handleAddExtractedQuestions}
                        className="btn-success flex-1 flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FiPlus className="w-5 h-5" />
                        Add All to Quiz
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ManageQuiz;
