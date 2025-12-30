const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI with API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get the Gemini model
const getGeminiModel = () => {
  return genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
};

// Generate quiz questions using Gemini
const generateQuestions = async (
  topic,
  numberOfQuestions,
  difficulty = "medium",
  language = "english",
  questionTypes = ["mcq"]
) => {
  const model = getGeminiModel();

  // Language-specific instructions
  const languageInstructions = {
    english: "",
    hindi:
      "\n\nIMPORTANT: Generate ALL content (questions, options, and answers) in Hindi language (हिंदी में). Use Devanagari script.",
    sanskrit:
      "\n\nIMPORTANT: Generate ALL content (questions, options, and answers) in Sanskrit language (संस्कृत में). Use Devanagari script.",
  };

  const languageNote = languageInstructions[language] || "";

  // Question type descriptions
  const typeDescriptions = {
    mcq: `MCQ Questions should have:
- "questionType": "mcq"
- "questionText": "The question text?"
- "options": ["Option A", "Option B", "Option C", "Option D"]
- "correctOption": 0 (index of correct answer, 0-3)
- "marks": 1`,
    written: `Written Answer Questions should have:
- "questionType": "written"
- "questionText": "The question text?"
- "correctAnswer": "Expected answer or key points"
- "marks": 2`,
    fillblank: `Fill in the Blanks Questions should have:
- "questionType": "fillblank"
- "questionText": "The question with _____ for each blank"
- "blanks": ["answer1", "answer2"] (array of correct answers for each blank)
- "marks": 1`,
    matching: `Match the Following Questions should have:
- "questionType": "matching"
- "questionText": "Match the following:"
- "matchPairs": [{"left": "Term 1", "right": "Definition 1"}, {"left": "Term 2", "right": "Definition 2"}]
- "marks": 2`,
    truefalse: `True/False Questions should have:
- "questionType": "truefalse"
- "questionText": "Statement to evaluate as true or false"
- "correctOption": 0 (0 for True, 1 for False)
- "options": ["True", "False"]
- "marks": 1`,
  };

  const selectedTypes = questionTypes
    .map((type) => typeDescriptions[type])
    .join("\n\n");

  const prompt = `Generate ${numberOfQuestions} quiz questions about "${topic}" at ${difficulty} difficulty level.${languageNote}

Generate a mix of these question types: ${questionTypes.join(", ")}

${selectedTypes}

Rules:
- Distribute questions across the selected types
- marks should be 1 for easy, 2 for medium, 3 for hard questions
- Questions should be clear and unambiguous
- For MCQ: exactly 4 options, only one correct
- For Written: provide comprehensive expected answer
- For Fill Blank: use _____ for blanks, provide all correct answers
- For Matching: provide 4-6 pairs, left items should match right items
${
  language !== "english"
    ? "- ALL text must be in " + language + " language"
    : ""
}

IMPORTANT: Return ONLY a valid JSON array with no additional text, markdown, or formatting.

Return ONLY the JSON array, nothing else.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up the response - remove markdown code blocks if present
    text = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Parse the JSON response
    const questions = JSON.parse(text);

    // Validate the structure
    if (!Array.isArray(questions)) {
      throw new Error("Response is not an array");
    }

    // Validate each question based on type
    questions.forEach((q, index) => {
      if (!q.questionText || !q.questionType) {
        throw new Error(`Invalid question structure at index ${index}`);
      }

      switch (q.questionType) {
        case "mcq":
          if (
            !Array.isArray(q.options) ||
            q.options.length !== 4 ||
            typeof q.correctOption !== "number" ||
            q.correctOption < 0 ||
            q.correctOption > 3
          ) {
            throw new Error(`Invalid MCQ structure at index ${index}`);
          }
          break;
        case "written":
          if (!q.correctAnswer) {
            throw new Error(
              `Missing correctAnswer for written question at index ${index}`
            );
          }
          break;
        case "fillblank":
          if (!Array.isArray(q.blanks) || q.blanks.length === 0) {
            throw new Error(
              `Invalid blanks array for fillblank question at index ${index}`
            );
          }
          break;
        case "matching":
          if (
            !Array.isArray(q.matchPairs) ||
            q.matchPairs.length < 2 ||
            !q.matchPairs.every((pair) => pair.left && pair.right)
          ) {
            throw new Error(
              `Invalid matchPairs for matching question at index ${index}`
            );
          }
          break;
        case "truefalse":
          if (
            typeof q.correctOption !== "number" ||
            (q.correctOption !== 0 && q.correctOption !== 1)
          ) {
            throw new Error(
              `Invalid correctOption for truefalse question at index ${index}`
            );
          }
          // Ensure options are set
          q.options = ["True", "False"];
          break;
        default:
          throw new Error(`Unknown question type at index ${index}`);
      }
    });

    return questions;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error(`Failed to generate questions: ${error.message}`);
  }
};

// OCR: Extract text from image using Gemini Vision
const extractTextFromImage = async (imageBase64, mimeType = "image/jpeg") => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Extract and transcribe all handwritten or printed text from this image. 
Return ONLY the extracted text, preserving the original language and formatting. 
If the text is in Hindi or Sanskrit (Devanagari script), transcribe it accurately.
Do not add any explanations, just the extracted text.`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      },
    ]);

    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error(`Failed to extract text from image: ${error.message}`);
  }
};

// Evaluate written answer using semantic matching
const evaluateWrittenAnswer = async (
  studentAnswer,
  expectedAnswer,
  maxMarks,
  threshold = 0.7
) => {
  const model = getGeminiModel();

  const prompt = `You are an answer evaluator. Compare the student's answer with the expected answer and evaluate it.

Expected Answer: "${expectedAnswer}"

Student's Answer: "${studentAnswer}"

Maximum Marks: ${maxMarks}

Evaluate the student's answer based on:
1. Semantic similarity - Does the answer convey the same meaning/concepts?
2. Key points covered - Are the important points mentioned?
3. Accuracy - Is the information correct?

MARKING SCHEME:
- Fully correct (95-100% match): Award full marks (${maxMarks})
- Minor errors (75-94% match): Deduct 1-2 marks based on severity
- Moderate errors (50-74% match): Deduct 3-4 marks or 30-50% of total
- Major errors (25-49% match): Deduct 50-75% of total marks
- Mostly wrong (1-24% match): Award minimal marks (1-2) if any relevant point
- Completely wrong (0% match): Award 0 marks

Be lenient with:
- Spelling errors and minor grammatical issues if meaning is clear
- Different word choices with same meaning
- Rephrased answers that convey the correct concept

Be strict with:
- Missing key concepts or important points
- Factual errors or incorrect information
- Completely unrelated or off-topic answers

Return ONLY a JSON object with this structure:
{
  "score": <number between 0 and ${maxMarks}>,
  "percentage": <number between 0 and 100>,
  "feedback": "<brief feedback explaining the score and what was correct/incorrect>"
}

Return ONLY the JSON object, nothing else.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up the response
    text = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const evaluation = JSON.parse(text);

    return {
      score: Math.min(Math.max(0, evaluation.score), maxMarks),
      percentage: Math.min(Math.max(0, evaluation.percentage), 100),
      feedback: evaluation.feedback || "Answer evaluated",
    };
  } catch (error) {
    console.error("Evaluation Error:", error);
    // Return 0 if evaluation fails
    return {
      score: 0,
      percentage: 0,
      feedback: "Could not evaluate answer automatically",
    };
  }
};

// Extract questions from an uploaded image
const extractQuestionsFromImage = async (
  imageBase64,
  mimeType,
  maxMarks,
  marksDistribution = "",
  additionalInstructions = "",
  language = "english"
) => {
  const model = getGeminiModel();

  const languageInstructions = {
    english: "",
    hindi: "\n\nGenerate ALL content in Hindi (हिंदी). Use Devanagari script.",
    sanskrit:
      "\n\nGenerate ALL content in Sanskrit (संस्कृत). Use Devanagari script.",
  };

  const languageNote = languageInstructions[language] || "";

  const prompt = `You are a quiz question extractor. Analyze this image and extract all questions visible in it.${languageNote}

MAXIMUM TOTAL MARKS: ${maxMarks}

MARKS DISTRIBUTION:
${marksDistribution || "Distribute marks evenly based on question difficulty"}

ADDITIONAL INSTRUCTIONS:
${additionalInstructions || "Extract all questions as they appear"}

RULES:
1. Extract all questions visible in the image
2. Determine the best format for each question:
   - Multiple choice → mcq type with 4 options
   - True/False → truefalse type
   - Fill in the blank → fillblank type
   - Matching → matching type
   - Descriptive/Written → written type
   - One word answer → Convert to mcq with 3 plausible wrong options

3. For questions without options shown:
   - If it's a one-word answer, convert to MCQ with 4 plausible options
   - If it's a definition/meaning, convert to MCQ with similar but wrong meanings
   - If it's descriptive, keep as written type

4. Preserve the original language if questions are in Hindi/other language

5. Distribute marks according to instructions, ensuring total = ${maxMarks}

6. Return ONLY a valid JSON array with each question having:
   - questionType: "mcq" | "truefalse" | "fillblank" | "matching" | "written"
   - questionText: The question text
   - marks: Number based on distribution
   - For mcq: options (array of 4), correctOption (0-3)
   - For truefalse: options ["True", "False"], correctOption (0 or 1)
   - For written: correctAnswer
   - For fillblank: blanks (array of answers)
   - For matching: matchPairs (array of {left, right})

IMPORTANT: Return ONLY the JSON array, no markdown, no explanation.`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      },
    ]);

    const response = await result.response;
    let text = response.text();

    // Clean up response - remove markdown and extra text
    text = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Extract only the JSON array part
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("No JSON array found in response");
    }

    text = text.substring(jsonStart, jsonEnd + 1);

    const questions = JSON.parse(text);

    if (!Array.isArray(questions)) {
      throw new Error("Response is not an array");
    }

    // Validate and fix each question
    questions.forEach((q, index) => {
      if (!q.questionText || !q.questionType) {
        throw new Error(`Invalid question at index ${index}`);
      }

      // Ensure truefalse has proper options
      if (q.questionType === "truefalse") {
        q.options = ["True", "False"];
      }
    });

    return questions;
  } catch (error) {
    console.error("Extract Questions from Image Error:", error);
    throw new Error(`Failed to extract questions from image: ${error.message}`);
  }
};

// Process raw questions and convert to proper quiz format
const processRawQuestions = async (
  rawQuestions,
  maxMarks,
  marksDistribution,
  language = "english",
  numberOfQuestions = null
) => {
  const model = getGeminiModel();

  const languageInstructions = {
    english: "",
    hindi: "\n\nGenerate ALL content in Hindi (हिंदी). Use Devanagari script.",
    sanskrit:
      "\n\nGenerate ALL content in Sanskrit (संस्कृत). Use Devanagari script.",
  };

  const languageNote = languageInstructions[language] || "";

  const prompt = `You are a quiz question processor. Convert the following raw questions/content into proper quiz questions.${languageNote}

RAW QUESTIONS/CONTENT:
"""
${rawQuestions}
"""

MAXIMUM TOTAL MARKS: ${maxMarks}

MARKS DISTRIBUTION INSTRUCTIONS:
"""
${marksDistribution}
"""

${
  numberOfQuestions
    ? `SELECT EXACTLY ${numberOfQuestions} QUESTIONS RANDOMLY from the input.`
    : "Process ALL questions provided."
}

RULES:
1. Analyze each question and determine the best format:
   - One word answers → Convert to MCQ with 4 plausible options (generate 3 wrong options using your knowledge)
   - Word meanings → MCQ with 4 options (include correct meaning + 3 similar but wrong meanings)
   - True/False statements → truefalse type
   - Fill in the blank → fillblank type
   - Matching pairs → matching type
   - Descriptive questions → written type
   - Multiple choice given → mcq type

2. For MCQ conversions:
   - Generate 3 plausible but incorrect options
   - Randomize the position of correct answer
   - Options should be similar in style/length

3. Distribute marks according to the instructions, ensuring total = ${maxMarks}

4. Return ONLY a valid JSON array with each question having:
   - questionType: "mcq" | "truefalse" | "fillblank" | "matching" | "written"
   - questionText: The question text
   - marks: Number based on distribution
   - For mcq: options (array of 4), correctOption (0-3)
   - For truefalse: options ["True", "False"], correctOption (0 or 1)
   - For written: correctAnswer
   - For fillblank: blanks (array of answers)
   - For matching: matchPairs (array of {left, right})

IMPORTANT: Return ONLY the JSON array, no markdown, no explanation.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up response - remove markdown and extra text
    text = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Extract only the JSON array part (everything between [ and last ])
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("No JSON array found in response");
    }

    text = text.substring(jsonStart, jsonEnd + 1);

    const questions = JSON.parse(text);

    if (!Array.isArray(questions)) {
      throw new Error("Response is not an array");
    }

    // Validate and fix each question
    questions.forEach((q, index) => {
      if (!q.questionText || !q.questionType) {
        throw new Error(`Invalid question at index ${index}`);
      }

      // Ensure truefalse has proper options
      if (q.questionType === "truefalse") {
        q.options = ["True", "False"];
      }
    });

    return questions;
  } catch (error) {
    console.error("Process Raw Questions Error:", error);
    throw new Error(`Failed to process questions: ${error.message}`);
  }
};

module.exports = {
  getGeminiModel,
  generateQuestions,
  extractTextFromImage,
  evaluateWrittenAnswer,
  processRawQuestions,
  extractQuestionsFromImage,
};
