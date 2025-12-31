const { GoogleGenerativeAI } = require("@google/generative-ai");

// Multiple Gemini API keys for fallback
const GEMINI_API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean); // Remove undefined/null keys

let currentKeyIndex = 0;

// Get Gemini AI instance with current key
const getGeminiAI = () => {
  if (GEMINI_API_KEYS.length === 0) {
    throw new Error("No Gemini API keys configured");
  }
  return new GoogleGenerativeAI(GEMINI_API_KEYS[currentKeyIndex]);
};

// Rotate to next API key
const rotateApiKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
  console.log(
    `Rotating to Gemini API key ${currentKeyIndex + 1}/${
      GEMINI_API_KEYS.length
    }`
  );
};

// Get the Gemini model with retry logic
const getGeminiModel = async (modelName = "gemini-3-flash-preview") => {
  const genAI = getGeminiAI();
  return genAI.getGenerativeModel({ model: modelName });
};

// Execute Gemini request with fallback
const executeWithFallback = async (operation) => {
  const maxRetries = GEMINI_API_KEYS.length;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.error(
        `Gemini API error with key ${currentKeyIndex + 1}:`,
        error.message
      );

      // Check if error is quota/rate limit related
      const isQuotaError =
        error.message?.includes("quota") ||
        error.message?.includes("rate limit") ||
        error.message?.includes("429");

      if (isQuotaError && attempt < maxRetries - 1) {
        rotateApiKey();
        console.log(
          `Retrying with next API key (attempt ${attempt + 2}/${maxRetries})...`
        );
        continue;
      }

      // If not quota error or last attempt, throw
      throw error;
    }
  }

  throw lastError;
};

// Normalize question type from various AI responses to standard types
const normalizeQuestionType = (type) => {
  if (!type) return null;
  const normalized = type.toLowerCase().trim().replace(/[_\-\s]/g, "");
  
  const typeMap = {
    // MCQ variations
    mcq: "mcq",
    multiplechoice: "mcq",
    multiplechoicequestion: "mcq",
    choice: "mcq",
    objective: "mcq",
    // Written variations
    written: "written",
    writtenanswer: "written",
    descriptive: "written",
    shortanswer: "written",
    longanswer: "written",
    essay: "written",
    subjective: "written",
    // Fill blank variations
    fillblank: "fillblank",
    fillintheblanks: "fillblank",
    fillintheblank: "fillblank",
    fillblanks: "fillblank",
    blank: "fillblank",
    blanks: "fillblank",
    fib: "fillblank",
    // Matching variations
    matching: "matching",
    matchthefollowing: "matching",
    match: "matching",
    matchpairs: "matching",
    // True/False variations
    truefalse: "truefalse",
    trueorfalse: "truefalse",
    tf: "truefalse",
    boolean: "truefalse",
    yesno: "truefalse",
  };
  
  return typeMap[normalized] || null;
};

// Generate quiz questions using Gemini
const generateQuestions = async (
  topic,
  numberOfQuestions,
  difficulty = "medium",
  language = "english",
  questionTypes = ["mcq"],
  description = "",
  examFormat = "general"
) => {
  return await executeWithFallback(async () => {
    const model = await getGeminiModel();

    // Language-specific instructions
    const languageInstructions = {
      english: "",
      hindi:
        "\n\nIMPORTANT: Generate ALL content (questions, options, and answers) in Hindi language (हिंदी में). Use Devanagari script for all text.",
      bilingual:
        "\n\nIMPORTANT: Generate questions in BILINGUAL format - each question should have both Hindi (हिंदी) and English versions. Format: Hindi version first, then English in parentheses or on next line.",
      sanskrit:
        "\n\nIMPORTANT: Generate ALL content (questions, options, and answers) in Sanskrit language (संस्कृत में). Use Devanagari script for all text.",
      spanish:
        "\n\nIMPORTANT: Generate ALL content (questions, options, and answers) in Spanish language (en español).",
      french:
        "\n\nIMPORTANT: Generate ALL content (questions, options, and answers) in French language (en français).",
      german:
        "\n\nIMPORTANT: Generate ALL content (questions, options, and answers) in German language (auf Deutsch).",
    };

    const languageNote = languageInstructions[language] || "";

    // Difficulty level detailed instructions
    const difficultyInstructions = {
      easy: `
DIFFICULTY: EASY (बोर्ड परीक्षा स्तर / Board Exam Level)
- Questions should be from NCERT textbook directly
- Focus on definitions, basic concepts, and direct recall
- MCQs: Straightforward with one clearly correct answer
- Written: Ask for definitions, list 2-3 points, simple explanations
- Include: Basic formulas, simple diagrams, direct textbook questions
- Avoid: Application-based, numerical problems, multi-step reasoning
- Example MCQ: "प्रकाश संश्लेषण किसमें होता है? / Where does photosynthesis occur?"
- Example Written: "प्रकाश के परावर्तन के नियम लिखिए। / Write the laws of reflection of light."
`,
      medium: `
DIFFICULTY: MEDIUM (प्रतियोगी परीक्षा स्तर / Competitive Exam Level)
- Questions should test understanding and application of concepts
- MCQs: Include tricky options, require careful analysis, some calculation-based
- Written: Ask for explanations with examples, compare/contrast, derive formulas
- Include: Numerical problems, diagram-based questions, reason-based questions
- Require: Multi-step thinking, connecting concepts, practical applications
- Example MCQ: "यदि किसी लेंस की क्षमता -2D है, तो यह है / If power of a lens is -2D, then it is:" (with calculation needed)
- Example Written: "उत्तल और अवतल दर्पण में अंतर स्पष्ट कीजिए। उदाहरण सहित समझाइए। / Differentiate between convex and concave mirrors with examples."
- Include WHY and HOW questions, not just WHAT
`,
      hard: `
DIFFICULTY: HARD (JEE/NEET/Olympiad स्तर / Competitive Entrance Level)
- Questions should be challenging, requiring deep understanding
- MCQs: Complex scenarios, multiple concepts combined, assertion-reason type, numerical with multiple steps
- Written: Derivations, prove statements, complex numerical, case studies, HOTS questions
- Include: Integration of multiple topics, real-world problem solving, critical thinking
- Require: Advanced reasoning, mathematical calculations, conceptual clarity
- Example MCQ: "एक उत्तल लेंस की फोकस दूरी 20cm है। यदि वस्तु को 15cm पर रखा जाए तो प्रतिबिंब की प्रकृति और आवर्धन ज्ञात कीजिए। / A convex lens has focal length 20cm. If object is placed at 15cm, find nature and magnification of image."
- Example Written: "लेंस निर्माता सूत्र का व्युत्पन्न कीजिए और इसका उपयोग करके सिद्ध कीजिए कि... / Derive lens maker's formula and use it to prove that..."
- Include: Assertion-Reason, Case-based, Numerical with 3+ steps, Derivations
- Questions should make students THINK, not just recall
`
    };

    const difficultyNote = difficultyInstructions[difficulty] || difficultyInstructions.medium;

    // UP Board Science Format - Exact Paper Structure (70 Marks)
    const upBoardScienceFormat = `
YOU ARE GENERATING UP BOARD CLASS 10 SCIENCE PAPER (विज्ञान) - TOTAL 70 MARKS

TOPIC(S) FOR THIS PAPER: "${topic}"

TOPIC HANDLING RULES:
- User may enter SINGLE topic (e.g., "प्रकाश") OR MULTIPLE topics (e.g., "प्रकाश, रासायनिक अभिक्रियाएं, जीवन प्रक्रियाएं")
- If SINGLE topic: Generate ALL 31 questions from that ONE topic only
- If MULTIPLE topics (comma-separated): Distribute questions EVENLY across ALL given topics
  Example: 3 topics = ~10-11 questions per topic, 2 topics = ~15-16 questions per topic
- Questions MUST be ONLY from the given topic(s) - do NOT add questions from other topics

FIXED PAPER STRUCTURE (31 questions = 70 marks):

खण्ड-अ / PART-A (बहुविकल्पीय प्रश्न / MCQ) - 20 Marks:
- उप-भाग I: 7 MCQs × 1 mark = 7 marks (Q1-Q7)
- उप-भाग II: 6 MCQs × 1 mark = 6 marks (Q8-Q13)
- उप-भाग III: 7 MCQs × 1 mark = 7 marks (Q14-Q20)
TOTAL: 20 MCQs = 20 marks

खण्ड-ब / PART-B (वर्णनात्मक प्रश्न / Descriptive) - 50 Marks:
- उप-भाग I: 4 questions × 4 marks (2+2 format with sub-parts) = 16 marks (Q21-Q24)
- उप-भाग II: 4 questions × 4 marks = 16 marks (Q25-Q28)
- उप-भाग III: 3 questions × 6 marks (with अथवा/OR option) = 18 marks (Q29-Q31)
TOTAL: 11 descriptive questions = 50 marks

GRAND TOTAL: 31 questions = 70 marks

SECTION VALUES (MUST include in each question):
- Q1-7 (MCQ): "section": "खण्ड-अ (Part-A) उप-भाग-I (1 अंक)"
- Q8-13 (MCQ): "section": "खण्ड-अ (Part-A) उप-भाग-II (1 अंक)"
- Q14-20 (MCQ): "section": "खण्ड-अ (Part-A) उप-भाग-III (1 अंक)"
- Q21-24 (4 marks): "section": "खण्ड-ब (Part-B) उप-भाग-I (2+2=4 अंक)"
- Q25-28 (4 marks): "section": "खण्ड-ब (Part-B) उप-भाग-II (4 अंक)"
- Q29-31 (6 marks): "section": "खण्ड-ब (Part-B) उप-भाग-III (6 अंक)"

FORMAT RULES:
1. BILINGUAL FORMAT: "हिंदी में प्रश्न / Question in English" (both languages in same questionText)
2. Chemical formulas with Unicode subscripts: H₂O, CO₂, H₂SO₄, CₙH₂ₙ₊₂, CₙH₂ₙ, CₙH₂ₙ₋₂, CH₄, C₂H₆
3. 4-mark questions (उप-भाग I, Q21-24): MUST have sub-parts (i) and (ii), 2 marks each
4. 4-mark questions (उप-भाग II, Q25-28): Can be single question or have sub-parts
5. 6-mark questions (Q29-31): MUST have "अथवा / OR" with alternative question and answer

ANSWER LENGTH REQUIREMENTS (VERY IMPORTANT):
- 1-mark MCQ: Just correct option
- 2-mark questions: 100-150 words answer
- 4-mark questions: 300-400 words answer (approximately 1 page)
- 6-mark questions: 600-800 words answer (approximately 2 pages)
- Answers must include: key points, examples, diagrams description, chemical equations where applicable
- For Science: Include formulas, reactions, labeled diagram descriptions, numerical examples
`;

    // For UP Board, override settings
    let finalNumberOfQuestions = numberOfQuestions;
    let finalQuestionTypes = questionTypes;
    let finalLanguage = language;
    
    if (examFormat === "upboard_science") {
      finalNumberOfQuestions = 31; // 20 MCQ + 4(4-mark) + 4(4-mark) + 3(6-mark) = 31
      finalQuestionTypes = ["mcq", "written"];
      finalLanguage = "bilingual";
    }

    // Exam format specific instructions
    const examFormatInstructions = {
      general: "",
      upboard_science: upBoardScienceFormat,
    };

    const examFormatNote = examFormatInstructions[examFormat] || "";

    // Question type descriptions with detailed examples
    const typeDescriptions = {
      mcq: `MCQ (Multiple Choice Questions):
- "questionType": "mcq" (MUST be exactly "mcq")
- "questionText": "Clear question ending with ?"
- "options": ["Option A", "Option B", "Option C", "Option D"] (exactly 4 options)
- "correctOption": 0 (index 0-3 of correct answer)
- "marks": 1-3 based on difficulty
- "section": "physics" | "chemistry" | "biology" (for UP Board format)
- "subSection": 1 | 2 | 3 (sub-section number)
Example: {"questionType": "mcq", "questionText": "What is 2+2?", "options": ["3", "4", "5", "6"], "correctOption": 1, "marks": 1}`,

      written: `Written Answer Questions:
- "questionType": "written" (MUST be exactly "written")
- "questionText": "Descriptive question requiring explanation"
- "correctAnswer": "Detailed expected answer with key points"
- "marks": 2-6 based on complexity
- "subParts": [{"part": "(i)", "question": "...", "answer": "...", "marks": 2}] (optional for multi-part questions)
- "hasAlternative": true/false (if question has "अथवा/OR" option)
- "alternativeQuestion": "Alternative question text" (if hasAlternative is true)
- "alternativeAnswer": "Alternative answer" (if hasAlternative is true)
Example: {"questionType": "written", "questionText": "Explain photosynthesis.", "correctAnswer": "Photosynthesis is the process...", "marks": 3}`,

      fillblank: `Fill in the Blanks:
- "questionType": "fillblank" (MUST be exactly "fillblank")
- "questionText": "Sentence with _____ for each blank"
- "blanks": ["answer1", "answer2"] (array of correct answers in order)
- "marks": 1-2 per blank
Example: {"questionType": "fillblank", "questionText": "The capital of France is _____.", "blanks": ["Paris"], "marks": 1}`,

      matching: `Match the Following:
- "questionType": "matching" (MUST be exactly "matching")
- "questionText": "Match the following items:"
- "matchPairs": [{"left": "Term", "right": "Definition"}] (4-6 pairs)
- "marks": 2-4 based on pairs
Example: {"questionType": "matching", "questionText": "Match countries with capitals:", "matchPairs": [{"left": "India", "right": "New Delhi"}, {"left": "Japan", "right": "Tokyo"}], "marks": 2}`,

      truefalse: `True/False Questions:
- "questionType": "truefalse" (MUST be exactly "truefalse")
- "questionText": "Statement to evaluate"
- "options": ["True", "False"] (always these exact values)
- "correctOption": 0 for True, 1 for False
- "marks": 1
Example: {"questionType": "truefalse", "questionText": "The Earth is flat.", "options": ["True", "False"], "correctOption": 1, "marks": 1}`,
    };

    const selectedTypes = finalQuestionTypes
      .map((type) => typeDescriptions[type])
      .filter(Boolean)
      .join("\n\n");

    // Build description context if provided
    const descriptionContext = description
      ? `\n\nADDITIONAL CONTEXT/INSTRUCTIONS:\n${description}\n`
      : "";

    // Build the prompt based on exam format
    let prompt;
    
    if (examFormat === "upboard_science") {
      prompt = `${upBoardScienceFormat}

${difficultyNote}

TOPIC(S) FOR THIS PAPER: "${topic}"

GENERATE EXACTLY 31 QUESTIONS IN THIS EXACT ORDER:

MCQ SECTION (20 questions, 1 mark each):
Q1-Q7: MCQs for section "खण्ड-अ (Part-A) उप-भाग-I (1 अंक)"
Q8-Q13: MCQs for section "खण्ड-अ (Part-A) उप-भाग-II (1 अंक)"
Q14-Q20: MCQs for section "खण्ड-अ (Part-A) उप-भाग-III (1 अंक)"

DESCRIPTIVE SECTION (11 questions):
Q21-Q24: Written (4 marks each, 2+2 format with sub-parts) - section "खण्ड-ब (Part-B) उप-भाग-I (2+2=4 अंक)"
Q25-Q28: Written (4 marks each) - section "खण्ड-ब (Part-B) उप-भाग-II (4 अंक)"
Q29-Q31: Written (6 marks each with अथवा/OR) - section "खण्ड-ब (Part-B) उप-भाग-III (6 अंक)"

CRITICAL REQUIREMENTS:
1. Generate EXACTLY 31 questions - no more, no less
2. ALL questions must be from "${topic}" ONLY (if multiple topics given, distribute evenly)
3. ALL questions must be BILINGUAL: "हिंदी प्रश्न / English question"
4. Each question MUST have the correct "section" field as specified above
5. Q21-Q24 MUST have "subParts" array with (i) and (ii) sub-questions
6. Q29-Q31 MUST have "hasAlternative": true, "alternativeQuestion", and "alternativeAnswer"
7. Use Unicode subscripts for chemical formulas: H₂O, CO₂, H₂SO₄, CH₄, C₂H₆

JSON STRUCTURE FOR EACH QUESTION TYPE:

MCQ (Q1-Q20):
{
  "questionType": "mcq",
  "questionText": "हिंदी प्रश्न / English question?",
  "options": ["विकल्प A / Option A", "विकल्प B / Option B", "विकल्प C / Option C", "विकल्प D / Option D"],
  "correctOption": 0,
  "marks": 1,
  "section": "खण्ड-अ (Part-A) उप-भाग-I (1 अंक)"
}

Written with sub-parts (Q21-Q24):
{
  "questionType": "written",
  "questionText": "हिंदी प्रश्न / English question",
  "subParts": [
    {"part": "(i)", "question": "उप-प्रश्न / Sub-question", "answer": "विस्तृत उत्तर (150-200 शब्द) / Detailed answer (150-200 words)", "marks": 2},
    {"part": "(ii)", "question": "उप-प्रश्न / Sub-question", "answer": "विस्तृत उत्तर (150-200 शब्द) / Detailed answer (150-200 words)", "marks": 2}
  ],
  "correctAnswer": "Complete answer covering both parts (300-400 words total)",
  "marks": 4,
  "section": "खण्ड-ब (Part-B) उप-भाग-I (2+2=4 अंक)"
}

Written 4-mark (Q25-Q28):
{
  "questionType": "written",
  "questionText": "हिंदी प्रश्न / English question",
  "correctAnswer": "विस्तृत उत्तर - कम से कम 300-400 शब्द, मुख्य बिंदुओं के साथ / Detailed answer - minimum 300-400 words with key points, examples, diagrams description if applicable. This should be approximately 1 page worth of content.",
  "marks": 4,
  "section": "खण्ड-ब (Part-B) उप-भाग-II (4 अंक)"
}

Written 6-mark with OR (Q29-Q31):
{
  "questionType": "written",
  "questionText": "हिंदी प्रश्न / English question",
  "correctAnswer": "बहुत विस्तृत उत्तर - कम से कम 600-800 शब्द / Very detailed answer - minimum 600-800 words. Include: introduction, main explanation with multiple points, examples, diagrams description, chemical equations if applicable, and conclusion. This should be approximately 2 pages worth of content.",
  "marks": 6,
  "section": "खण्ड-ब (Part-B) उप-भाग-III (6 अंक)",
  "hasAlternative": true,
  "alternativeQuestion": "अथवा / OR: वैकल्पिक प्रश्न / Alternative question",
  "alternativeAnswer": "वैकल्पिक उत्तर - 600-800 शब्द / Alternative answer - 600-800 words with same level of detail"
}

Return ONLY a valid JSON array with exactly 31 questions. No markdown, no explanation.`;
    } else {
      prompt = `Generate exactly ${finalNumberOfQuestions} quiz questions about "${topic}".${languageNote}${descriptionContext}

${difficultyNote}

REQUIRED QUESTION TYPES (distribute evenly): ${finalQuestionTypes.join(", ")}

FORMAT SPECIFICATIONS:
${selectedTypes}

STRICT RULES:
1. Generate EXACTLY ${finalNumberOfQuestions} questions
2. Distribute questions across selected types: ${finalQuestionTypes.join(", ")}
3. Use ONLY these exact questionType values: "mcq", "written", "fillblank", "matching", "truefalse"
4. DO NOT use variations like "multiple_choice", "true_false", "fill_in_blank" etc.
5. MCQ must have exactly 4 options with correctOption 0-3
6. True/False must have options ["True", "False"] with correctOption 0 or 1
7. Written must have a comprehensive correctAnswer
8. Fill blank must have blanks array matching _____ count
9. Matching must have 4-6 pairs with left and right values
10. FOLLOW THE DIFFICULTY LEVEL STRICTLY - questions must match the specified difficulty
${finalLanguage !== "english" ? `11. ALL text MUST be in ${finalLanguage} language` : ""}

CRITICAL: Return ONLY a valid JSON array. No markdown, no explanation, no code blocks.

[{"questionType": "...", ...}, ...]`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up the response - remove markdown code blocks if present
    text = text
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/g, "")
      .trim();

    // Extract JSON array if wrapped in other text
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      text = text.substring(jsonStart, jsonEnd + 1);
    }

    // Parse the JSON response
    let questions;
    try {
      questions = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError.message);
      console.error("Raw text:", text.substring(0, 500));
      throw new Error("Failed to parse AI response as JSON");
    }

    // Validate the structure
    if (!Array.isArray(questions)) {
      throw new Error("Response is not an array");
    }

    // Validate and normalize each question based on type
    const validatedQuestions = [];
    
    for (let index = 0; index < questions.length; index++) {
      const q = questions[index];
      
      if (!q.questionText) {
        console.warn(`Skipping question at index ${index}: missing questionText`);
        continue;
      }

      // Normalize the question type
      const originalType = q.questionType;
      q.questionType = normalizeQuestionType(q.questionType);
      
      if (!q.questionType) {
        console.warn(`Skipping question at index ${index}: unknown type "${originalType}"`);
        // Try to infer type from structure
        if (q.options && q.options.length === 4 && typeof q.correctOption === "number") {
          q.questionType = "mcq";
        } else if (q.options && q.options.length === 2 && 
                   (q.options[0].toLowerCase() === "true" || q.options[1].toLowerCase() === "false")) {
          q.questionType = "truefalse";
        } else if (q.correctAnswer) {
          q.questionType = "written";
        } else if (q.blanks) {
          q.questionType = "fillblank";
        } else if (q.matchPairs) {
          q.questionType = "matching";
        } else {
          continue; // Skip if can't determine type
        }
      }

      // Ensure marks is set
      if (!q.marks || typeof q.marks !== "number") {
        q.marks = difficulty === "easy" ? 1 : difficulty === "hard" ? 3 : 2;
      }

      // Validate and fix based on type
      try {
        switch (q.questionType) {
          case "mcq":
            if (!Array.isArray(q.options) || q.options.length < 4) {
              // Try to pad options if less than 4
              q.options = q.options || [];
              while (q.options.length < 4) {
                q.options.push(`Option ${q.options.length + 1}`);
              }
            }
            if (q.options.length > 4) {
              q.options = q.options.slice(0, 4);
            }
            if (typeof q.correctOption !== "number" || q.correctOption < 0 || q.correctOption > 3) {
              q.correctOption = 0; // Default to first option
            }
            break;

          case "written":
            if (!q.correctAnswer) {
              q.correctAnswer = "Answer not provided";
            }
            break;

          case "fillblank":
            if (!Array.isArray(q.blanks) || q.blanks.length === 0) {
              // Try to extract from correctAnswer if available
              if (q.correctAnswer) {
                q.blanks = [q.correctAnswer];
              } else {
                q.blanks = ["answer"];
              }
            }
            break;

          case "matching":
            if (!Array.isArray(q.matchPairs) || q.matchPairs.length < 2) {
              console.warn(`Skipping matching question at index ${index}: insufficient pairs`);
              continue;
            }
            // Ensure all pairs have left and right
            q.matchPairs = q.matchPairs.filter(pair => pair.left && pair.right);
            if (q.matchPairs.length < 2) {
              continue;
            }
            break;

          case "truefalse":
            // Always set standard options
            q.options = ["True", "False"];
            if (typeof q.correctOption !== "number" || (q.correctOption !== 0 && q.correctOption !== 1)) {
              // Try to infer from correctAnswer if available
              if (q.correctAnswer) {
                const answer = q.correctAnswer.toString().toLowerCase();
                q.correctOption = answer === "true" || answer === "yes" ? 0 : 1;
              } else {
                q.correctOption = 0;
              }
            }
            break;
        }

        validatedQuestions.push(q);
      } catch (validationError) {
        console.warn(`Skipping question at index ${index}: ${validationError.message}`);
      }
    }

    if (validatedQuestions.length === 0) {
      throw new Error("No valid questions could be generated. Please try again.");
    }

    return validatedQuestions;
  });
};

// OCR: Extract text from image using Gemini Vision
const extractTextFromImage = async (imageBase64, mimeType = "image/jpeg") => {
  return await executeWithFallback(async () => {
    const model = await getGeminiModel("gemini-3-flash-preview");

    const prompt = `Extract and transcribe all handwritten or printed text from this image. 
Return ONLY the extracted text, preserving the original language and formatting. 
If the text is in Hindi or Sanskrit (Devanagari script), transcribe it accurately.
Do not add any explanations, just the extracted text.`;

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
  });
};

// Evaluate written answer using semantic matching
const evaluateWrittenAnswer = async (
  studentAnswer,
  expectedAnswer,
  maxMarks,
  threshold = 0.7
) => {
  return await executeWithFallback(async () => {
    const model = await getGeminiModel();

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
  });
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
  return await executeWithFallback(async () => {
    const model = await getGeminiModel("gemini-3-flash-preview");

    const languageInstructions = {
      english: "",
      hindi:
        "\n\nGenerate ALL content in Hindi (हिंदी). Use Devanagari script.",
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
  });
};

// Process raw questions and convert to proper quiz format
const processRawQuestions = async (
  rawQuestions,
  maxMarks,
  marksDistribution,
  language = "english",
  numberOfQuestions = null
) => {
  return await executeWithFallback(async () => {
    const model = await getGeminiModel();

    const languageInstructions = {
      english: "",
      hindi:
        "\n\nGenerate ALL content in Hindi (हिंदी). Use Devanagari script.",
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
  });
};

module.exports = {
  getGeminiModel,
  generateQuestions,
  extractTextFromImage,
  evaluateWrittenAnswer,
  processRawQuestions,
  extractQuestionsFromImage,
};
