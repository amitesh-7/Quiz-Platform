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

    // UP Board English Format - Exact Paper Structure (70 Marks)
    const upBoardEnglishFormat = `
YOU ARE GENERATING UP BOARD CLASS 10 ENGLISH PAPER (अंग्रेजी) - TOTAL 70 MARKS
Paper Code: 817(BH)

TOPIC(S) FOR THIS PAPER: "${topic}"

TOPIC HANDLING RULES:
- User may enter SINGLE topic (e.g., "Reading Comprehension") OR MULTIPLE topics (e.g., "Grammar, Literature, Writing")
- If SINGLE topic: Generate ALL questions from that ONE topic only
- If MULTIPLE topics (comma-separated): Distribute questions EVENLY across ALL given topics
- Questions MUST be ONLY from the given topic(s) - do NOT add questions from other topics

FIXED PAPER STRUCTURE (31 questions = 70 marks):

PART-A (Multiple Choice Questions) - 20 Marks:
- Q1-Q20: 20 MCQs × 1 mark = 20 marks
TOTAL: 20 MCQs = 20 marks

PART-B (Descriptive Questions) - 50 Marks:
- Q21: Reading Comprehension (8 marks) - LONG passage 250-350 words with 4 sub-questions
- Q22: Letter/Application Writing (4 marks) with OR option
- Q23: Article/Essay Writing (6 marks) with OR option  
- Q24-Q27: Grammar Questions (4 questions × 2 marks = 8 marks)
- Q28-Q31: Literature Questions (4 questions × 6 marks = 24 marks) with OR options
TOTAL: 11 descriptive questions = 50 marks

GRAND TOTAL: 31 questions = 70 marks

SECTION VALUES (MUST include in each question):
- Q1-Q20 (MCQ): "section": "PART-A (MCQ) - 1 mark"
- Q21 (Reading): "section": "PART-B (Reading Comprehension) - 8 marks"
- Q22 (Letter): "section": "PART-B (Writing - Letter) - 4 marks"
- Q23 (Article): "section": "PART-B (Writing - Article/Essay) - 6 marks"
- Q24-Q27 (Grammar): "section": "PART-B (Grammar) - 2 marks"
- Q28-Q31 (Literature): "section": "PART-B (Literature) - 6 marks"

=== CRITICAL: ANSWER LENGTH REQUIREMENTS ===
- 1-mark MCQ: Just correct option
- 2-mark Grammar: 30-50 words
- 4-mark Letter: 150-200 words (FULL FORMAT with address, date, salutation, 3 body paragraphs, closing, signature)
- 6-mark Article/Essay: 250-350 words (proper structure with introduction, body paragraphs, conclusion)
- 6-mark Literature: 200-300 words (detailed explanation with examples from text)
- 8-mark Reading: Each sub-answer 40-60 words

=== CRITICAL: PASSAGE FORMAT (Q21) ===
The passage MUST be 250-350 words with meaningful content:
- Multiple paragraphs (3-4 paragraphs)
- Topics: Education, Environment, Technology, Health, Moral Values, Social Issues
- Include vocabulary words that can be asked
- 4 sub-questions: (a) comprehension, (b) inference, (c) vocabulary, (d) opinion/summary

=== CRITICAL: LETTER FORMAT (Q22) ===
Letter answer MUST be 150-200 words with ALL parts:
- Sender's Address (2 lines)
- Date (15th March, 2024 format)
- Receiver's Address (for formal) OR Dear [Name] (for informal)
- Subject line (for formal letters)
- Salutation
- Body: 3 paragraphs (opening - purpose, middle - details/reasons, closing - request/wishes)
- Complimentary close (Yours obediently/faithfully/sincerely/lovingly)
- Signature with Name and details

=== CRITICAL: ARTICLE/ESSAY FORMAT (Q23) ===
Article/Essay answer MUST be 250-350 words with proper structure:
- Title (centered)
- By: [Name]
- Introduction paragraph (40-50 words) - introduce the topic
- Body paragraph 1 (80-100 words) - main points with examples
- Body paragraph 2 (80-100 words) - more points, statistics, effects
- Body paragraph 3 (50-60 words) - solutions/suggestions
- Conclusion (40-50 words) - summary and final thoughts

=== CRITICAL: LITERATURE ANSWERS (Q28-Q31) ===
Literature answers MUST be 200-300 words with:
- Direct reference to the text/poem
- Explanation of theme/character/central idea
- Relevant quotes or examples from the text
- Personal interpretation where applicable
`;

    // UP Board Hindi Format - Exact Paper Structure (70 Marks) - Paper Code 801(BA)
    const upBoardHindiFormat = `
YOU ARE GENERATING UP BOARD CLASS 10 HINDI PAPER (हिन्दी) - TOTAL 70 MARKS
Paper Code: 801(BA)

TOPIC(S) FOR THIS PAPER: "${topic}"

TOPIC HANDLING RULES:
- User may enter SINGLE topic (e.g., "काव्य खण्ड") OR MULTIPLE topics (e.g., "गद्य खण्ड, काव्य खण्ड, व्याकरण")
- If SINGLE topic: Generate ALL questions from that ONE topic only
- If MULTIPLE topics (comma-separated): Distribute questions EVENLY across ALL given topics
- Questions MUST be ONLY from the given topic(s) - do NOT add questions from other topics

FIXED PAPER STRUCTURE (30 questions = 70 marks):

खण्ड 'अ' (बहुविकल्पीय प्रश्न) - 20 अंक:
- प्र.1-20: 20 MCQs × 1 अंक = 20 अंक
- Topics: साहित्य (लेखक/कवि/रचनाएं), व्याकरण (रस, अलंकार, छंद, समास, उपसर्ग, प्रत्यय, पर्यायवाची, विलोम)
TOTAL: 20 MCQs = 20 अंक

खण्ड 'ब' (वर्णनात्मक प्रश्न) - 50 अंक:
- प्र.21: गद्यांश - 3×2=6 अंक (अथवा सहित) - 300-400 शब्द का गद्यांश (1 पेज), 3 उप-प्रश्न
- प्र.22: पद्यांश - 3×2=6 अंक (अथवा सहित) - 16-24 पंक्तियों की कविता (1 पेज), 3 उप-प्रश्न
- प्र.23: संस्कृत गद्यांश अनुवाद - 2+3=5 अंक (अथवा सहित)
- प्र.24: संस्कृत पद्यांश अनुवाद - 2+3=5 अंक (अथवा सहित)
- प्र.25: खण्डकाव्य - 1×3=3 अंक (6 विकल्पों में से एक: मुक्तियज्ञ, ज्योति जवाहर, मेवाड़ मुकुट, अग्रपूजा, जय सुभाष, मातृभूमि के लिए, कर्ण, कर्मवीर भरत, तुमुल)
- प्र.26: लेखक परिचय (3+2=5 अंक) + कवि परिचय (3+2=5 अंक) = 10 अंक
- प्र.27: कण्ठस्थ श्लोक - 2 अंक
- प्र.28: पत्र लेखन - 4 अंक (अथवा सहित)
- प्र.29: संस्कृत प्रश्न - 1+1=2 अंक (4 में से 2 प्रश्नों के उत्तर संस्कृत में)
- प्र.30: निबन्ध - 1×7=7 अंक (5 विकल्पों में से एक) - उत्तर 2 पेज (700-900 शब्द)
TOTAL: 10 वर्णनात्मक प्रश्न = 50 अंक

GRAND TOTAL: 30 questions = 70 marks

SECTION VALUES (MUST include in each question):
- प्र.1-20 (MCQ): "section": "खण्ड 'अ' (बहुविकल्पीय प्रश्न) - 1 अंक"
- प्र.21 (गद्यांश): "section": "खण्ड 'ब' (गद्यांश) - 3×2=6 अंक"
- प्र.22 (पद्यांश): "section": "खण्ड 'ब' (पद्यांश) - 3×2=6 अंक"
- प्र.23 (संस्कृत गद्य): "section": "खण्ड 'ब' (संस्कृत गद्यांश अनुवाद) - 2+3=5 अंक"
- प्र.24 (संस्कृत पद्य): "section": "खण्ड 'ब' (संस्कृत पद्यांश अनुवाद) - 2+3=5 अंक"
- प्र.25 (खण्डकाव्य): "section": "खण्ड 'ब' (खण्डकाव्य) - 1×3=3 अंक"
- प्र.26 (लेखक/कवि): "section": "खण्ड 'ब' (लेखक/कवि परिचय) - 5+5=10 अंक"
- प्र.27 (श्लोक): "section": "खण्ड 'ब' (कण्ठस्थ श्लोक) - 2 अंक"
- प्र.28 (पत्र): "section": "खण्ड 'ब' (पत्र लेखन) - 4 अंक"
- प्र.29 (संस्कृत प्रश्न): "section": "खण्ड 'ब' (संस्कृत प्रश्न) - 1+1=2 अंक"
- प्र.30 (निबन्ध): "section": "खण्ड 'ब' (निबन्ध) - 1×7=7 अंक"

=== MCQ TOPICS (प्र.1-20) ===
MCQs should cover:
- साहित्य: लेखक/कवि की रचनाएं, नाटक, उपन्यास, कहानी के लेखक
- रस: हास्य रस का स्थायी भाव, श्रृंगार रस, वीर रस आदि
- छंद: चौपाई, दोहा, सोरठा की मात्राएं
- अलंकार: रूपक, उपमा, उत्प्रेक्षा, अनुप्रास
- समास: द्विगु, कर्मधारय, द्वन्द्व, तत्पुरुष
- पर्यायवाची/विलोम शब्द
- उपसर्ग/प्रत्यय
- संस्कृत व्याकरण: विभक्ति, वचन

=== CRITICAL: गद्यांश FORMAT (प्र.21) - MINIMUM 1 PAGE ===
गद्यांश 300-400 शब्दों का होना चाहिए (लगभग 1 पेज):
- किसी प्रसिद्ध लेखक की रचना से (प्रेमचंद, जयशंकर प्रसाद, रामचन्द्र शुक्ल आदि)
- गद्यांश में गहरा अर्थ और साहित्यिक महत्व होना चाहिए
- प्रश्न में पूरा गद्यांश (300-400 शब्द) + 3 उप-प्रश्न होने चाहिए
- 3 उप-प्रश्न:
  (i) उपर्युक्त गद्यांश का सन्दर्भ लिखिए। (2 अंक)
  (ii) रेखांकित अंश की व्याख्या कीजिए। (2 अंक)
  (iii) प्रश्न (जैसे: हमारे देश का प्राण क्या है?) (2 अंक)
- उत्तर सामान्य लंबाई का हो (प्रत्येक भाग 50-80 शब्द)
- अथवा में दूसरा गद्यांश समान प्रारूप में (300-400 शब्द)

=== CRITICAL: पद्यांश FORMAT (प्र.22) - MINIMUM 1 PAGE ===
पद्यांश 16-24 पंक्तियों का होना चाहिए (लगभग 1 पेज):
- किसी प्रसिद्ध कवि की रचना से (तुलसीदास, सूरदास, कबीर, मीरा, महादेवी वर्मा, सुभद्रा कुमारी चौहान आदि)
- पूर्ण पद/छंद होना चाहिए, अधूरा नहीं
- प्रश्न में पूरा पद्यांश (16-24 पंक्तियाँ) + 3 उप-प्रश्न होने चाहिए
- 3 उप-प्रश्न:
  (i) उपर्युक्त पद्यांश का सन्दर्भ लिखिए। (2 अंक)
  (ii) पद्यांश में 'शब्द' किसके लिए प्रयुक्त हुआ है? / अलंकार बताइए (2 अंक)
  (iii) रेखांकित अंश की व्याख्या कीजिए। (2 अंक)
- उत्तर सामान्य लंबाई का हो (प्रत्येक भाग 50-80 शब्द)
- अथवा में दूसरा पद्यांश समान प्रारूप में (16-24 पंक्तियाँ)

=== CRITICAL: संस्कृत अनुवाद FORMAT (प्र.23-24) ===
- संस्कृत गद्यांश/पद्यांश देवनागरी में
- सन्दर्भ (2 अंक) + हिन्दी अनुवाद (3 अंक) = 5 अंक
- अथवा में दूसरा संस्कृत अंश

=== CRITICAL: खण्डकाव्य FORMAT (प्र.25) ===
6 खण्डकाव्यों में से प्रश्न:
(क) 'मुक्तियज्ञ' - (i) चरित्र-चित्रण (ii) कथावस्तु
(ख) 'ज्योति जवाहर' - (i) चरित्र-चित्रण (ii) कथावस्तु
(ग) 'मेवाड़ मुकुट' - (i) चरित्र-चित्रण (ii) कथावस्तु
(घ) 'अग्रपूजा' - (i) चरित्र-चित्रण (ii) कथावस्तु
(ङ) 'जय सुभाष' - (i) चरित्र-चित्रण (ii) कथावस्तु
(च) 'मातृभूमि के लिए'/'कर्ण'/'कर्मवीर भरत'/'तुमुल' - (i) चरित्र-चित्रण (ii) कथावस्तु

=== CRITICAL: लेखक/कवि परिचय FORMAT (प्र.26) ===
(क) लेखक परिचय (5 अंक):
- 3 लेखकों में से किसी एक का जीवन-परिचय (3 अंक)
- उनकी एक प्रमुख रचना का उल्लेख (2 अंक)
- लेखक: रामधारी सिंह 'दिनकर', आचार्य रामचन्द्र शुक्ल, जयशंकर प्रसाद, प्रेमचंद आदि

(ख) कवि परिचय (5 अंक):
- 3 कवियों में से किसी एक का जीवन-परिचय (3 अंक)
- उनकी एक प्रमुख रचना का उल्लेख (2 अंक)
- कवि: तुलसीदास, मैथिलीशरण गुप्त, महादेवी वर्मा, सूरदास आदि

=== CRITICAL: पत्र लेखन FORMAT (प्र.28) ===
पत्र प्रश्न में बिंदु दिए जाएं (विषय के साथ 5-6 बिंदु):
- प्रश्न में विषय + बिंदु होने चाहिए जिन पर पत्र लिखना है
- उत्तर में पूर्ण पत्र हो (250-300 शब्द)
- पत्र प्रारूप: पता, दिनांक, संबोधन, विषय (औपचारिक के लिए), मुख्य भाग (3-4 अनुच्छेद), समापन, हस्ताक्षर
- अनौपचारिक पत्र: मित्र/भाई को सलाह, निमंत्रण, बधाई आदि
- औपचारिक पत्र: प्रधानाचार्य को प्रार्थना-पत्र, अवकाश हेतु, शिकायत आदि

=== CRITICAL: निबन्ध FORMAT (प्र.30) - MINIMUM 2 PAGES ===
निबन्ध का उत्तर 700-900 शब्दों का होना चाहिए (लगभग 2 पेज):
- भूमिका (80-100 शब्द) - विषय का परिचय, महत्व, परिभाषा
- मुख्य भाग (500-600 शब्द):
  * प्रथम बिंदु (150-180 शब्द) - मुख्य पहलू, इतिहास/पृष्ठभूमि
  * द्वितीय बिंदु (150-180 शब्द) - वर्तमान स्थिति, लाभ/हानि
  * तृतीय बिंदु (150-180 शब्द) - समस्याएं, समाधान, भविष्य
- उपसंहार (80-100 शब्द) - निष्कर्ष, सुझाव, अंतिम विचार
- विषय: साहित्य और समाज, स्वच्छ भारत अभियान, लोकतंत्र में मतदान का महत्त्व, मेरा प्रिय कवि, नारी सशक्तीकरण, विज्ञान के चमत्कार, पर्यावरण प्रदूषण, इंटरनेट का महत्व आदि
`;

    // UP Board Sanskrit Format - Exact Paper Structure (70 Marks) - Paper Code 818(BP)
    const upBoardSanskritFormat = `
YOU ARE GENERATING UP BOARD CLASS 10 SANSKRIT PAPER (संस्कृत) - TOTAL 70 MARKS
Paper Code: 818(BP)

TOPIC(S) FOR THIS PAPER: "${topic}"

TOPIC HANDLING RULES:
- User may enter SINGLE topic (e.g., "व्याकरण") OR MULTIPLE topics (e.g., "गद्य, पद्य, व्याकरण")
- If SINGLE topic: Generate ALL questions from that ONE topic only
- If MULTIPLE topics (comma-separated): Distribute questions EVENLY across ALL given topics
- Questions MUST be ONLY from the given topic(s) - do NOT add questions from other topics

FIXED PAPER STRUCTURE (31 questions = 70 marks):

खण्ड 'अ' (बहुविकल्पीय प्रश्न) - 20 अंक:
- उपखण्ड (क): गद्यांश आधारित MCQs (प्र.1-6) × 1 अंक = 6 अंक
- उपखण्ड (ख): व्याकरण MCQs (प्र.7-20) × 1 अंक = 14 अंक
  - संधि (2 प्रश्न), समास (2 प्रश्न), विभक्ति (2 प्रश्न), लकार (2 प्रश्न), प्रत्याहार (2 प्रश्न), अन्य व्याकरण (4 प्रश्न)
TOTAL: 20 MCQs = 20 अंक

खण्ड 'ब' (वर्णनात्मक प्रश्न) - 50 अंक:
उपखण्ड (क):
- प्र.21: गद्यांश अनुवाद (4 अंक) - अथवा सहित
- प्र.22: पाठ सारांश (4 अंक) - अथवा सहित
- प्र.23: श्लोक व्याख्या (4 अंक) - अथवा सहित
- प्र.24: सूक्ति व्याख्या (3 अंक) - अथवा सहित
- प्र.25: श्लोक अर्थ (4 अंक) - अथवा सहित
- प्र.26: चरित्र-चित्रण (4 अंक) - अथवा सहित

उपखण्ड (ख):
- प्र.27(क): विभक्ति (2 अंक)
- प्र.27(ख): प्रत्यय (2 अंक)
- प्र.28: वाच्य परिवर्तन (3 अंक)
- प्र.29: हिन्दी से संस्कृत अनुवाद (3×2=6 अंक)
- प्र.30: निबन्ध (8 अंक)
- प्र.31: पद प्रयोग (2×2=4 अंक)

TOTAL: 11 वर्णनात्मक प्रश्न = 50 अंक

GRAND TOTAL: 31 questions = 70 marks

SECTION VALUES (MUST include in each question):
- प्र.1-6 (MCQ): "section": "खण्ड 'अ' उपखण्ड (क) - गद्यांश आधारित (1 अंक)"
- प्र.7-20 (MCQ): "section": "खण्ड 'अ' उपखण्ड (ख) - व्याकरण (1 अंक)"
- प्र.21 (गद्यांश अनुवाद): "section": "खण्ड 'ब' उपखण्ड (क) - गद्यांश अनुवाद (4 अंक)"
- प्र.22 (पाठ सारांश): "section": "खण्ड 'ब' उपखण्ड (क) - पाठ सारांश (4 अंक)"
- प्र.23 (श्लोक व्याख्या): "section": "खण्ड 'ब' उपखण्ड (क) - श्लोक व्याख्या (4 अंक)"
- प्र.24 (सूक्ति व्याख्या): "section": "खण्ड 'ब' उपखण्ड (क) - सूक्ति व्याख्या (3 अंक)"
- प्र.25 (श्लोक अर्थ): "section": "खण्ड 'ब' उपखण्ड (क) - श्लोक अर्थ (4 अंक)"
- प्र.26 (चरित्र-चित्रण): "section": "खण्ड 'ब' उपखण्ड (क) - चरित्र-चित्रण (4 अंक)"
- प्र.27 (विभक्ति/प्रत्यय): "section": "खण्ड 'ब' उपखण्ड (ख) - विभक्ति/प्रत्यय (2+2=4 अंक)"
- प्र.28 (वाच्य परिवर्तन): "section": "खण्ड 'ब' उपखण्ड (ख) - वाच्य परिवर्तन (3 अंक)"
- प्र.29 (अनुवाद): "section": "खण्ड 'ब' उपखण्ड (ख) - हिन्दी से संस्कृत अनुवाद (3×2=6 अंक)"
- प्र.30 (निबन्ध): "section": "खण्ड 'ब' उपखण्ड (ख) - निबन्ध (8 अंक)"
- प्र.31 (पद प्रयोग): "section": "खण्ड 'ब' उपखण्ड (ख) - पद प्रयोग (2×2=4 अंक)"

=== ANSWER LENGTH PROPORTIONAL TO MARKS ===
- 8 अंक (निबन्ध): 400-500 शब्द (संस्कृत में)
- 6 अंक (अनुवाद): प्रत्येक वाक्य 20-30 शब्द
- 4 अंक (गद्यांश/श्लोक/सारांश/चरित्र): 150-200 शब्द
- 3 अंक (सूक्ति/वाच्य): 100-120 शब्द
- 2 अंक (विभक्ति/प्रत्यय/पद प्रयोग): 40-60 शब्द
- 1 अंक (MCQ): केवल सही विकल्प

=== MCQ FORMAT (प्र.1-20) ===
- Options format: (A), (B), (C), (D)
- गद्यांश आधारित MCQs (प्र.1-6): गद्यांश से संबंधित प्रश्न
- व्याकरण MCQs (प्र.7-20):
  - संधि: संधि विच्छेद, संधि का नाम
  - समास: समास विग्रह, समास का नाम
  - विभक्ति: विभक्ति पहचान, वाक्य में प्रयोग
  - लकार: लकार पहचान, धातु रूप
  - प्रत्याहार: प्रत्याहार का विस्तार

=== CRITICAL: गद्यांश अनुवाद FORMAT (प्र.21) ===
- संस्कृत गद्यांश (100-150 शब्द) दिया जाए
- हिन्दी में अनुवाद करना है
- उत्तर: सन्दर्भ (50 शब्द) + अनुवाद (100-150 शब्द)
- अथवा में दूसरा गद्यांश

=== CRITICAL: पाठ सारांश FORMAT (प्र.22) ===
- किसी पाठ का सारांश संस्कृत में लिखना है
- उत्तर: 150-200 शब्द संस्कृत में
- अथवा में दूसरा पाठ

=== CRITICAL: श्लोक व्याख्या FORMAT (प्र.23) ===
- संस्कृत श्लोक दिया जाए (4-8 पंक्तियाँ)
- सन्दर्भ + हिन्दी व्याख्या
- उत्तर: सन्दर्भ (50 शब्द) + व्याख्या (100-150 शब्द)
- अथवा में दूसरा श्लोक

=== CRITICAL: सूक्ति व्याख्या FORMAT (प्र.24) ===
- संस्कृत सूक्ति/उक्ति दी जाए
- हिन्दी में व्याख्या
- उत्तर: 100-120 शब्द
- अथवा में दूसरी सूक्ति

=== CRITICAL: श्लोक अर्थ FORMAT (प्र.25) ===
- संस्कृत श्लोक दिया जाए
- संस्कृत में अर्थ लिखना है
- उत्तर: 150-200 शब्द संस्कृत में
- अथवा में दूसरा श्लोक

=== CRITICAL: चरित्र-चित्रण FORMAT (प्र.26) ===
- किसी पात्र का चरित्र-चित्रण संस्कृत में
- उत्तर: 150-200 शब्द संस्कृत में
- अथवा में दूसरा पात्र

=== CRITICAL: विभक्ति/प्रत्यय FORMAT (प्र.27) ===
(क) विभक्ति (2 अंक):
- 4 शब्दों में विभक्ति और वचन बताना
- उत्तर: प्रत्येक शब्द के लिए विभक्ति + वचन

(ख) प्रत्यय (2 अंक):
- 4 शब्दों में प्रत्यय बताना
- उत्तर: प्रत्येक शब्द के लिए प्रत्यय का नाम

=== CRITICAL: वाच्य परिवर्तन FORMAT (प्र.28) ===
- 3 वाक्यों का वाच्य परिवर्तन
- कर्तृवाच्य से कर्मवाच्य या भाववाच्य में
- उत्तर: प्रत्येक वाक्य का परिवर्तित रूप

=== CRITICAL: हिन्दी से संस्कृत अनुवाद FORMAT (प्र.29) ===
- 3 हिन्दी वाक्य दिए जाएं
- संस्कृत में अनुवाद करना है
- उत्तर: प्रत्येक वाक्य का संस्कृत अनुवाद (20-30 शब्द)

=== CRITICAL: निबन्ध FORMAT (प्र.30) ===
- 5 विषयों में से किसी एक पर संस्कृत में निबन्ध
- उत्तर: 400-500 शब्द संस्कृत में
- विषय: मम विद्यालयः, संस्कृतभाषायाः महत्त्वम्, पर्यावरणम्, स्वास्थ्यम्, राष्ट्रप्रेमः आदि

=== CRITICAL: पद प्रयोग FORMAT (प्र.31) ===
- 4 पदों का वाक्य में प्रयोग
- उत्तर: प्रत्येक पद के लिए एक संस्कृत वाक्य
`;

    // For UP Board, override settings
    let finalNumberOfQuestions = numberOfQuestions;
    let finalQuestionTypes = questionTypes;
    let finalLanguage = language;
    
    if (examFormat === "upboard_science") {
      finalNumberOfQuestions = 31; // 20 MCQ + 4(4-mark) + 4(4-mark) + 3(6-mark) = 31
      finalQuestionTypes = ["mcq", "written"];
      finalLanguage = "bilingual";
    } else if (examFormat === "upboard_english") {
      finalNumberOfQuestions = 31; // 20 MCQ + 11 descriptive = 31
      finalQuestionTypes = ["mcq", "written"];
      finalLanguage = "english";
    } else if (examFormat === "upboard_hindi") {
      finalNumberOfQuestions = 30; // 20 MCQ + 10 descriptive = 30
      finalQuestionTypes = ["mcq", "written"];
      finalLanguage = "hindi";
    } else if (examFormat === "upboard_sanskrit") {
      finalNumberOfQuestions = 31; // 20 MCQ + 11 descriptive = 31
      finalQuestionTypes = ["mcq", "written"];
      finalLanguage = "sanskrit";
    }

    // Exam format specific instructions
    const examFormatInstructions = {
      general: "",
      upboard_hindi: upBoardHindiFormat,
      upboard_science: upBoardScienceFormat,
      upboard_english: upBoardEnglishFormat,
      upboard_sanskrit: upBoardSanskritFormat,
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
    } else if (examFormat === "upboard_english") {
      prompt = `Generate UP BOARD CLASS 10 ENGLISH PAPER - 70 marks, 31 questions.

TOPIC: "${topic}"

STRUCTURE:
- Q1-Q20: MCQs (1 mark each) = 20 marks
- Q21: Reading passage 250+ words with 4 sub-questions (8 marks)
- Q22: Letter writing with OR option (4 marks) - FULL FORMAT with address, date, salutation, body, closing
- Q23: Article/Essay with OR option (6 marks) - 250+ words
- Q24-Q27: Grammar - Voice, Narration, Punctuation, Translation (2 marks each)
- Q28-Q31: Literature with OR options (6 marks each) - 200+ words answers

JSON FORMAT:

MCQ: {"questionType":"mcq","questionText":"Q?","options":["A","B","C","D"],"correctOption":0,"marks":1,"section":"PART-A (MCQ) - 1 mark"}

Reading (Q21): {"questionType":"written","questionText":"Read passage...\\n\\n[250-350 word passage]\\n\\n(a) Q1 (2m)\\n(b) Q2 (2m)\\n(c) Vocabulary (2m)\\n(d) Inference (2m)","correctAnswer":"(a) [answer]\\n(b) [answer]\\n(c) [answer]\\n(d) [answer]","marks":8,"section":"PART-B (Reading) - 8 marks"}

Letter (Q22): {"questionType":"written","questionText":"Write a letter...","correctAnswer":"[Address]\\n[Date]\\n\\nDear/To...\\n\\n[3 paragraphs - 150-200 words total]\\n\\nYours...\\n[Name]","marks":4,"section":"PART-B (Writing) - 4 marks","hasAlternative":true,"alternativeQuestion":"OR: Write application...","alternativeAnswer":"[Full application 150-200 words]"}

Article (Q23): {"questionType":"written","questionText":"Write article on...","correctAnswer":"[TITLE]\\nBy: Name\\n\\n[Introduction]\\n[Body 1]\\n[Body 2]\\n[Conclusion] - 250-350 words total","marks":6,"section":"PART-B (Writing) - 6 marks","hasAlternative":true,"alternativeQuestion":"OR: Essay on...","alternativeAnswer":"[250-350 words]"}

Grammar (Q24-27): {"questionType":"written","questionText":"Change to passive: ...","correctAnswer":"[Answer with explanation]","marks":2,"section":"PART-B (Grammar) - 2 marks"}

Literature (Q28-31): {"questionType":"written","questionText":"Central idea of...","correctAnswer":"[200-300 word detailed answer]","marks":6,"section":"PART-B (Literature) - 6 marks","hasAlternative":true,"alternativeQuestion":"OR: Character of...","alternativeAnswer":"[200-300 words]"}

RULES:
1. EXACTLY 31 questions
2. English only
3. Long answers for 4+ marks questions
4. Q22,Q23,Q28-31 need hasAlternative

Return ONLY valid JSON array.`;
    } else if (examFormat === "upboard_hindi") {
      prompt = `UP BOARD CLASS 10 HINDI PAPER (हिन्दी) - 70 अंक, 30 प्रश्न बनाएं।
Paper Code: 801(BA)

विषय: "${topic}"

संरचना (EXACT STRUCTURE - 30 questions = 70 marks):

खण्ड 'अ' (बहुविकल्पीय प्रश्न) - 20 अंक:
- प्र.1-20: 20 MCQs × 1 अंक = 20 अंक
- Topics: साहित्य (लेखक/कवि/रचनाएं), व्याकरण (रस, अलंकार, छंद, समास, उपसर्ग, प्रत्यय)

खण्ड 'ब' (वर्णनात्मक प्रश्न) - 50 अंक:
- प्र.21: गद्यांश - 3×2=6 अंक (अथवा सहित) - 300-400 शब्द (लगभग 1 पेज)
- प्र.22: पद्यांश - 3×2=6 अंक (अथवा सहित) - 16-24 पंक्तियाँ (लगभग 1 पेज)
- प्र.23: संस्कृत गद्यांश अनुवाद - 2+3=5 अंक (अथवा सहित)
- प्र.24: संस्कृत पद्यांश अनुवाद - 2+3=5 अंक (अथवा सहित)
- प्र.25: खण्डकाव्य - 1×3=3 अंक - 100-150 शब्द उत्तर
- प्र.26: लेखक परिचय (5 अंक) + कवि परिचय (5 अंक) = 10 अंक - प्रत्येक 200-250 शब्द
- प्र.27: कण्ठस्थ श्लोक - 2 अंक
- प्र.28: पत्र लेखन - 4 अंक (अथवा सहित) - 250-300 शब्द उत्तर
- प्र.29: संस्कृत प्रश्न - 1+1=2 अंक
- प्र.30: निबन्ध - 1×7=7 अंक - 700-900 शब्द (लगभग 2 पेज)

=== ANSWER LENGTH PROPORTIONAL TO MARKS ===
- 7 अंक (निबन्ध): 700-900 शब्द (2 पेज)
- 6 अंक (गद्यांश/पद्यांश): प्रत्येक उप-भाग 80-100 शब्द
- 5 अंक (संस्कृत अनुवाद/लेखक/कवि): 150-200 शब्द
- 4 अंक (पत्र): 250-300 शब्द (पूर्ण पत्र)
- 3 अंक (खण्डकाव्य): 100-150 शब्द
- 2 अंक (श्लोक): श्लोक + अर्थ 40-50 शब्द
- 1 अंक (MCQ): केवल सही विकल्प

JSON FORMAT:

MCQ (प्र.1-20):
{"questionType":"mcq","questionText":"'प्रेमचंद' का विशेष महत्त्व किस रूप में है?","options":["(A) उपन्यासकार","(B) निबन्धकार","(C) कवि","(D) नाटककार"],"correctOption":0,"marks":1,"section":"खण्ड 'अ' (बहुविकल्पीय प्रश्न) - 1 अंक"}

गद्यांश (प्र.21):
{"questionType":"written","questionText":"निम्नलिखित गद्यांश पर आधारित तीन प्रश्नों के उत्तर दीजिए:\\n\\nविश्वासपात्र मित्र से बड़ी भारी रक्षा रहती है। जिसे ऐसा मित्र मिल जाए, उसे समझना चाहिए कि बड़ा भारी खजाना मिल गया। विश्वासपात्र मित्र जीवन की एक औषध है। हमें अपने मित्रों से यह आशा रखनी चाहिए कि वे उत्तम संकल्पों में हमें दृढ़ करेंगे, दोषों और त्रुटियों से हमें बचाएंगे, हमारे सत्य, पवित्रता और मर्यादा के प्रेम को पुष्ट करेंगे; जब हम कुमार्ग पर पैर रखेंगे, तब वे हमें सचेत करेंगे; जब हम हतोत्साहित होंगे, तब वे हमें उत्साहित करेंगे। सारांश यह है कि वे हमें उत्तमतापूर्वक जीवन निर्वाह करने में हर तरह से सहायता देंगे।\\n\\nसच्ची मित्रता में उत्तम से उत्तम वैद्य की-सी निपुणता और परख होती है, अच्छी से अच्छी माता का-सा धैर्य और कोमलता होती है। जिस प्रकार एक कुशल वैद्य रोगी की नाड़ी देखकर उसके रोग का पता लगा लेता है और उचित औषधि देकर उसे स्वस्थ कर देता है, उसी प्रकार एक सच्चा मित्र हमारे हृदय के दोषों को पहचानकर उन्हें दूर करता है। वह हमें बुराइयों से बचाकर सन्मार्ग पर ले जाता है। जिस प्रकार माता अपने बच्चे की गलतियों को धैर्यपूर्वक सहती है और उसे क्षमा करके सन्मार्ग पर लाती है, उसी प्रकार मित्र भी कोमलता और क्षमा के साथ हमें सुधारता है।\\n\\nऐसी ही मित्रता करने का प्रयत्न प्रत्येक पुरुष को करना चाहिए। मित्रता के लिए यह आवश्यक है कि हम भी अपने मित्र के प्रति सच्चे और निष्कपट रहें। मित्रता एकतरफा नहीं हो सकती। जैसा व्यवहार हम अपने मित्र से चाहते हैं, वैसा ही व्यवहार हमें भी उसके साथ करना चाहिए। तभी मित्रता स्थायी और सुखद हो सकती है।\\n\\n(i) उपर्युक्त गद्यांश का सन्दर्भ लिखिए।\\n(ii) रेखांकित अंश की व्याख्या कीजिए। (रेखांकित अंश: विश्वासपात्र मित्र जीवन की एक औषध है... हर तरह से सहायता देंगे।)\\n(iii) लेखक ने एक सच्चे मित्र की तुलना किससे की है और क्यों?","correctAnswer":"(i) सन्दर्भ (2 अंक - 80-100 शब्द): प्रस्तुत गद्य-अवतरण हमारी पाठ्यपुस्तक 'हिन्दी' के गद्य-खण्ड में संकलित 'मित्रता' नामक निबन्ध से लिया गया है। इसके लेखक सुप्रसिद्ध समालोचक एवं निबन्धकार आचार्य रामचन्द्र शुक्ल हैं। इस अंश में लेखक ने जीवन में मित्रों के चयन की सावधानी और एक आदर्श मित्र के गुणों का विषद विवेचन किया है। लेखक बताते हैं कि विश्वासपात्र मित्र जीवन की अमूल्य निधि है।\\n\\n(ii) व्याख्या (2 अंक - 80-100 शब्द): लेखक का विचार है कि जिस प्रकार एक अच्छी औषधि शारीरिक रोगों को दूर कर व्यक्ति को स्वस्थ बनाती है, उसी प्रकार एक विश्वासपात्र मित्र हमारे मानसिक विकारों और बुराइयों को दूर करने में सहायक होता है। सच्चा मित्र हमें गलत राह जाने से रोकता है, निराशा में उत्साह देता है, और सत्य-मर्यादा के प्रति सजग करता है। वह हमारे जीवन के सम्पूर्ण विकास में मार्गदर्शक की भूमिका निभाता है।\\n\\n(iii) उत्तर (2 अंक - 80-100 शब्द): लेखक ने सच्चे मित्र की तुलना उत्तम वैद्य और श्रेष्ठ माता से की है। जैसे कुशल वैद्य रोगी की नाड़ी पहचानकर उपचार करता है, वैसे मित्र हमारे दोषों को पहचानकर दूर करता है। जैसे माता धैर्य और कोमलता से बच्चे की गलतियाँ क्षमा कर सुधारती है, वैसे मित्र भी क्षमा के साथ हमें सन्मार्ग दिखाता है। ऐसी मित्रता करने का प्रयास सभी को करना चाहिए।","marks":6,"section":"खण्ड 'ब' (गद्यांश) - 3×2=6 अंक","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा गद्यांश 300-400 शब्द - लगभग 1 पेज - समान प्रारूप में 3 उप-प्रश्नों सहित]","alternativeAnswer":"(i) सन्दर्भ (2 अंक - 80-100 शब्द): [पाठ का नाम, लेखक, विषय का विस्तृत विवरण]\\n\\n(ii) व्याख्या (2 अंक - 80-100 शब्द): [रेखांकित अंश की विस्तृत व्याख्या]\\n\\n(iii) उत्तर (2 अंक - 80-100 शब्द): [प्रश्न का विस्तृत उत्तर]"}

पद्यांश (प्र.22):
{"questionType":"written","questionText":"दिए गए पद्यांश पर आधारित तीन प्रश्नों के उत्तर दीजिए:\\n\\nचरन कमल बंदौ हरि राई।\\nजाकी कृपा पंगु गिरि लंघै, अंधे को सब कुछ दरसाई॥\\nबहिरो सुनै गूंग पुनि बोलै, रंक चलै सिर छत्र धराई।\\nसूरदास स्वामी करुणामय, बार-बार बंदौं तेहि पाई॥\\n\\nमैया मोहि दाऊ बहुत खिझायो।\\nमो सों कहत मोल को लीन्हों, तू जसुमति कब जायो॥\\nकहा करौं इहि रिस के मारे, खेलन हौं नहिं जात।\\nपुनि पुनि कहत कौन है माता, को है तेरो तात॥\\n\\nगोरे नंद जसोदा गोरी, तू कत स्यामल गात।\\nचुटकी दै दै ग्वाल नचावत, हँसत सबै मुसुकात॥\\nतू मोहीं को मारन सीखी, दाउहि कबहुँ न खीझै।\\nमोहन मुख रिस की ये बातें, जसुमति सुनि सुनि रीझै॥\\n\\nसुनहु कान्ह बलभद्र चबाई, जनमत ही को धूत।\\nसूर स्याम मोहिं गोधन की सौं, हौं माता तू पूत॥\\n\\n(i) उपर्युक्त पद्यांश का सन्दर्भ लिखिए।\\n(ii) 'चरन कमल' में कौन-सा अलंकार है? स्पष्ट कीजिए।\\n(iii) रेखांकित अंश की व्याख्या कीजिए। (रेखांकित अंश: मैया मोहि दाऊ बहुत खिझायो... को है तेरो तात॥)","correctAnswer":"(i) सन्दर्भ (2 अंक - 80-100 शब्द): प्रस्तुत पद भक्तकवि सूरदास द्वारा रचित 'सूरसागर' महाकाव्य से हमारी पाठ्यपुस्तक के 'पद' शीर्षक से उद्धृत है। सूरदास हिन्दी साहित्य के महान भक्त कवि हैं जिन्होंने श्रीकृष्ण की बाल-लीलाओं और भक्ति का अद्भुत वर्णन किया है। इस पद में कवि ने श्रीकृष्ण की अपार कृपा और बाल सुलभ शिकायतों का मनोहारी चित्रण किया है।\\n\\n(ii) अलंकार (2 अंक - 80-100 शब्द): 'चरन कमल' में रूपक अलंकार है। रूपक अलंकार में उपमेय और उपमान में अभेद दिखाया जाता है अर्थात् दोनों को एक मान लिया जाता है। यहाँ चरणों को कमल के समान न कहकर कमल ही कहा गया है - 'चरण रूपी कमल'। इसके अतिरिक्त 'पंगु गिरि लंघै, अंधे को सब कुछ दरसाई' में अतिशयोक्ति अलंकार है क्योंकि यहाँ लोकसीमा का अतिक्रमण किया गया है।\\n\\n(iii) व्याख्या (2 अंक - 80-100 शब्द): बालक कृष्ण माता यशोदा से शिकायत करते हुए कहते हैं कि माँ, बलराम दाऊ मुझे बहुत चिढ़ाते हैं। वे कहते हैं कि तुम्हें तो मोल लिया गया है, यशोदा ने तुम्हें कब जन्म दिया। इस क्रोध के कारण मैं खेलने भी नहीं जाता। वे बार-बार पूछते हैं कि तेरी असली माता कौन है, तेरा पिता कौन है। कृष्ण की इन बाल सुलभ शिकायतों को सुनकर यशोदा का हृदय प्रेम से भर जाता है।","marks":6,"section":"खण्ड 'ब' (पद्यांश) - 3×2=6 अंक","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा पद्यांश 16-24 पंक्तियाँ - लगभग 1 पेज - समान प्रारूप में 3 उप-प्रश्नों सहित]","alternativeAnswer":"(i) सन्दर्भ (2 अंक - 80-100 शब्द): [कवि, रचना, विषय का विस्तृत विवरण]\\n\\n(ii) उत्तर (2 अंक - 80-100 शब्द): [प्रश्न का विस्तृत उत्तर]\\n\\n(iii) व्याख्या (2 अंक - 80-100 शब्द): [रेखांकित पंक्तियों की विस्तृत व्याख्या]"}

संस्कृत गद्यांश (प्र.23):
{"questionType":"written","questionText":"निम्नलिखित संस्कृत गद्यांश में से किसी एक का सन्दर्भ-सहित हिन्दी में अनुवाद कीजिए:\\n\\n[संस्कृत गद्यांश - जैसे:]\\nअस्माकं संस्कृतिः सदा गतिशीला वर्तते। मानवजीवनं संस्कृतिम् एषा यथासमयं नवां-नवां विचारधारां स्वीकरोति...","correctAnswer":"सन्दर्भ: प्रस्तुत गद्यांश [पाठ] से उद्धृत है। इसमें [विषय] का वर्णन है।\\n\\nअनुवाद: हमारी संस्कृति सदा गतिशील है। यह मानव जीवन की संस्कृति समय के अनुसार नई-नई विचारधाराओं को स्वीकार करती है...","marks":5,"section":"खण्ड 'ब' (संस्कृत गद्यांश अनुवाद) - 2+3=5 अंक","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा संस्कृत गद्यांश]","alternativeAnswer":"सन्दर्भ: [सन्दर्भ]\\n\\nअनुवाद: [हिन्दी अनुवाद]"}

संस्कृत पद्यांश (प्र.24):
{"questionType":"written","questionText":"दिए गए संस्कृत पद्यांश में से किसी एक का सन्दर्भ-सहित हिन्दी में अनुवाद कीजिए:\\n\\n[संस्कृत श्लोक - जैसे:]\\nउत्तरं यत् समुद्रस्य हिमाद्रेश्चैव दक्षिणम्।\\nवर्षं तद् भारतं नाम भारती तत्र सन्ततिः॥","correctAnswer":"सन्दर्भ: प्रस्तुत श्लोक [पाठ] से उद्धृत है।\\n\\nअनुवाद: जो देश समुद्र के उत्तर में और हिमालय के दक्षिण में स्थित है, उस देश का नाम भारत है और वहाँ की संतान भारती कहलाती है।","marks":5,"section":"खण्ड 'ब' (संस्कृत पद्यांश अनुवाद) - 2+3=5 अंक","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा संस्कृत श्लोक]","alternativeAnswer":"सन्दर्भ: [सन्दर्भ]\\n\\nअनुवाद: [हिन्दी अनुवाद]"}

खण्डकाव्य (प्र.25):
{"questionType":"written","questionText":"अपने पठित खण्डकाव्य के आधार पर दिए गए प्रश्नों में से किसी एक प्रश्न का उत्तर दीजिए:\\n\\n(क) (i) 'मुक्तियज्ञ' खण्डकाव्य के आधार पर महात्मा गांधी का चरित्र-चित्रण कीजिए।\\n    (ii) 'मुक्तियज्ञ' खण्डकाव्य के तृतीय सर्ग का कथानक अपने शब्दों में लिखिए।\\n\\n(ख) (i) 'ज्योति जवाहर' खण्डकाव्य के आधार पर उसके नायक का चरित्र-चित्रण कीजिए।\\n    (ii) 'ज्योति जवाहर' खण्डकाव्य की कथावस्तु संक्षेप में लिखिए।\\n\\n(ग) (i) 'मेवाड़ मुकुट' खण्डकाव्य की कथावस्तु संक्षेप में लिखिए।\\n    (ii) 'मेवाड़ मुकुट' खण्डकाव्य के आधार पर राणा प्रताप का चरित्र-चित्रण कीजिए।\\n\\n(घ) (i) 'अग्रपूजा' खण्डकाव्य के आधार पर 'श्री कृष्ण' का चरित्र-चित्रण कीजिए।\\n    (ii) 'अग्रपूजा' खण्डकाव्य की कथावस्तु संक्षेप में लिखिए।\\n\\n(ङ) (i) 'जय सुभाष' खण्डकाव्य के द्वितीय सर्ग की कथावस्तु लिखिए।\\n    (ii) 'जय सुभाष' खण्डकाव्य के नायक का चरित्र-चित्रण कीजिए।\\n\\n(च) (i) 'मातृभूमि के लिए' खण्डकाव्य के नायक का चरित्र-चित्रण कीजिए।\\n    (ii) 'मातृभूमि के लिए' खण्डकाव्य के द्वितीय सर्ग की कथावस्तु लिखिए।","correctAnswer":"[चयनित खण्डकाव्य के आधार पर 100-150 शब्दों में विस्तृत उत्तर]\\n\\nउदाहरण (मुक्तियज्ञ - गांधी जी का चरित्र-चित्रण):\\nमहात्मा गांधी 'मुक्तियज्ञ' खण्डकाव्य के नायक हैं। उनके चरित्र की प्रमुख विशेषताएं:\\n1. सत्य और अहिंसा के पुजारी\\n2. स्वदेशी आंदोलन के प्रणेता\\n3. सादा जीवन उच्च विचार\\n4. राष्ट्रप्रेम और त्याग की भावना\\n5. सर्वधर्म समभाव","marks":3,"section":"खण्ड 'ब' (खण्डकाव्य) - 1×3=3 अंक"}

लेखक/कवि परिचय (प्र.26):
{"questionType":"written","questionText":"(क) निम्नलिखित लेखकों में से किसी एक लेखक का जीवन-परिचय देते हुए उनकी एक प्रमुख रचना का उल्लेख कीजिए:\\n    (i) रामधारी सिंह 'दिनकर'\\n    (ii) आचार्य रामचन्द्र शुक्ल\\n    (iii) जयशंकर प्रसाद\\n\\n(ख) निम्नलिखित कवियों में से किसी एक कवि का जीवन-परिचय देते हुए उनकी एक प्रमुख रचना का उल्लेख कीजिए:\\n    (i) तुलसीदास\\n    (ii) मैथिलीशरण गुप्त\\n    (iii) महादेवी वर्मा","correctAnswer":"(क) लेखक परिचय (5 अंक):\\n\\n[लेखक का नाम]\\n\\nजन्म: [तिथि], [स्थान]\\nमृत्यु: [तिथि]\\n\\nजीवन परिचय: [80-100 शब्दों में जीवन का संक्षिप्त विवरण - शिक्षा, कार्यक्षेत्र, साहित्यिक योगदान]\\n\\nप्रमुख रचनाएं: [रचनाओं की सूची]\\n\\nसाहित्य में स्थान: [20-30 शब्दों में महत्व]\\n\\n---\\n\\n(ख) कवि परिचय (5 अंक):\\n\\n[कवि का नाम]\\n\\nजन्म: [तिथि], [स्थान]\\nमृत्यु: [तिथि]\\n\\nजीवन परिचय: [80-100 शब्दों में जीवन का संक्षिप्त विवरण]\\n\\nप्रमुख रचनाएं: [रचनाओं की सूची]\\n\\nसाहित्य में स्थान: [20-30 शब्दों में महत्व]","marks":10,"section":"खण्ड 'ब' (लेखक/कवि परिचय) - 5+5=10 अंक"}

कण्ठस्थ श्लोक (प्र.27):
{"questionType":"written","questionText":"अपनी पाठ्यपुस्तक में से कण्ठस्थ कोई एक श्लोक लिखिए जो इस प्रश्न-पत्र में न आया हो।","correctAnswer":"[संस्कृत श्लोक]\\n\\nउदाहरण:\\nविद्या ददाति विनयं विनयाद् याति पात्रताम्।\\nपात्रत्वाद् धनमाप्नोति धनाद् धर्मं ततः सुखम्॥\\n\\nअर्थ: विद्या विनय देती है, विनय से पात्रता आती है, पात्रता से धन मिलता है, धन से धर्म होता है और धर्म से सुख प्राप्त होता है।","marks":2,"section":"खण्ड 'ब' (कण्ठस्थ श्लोक) - 2 अंक"}

पत्र लेखन (प्र.28):
{"questionType":"written","questionText":"अपने छोटे भाई को समय का सदुपयोग करने की सलाह देते हुए एक पत्र लिखिए जिसमें निम्नलिखित बिंदुओं का समावेश हो:\\n- समय के महत्व पर प्रकाश\\n- विद्यार्थी जीवन में समय की कीमत\\n- समय बर्बाद करने के दुष्परिणाम\\n- समय-सारणी बनाने की सलाह\\n- मोबाइल और सोशल मीडिया से दूरी\\n- माता-पिता की अपेक्षाएं","correctAnswer":"परीक्षा भवन,\\nइलाहाबाद।\\nदिनांक: 15 फरवरी, 2025\\n\\nप्रिय अनुज सोहन,\\nशुभ आशीर्वाद।\\n\\nआशा है कि तुम छात्रावास में स्वस्थ और प्रसन्न होगे तथा अपनी पढ़ाई में मन लगाकर परिश्रम कर रहे होगे। मुझे पिताजी के पत्र से ज्ञात हुआ कि तुम्हारा ध्यान पढ़ाई से हटकर रहा है और तुम अपना बहुमूल्य समय व्यर्थ के कार्यों में नष्ट कर रहे हो। यह जानकर मुझे अत्यंत दुःख और चिंता हुई।\\n\\nमेरे प्रिय भाई, समय संसार की सबसे मूल्यवान वस्तु है। बीता हुआ समय कभी वापस नहीं आता, चाहे कोई कितना भी धन व्यय कर ले। महान विद्वानों ने कहा है - 'समय और ज्वार किसी की प्रतीक्षा नहीं करते।' विद्यार्थी जीवन तो स्वर्णिम काल है जिसमें किया गया परिश्रम जीवनभर फल देता है।\\n\\nयदि तुम अभी समय का सदुपयोग करोगे और मन लगाकर पढ़ाई करोगे, तो भविष्य में अवश्य सफलता प्राप्त करोगे। मनोरंजन जीवन के लिए आवश्यक है, परंतु पढ़ाई की कीमत पर नहीं। तुम्हें एक निश्चित समय-सारणी बनानी चाहिए। मोबाइल और सोशल मीडिया पर अनावश्यक समय बर्बाद मत करो।\\n\\nमाता-पिता को तुमसे बहुत अपेक्षाएं हैं। उनका आशीर्वाद सदैव तुम्हारे साथ है। मुझे विश्वास है तुम सुधार करोगे।\\n\\nशुभकामनाओं सहित,\\nतुम्हारा अग्रज,\\nराम","marks":4,"section":"खण्ड 'ब' (पत्र लेखन) - 4 अंक","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\nअपने विद्यालय के प्रधानाचार्य को निम्नलिखित विषय पर प्रार्थना-पत्र लिखिए:\\n- बहन के विवाह में सम्मिलित होने हेतु पाँच दिन का अवकाश\\n- विवाह की तिथि और स्थान का उल्लेख\\n- परिवार में आपकी भूमिका\\n- अवकाश की अवधि\\n- छूटे पाठ्यक्रम को पूरा करने का आश्वासन","alternativeAnswer":"सेवा में,\\nश्रीमान प्रधानाचार्य जी,\\nराजकीय इंटर कॉलेज,\\nइलाहाबाद।\\n\\nविषय: पाँच दिन के अवकाश हेतु प्रार्थना-पत्र\\n\\nमहोदय,\\n\\nसविनय निवेदन है कि मैं आपके विद्यालय की कक्षा दसवीं 'ब' का नियमित छात्र हूँ। मेरा अनुक्रमांक 25 है। मैं अपनी कक्षा में सदैव अच्छे अंक प्राप्त करता रहा हूँ और विद्यालय के नियमों का पालन करता हूँ।\\n\\nमहोदय, मेरी बड़ी बहन का विवाह दिनांक 20 फरवरी, 2025 को निश्चित हुआ है। यह हमारे परिवार के लिए अत्यंत महत्वपूर्ण अवसर है। विवाह समारोह में भाग लेना मेरे लिए आवश्यक है क्योंकि परिवार में मैं ही एकमात्र भाई हूँ।\\n\\nविवाह से संबंधित अनेक कार्यों में मुझे सहायता करनी है। अतिथियों के स्वागत-सत्कार और अन्य रस्मों में मेरी उपस्थिति अनिवार्य है। इस कारण मुझे दिनांक 18 फरवरी से 22 फरवरी तक पाँच दिन का अवकाश चाहिए।\\n\\nमैं वचन देता हूँ कि छूटे पाठ्यक्रम को पूरा कर लूँगा।\\n\\nधन्यवाद।\\n\\nआपका आज्ञाकारी शिष्य,\\nअमित कुमार\\nकक्षा: 10 'ब'\\nदिनांक: 15 फरवरी, 2025"}

संस्कृत प्रश्न (प्र.29):
{"questionType":"written","questionText":"निम्नलिखित में से किन्हीं दो प्रश्नों के उत्तर संस्कृत में दीजिए:\\n\\n(i) चन्द्रशेखरः कः आसीत्?\\n(ii) भूमेः गुरुतरं किम् अस्ति?\\n(iii) पुरुराजः केन सह युद्धम् अकरोत्?\\n(iv) वाराणसी केषां संगमस्थली अस्ति?","correctAnswer":"(i) चन्द्रशेखरः एकः महान् स्वतन्त्रता सेनानी आसीत्।\\n\\n(ii) भूमेः गुरुतरं माता अस्ति।\\n\\n(iii) पुरुराजः सिकन्दरेण सह युद्धम् अकरोत्।\\n\\n(iv) वाराणसी विविधधर्माणां संगमस्थली अस्ति।\\n\\n(किन्हीं दो के उत्तर)","marks":2,"section":"खण्ड 'ब' (संस्कृत प्रश्न) - 1+1=2 अंक"}

निबन्ध (प्र.30):
{"questionType":"written","questionText":"निम्नलिखित विषयों में से किसी एक विषय पर निबन्ध लिखिए:\\n\\n(i) साहित्य और समाज\\n(ii) स्वच्छ भारत अभियान\\n(iii) लोकतंत्र में मतदान का महत्त्व\\n(iv) मेरा प्रिय कवि\\n(v) नारी सशक्तीकरण","correctAnswer":"[शीर्षक]\\nस्वच्छ भारत अभियान\\n\\nभूमिका (80-100 शब्द):\\nस्वच्छता मानव जीवन का अभिन्न अंग है। महात्मा गांधी ने कहा था - 'स्वच्छता स्वतंत्रता से अधिक महत्वपूर्ण है।' इसी प्रेरणा से 2 अक्टूबर 2014 को प्रधानमंत्री नरेंद्र मोदी ने स्वच्छ भारत अभियान का शुभारंभ किया। यह अभियान भारत को स्वच्छ और स्वस्थ बनाने की दिशा में एक महत्वपूर्ण कदम है।\\n\\nमुख्य भाग:\\n\\n1. अभियान का उद्देश्य (150-180 शब्द):\\nइस अभियान का मुख्य उद्देश्य भारत को स्वच्छ और खुले में शौच मुक्त बनाना है। ग्रामीण और शहरी क्षेत्रों में शौचालयों का निर्माण, कचरा प्रबंधन, और जन जागरूकता इसके प्रमुख लक्ष्य हैं। इस अभियान के तहत सार्वजनिक स्थानों, सड़कों, और गलियों की सफाई पर विशेष ध्यान दिया जा रहा है। स्कूलों और कॉलेजों में स्वच्छता शिक्षा को पाठ्यक्रम का हिस्सा बनाया गया है।\\n\\n2. अभियान की उपलब्धियां (150-180 शब्द):\\nइस अभियान के तहत करोड़ों शौचालयों का निर्माण हुआ है। अनेक गांव और शहर खुले में शौच मुक्त घोषित किए गए हैं। स्कूलों और सार्वजनिक स्थानों पर स्वच्छता के प्रति जागरूकता बढ़ी है। कचरे के वैज्ञानिक निस्तारण की व्यवस्था की गई है। प्लास्टिक के उपयोग को कम करने के लिए जन जागरूकता अभियान चलाए जा रहे हैं।\\n\\n3. हमारा योगदान (150-180 शब्द):\\nहम सभी को इस अभियान में सक्रिय भागीदारी निभानी चाहिए। अपने घर, मोहल्ले और शहर को स्वच्छ रखना हमारा कर्तव्य है। कचरे का उचित निस्तारण और प्लास्टिक का कम उपयोग करना चाहिए। सार्वजनिक स्थानों पर गंदगी न फैलाएं। पानी का दुरुपयोग न करें। पेड़-पौधे लगाएं और पर्यावरण की रक्षा करें।\\n\\n4. चुनौतियां और समाधान (100-120 शब्द):\\nइस अभियान के सामने कई चुनौतियां हैं जैसे जन जागरूकता की कमी, संसाधनों की कमी, और लोगों की मानसिकता में बदलाव। इन चुनौतियों से निपटने के लिए शिक्षा और जागरूकता कार्यक्रम आवश्यक हैं।\\n\\nउपसंहार (80-100 शब्द):\\nस्वच्छ भारत अभियान केवल सरकार का नहीं, बल्कि हर नागरिक का अभियान है। स्वच्छता से ही स्वस्थ और समृद्ध भारत का निर्माण संभव है। आइए, हम सब मिलकर इस अभियान को सफल बनाएं और अपने देश को स्वच्छ और सुंदर बनाने में अपना योगदान दें।\\n\\n(कुल 700-900 शब्द - लगभग 2 पेज)","marks":7,"section":"खण्ड 'ब' (निबन्ध) - 1×7=7 अंक"}

STRICT RULES:
1. EXACTLY 30 questions (20 MCQ + 10 descriptive)
2. ALL questions in Hindi (हिन्दी) only - Devanagari script
3. MCQ options format: (A), (B), (C), (D)
4. प्र.21-24, प्र.28 MUST have hasAlternative, alternativeQuestion, alternativeAnswer
5. गद्यांश: प्रश्न में पूरा गद्यांश (300-400 शब्द - 1 पेज), उत्तर प्रत्येक भाग 80-100 शब्द
6. पद्यांश: प्रश्न में पूरा पद्यांश (16-24 पंक्तियाँ - 1 पेज), उत्तर प्रत्येक भाग 80-100 शब्द
7. पत्र: प्रश्न में बिंदु दें, उत्तर में पूर्ण पत्र (250-300 शब्द)
8. निबन्ध: उत्तर 700-900 शब्द (2 पेज) - भूमिका, मुख्य भाग (3-4 बिंदु), उपसंहार
9. खण्डकाव्य: उत्तर 100-150 शब्द
10. लेखक/कवि परिचय: प्रत्येक 200-250 शब्द (जन्म, जीवन, रचनाएं, साहित्य में स्थान)

Return ONLY valid JSON array with exactly 30 questions. No markdown, no explanation.`;
    } else if (examFormat === "upboard_sanskrit") {
      prompt = `UP BOARD CLASS 10 SANSKRIT PAPER (संस्कृत) - 70 अंक, 31 प्रश्न बनाएं।
Paper Code: 818(BP)

विषय: "${topic}"

संरचना (EXACT STRUCTURE - 31 questions = 70 marks):

खण्ड 'अ' (बहुविकल्पीय प्रश्न) - 20 अंक:
- उपखण्ड (क): गद्यांश आधारित MCQs (प्र.1-6) × 1 अंक = 6 अंक
- उपखण्ड (ख): व्याकरण MCQs (प्र.7-20) × 1 अंक = 14 अंक
  - संधि (2 प्रश्न), समास (2 प्रश्न), विभक्ति (2 प्रश्न), लकार (2 प्रश्न), प्रत्याहार (2 प्रश्न), अन्य व्याकरण (4 प्रश्न)
TOTAL: 20 MCQs = 20 अंक

खण्ड 'ब' (वर्णनात्मक प्रश्न) - 50 अंक:
उपखण्ड (क):
- प्र.21: गद्यांश अनुवाद (4 अंक) - अथवा सहित
- प्र.22: पाठ सारांश (4 अंक) - अथवा सहित
- प्र.23: श्लोक व्याख्या (4 अंक) - अथवा सहित
- प्र.24: सूक्ति व्याख्या (3 अंक) - अथवा सहित
- प्र.25: श्लोक अर्थ (4 अंक) - अथवा सहित
- प्र.26: चरित्र-चित्रण (4 अंक) - अथवा सहित

उपखण्ड (ख):
- प्र.27: विभक्ति (2 अंक) + प्रत्यय (2 अंक) = 4 अंक
- प्र.28: वाच्य परिवर्तन (3 अंक)
- प्र.29: हिन्दी से संस्कृत अनुवाद (3×2=6 अंक)
- प्र.30: निबन्ध (8 अंक)
- प्र.31: पद प्रयोग (2×2=4 अंक)

=== ANSWER LENGTH - VERY DETAILED AND LONG ===
- 8 अंक (निबन्ध): 500-600 शब्द (संस्कृत में) - बहुत विस्तृत
- 6 अंक (अनुवाद): प्रत्येक वाक्य 25-35 शब्द विस्तृत व्याख्या सहित
- 4 अंक (गद्यांश/श्लोक/सारांश/चरित्र): 200-250 शब्द - सन्दर्भ 50 शब्द + अनुवाद/व्याख्या 150-200 शब्द
- 3 अंक (सूक्ति/वाच्य): 120-150 शब्द विस्तृत
- 2 अंक (विभक्ति/प्रत्यय/पद प्रयोग): 50-70 शब्द
- 1 अंक (MCQ): केवल सही विकल्प

JSON FORMAT:

MCQ गद्यांश आधारित (प्र.1-6):
{"questionType":"mcq","questionText":"'वाराणसी' इति नगरी कस्याः तटे स्थिता अस्ति?","options":["(A) गङ्गायाः","(B) यमुनायाः","(C) सरस्वत्याः","(D) नर्मदायाः"],"correctOption":0,"marks":1,"section":"खण्ड 'अ' उपखण्ड (क) - गद्यांश आधारित (1 अंक)"}

MCQ व्याकरण (प्र.7-20):
{"questionType":"mcq","questionText":"'रामस्य' इति पदे का विभक्तिः?","options":["(A) प्रथमा","(B) द्वितीया","(C) षष्ठी","(D) सप्तमी"],"correctOption":2,"marks":1,"section":"खण्ड 'अ' उपखण्ड (ख) - व्याकरण (1 अंक)"}

गद्यांश अनुवाद (प्र.21) - VERY DETAILED ANSWER:
{"questionType":"written","questionText":"निम्नलिखित गद्यांश का सन्दर्भ-सहित हिन्दी में अनुवाद कीजिए:\\n\\nसंस्कृतभाषा अतीव प्राचीना भाषा अस्ति। इयं भाषा देववाणी इति नाम्ना प्रसिद्धा अस्ति। अस्याः भाषायाः साहित्यं विश्वस्य प्राचीनतमं साहित्यम् अस्ति। वेदाः पुराणानि उपनिषदः च संस्कृतभाषायाम् एव लिखिताः सन्ति। अस्याः भाषायाः व्याकरणं पाणिनिना रचितम्। इयं भाषा सर्वासां भारतीयभाषाणां जननी अस्ति।","correctAnswer":"सन्दर्भ (50 शब्द):\\nप्रस्तुत गद्यांश हमारी संस्कृत पाठ्यपुस्तक के 'संस्कृतभाषायाः महत्त्वम्' नामक पाठ से उद्धृत है। यह पाठ संस्कृत भाषा की प्राचीनता, महत्त्व एवं गौरवशाली परम्परा का वर्णन करता है। इस गद्यांश में संस्कृत भाषा को देववाणी कहा गया है तथा इसके साहित्यिक महत्त्व को प्रतिपादित किया गया है।\\n\\nअनुवाद (150 शब्द):\\nसंस्कृत भाषा अत्यन्त प्राचीन भाषा है। यह भाषा 'देववाणी' इस नाम से प्रसिद्ध है क्योंकि प्राचीन काल में देवताओं की स्तुति इसी भाषा में की जाती थी। इस भाषा का साहित्य विश्व का सबसे प्राचीन साहित्य है जो हजारों वर्ष पुराना है। वेद, पुराण और उपनिषद जैसे महान ग्रन्थ संस्कृत भाषा में ही लिखे गए हैं। ये ग्रन्थ भारतीय संस्कृति और दर्शन की अमूल्य धरोहर हैं। इस भाषा का व्याकरण महर्षि पाणिनि द्वारा रचित है जो 'अष्टाध्यायी' के नाम से विख्यात है। यह व्याकरण विश्व का सबसे वैज्ञानिक व्याकरण माना जाता है। संस्कृत भाषा सभी भारतीय भाषाओं की जननी है अर्थात् हिन्दी, मराठी, बंगला, गुजराती आदि सभी भाषाएँ संस्कृत से ही उत्पन्न हुई हैं। इसलिए संस्कृत को 'भाषाओं की माता' भी कहा जाता है।","marks":4,"section":"खण्ड 'ब' उपखण्ड (क) - गद्यांश अनुवाद (4 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\nभारतवर्षस्य उत्तरस्यां दिशि हिमालयः पर्वतः स्थितः अस्ति। अयं पर्वतः विश्वस्य उच्चतमः पर्वतः अस्ति। अस्मात् पर्वतात् गङ्गा यमुना सरस्वती च नद्यः प्रवहन्ति। एताः नद्यः भारतस्य जीवनदायिन्यः सन्ति। हिमालयः भारतस्य रक्षकः अस्ति।","alternativeAnswer":"सन्दर्भ (50 शब्द):\\nप्रस्तुत गद्यांश हमारी पाठ्यपुस्तक के 'हिमालयः' नामक पाठ से उद्धृत है। इस पाठ में हिमालय पर्वत की भौगोलिक स्थिति, उसकी महिमा एवं भारत के लिए उसके महत्त्व का सुन्दर वर्णन किया गया है।\\n\\nअनुवाद (150 शब्द):\\nभारतवर्ष की उत्तर दिशा में हिमालय पर्वत स्थित है। यह पर्वत विश्व का सबसे ऊँचा पर्वत है जिसकी चोटियाँ सदैव बर्फ से ढकी रहती हैं। इस पर्वत से गंगा, यमुना और सरस्वती जैसी पवित्र नदियाँ बहती हैं। ये नदियाँ भारत की जीवनदायिनी हैं क्योंकि इनके जल से करोड़ों लोगों की प्यास बुझती है और खेतों की सिंचाई होती है। हिमालय भारत का रक्षक है क्योंकि यह उत्तर से आने वाली शीत हवाओं को रोकता है।"}

पाठ सारांश (प्र.22) - VERY DETAILED ANSWER:
{"questionType":"written","questionText":"'वाराणसी' अथवा 'भारतीया संस्कृतिः' पाठ का सारांश संस्कृत में लिखिए।","correctAnswer":"वाराणसी (200-250 शब्द):\\n\\nवाराणसी नगरी भारतस्य प्राचीनतमा नगरी अस्ति। इयं नगरी पवित्रायाः गङ्गायाः तटे स्थिता अस्ति। अस्याः नगर्याः अपरं नाम काशी इति अस्ति। इयं नगरी हिन्दूधर्मस्य प्रमुखं तीर्थस्थानम् अस्ति।\\n\\nअस्यां नगर्यां अनेकानि प्राचीनानि मन्दिराणि सन्ति। काशीविश्वनाथस्य मन्दिरं सर्वेषु मन्दिरेषु प्रसिद्धतमम् अस्ति। अत्र भगवान् शिवः विश्वनाथरूपेण पूज्यते। अन्नपूर्णादेव्याः मन्दिरम् अपि अत्र स्थितम् अस्ति।\\n\\nगङ्गायाः तटे अनेके घाटाः सन्ति। दशाश्वमेधघाटः मणिकर्णिकाघाटः च प्रसिद्धौ स्तः। प्रातःकाले सहस्राणि जनाः गङ्गायां स्नानं कुर्वन्ति। सायंकाले गङ्गायाः आरतिः भवति या अतीव मनोहरा भवति।\\n\\nवाराणसी विद्यायाः केन्द्रम् अपि अस्ति। अत्र काशीहिन्दूविश्वविद्यालयः स्थितः अस्ति यः भारतस्य प्रमुखेषु विश्वविद्यालयेषु अन्यतमः अस्ति। अत्र संस्कृतस्य अध्ययनं विशेषरूपेण भवति।\\n\\nइयं नगरी रेशमवस्त्राणां कृते अपि प्रसिद्धा अस्ति। बनारसी साड़ी विश्वप्रसिद्धा अस्ति। अतः वाराणसी धार्मिकदृष्ट्या शैक्षिकदृष्ट्या व्यापारिकदृष्ट्या च महत्त्वपूर्णा नगरी अस्ति।","marks":4,"section":"खण्ड 'ब' उपखण्ड (क) - पाठ सारांश (4 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n'भारतीया संस्कृतिः' पाठ का सारांश संस्कृत में लिखिए।","alternativeAnswer":"भारतीया संस्कृतिः (200-250 शब्द):\\n\\nभारतीया संस्कृतिः विश्वस्य प्राचीनतमा संस्कृतिः अस्ति। अस्याः संस्कृतेः इतिहासः पञ्चसहस्रवर्षेभ्यः अपि प्राचीनः अस्ति। अस्याः संस्कृतेः मूलं वेदेषु अस्ति।\\n\\nभारतीयसंस्कृतेः प्रमुखं तत्त्वं 'वसुधैव कुटुम्बकम्' इति अस्ति। अस्य अर्थः अस्ति यत् सम्पूर्णा पृथ्वी एकं कुटुम्बम् इव अस्ति। अस्मिन् देशे सर्वे धर्माः आदरेण स्वीक्रियन्ते।\\n\\nभारतीयसंस्कृतौ गुरुशिष्यपरम्परा अतीव महत्त्वपूर्णा अस्ति। अत्र गुरुः देवतुल्यः मन्यते। अतिथिदेवो भव इति अस्माकं संस्कृतेः आदर्शः अस्ति।\\n\\nभारतीयसंस्कृतौ योगः ध्यानं च महत्त्वपूर्णौ स्तः। अद्य सम्पूर्णे विश्वे योगस्य प्रचारः भवति। आयुर्वेदः अपि भारतीयसंस्कृतेः महत्त्वपूर्णं अङ्गम् अस्ति।\\n\\nसंगीतं नृत्यं चित्रकला च भारतीयसंस्कृतेः अभिन्नानि अङ्गानि सन्ति। भरतनाट्यम् कथक् ओडिसी च प्रसिद्धाः नृत्यशैल्यः सन्ति। एवं भारतीया संस्कृतिः समृद्धा विविधा च अस्ति।"}

श्लोक व्याख्या (प्र.23) - VERY DETAILED ANSWER:
{"questionType":"written","questionText":"निम्नलिखित श्लोक की सन्दर्भ-सहित हिन्दी में व्याख्या कीजिए:\\n\\nविद्या ददाति विनयं विनयाद् याति पात्रताम्।\\nपात्रत्वाद् धनमाप्नोति धनाद् धर्मं ततः सुखम्॥","correctAnswer":"सन्दर्भ (50 शब्द):\\nप्रस्तुत श्लोक हमारी संस्कृत पाठ्यपुस्तक के 'नीतिश्लोकाः' नामक पाठ से उद्धृत है। यह श्लोक महान नीतिकार आचार्य चाणक्य द्वारा रचित है। इस श्लोक में विद्या के महत्त्व का अत्यन्त सुन्दर एवं क्रमबद्ध वर्णन किया गया है। यह श्लोक विद्यार्थियों के लिए अत्यन्त प्रेरणादायक है।\\n\\nव्याख्या (150-200 शब्द):\\nइस श्लोक में कवि ने विद्या से सुख तक पहुँचने की एक सुन्दर शृंखला प्रस्तुत की है। विद्या मनुष्य को विनय अर्थात् नम्रता प्रदान करती है। जो व्यक्ति विद्वान होता है वह कभी अहंकारी नहीं होता, बल्कि वह सदैव विनम्र रहता है। विनय से मनुष्य में पात्रता अर्थात् योग्यता आती है। विनम्र व्यक्ति को सभी लोग पसन्द करते हैं और उसे अवसर प्राप्त होते हैं।\\n\\nपात्रता से धन की प्राप्ति होती है क्योंकि योग्य व्यक्ति को सम्मानजनक कार्य मिलता है। धन से मनुष्य धर्म का पालन कर सकता है अर्थात् दान-पुण्य कर सकता है, यज्ञ कर सकता है और समाज की सेवा कर सकता है। धर्म के पालन से अन्ततः सुख की प्राप्ति होती है।\\n\\nइस प्रकार विद्या ही सभी सुखों का मूल है। विद्या के बिना मनुष्य पशु के समान है। अतः प्रत्येक व्यक्ति को विद्या प्राप्त करने का प्रयास करना चाहिए। यह श्लोक हमें शिक्षा का महत्त्व समझाता है।","marks":4,"section":"खण्ड 'ब' उपखण्ड (क) - श्लोक व्याख्या (4 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\nमातृदेवो भव। पितृदेवो भव।\\nआचार्यदेवो भव। अतिथिदेवो भव॥","alternativeAnswer":"सन्दर्भ (50 शब्द):\\nप्रस्तुत श्लोक तैत्तिरीय उपनिषद् से उद्धृत है जो हमारी पाठ्यपुस्तक के 'उपनिषद्-सूक्तयः' पाठ में संकलित है। यह गुरु द्वारा शिष्य को दी गई शिक्षा है जो भारतीय संस्कृति के मूल्यों को प्रतिबिम्बित करती है।\\n\\nव्याख्या (150-200 शब्द):\\nइस श्लोक में गुरु अपने शिष्य को जीवन के चार महत्त्वपूर्ण आदर्श बताते हैं। 'मातृदेवो भव' का अर्थ है कि माता को देवता के समान मानो क्योंकि माता ने हमें जन्म दिया और पाला-पोसा। 'पितृदेवो भव' का अर्थ है कि पिता को देवता समान मानो क्योंकि पिता हमारे पालन-पोषण और शिक्षा की व्यवस्था करते हैं। 'आचार्यदेवो भव' का अर्थ है कि गुरु को देवता मानो क्योंकि गुरु हमें ज्ञान देकर अज्ञान के अन्धकार से प्रकाश की ओर ले जाते हैं। 'अतिथिदेवो भव' का अर्थ है कि अतिथि को देवता मानो और उसका सत्कार करो। यह भारतीय संस्कृति की विशेषता है।"}

सूक्ति व्याख्या (प्र.24) - VERY DETAILED ANSWER:
{"questionType":"written","questionText":"निम्नलिखित सूक्ति की हिन्दी में व्याख्या कीजिए:\\n\\n'विद्या विहीनः पशुः'","correctAnswer":"व्याख्या (120-150 शब्द):\\n\\nइस सूक्ति का शाब्दिक अर्थ है कि विद्या से रहित व्यक्ति पशु के समान है। यह सूक्ति भर्तृहरि के नीतिशतक से ली गई है और इसमें विद्या के महत्त्व को अत्यन्त प्रभावशाली ढंग से प्रस्तुत किया गया है।\\n\\nजिस प्रकार पशु में विवेक नहीं होता, वह सही-गलत का भेद नहीं कर सकता, उसी प्रकार विद्याहीन व्यक्ति में भी विवेक का अभाव होता है। पशु केवल खाना, पीना और सोना जानता है। विद्याहीन मनुष्य भी इन्हीं कार्यों तक सीमित रहता है।\\n\\nविद्या ही मनुष्य को पशु से भिन्न करती है। विद्या से ज्ञान मिलता है, ज्ञान से विवेक आता है और विवेक से मनुष्य उचित-अनुचित का निर्णय कर पाता है। विद्या मनुष्य को सभ्य, संस्कारी और समाज का उपयोगी सदस्य बनाती है।\\n\\nअतः प्रत्येक व्यक्ति को विद्या प्राप्त करने का भरसक प्रयास करना चाहिए। विद्या ही जीवन का वास्तविक धन है जो कभी नष्ट नहीं होता।","marks":3,"section":"खण्ड 'ब' उपखण्ड (क) - सूक्ति व्याख्या (3 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n'परोपकाराय सतां विभूतयः'","alternativeAnswer":"व्याख्या (120-150 शब्द):\\n\\nइस सूक्ति का अर्थ है कि सज्जनों की सम्पत्ति परोपकार के लिए होती है। यह सूक्ति भारतीय संस्कृति के उदात्त आदर्श को प्रस्तुत करती है।\\n\\nसज्जन पुरुष अपनी सम्पत्ति, शक्ति और योग्यता का उपयोग दूसरों की भलाई के लिए करते हैं। जिस प्रकार वृक्ष अपने फल स्वयं नहीं खाता बल्कि दूसरों को देता है, नदी अपना जल स्वयं नहीं पीती बल्कि सबकी प्यास बुझाती है, उसी प्रकार सज्जन पुरुष भी अपनी विभूतियों का उपयोग परोपकार में करते हैं।\\n\\nपरोपकार से बढ़कर कोई धर्म नहीं है। जो व्यक्ति दूसरों की सहायता करता है, वह समाज में सम्मान पाता है और मरने के बाद भी याद किया जाता है। अतः हमें भी सज्जनों के इस आदर्श का अनुसरण करना चाहिए और अपनी क्षमता के अनुसार परोपकार करना चाहिए।"}

श्लोक अर्थ (प्र.25) - VERY DETAILED ANSWER:
{"questionType":"written","questionText":"निम्नलिखित श्लोक का संस्कृत में अर्थ लिखिए:\\n\\nउत्तरं यत् समुद्रस्य हिमाद्रेश्चैव दक्षिणम्।\\nवर्षं तद् भारतं नाम भारती यत्र सन्ततिः॥","correctAnswer":"अर्थः (200-250 शब्द संस्कृत में):\\n\\nअस्य श्लोकस्य अर्थः अतीव गम्भीरः महत्त्वपूर्णः च अस्ति। अस्मिन् श्लोके भारतदेशस्य भौगोलिकस्थितेः वर्णनं कृतम् अस्ति।\\n\\nयः देशः समुद्रस्य उत्तरे स्थितः अस्ति तथा च हिमालयपर्वतस्य दक्षिणे स्थितः अस्ति, तस्य देशस्य नाम भारतम् इति अस्ति। अस्मिन् देशे भारतीयाः जनाः निवसन्ति ये भरतस्य सन्ततयः सन्ति।\\n\\nअयं देशः त्रिभिः समुद्रैः परिवेष्टितः अस्ति - पूर्वे बङ्गोपसागरः, पश्चिमे अरबसागरः, दक्षिणे हिन्दमहासागरः च। उत्तरस्यां दिशि हिमालयः पर्वतः स्थितः अस्ति यः विश्वस्य उच्चतमः पर्वतः अस्ति।\\n\\nअयं देशः अतीव सुन्दरः समृद्धः च अस्ति। अस्य देशस्य संस्कृतिः विश्वस्य प्राचीनतमा संस्कृतिः अस्ति। अत्र अनेके महापुरुषाः ऋषयः मुनयः च जाताः ये विश्वस्य कल्याणाय कार्यम् अकुर्वन्।\\n\\nअस्य देशस्य नाम भारतम् इति राजा भरतस्य नाम्ना प्रसिद्धम् अस्ति। वयं सर्वे भारतीयाः भरतस्य वंशजाः स्मः। अतः अस्माकं कर्तव्यम् अस्ति यत् वयं स्वदेशस्य गौरवं रक्षेम।","marks":4,"section":"खण्ड 'ब' उपखण्ड (क) - श्लोक अर्थ (4 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\nजननी जन्मभूमिश्च स्वर्गादपि गरीयसी।","alternativeAnswer":"अर्थः (200-250 शब्द संस्कृत में):\\n\\nअस्य श्लोकस्य अर्थः अस्ति यत् जननी (माता) जन्मभूमिः (मातृभूमिः) च स्वर्गात् अपि श्रेष्ठा अस्ति। अयं श्लोकः वाल्मीकिरामायणात् उद्धृतः अस्ति।\\n\\nमाता अस्माकं जन्मदात्री अस्ति। सा अस्मान् नवमासपर्यन्तं स्वगर्भे धारयति। जन्मानन्तरं सा अस्माकं पालनं पोषणं च करोति। माता अस्मभ्यं प्रथमं शिक्षां ददाति। अतः माता स्वर्गात् अपि श्रेष्ठा अस्ति।\\n\\nजन्मभूमिः अपि मातृसमाना अस्ति। अस्याः भूमेः जलं वायुं अन्नं च खादित्वा वयं वर्धामहे। इयं भूमिः अस्माकं पालनं करोति। अतः जन्मभूमिः अपि स्वर्गात् श्रेष्ठा अस्ति।\\n\\nस्वर्गे सुखं भवति इति कथ्यते परन्तु माता जन्मभूमिः च तस्मात् अपि अधिकं सुखं ददाति। अतः वयं मातरं जन्मभूमिं च सदा आदरेण पूजयेम।"}

चरित्र-चित्रण (प्र.26) - VERY DETAILED ANSWER:
{"questionType":"written","questionText":"'कालिदासः' अथवा 'भर्तृहरिः' का चरित्र-चित्रण संस्कृत में कीजिए।","correctAnswer":"कालिदासस्य चरित्र-चित्रणम् (200-250 शब्द संस्कृत में):\\n\\nकालिदासः संस्कृतसाहित्यस्य सर्वश्रेष्ठः कविः आसीत्। सः भारतीयसाहित्यस्य गौरवम् अस्ति। तस्य जन्म उज्जयिन्यां अभवत् इति केचन विद्वांसः मन्यन्ते।\\n\\nकालिदासः विक्रमादित्यस्य राज्ञः सभायां नवरत्नेषु प्रमुखः आसीत्। सः राज्ञः प्रियः कविः आसीत्। तस्य काव्यप्रतिभा अद्वितीया आसीत्।\\n\\nतस्य प्रमुखाः रचनाः एवं सन्ति - नाटकेषु अभिज्ञानशाकुन्तलम्, विक्रमोर्वशीयम्, मालविकाग्निमित्रम् च प्रसिद्धानि सन्ति। महाकाव्येषु रघुवंशम् कुमारसम्भवम् च विश्वप्रसिद्धे स्तः। खण्डकाव्येषु मेघदूतम् ऋतुसंहारम् च अतीव सुन्दरे स्तः।\\n\\nतस्य काव्येषु प्रकृतेः अतीव सुन्दरं वर्णनम् अस्ति। सः प्रकृतेः सूक्ष्मनिरीक्षकः आसीत्। तस्य उपमाः विश्वप्रसिद्धाः सन्ति। अतः सः 'उपमा कालिदासस्य' इति उक्त्या प्रसिद्धः अस्ति।\\n\\nसः 'कविकुलगुरुः' इति नाम्ना अपि प्रसिद्धः अस्ति। तस्य रचनाः अद्यापि विश्वस्य अनेकासु भाषासु अनूदिताः सन्ति। जर्मनकविः गेटे अभिज्ञानशाकुन्तलं पठित्वा अतीव प्रभावितः अभवत्।\\n\\nएवं कालिदासः संस्कृतसाहित्यस्य अमूल्यं रत्नम् आसीत्।","marks":4,"section":"खण्ड 'ब' उपखण्ड (क) - चरित्र-चित्रण (4 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n'भर्तृहरिः' का चरित्र-चित्रण संस्कृत में कीजिए।","alternativeAnswer":"भर्तृहरेः चरित्र-चित्रणम् (200-250 शब्द संस्कृत में):\\n\\nभर्तृहरिः संस्कृतसाहित्यस्य महान् कविः नीतिकारः च आसीत्। सः उज्जयिन्याः राजा आसीत्। सः विक्रमादित्यस्य ज्येष्ठः भ्राता आसीत् इति केचन मन्यन्ते।\\n\\nभर्तृहरिः प्रारम्भे विलासी राजा आसीत्। परन्तु एकस्मिन् दिने तस्य पत्न्याः विश्वासघातं ज्ञात्वा सः वैराग्यं प्राप्तवान्। ततः सः राज्यं त्यक्त्वा संन्यासी अभवत्।\\n\\nतस्य त्रयः शतकाः अतीव प्रसिद्धाः सन्ति - नीतिशतकम्, शृङ्गारशतकम्, वैराग्यशतकम् च। नीतिशतके जीवनस्य व्यावहारिकज्ञानं वर्णितम् अस्ति। शृङ्गारशतके प्रेमस्य सौन्दर्यस्य च वर्णनम् अस्ति। वैराग्यशतके संसारस्य असारता मोक्षस्य महत्त्वं च वर्णितम् अस्ति।\\n\\nतस्य सूक्तयः अद्यापि लोकप्रियाः सन्ति। 'विद्या विहीनः पशुः', 'परोपकाराय सतां विभूतयः' इत्यादयः सूक्तयः तस्य एव सन्ति।\\n\\nएवं भर्तृहरिः महान् कविः दार्शनिकः च आसीत्।"}

विभक्ति/प्रत्यय (प्र.27) - DETAILED ANSWER:
{"questionType":"written","questionText":"(क) निम्नलिखित पदों में विभक्ति एवं वचन बताइए:\\n    (i) रामेण (ii) वनेषु (iii) बालकाय (iv) फलानि\\n\\n(ख) निम्नलिखित पदों में प्रत्यय बताइए:\\n    (i) गमनम् (ii) पठितवान् (iii) कर्तव्यम् (iv) लेखकः","correctAnswer":"(क) विभक्ति एवं वचन (विस्तृत उत्तर):\\n\\n(i) रामेण - तृतीया विभक्ति, एकवचन\\n    व्याख्या: 'राम' शब्द अकारान्त पुल्लिंग है। तृतीया विभक्ति में एकवचन का रूप 'रामेण' होता है। तृतीया विभक्ति करण कारक (साधन) के लिए प्रयुक्त होती है।\\n\\n(ii) वनेषु - सप्तमी विभक्ति, बहुवचन\\n    व्याख्या: 'वन' शब्द अकारान्त नपुंसकलिंग है। सप्तमी विभक्ति में बहुवचन का रूप 'वनेषु' होता है। सप्तमी विभक्ति अधिकरण कारक (स्थान) के लिए प्रयुक्त होती है।\\n\\n(iii) बालकाय - चतुर्थी विभक्ति, एकवचन\\n    व्याख्या: 'बालक' शब्द अकारान्त पुल्लिंग है। चतुर्थी विभक्ति में एकवचन का रूप 'बालकाय' होता है। चतुर्थी विभक्ति सम्प्रदान कारक (जिसके लिए) के लिए प्रयुक्त होती है।\\n\\n(iv) फलानि - प्रथमा/द्वितीया विभक्ति, बहुवचन\\n    व्याख्या: 'फल' शब्द अकारान्त नपुंसकलिंग है। प्रथमा एवं द्वितीया विभक्ति में बहुवचन का रूप 'फलानि' होता है।\\n\\n(ख) प्रत्यय (विस्तृत उत्तर):\\n\\n(i) गमनम् - ल्युट् (अन) प्रत्यय\\n    व्याख्या: गम् धातु + ल्युट् प्रत्यय = गमनम्। ल्युट् प्रत्यय भाववाचक संज्ञा बनाने के लिए प्रयुक्त होता है।\\n\\n(ii) पठितवान् - क्तवतु प्रत्यय\\n    व्याख्या: पठ् धातु + क्तवतु प्रत्यय = पठितवान्। क्तवतु प्रत्यय भूतकाल में कर्ता के लिए प्रयुक्त होता है।\\n\\n(iii) कर्तव्यम् - तव्यत् प्रत्यय\\n    व्याख्या: कृ धातु + तव्यत् प्रत्यय = कर्तव्यम्। तव्यत् प्रत्यय 'करने योग्य' अर्थ में प्रयुक्त होता है।\\n\\n(iv) लेखकः - ण्वुल् (अक) प्रत्यय\\n    व्याख्या: लिख् धातु + ण्वुल् प्रत्यय = लेखकः। ण्वुल् प्रत्यय कर्तृवाचक संज्ञा बनाने के लिए प्रयुक्त होता है।","marks":4,"section":"खण्ड 'ब' उपखण्ड (ख) - विभक्ति/प्रत्यय (2+2=4 अंक)"}

वाच्य परिवर्तन (प्र.28) - DETAILED ANSWER:
{"questionType":"written","questionText":"निम्नलिखित वाक्यों का वाच्य परिवर्तन कीजिए:\\n\\n(i) रामः पुस्तकं पठति। (कर्मवाच्य में)\\n(ii) बालकः गच्छति। (भाववाच्य में)\\n(iii) सीता गीतं गायति। (कर्मवाच्य में)","correctAnswer":"वाच्य परिवर्तन (विस्तृत उत्तर 120-150 शब्द):\\n\\n(i) कर्तृवाच्य: रामः पुस्तकं पठति।\\n    कर्मवाच्य: रामेण पुस्तकं पठ्यते।\\n    व्याख्या: कर्मवाच्य में कर्ता (राम) तृतीया विभक्ति में होता है (रामेण), कर्म (पुस्तकम्) प्रथमा में रहता है, और क्रिया आत्मनेपद में होती है (पठ्यते)।\\n\\n(ii) कर्तृवाच्य: बालकः गच्छति।\\n    भाववाच्य: बालकेन गम्यते।\\n    व्याख्या: भाववाच्य में कर्ता तृतीया विभक्ति में होता है (बालकेन), क्रिया प्रथम पुरुष एकवचन आत्मनेपद में होती है (गम्यते)। भाववाच्य अकर्मक क्रियाओं के साथ प्रयुक्त होता है।\\n\\n(iii) कर्तृवाच्य: सीता गीतं गायति।\\n    कर्मवाच्य: सीतया गीतं गीयते।\\n    व्याख्या: कर्मवाच्य में कर्ता (सीता) तृतीया विभक्ति में होता है (सीतया - स्त्रीलिंग), कर्म (गीतम्) प्रथमा में रहता है, और क्रिया आत्मनेपद में होती है (गीयते)।\\n\\nनियम: कर्मवाच्य में कर्ता तृतीया में, कर्म प्रथमा में, क्रिया आत्मनेपद में होती है।","marks":3,"section":"खण्ड 'ब' उपखण्ड (ख) - वाच्य परिवर्तन (3 अंक)"}

हिन्दी से संस्कृत अनुवाद (प्र.29) - DETAILED ANSWER:
{"questionType":"written","questionText":"निम्नलिखित वाक्यों का संस्कृत में अनुवाद कीजिए:\\n\\n(i) राम वन में जाता है।\\n(ii) छात्र पुस्तक पढ़ते हैं।\\n(iii) गंगा पवित्र नदी है।","correctAnswer":"संस्कृत अनुवाद (विस्तृत उत्तर):\\n\\n(i) हिन्दी: राम वन में जाता है।\\n    संस्कृत: रामः वनं गच्छति।\\n    व्याख्या: 'राम' कर्ता है अतः प्रथमा विभक्ति (रामः)। 'वन में' कर्म है अतः द्वितीया विभक्ति (वनम्)। 'जाता है' क्रिया है - गम् धातु लट् लकार प्रथम पुरुष एकवचन (गच्छति)।\\n\\n(ii) हिन्दी: छात्र पुस्तक पढ़ते हैं।\\n    संस्कृत: छात्राः पुस्तकं पठन्ति।\\n    व्याख्या: 'छात्र' बहुवचन कर्ता है अतः प्रथमा बहुवचन (छात्राः)। 'पुस्तक' कर्म है अतः द्वितीया एकवचन (पुस्तकम्)। 'पढ़ते हैं' क्रिया है - पठ् धातु लट् लकार प्रथम पुरुष बहुवचन (पठन्ति)।\\n\\n(iii) हिन्दी: गंगा पवित्र नदी है।\\n    संस्कृत: गङ्गा पवित्रा नदी अस्ति।\\n    व्याख्या: 'गंगा' कर्ता है अतः प्रथमा (गङ्गा)। 'पवित्र' विशेषण है - स्त्रीलिंग में 'पवित्रा'। 'नदी' विधेय है अतः प्रथमा (नदी)। 'है' क्रिया है - अस् धातु लट् लकार प्रथम पुरुष एकवचन (अस्ति)।\\n\\nअनुवाद के नियम: कर्ता प्रथमा में, कर्म द्वितीया में, क्रिया कर्ता के अनुसार पुरुष-वचन में होती है।","marks":6,"section":"खण्ड 'ब' उपखण्ड (ख) - हिन्दी से संस्कृत अनुवाद (3×2=6 अंक)"}

निबन्ध (प्र.30) - VERY DETAILED ANSWER (500-600 शब्द):
{"questionType":"written","questionText":"निम्नलिखित विषयों में से किसी एक पर संस्कृत में निबन्ध लिखिए:\\n\\n(i) मम विद्यालयः\\n(ii) संस्कृतभाषायाः महत्त्वम्\\n(iii) पर्यावरणम्\\n(iv) स्वास्थ्यम्\\n(v) राष्ट्रप्रेमः","correctAnswer":"मम विद्यालयः (500-600 शब्द संस्कृत में)\\n\\nप्रस्तावना:\\nविद्यालयः विद्यायाः आलयः भवति। विद्यालयः छात्राणां द्वितीयं गृहम् इव अस्ति। अत्र छात्राः ज्ञानं प्राप्नुवन्ति संस्कारान् च अधिगच्छन्ति। मम विद्यालयः मम जीवने अतीव महत्त्वपूर्णः अस्ति।\\n\\nविद्यालयस्य परिचयः:\\nमम विद्यालयस्य नाम राजकीय इण्टर कॉलेज इति अस्ति। अयं विद्यालयः नगरस्य मध्ये स्थितः अस्ति। अस्य विद्यालयस्य स्थापना स्वातन्त्र्यात् पूर्वम् एव अभवत्। अतः अयं विद्यालयः अतीव प्राचीनः प्रतिष्ठितः च अस्ति।\\n\\nविद्यालयस्य भवनम्:\\nअस्य विद्यालयस्य भवनं बृहत् सुन्दरं च अस्ति। भवने त्रयः तलाः सन्ति। अस्मिन् विद्यालये त्रिंशत् कक्षाः सन्ति। प्रत्येका कक्षा विशाला वातायनयुक्ता च अस्ति। कक्षासु श्यामपट्टाः आसन्दिकाः च सन्ति। विद्यालये एकं विशालं सभागारम् अपि अस्ति यत्र वार्षिकोत्सवः अन्ये च कार्यक्रमाः भवन्ति।\\n\\nअध्यापकाः छात्राः च:\\nअस्मिन् विद्यालये पञ्चाशत् अध्यापकाः सन्ति। ते सर्वे विद्वांसः अनुभविनः च सन्ति। ते छात्रान् स्नेहेन पाठयन्ति। अस्य विद्यालयस्य प्रधानाचार्यः अतीव योग्यः अनुशासनप्रियः च अस्ति। सः छात्राणां कल्याणाय सदा चिन्तयति। विद्यालये सहस्रं छात्राः पठन्ति। ते सर्वे अनुशासनप्रियाः परिश्रमिणः च सन्ति।\\n\\nपुस्तकालयः प्रयोगशाला च:\\nविद्यालये एकं विशालं पुस्तकालयम् अस्ति। तत्र दशसहस्राणि पुस्तकानि सन्ति। छात्राः तत्र गत्वा पुस्तकानि पठन्ति। विद्यालये विज्ञानप्रयोगशाला गणकयन्त्रप्रयोगशाला च अपि स्तः। तत्र छात्राः प्रयोगान् कुर्वन्ति।\\n\\nक्रीडाङ्गणम् उद्यानं च:\\nविद्यालयस्य प्राङ्गणं विशालम् अस्ति। तत्र छात्राः क्रीडन्ति। क्रिकेट्-क्रीडा फुटबॉल-क्रीडा बैडमिण्टन-क्रीडा च अत्र भवन्ति। विद्यालये एकं सुन्दरम् उद्यानम् अपि अस्ति। तत्र विविधानि पुष्पाणि विकसन्ति। उद्याने वृक्षाः अपि सन्ति ये छायां प्रददति।\\n\\nअनुशासनम्:\\nअस्मिन् विद्यालये अनुशासनं कठोरम् अस्ति। छात्राः नियमान् पालयन्ति। ते प्रातःकाले समये विद्यालयम् आगच्छन्ति। प्रार्थनायाः अनन्तरं कक्षाः आरभन्ते। छात्राः गणवेशं धारयन्ति। ते परस्परं सम्मानेन व्यवहरन्ति।\\n\\nउपसंहारः:\\nअहं मम विद्यालयं प्रति गर्वम् अनुभवामि। अयं विद्यालयः मम द्वितीयं गृहम् इव अस्ति। अत्र अहं ज्ञानं संस्कारान् च प्राप्नोमि। अस्य विद्यालयस्य यशः सर्वत्र प्रसृतम् अस्ति। अहं सदा अस्य विद्यालयस्य गौरवं वर्धयितुम् इच्छामि।","marks":8,"section":"खण्ड 'ब' उपखण्ड (ख) - निबन्ध (8 अंक)"}

पद प्रयोग (प्र.31) - DETAILED ANSWER:
{"questionType":"written","questionText":"निम्नलिखित पदों का वाक्यों में प्रयोग कीजिए:\\n\\n(i) गच्छति (ii) पठन्ति (iii) अस्ति (iv) सन्ति","correctAnswer":"पद प्रयोग (विस्तृत उत्तर):\\n\\n(i) गच्छति (जाता है/जाती है - एकवचन):\\n    वाक्य: बालकः विद्यालयं गच्छति।\\n    अर्थ: बालक विद्यालय जाता है।\\n    व्याख्या: 'गच्छति' गम् धातु का लट् लकार प्रथम पुरुष एकवचन रूप है। यह एकवचन कर्ता के साथ प्रयुक्त होता है।\\n\\n(ii) पठन्ति (पढ़ते हैं/पढ़ती हैं - बहुवचन):\\n    वाक्य: छात्राः पुस्तकानि पठन्ति।\\n    अर्थ: छात्र पुस्तकें पढ़ते हैं।\\n    व्याख्या: 'पठन्ति' पठ् धातु का लट् लकार प्रथम पुरुष बहुवचन रूप है। यह बहुवचन कर्ता के साथ प्रयुक्त होता है।\\n\\n(iii) अस्ति (है - एकवचन):\\n    वाक्य: गङ्गा पवित्रा नदी अस्ति।\\n    अर्थ: गंगा पवित्र नदी है।\\n    व्याख्या: 'अस्ति' अस् धातु का लट् लकार प्रथम पुरुष एकवचन रूप है। यह 'होना' अर्थ में एकवचन कर्ता के साथ प्रयुक्त होता है।\\n\\n(iv) सन्ति (हैं - बहुवचन):\\n    वाक्य: वने अनेके वृक्षाः सन्ति।\\n    अर्थ: वन में अनेक वृक्ष हैं।\\n    व्याख्या: 'सन्ति' अस् धातु का लट् लकार प्रथम पुरुष बहुवचन रूप है। यह 'होना' अर्थ में बहुवचन कर्ता के साथ प्रयुक्त होता है।","marks":4,"section":"खण्ड 'ब' उपखण्ड (ख) - पद प्रयोग (2×2=4 अंक)"}

STRICT RULES:
1. EXACTLY 31 questions (20 MCQ + 11 descriptive)
2. ALL questions in Sanskrit/Hindi - Devanagari script
3. MCQ options format: (A), (B), (C), (D)
4. प्र.21-26 MUST have hasAlternative, alternativeQuestion, alternativeAnswer
5. गद्यांश अनुवाद: सन्दर्भ (50 शब्द) + हिन्दी अनुवाद (150-200 शब्द) = 200-250 शब्द TOTAL
6. पाठ सारांश: संस्कृत में (200-250 शब्द) - विस्तृत
7. श्लोक व्याख्या: सन्दर्भ (50 शब्द) + हिन्दी व्याख्या (150-200 शब्द) = 200-250 शब्द TOTAL
8. सूक्ति व्याख्या: हिन्दी में (120-150 शब्द) - विस्तृत
9. श्लोक अर्थ: संस्कृत में (200-250 शब्द) - विस्तृत
10. चरित्र-चित्रण: संस्कृत में (200-250 शब्द) - विस्तृत
11. निबन्ध: संस्कृत में (500-600 शब्द) - बहुत विस्तृत, अनुच्छेदों में विभाजित
12. विभक्ति/प्रत्यय: प्रत्येक उत्तर के साथ व्याख्या
13. वाच्य परिवर्तन: प्रत्येक उत्तर के साथ नियम की व्याख्या
14. अनुवाद: प्रत्येक वाक्य का संस्कृत अनुवाद + व्याकरणिक व्याख्या
15. पद प्रयोग: प्रत्येक पद का वाक्य + अर्थ + व्याख्या

IMPORTANT: ALL ANSWERS MUST BE VERY LONG AND DETAILED AS SHOWN IN EXAMPLES ABOVE.

Return ONLY valid JSON array with exactly 31 questions. No markdown, no explanation.`;
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

// Extract questions from uploaded image(s) - supports multiple images
const extractQuestionsFromImage = async (
  imagesData, // Array of {base64Data, mimeType} or single object for backward compatibility
  maxMarks,
  marksDistribution = "",
  additionalInstructions = "",
  language = "english",
  examFormat = "general",
  difficulty = "medium"
) => {
  return await executeWithFallback(async () => {
    const model = await getGeminiModel("gemini-3-flash-preview");

    const languageInstructions = {
      english: "",
      hindi: "\n\nGenerate ALL content in Hindi (हिंदी). Use Devanagari script.",
      bilingual: "\n\nGenerate in BILINGUAL format: Hindi first, then English. Example: 'हिंदी प्रश्न / English question'",
      sanskrit: "\n\nGenerate ALL content in Sanskrit (संस्कृत). Use Devanagari script.",
    };

    const difficultyInstructions = {
      easy: `
DIFFICULTY: EASY - Board exam level questions
- Direct NCERT/textbook questions, definitions, basic recall
- Simple MCQs with clear correct answer
- Written: definitions, list points, simple explanations`,
      medium: `
DIFFICULTY: MEDIUM - Competitive exam level
- Application-based, understanding required
- Tricky MCQs, some calculations needed
- Written: explain with examples, compare/contrast, numerical problems`,
      hard: `
DIFFICULTY: HARD - JEE/NEET/Olympiad level
- Complex scenarios, multiple concepts combined
- Assertion-reason MCQs, multi-step numerical
- Written: derivations, prove statements, HOTS questions, case studies`
    };

    const languageNote = languageInstructions[language] || "";
    const difficultyNote = difficultyInstructions[difficulty] || difficultyInstructions.medium;

    let prompt;
    
    if (examFormat === "upboard_science") {
      prompt = `You are extracting questions from image(s) to create UP BOARD CLASS 10 SCIENCE PAPER.

IMPORTANT: You must ONLY extract questions that are VISIBLE in the images. Do NOT generate new questions. 
If the images show a specific topic/chapter, extract questions ONLY from what is written in the images.

${difficultyNote}

FIXED STRUCTURE (31 questions = 70 marks):
- Q1-Q7: MCQs, section "खण्ड-अ (Part-A) उप-भाग-I (1 अंक)"
- Q8-Q13: MCQs, section "खण्ड-अ (Part-A) उप-भाग-II (1 अंक)"  
- Q14-Q20: MCQs, section "खण्ड-अ (Part-A) उप-भाग-III (1 अंक)"
- Q21-Q24: Written 4 marks, section "खण्ड-ब (Part-B) उप-भाग-I (2+2=4 अंक)"
- Q25-Q28: Written 4 marks, section "खण्ड-ब (Part-B) उप-भाग-II (4 अंक)"
- Q29-Q31: Written 6 marks with OR, section "खण्ड-ब (Part-B) उप-भाग-III (6 अंक)"

CRITICAL JSON FORMAT - USE EXACTLY THESE FIELD NAMES:
For MCQ:
{
  "questionText": "हिंदी प्रश्न / English question?",
  "questionType": "mcq",
  "options": ["विकल्प A / Option A", "विकल्प B / Option B", "विकल्प C / Option C", "विकल्प D / Option D"],
  "correctOption": 0,
  "marks": 1,
  "section": "खण्ड-अ (Part-A) उप-भाग-I (1 अंक)"
}

For Written (4 marks):
{
  "questionText": "हिंदी प्रश्न / English question",
  "questionType": "written",
  "correctAnswer": "विस्तृत उत्तर 300-400 शब्दों में / Detailed answer in 300-400 words with key points, examples, diagrams description",
  "marks": 4,
  "section": "खण्ड-ब (Part-B) उप-भाग-II (4 अंक)"
}

For Written (6 marks with OR):
{
  "questionText": "हिंदी प्रश्न / English question",
  "questionType": "written",
  "correctAnswer": "बहुत विस्तृत उत्तर 600-800 शब्दों में / Very detailed answer in 600-800 words",
  "marks": 6,
  "section": "खण्ड-ब (Part-B) उप-भाग-III (6 अंक)",
  "hasAlternative": true,
  "alternativeQuestion": "अथवा / OR: वैकल्पिक प्रश्न",
  "alternativeAnswer": "वैकल्पिक उत्तर 600-800 शब्द"
}

STRICT RULES:
1. EXTRACT questions ONLY from what is visible in the images - DO NOT create new questions
2. If images show questions, extract them exactly as shown
3. ALL questions must be BILINGUAL: "हिंदी / English"
4. MUST include "section" field for EVERY question
5. MUST provide detailed "correctAnswer" for written questions (NOT "Answer not provided")
6. For 4-mark: Answer should be 300-400 words with key points
7. For 6-mark: Answer should be 600-800 words with introduction, explanation, examples, conclusion
8. Q29-31 MUST have hasAlternative, alternativeQuestion, alternativeAnswer
9. Use Unicode subscripts: H₂O, CO₂, CH₄

Return ONLY valid JSON array. No markdown, no explanation.`;
    } else if (examFormat === "upboard_english") {
      prompt = `Extract questions from images for UP BOARD CLASS 10 ENGLISH PAPER - 70 marks, 31 questions.

EXTRACT ONLY what is visible in images. Do NOT generate new questions.

STRUCTURE: 20 MCQs (1 mark) + 11 descriptive (50 marks)
- Q21: Reading passage 250+ words (8 marks)
- Q22: Letter with OR (4 marks) - FULL FORMAT
- Q23: Article/Essay with OR (6 marks) - 250+ words
- Q24-27: Grammar (2 marks each)
- Q28-31: Literature with OR (6 marks each) - 200+ words

JSON FORMAT:
MCQ: {"questionType":"mcq","questionText":"Q?","options":["A","B","C","D"],"correctOption":0,"marks":1,"section":"PART-A (MCQ) - 1 mark"}

Written: {"questionType":"written","questionText":"Q","correctAnswer":"[detailed answer]","marks":X,"section":"PART-B (Section) - X marks"}

With OR: Add "hasAlternative":true,"alternativeQuestion":"OR: ...","alternativeAnswer":"..."

RULES:
1. Extract from images only
2. 31 questions total
3. English only
4. Long answers for 4+ marks

Return ONLY valid JSON array.`;
    } else if (examFormat === "upboard_hindi") {
      prompt = `Extract questions from images for UP BOARD CLASS 10 HINDI PAPER (हिन्दी) - 70 marks, 30 questions.
Paper Code: 801(BA)

EXTRACT ONLY what is visible in images. Do NOT generate new questions.

STRUCTURE (30 questions = 70 marks):
खण्ड 'अ': प्र.1-20 MCQs (1 अंक प्रत्येक) = 20 अंक
खण्ड 'ब':
- प्र.21: गद्यांश (3×2=6 अंक) - अथवा सहित - 300-400 शब्द (लगभग 1 पेज)
- प्र.22: पद्यांश (3×2=6 अंक) - अथवा सहित - 16-24 पंक्तियाँ (लगभग 1 पेज)
- प्र.23: संस्कृत गद्यांश अनुवाद (2+3=5 अंक) - अथवा सहित
- प्र.24: संस्कृत पद्यांश अनुवाद (2+3=5 अंक) - अथवा सहित
- प्र.25: खण्डकाव्य (1×3=3 अंक) - 100-150 शब्द उत्तर
- प्र.26: लेखक/कवि परिचय (5+5=10 अंक) - प्रत्येक 200-250 शब्द
- प्र.27: कण्ठस्थ श्लोक (2 अंक)
- प्र.28: पत्र लेखन (4 अंक) - अथवा सहित - 250-300 शब्द उत्तर
- प्र.29: संस्कृत प्रश्न (1+1=2 अंक)
- प्र.30: निबन्ध (1×7=7 अंक) - 700-900 शब्द (लगभग 2 पेज)

=== ANSWER LENGTH PROPORTIONAL TO MARKS ===
- 7 अंक (निबन्ध): 700-900 शब्द (2 पेज)
- 6 अंक (गद्यांश/पद्यांश): प्रत्येक उप-भाग 80-100 शब्द
- 5 अंक (संस्कृत अनुवाद/लेखक/कवि): 150-200 शब्द
- 4 अंक (पत्र): 250-300 शब्द (पूर्ण पत्र)
- 3 अंक (खण्डकाव्य): 100-150 शब्द
- 2 अंक (श्लोक): श्लोक + अर्थ 40-50 शब्द
- 1 अंक (MCQ): केवल सही विकल्प

JSON FORMAT:
MCQ: {"questionType":"mcq","questionText":"प्रश्न?","options":["(A) विकल्प","(B) विकल्प","(C) विकल्प","(D) विकल्प"],"correctOption":0,"marks":1,"section":"खण्ड 'अ' (बहुविकल्पीय प्रश्न) - 1 अंक"}

गद्यांश/पद्यांश: {"questionType":"written","questionText":"[गद्यांश 300-400 शब्द / पद्यांश 16-24 पंक्तियाँ - पूरा passage यहाँ]\\n\\n(i) सन्दर्भ लिखिए।\\n(ii) [व्याख्या/प्रश्न]\\n(iii) [प्रश्न/व्याख्या]","correctAnswer":"(i) सन्दर्भ: [80-100 शब्द]\\n\\n(ii) उत्तर: [80-100 शब्द]\\n\\n(iii) उत्तर: [80-100 शब्द]","marks":6,"section":"खण्ड 'ब' (गद्यांश) - 3×2=6 अंक","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा गद्यांश/पद्यांश + 3 उप-प्रश्न]","alternativeAnswer":"(i) सन्दर्भ...\\n(ii) उत्तर...\\n(iii) उत्तर..."}

पत्र: {"questionType":"written","questionText":"पत्र लिखिए जिसमें निम्नलिखित बिंदुओं का समावेश हो:\\n- [बिंदु 1]\\n- [बिंदु 2]\\n- [बिंदु 3]\\n- [बिंदु 4]\\n- [बिंदु 5]","correctAnswer":"[पता]\\n[दिनांक]\\n\\n[संबोधन]\\n[विषय]\\n\\n[प्रथम अनुच्छेद - 50-60 शब्द]\\n\\n[द्वितीय अनुच्छेद - 100-120 शब्द]\\n\\n[तृतीय अनुच्छेद - 50-60 शब्द]\\n\\n[समापन]\\n[हस्ताक्षर]\\n(कुल 250-300 शब्द)","marks":4,"section":"खण्ड 'ब' (पत्र लेखन) - 4 अंक","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा पत्र विषय + बिंदु]","alternativeAnswer":"[पूर्ण पत्र 250-300 शब्द]"}

खण्डकाव्य: {"questionType":"written","questionText":"खण्डकाव्य प्रश्न...","correctAnswer":"[100-150 शब्द विस्तृत उत्तर]","marks":3,"section":"खण्ड 'ब' (खण्डकाव्य) - 1×3=3 अंक"}

लेखक/कवि: {"questionType":"written","questionText":"(क) लेखक परिचय...\\n(ख) कवि परिचय...","correctAnswer":"(क) [200-250 शब्द]\\n(ख) [200-250 शब्द]","marks":10,"section":"खण्ड 'ब' (लेखक/कवि परिचय) - 5+5=10 अंक"}

निबन्ध: {"questionType":"written","questionText":"निबन्ध लिखिए...","correctAnswer":"[शीर्षक]\\n\\nभूमिका: [80-100 शब्द]\\n\\nमुख्य भाग:\\n1. [150-180 शब्द]\\n2. [150-180 शब्द]\\n3. [150-180 शब्द]\\n\\nउपसंहार: [80-100 शब्द]\\n\\n(कुल 700-900 शब्द - लगभग 2 पेज)","marks":7,"section":"खण्ड 'ब' (निबन्ध) - 1×7=7 अंक"}

Written: {"questionType":"written","questionText":"प्रश्न","correctAnswer":"[विस्तृत उत्तर]","marks":X,"section":"खण्ड 'ब' (विभाग) - X अंक"}

STRICT RULES:
1. Extract from images only - DO NOT generate new questions
2. 30 questions total (20 MCQ + 10 descriptive)
3. Hindi only (Devanagari script)
4. प्र.21-24, प्र.28 need hasAlternative, alternativeQuestion, alternativeAnswer
5. MCQ options: (A), (B), (C), (D) format
6. गद्यांश: प्रश्न में पूरा गद्यांश (300-400 शब्द - 1 पेज), उत्तर प्रत्येक भाग 50-80 शब्द
7. पद्यांश: प्रश्न में पूरा पद्यांश (16-24 पंक्तियाँ - 1 पेज), उत्तर प्रत्येक भाग 50-80 शब्द
8. पत्र: प्रश्न में बिंदु दें, उत्तर में पूर्ण पत्र (250-300 शब्द)
9. निबन्ध: उत्तर 700-900 शब्द (2 पेज)
10. खण्डकाव्य: उत्तर 100-150 शब्द

Return ONLY valid JSON array.`;
    } else if (examFormat === "upboard_sanskrit") {
      prompt = `Extract questions from images for UP BOARD CLASS 10 SANSKRIT PAPER (संस्कृत) - 70 marks, 31 questions.
Paper Code: 818(BP)

EXTRACT ONLY what is visible in images. Do NOT generate new questions.

STRUCTURE (31 questions = 70 marks):
खण्ड 'अ' (बहुविकल्पीय प्रश्न) - 20 अंक:
- उपखण्ड (क): गद्यांश आधारित MCQs (प्र.1-6) × 1 अंक = 6 अंक
- उपखण्ड (ख): व्याकरण MCQs (प्र.7-20) × 1 अंक = 14 अंक

खण्ड 'ब' (वर्णनात्मक प्रश्न) - 50 अंक:
- प्र.21: गद्यांश अनुवाद (4 अंक) - अथवा सहित
- प्र.22: पाठ सारांश (4 अंक) - अथवा सहित
- प्र.23: श्लोक व्याख्या (4 अंक) - अथवा सहित
- प्र.24: सूक्ति व्याख्या (3 अंक) - अथवा सहित
- प्र.25: श्लोक अर्थ (4 अंक) - अथवा सहित
- प्र.26: चरित्र-चित्रण (4 अंक) - अथवा सहित
- प्र.27: विभक्ति (2 अंक) + प्रत्यय (2 अंक) = 4 अंक
- प्र.28: वाच्य परिवर्तन (3 अंक)
- प्र.29: हिन्दी से संस्कृत अनुवाद (3×2=6 अंक)
- प्र.30: निबन्ध (8 अंक)
- प्र.31: पद प्रयोग (2×2=4 अंक)

=== ANSWER LENGTH - VERY DETAILED AND LONG ===
- 8 अंक (निबन्ध): 500-600 शब्द (संस्कृत में) - बहुत विस्तृत
- 6 अंक (अनुवाद): प्रत्येक वाक्य 25-35 शब्द विस्तृत व्याख्या सहित
- 4 अंक (गद्यांश/श्लोक/सारांश/चरित्र): 200-250 शब्द - सन्दर्भ 50 शब्द + अनुवाद/व्याख्या 150-200 शब्द
- 3 अंक (सूक्ति/वाच्य): 120-150 शब्द विस्तृत
- 2 अंक (विभक्ति/प्रत्यय/पद प्रयोग): 50-70 शब्द
- 1 अंक (MCQ): केवल सही विकल्प

JSON FORMAT:
MCQ: {"questionType":"mcq","questionText":"प्रश्न?","options":["(A) विकल्प","(B) विकल्प","(C) विकल्प","(D) विकल्प"],"correctOption":0,"marks":1,"section":"खण्ड 'अ' उपखण्ड (क/ख) - 1 अंक"}

गद्यांश अनुवाद (प्र.21): {"questionType":"written","questionText":"[संस्कृत गद्यांश]","correctAnswer":"सन्दर्भ (50 शब्द):\\n[पाठ का नाम, विषय, महत्त्व का विस्तृत वर्णन]\\n\\nअनुवाद (150 शब्द):\\n[विस्तृत हिन्दी अनुवाद - प्रत्येक वाक्य का अर्थ, व्याख्या, सन्दर्भ]","marks":4,"section":"खण्ड 'ब' उपखण्ड (क) - गद्यांश अनुवाद (4 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा गद्यांश]","alternativeAnswer":"सन्दर्भ (50 शब्द):...\\n\\nअनुवाद (150 शब्द):..."}

पाठ सारांश (प्र.22): {"questionType":"written","questionText":"पाठ का सारांश संस्कृत में लिखिए।","correctAnswer":"[संस्कृत में विस्तृत सारांश 200-250 शब्द - पाठ का परिचय, मुख्य विषय, पात्र, घटनाएं, शिक्षा]","marks":4,"section":"खण्ड 'ब' उपखण्ड (क) - पाठ सारांश (4 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा...","alternativeAnswer":"[संस्कृत में सारांश 200-250 शब्द]"}

श्लोक व्याख्या (प्र.23): {"questionType":"written","questionText":"[श्लोक]","correctAnswer":"सन्दर्भ (50 शब्द):\\n[पाठ, कवि, विषय, महत्त्व]\\n\\nव्याख्या (150-200 शब्द):\\n[शब्दार्थ, भावार्थ, विस्तृत व्याख्या, जीवन में उपयोगिता]","marks":4,"section":"खण्ड 'ब' उपखण्ड (क) - श्लोक व्याख्या (4 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा श्लोक]","alternativeAnswer":"सन्दर्भ:...\\n\\nव्याख्या:..."}

सूक्ति व्याख्या (प्र.24): {"questionType":"written","questionText":"[सूक्ति]","correctAnswer":"व्याख्या (120-150 शब्द):\\n[शाब्दिक अर्थ, स्रोत, विस्तृत व्याख्या, उदाहरण, जीवन में महत्त्व]","marks":3,"section":"खण्ड 'ब' उपखण्ड (क) - सूक्ति व्याख्या (3 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरी सूक्ति]","alternativeAnswer":"व्याख्या (120-150 शब्द):..."}

श्लोक अर्थ (प्र.25): {"questionType":"written","questionText":"[श्लोक]","correctAnswer":"अर्थः (200-250 शब्द संस्कृत में):\\n[श्लोक का विस्तृत संस्कृत अर्थ - प्रत्येक पद का अर्थ, भाव, सन्देश]","marks":4,"section":"खण्ड 'ब' उपखण्ड (क) - श्लोक अर्थ (4 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा श्लोक]","alternativeAnswer":"अर्थः (200-250 शब्द संस्कृत में):..."}

चरित्र-चित्रण (प्र.26): {"questionType":"written","questionText":"चरित्र-चित्रण संस्कृत में कीजिए।","correctAnswer":"चरित्र-चित्रणम् (200-250 शब्द संस्कृत में):\\n[जन्म, जीवन, गुण, कार्य, रचनाएं, महत्त्व, उपसंहार]","marks":4,"section":"खण्ड 'ब' उपखण्ड (क) - चरित्र-चित्रण (4 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा...","alternativeAnswer":"[संस्कृत में चरित्र-चित्रण 200-250 शब्द]"}

विभक्ति/प्रत्यय (प्र.27): {"questionType":"written","questionText":"(क) विभक्ति बताइए...\\n(ख) प्रत्यय बताइए...","correctAnswer":"(क) विभक्ति एवं वचन (विस्तृत):\\n[प्रत्येक पद - विभक्ति, वचन, व्याख्या]\\n\\n(ख) प्रत्यय (विस्तृत):\\n[प्रत्येक पद - धातु, प्रत्यय, व्याख्या]","marks":4,"section":"खण्ड 'ब' उपखण्ड (ख) - विभक्ति/प्रत्यय (2+2=4 अंक)"}

वाच्य परिवर्तन (प्र.28): {"questionType":"written","questionText":"वाच्य परिवर्तन कीजिए...","correctAnswer":"वाच्य परिवर्तन (120-150 शब्द):\\n[प्रत्येक वाक्य का परिवर्तन + नियम की व्याख्या]","marks":3,"section":"खण्ड 'ब' उपखण्ड (ख) - वाच्य परिवर्तन (3 अंक)"}

अनुवाद (प्र.29): {"questionType":"written","questionText":"हिन्दी से संस्कृत में अनुवाद कीजिए...","correctAnswer":"संस्कृत अनुवाद (विस्तृत):\\n[प्रत्येक वाक्य का संस्कृत अनुवाद + व्याकरणिक व्याख्या - कर्ता, कर्म, क्रिया]","marks":6,"section":"खण्ड 'ब' उपखण्ड (ख) - अनुवाद (3×2=6 अंक)"}

निबन्ध (प्र.30): {"questionType":"written","questionText":"संस्कृत में निबन्ध लिखिए...","correctAnswer":"[शीर्षक]\\n\\nप्रस्तावना: [80-100 शब्द]\\n\\nविद्यालयस्य परिचयः/मुख्य भाग: [150-180 शब्द]\\n\\n[अन्य बिंदु]: [150-180 शब्द]\\n\\nउपसंहारः: [80-100 शब्द]\\n\\n(कुल 500-600 शब्द संस्कृत में)","marks":8,"section":"खण्ड 'ब' उपखण्ड (ख) - निबन्ध (8 अंक)"}

पद प्रयोग (प्र.31): {"questionType":"written","questionText":"पदों का वाक्य में प्रयोग कीजिए...","correctAnswer":"पद प्रयोग (विस्तृत):\\n[प्रत्येक पद - वाक्य + अर्थ + व्याख्या]","marks":4,"section":"खण्ड 'ब' उपखण्ड (ख) - पद प्रयोग (2×2=4 अंक)"}

STRICT RULES:
1. Extract from images only - DO NOT generate new questions
2. 31 questions total (20 MCQ + 11 descriptive)
3. Sanskrit/Hindi (Devanagari script)
4. प्र.21-26 need hasAlternative, alternativeQuestion, alternativeAnswer
5. MCQ options: (A), (B), (C), (D) format
6. ALL ANSWERS MUST BE VERY LONG AND DETAILED

Return ONLY valid JSON array.`;
    } else {
      prompt = `You are a quiz question extractor. EXTRACT questions ONLY from the provided image(s).

IMPORTANT: Do NOT generate new questions. Only extract what is VISIBLE in the images.
${languageNote}
${difficultyNote}

MAXIMUM TOTAL MARKS: ${maxMarks}

MARKS DISTRIBUTION:
${marksDistribution || "Distribute marks based on question complexity"}

ADDITIONAL INSTRUCTIONS:
${additionalInstructions || "Extract questions exactly as they appear in the images"}

CRITICAL JSON FORMAT - USE EXACTLY THESE FIELD NAMES:
{
  "questionText": "Your question here",
  "questionType": "mcq" or "written" or "truefalse" or "fillblank" or "matching",
  "options": ["A", "B", "C", "D"],
  "correctOption": 0,
  "correctAnswer": "Detailed answer text - NOT 'Answer not provided'",
  "marks": 1
}

STRICT RULES:
1. EXTRACT questions ONLY from what is visible in the images
2. Do NOT generate or create new questions
3. MUST use "questionText" field (not "question" or "text")
4. MUST use "questionType" field
5. MCQ: 4 options, correctOption 0-3
6. Written: MUST include detailed correctAnswer (not "Answer not provided")
7. Preserve Hindi/bilingual if present in images

Return ONLY a valid JSON array, no markdown, no explanation.`;
    }

    // Prepare content array with prompt and all images
    const contentArray = [prompt];
    
    // Handle both array of images and single image (backward compatibility)
    const images = Array.isArray(imagesData) ? imagesData : [{ base64Data: imagesData.base64Data || imagesData, mimeType: imagesData.mimeType || "image/jpeg" }];
    
    images.forEach((img, index) => {
      contentArray.push({
        inlineData: {
          mimeType: img.mimeType || "image/jpeg",
          data: img.base64Data,
        },
      });
    });

    const result = await model.generateContent(contentArray);

    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("No JSON array found in response");
    }

    text = text.substring(jsonStart, jsonEnd + 1);
    
    let questions;
    try {
      questions = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError.message);
      console.error("Raw text:", text.substring(0, 500));
      throw new Error("Failed to parse AI response as JSON");
    }

    if (!Array.isArray(questions)) {
      throw new Error("Response is not an array");
    }

    // Log first question to debug field names
    if (questions.length > 0) {
      console.log("Sample question structure:", JSON.stringify(questions[0], null, 2).substring(0, 500));
    }

    // Validate and normalize each question (same logic as generateQuestions)
    const validatedQuestions = [];
    
    for (let index = 0; index < questions.length; index++) {
      const q = questions[index];
      
      // Handle alternative field names for questionText
      if (!q.questionText) {
        // Try common alternative field names
        q.questionText = q.question || q.text || q.Question || q.questiontext || 
                         q.question_text || q.QuestionText || q.content || q.prompt;
      }
      
      if (!q.questionText) {
        console.warn(`Skipping question at index ${index}: missing questionText. Keys: ${Object.keys(q).join(', ')}`);
        continue;
      }

      // Handle alternative field names for questionType
      if (!q.questionType) {
        q.questionType = q.type || q.Type || q.question_type || q.QuestionType || q.qtype;
      }

      // Normalize the question type
      const originalType = q.questionType;
      q.questionType = normalizeQuestionType(q.questionType);
      
      if (!q.questionType) {
        console.warn(`Question at index ${index}: unknown type "${originalType}", trying to infer...`);
        // Try to infer type from structure
        if (q.options && q.options.length === 4 && typeof q.correctOption === "number") {
          q.questionType = "mcq";
        } else if (q.options && q.options.length === 2 && 
                   (q.options[0]?.toLowerCase() === "true" || q.options[1]?.toLowerCase() === "false")) {
          q.questionType = "truefalse";
        } else if (q.correctAnswer || q.answer || q.Answer) {
          q.questionType = "written";
        } else if (q.blanks) {
          q.questionType = "fillblank";
        } else if (q.matchPairs) {
          q.questionType = "matching";
        } else {
          q.questionType = "written"; // Default to written if can't determine
        }
      }

      // Handle alternative field names for correctAnswer
      if (!q.correctAnswer) {
        q.correctAnswer = q.answer || q.Answer || q.correct_answer || q.expectedAnswer || q.expected_answer;
      }

      // Handle alternative field names for correctOption
      if (q.correctOption === undefined) {
        q.correctOption = q.correct_option ?? q.correctIndex ?? q.correct ?? q.answerIndex ?? 0;
      }

      // Ensure marks is set
      if (!q.marks || typeof q.marks !== "number") {
        q.marks = q.mark || q.points || q.score || 1;
      }

      // Validate and fix based on type
      try {
        switch (q.questionType) {
          case "mcq":
            if (!Array.isArray(q.options) || q.options.length < 4) {
              q.options = q.options || [];
              while (q.options.length < 4) {
                q.options.push(`Option ${q.options.length + 1}`);
              }
            }
            if (q.options.length > 4) {
              q.options = q.options.slice(0, 4);
            }
            if (typeof q.correctOption !== "number" || q.correctOption < 0 || q.correctOption > 3) {
              q.correctOption = 0;
            }
            break;

          case "written":
            if (!q.correctAnswer) {
              q.correctAnswer = "Answer not provided";
            }
            break;

          case "fillblank":
            if (!Array.isArray(q.blanks) || q.blanks.length === 0) {
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
            q.matchPairs = q.matchPairs.filter(pair => pair.left && pair.right);
            if (q.matchPairs.length < 2) {
              continue;
            }
            break;

          case "truefalse":
            q.options = ["True", "False"];
            if (typeof q.correctOption !== "number" || (q.correctOption !== 0 && q.correctOption !== 1)) {
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
      throw new Error("No valid questions could be extracted. Please try again with clearer images.");
    }

    return validatedQuestions;
  });
};

// Process raw questions and convert to proper quiz format
const processRawQuestions = async (
  rawQuestions,
  maxMarks,
  marksDistribution,
  language = "english",
  numberOfQuestions = null,
  examFormat = "general",
  difficulty = "medium"
) => {
  return await executeWithFallback(async () => {
    const model = await getGeminiModel();

    const languageInstructions = {
      english: "",
      hindi: "\n\nGenerate ALL content in Hindi (हिंदी). Use Devanagari script.",
      bilingual: "\n\nGenerate in BILINGUAL format: Hindi first, then English. Example: 'हिंदी प्रश्न / English question'",
      sanskrit: "\n\nGenerate ALL content in Sanskrit (संस्कृत). Use Devanagari script.",
    };

    const difficultyInstructions = {
      easy: `
DIFFICULTY: EASY - Board exam level
- Direct textbook questions, definitions, basic recall
- Simple MCQs with clear correct answer
- Written: definitions, list 2-3 points, simple explanations
- No complex calculations or multi-step reasoning`,
      medium: `
DIFFICULTY: MEDIUM - Competitive exam level
- Application-based questions, understanding required
- Tricky MCQs requiring careful analysis, some calculations
- Written: explain with examples, compare/contrast, numerical problems
- WHY and HOW questions, not just WHAT`,
      hard: `
DIFFICULTY: HARD - JEE/NEET/Olympiad level
- Complex scenarios combining multiple concepts
- Assertion-reason MCQs, multi-step numerical problems
- Written: derivations, prove statements, HOTS questions, case studies
- Critical thinking, advanced reasoning required`
    };

    const languageNote = languageInstructions[language] || "";
    const difficultyNote = difficultyInstructions[difficulty] || difficultyInstructions.medium;

    let prompt;
    
    if (examFormat === "upboard_science") {
      prompt = `You are generating UP BOARD CLASS 10 SCIENCE PAPER from the given topic/content.

INPUT TOPIC/CONTENT:
"""
${rawQuestions}
"""

${difficultyNote}

GENERATE EXACTLY 31 QUESTIONS in UP Board format (70 marks total):

STRUCTURE:
- Q1-Q7: MCQs, section "खण्ड-अ (Part-A) उप-भाग-I (1 अंक)"
- Q8-Q13: MCQs, section "खण्ड-अ (Part-A) उप-भाग-II (1 अंक)"
- Q14-Q20: MCQs, section "खण्ड-अ (Part-A) उप-भाग-III (1 अंक)"
- Q21-Q24: Written 4 marks, section "खण्ड-ब (Part-B) उप-भाग-I (2+2=4 अंक)"
- Q25-Q28: Written 4 marks, section "खण्ड-ब (Part-B) उप-भाग-II (4 अंक)"
- Q29-Q31: Written 6 marks with OR, section "खण्ड-ब (Part-B) उप-भाग-III (6 अंक)"

CRITICAL JSON FORMAT - USE EXACTLY THESE FIELD NAMES:
For MCQ:
{
  "questionText": "हिंदी प्रश्न / English question?",
  "questionType": "mcq",
  "options": ["विकल्प A / Option A", "विकल्प B / Option B", "विकल्प C / Option C", "विकल्प D / Option D"],
  "correctOption": 0,
  "marks": 1,
  "section": "खण्ड-अ (Part-A) उप-भाग-I (1 अंक)"
}

For Written (4 marks):
{
  "questionText": "हिंदी प्रश्न / English question",
  "questionType": "written",
  "correctAnswer": "विस्तृत उत्तर 300-400 शब्दों में / Detailed answer in 300-400 words",
  "marks": 4,
  "section": "खण्ड-ब (Part-B) उप-भाग-II (4 अंक)"
}

For Written (6 marks with OR):
{
  "questionText": "हिंदी प्रश्न / English question",
  "questionType": "written",
  "correctAnswer": "बहुत विस्तृत उत्तर 600-800 शब्दों में / Very detailed answer in 600-800 words",
  "marks": 6,
  "section": "खण्ड-ब (Part-B) उप-भाग-III (6 अंक)",
  "hasAlternative": true,
  "alternativeQuestion": "अथवा / OR: वैकल्पिक प्रश्न",
  "alternativeAnswer": "वैकल्पिक उत्तर 600-800 शब्द"
}

STRICT RULES:
1. ALL questions from given topic ONLY
2. ALL questions BILINGUAL: "हिंदी प्रश्न / English question"
3. MUST use "questionText" field (not "question" or "text")
4. MUST use "questionType" field with value "mcq" or "written"
5. Each question MUST have "section" field
6. Q29-31 MUST have hasAlternative, alternativeQuestion, alternativeAnswer
7. MUST provide detailed "correctAnswer" for written questions (NOT "Answer not provided")
8. Chemical formulas: H₂O, CO₂, CH₄, C₂H₆

Return ONLY valid JSON array with exactly 31 questions. No markdown, no explanation.`;
    } else if (examFormat === "upboard_english") {
      prompt = `Generate UP BOARD CLASS 10 ENGLISH PAPER - 70 marks, 31 questions from topic: "${rawQuestions}"

STRUCTURE:
- Q1-Q20: MCQs (1 mark each) = 20 marks
- Q21: Reading passage 250+ words (8 marks)
- Q22: Letter with OR (4 marks) - FULL FORMAT 150-200 words
- Q23: Article/Essay with OR (6 marks) - 250+ words
- Q24-27: Grammar (2 marks each)
- Q28-31: Literature with OR (6 marks each) - 200+ words

JSON FORMAT:
MCQ: {"questionType":"mcq","questionText":"Q?","options":["A","B","C","D"],"correctOption":0,"marks":1,"section":"PART-A (MCQ) - 1 mark"}

Reading: {"questionType":"written","questionText":"Read passage...\\n\\n[250+ word passage]\\n\\n(a)...(b)...(c)...(d)...","correctAnswer":"(a)...(b)...(c)...(d)...","marks":8,"section":"PART-B (Reading) - 8 marks"}

Letter: {"questionType":"written","questionText":"Write letter...","correctAnswer":"[Address]\\n[Date]\\n[Receiver]\\n[Subject]\\n[Body 150-200 words]\\n[Closing]\\n[Name]","marks":4,"section":"PART-B (Writing) - 4 marks","hasAlternative":true,"alternativeQuestion":"OR: Application...","alternativeAnswer":"[150-200 words]"}

Article: {"questionType":"written","questionText":"Write article...","correctAnswer":"[TITLE]\\nBy: Name\\n[250-350 words]","marks":6,"section":"PART-B (Writing) - 6 marks","hasAlternative":true,"alternativeQuestion":"OR: Essay...","alternativeAnswer":"[250-350 words]"}

Grammar: {"questionType":"written","questionText":"Change to passive...","correctAnswer":"[Answer]","marks":2,"section":"PART-B (Grammar) - 2 marks"}

Literature: {"questionType":"written","questionText":"Central idea...","correctAnswer":"[200-300 words]","marks":6,"section":"PART-B (Literature) - 6 marks","hasAlternative":true,"alternativeQuestion":"OR: Character...","alternativeAnswer":"[200-300 words]"}

RULES: 31 questions, English only, long answers for 4+ marks, Q22,Q23,Q28-31 need hasAlternative

Return ONLY valid JSON array.`;
    } else if (examFormat === "upboard_hindi") {
      prompt = `UP BOARD CLASS 10 HINDI PAPER (हिन्दी) - 70 अंक, 30 प्रश्न बनाएं।
Paper Code: 801(BA)

INPUT विषय/सामग्री: "${rawQuestions}"

STRUCTURE (30 questions = 70 marks):
खण्ड 'अ': प्र.1-20 MCQs (1 अंक प्रत्येक) = 20 अंक
खण्ड 'ब':
- प्र.21: गद्यांश (3×2=6 अंक) - अथवा सहित - 300-400 शब्द (लगभग 1 पेज)
- प्र.22: पद्यांश (3×2=6 अंक) - अथवा सहित - 16-24 पंक्तियाँ (लगभग 1 पेज)
- प्र.23: संस्कृत गद्यांश अनुवाद (2+3=5 अंक) - अथवा सहित
- प्र.24: संस्कृत पद्यांश अनुवाद (2+3=5 अंक) - अथवा सहित
- प्र.25: खण्डकाव्य (1×3=3 अंक) - 100-150 शब्द उत्तर
- प्र.26: लेखक/कवि परिचय (5+5=10 अंक) - प्रत्येक 200-250 शब्द
- प्र.27: कण्ठस्थ श्लोक (2 अंक)
- प्र.28: पत्र लेखन (4 अंक) - अथवा सहित - 250-300 शब्द उत्तर
- प्र.29: संस्कृत प्रश्न (1+1=2 अंक)
- प्र.30: निबन्ध (1×7=7 अंक) - 700-900 शब्द (लगभग 2 पेज)

=== ANSWER LENGTH PROPORTIONAL TO MARKS ===
- 7 अंक (निबन्ध): 700-900 शब्द (2 पेज)
- 6 अंक (गद्यांश/पद्यांश): प्रत्येक उप-भाग 80-100 शब्द
- 5 अंक (संस्कृत अनुवाद/लेखक/कवि): 150-200 शब्द
- 4 अंक (पत्र): 250-300 शब्द (पूर्ण पत्र)
- 3 अंक (खण्डकाव्य): 100-150 शब्द
- 2 अंक (श्लोक): श्लोक + अर्थ 40-50 शब्द
- 1 अंक (MCQ): केवल सही विकल्प

JSON FORMAT:
MCQ: {"questionType":"mcq","questionText":"प्रश्न?","options":["(A) विकल्प","(B) विकल्प","(C) विकल्प","(D) विकल्प"],"correctOption":0,"marks":1,"section":"खण्ड 'अ' (बहुविकल्पीय प्रश्न) - 1 अंक"}

गद्यांश (प्र.21): {"questionType":"written","questionText":"निम्नलिखित गद्यांश पर आधारित तीन प्रश्नों के उत्तर दीजिए:\\n\\n[300-400 शब्द का पूरा गद्यांश यहाँ लिखें - लगभग 1 पेज]\\n\\n(i) उपर्युक्त गद्यांश का सन्दर्भ लिखिए।\\n(ii) रेखांकित अंश की व्याख्या कीजिए।\\n(iii) [प्रश्न]","correctAnswer":"(i) सन्दर्भ: [पाठ, लेखक, विषय - 80-100 शब्द]\\n\\n(ii) व्याख्या: [रेखांकित अंश की व्याख्या - 80-100 शब्द]\\n\\n(iii) उत्तर: [प्रश्न का उत्तर - 80-100 शब्द]","marks":6,"section":"खण्ड 'ब' (गद्यांश) - 3×2=6 अंक","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा गद्यांश 300-400 शब्द + 3 उप-प्रश्न]","alternativeAnswer":"(i) सन्दर्भ...\\n(ii) व्याख्या...\\n(iii) उत्तर..."}

पद्यांश (प्र.22): {"questionType":"written","questionText":"पद्यांश पर आधारित प्रश्न:\\n\\n[16-24 पंक्तियों का पूरा पद्यांश यहाँ लिखें - लगभग 1 पेज]\\n\\n(i) उपर्युक्त पद्यांश का सन्दर्भ लिखिए।\\n(ii) [अलंकार/शब्द संबंधी प्रश्न]\\n(iii) रेखांकित अंश की व्याख्या कीजिए।","correctAnswer":"(i) सन्दर्भ: [कवि, रचना, विषय - 80-100 शब्द]\\n\\n(ii) उत्तर: [प्रश्न का उत्तर - 80-100 शब्द]\\n\\n(iii) व्याख्या: [रेखांकित पंक्तियों की व्याख्या - 80-100 शब्द]","marks":6,"section":"खण्ड 'ब' (पद्यांश) - 3×2=6 अंक","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा पद्यांश 16-24 पंक्तियाँ + 3 उप-प्रश्न]","alternativeAnswer":"(i) सन्दर्भ...\\n(ii) उत्तर...\\n(iii) व्याख्या..."} [रेखांकित पंक्तियों की व्याख्या - 50-80 शब्द]","marks":6,"section":"खण्ड 'ब' (पद्यांश) - 3×2=6 अंक","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा पद्यांश 16-24 पंक्तियाँ + 3 उप-प्रश्न]","alternativeAnswer":"(i) सन्दर्भ...\\n(ii) उत्तर...\\n(iii) व्याख्या..."}

संस्कृत अनुवाद (प्र.23-24): {"questionType":"written","questionText":"संस्कृत गद्यांश/पद्यांश का अनुवाद कीजिए:\\n\\n[संस्कृत अंश]","correctAnswer":"सन्दर्भ (40-50 शब्द):...\\n\\nअनुवाद (80-100 शब्द):...","marks":5,"section":"खण्ड 'ब' (संस्कृत अनुवाद) - 2+3=5 अंक","hasAlternative":true,"alternativeQuestion":"अथवा...","alternativeAnswer":"सन्दर्भ:...\\nअनुवाद:..."}

खण्डकाव्य (प्र.25): {"questionType":"written","questionText":"खण्डकाव्य प्रश्न:\\n(क) मुक्तियज्ञ...\\n(ख) ज्योति जवाहर...","correctAnswer":"[100-150 शब्द विस्तृत उत्तर - चरित्र-चित्रण या कथावस्तु]","marks":3,"section":"खण्ड 'ब' (खण्डकाव्य) - 1×3=3 अंक"}

लेखक/कवि (प्र.26): {"questionType":"written","questionText":"(क) लेखक परिचय...\\n(ख) कवि परिचय...","correctAnswer":"(क) लेखक परिचय (5 अंक - 200-250 शब्द):\\nजन्म: [तिथि, स्थान]\\nजीवन परिचय: [80-100 शब्द]\\nप्रमुख रचनाएं: [सूची]\\nसाहित्य में स्थान: [20-30 शब्द]\\n\\n(ख) कवि परिचय (5 अंक - 200-250 शब्द):\\nजन्म: [तिथि, स्थान]\\nजीवन परिचय: [80-100 शब्द]\\nप्रमुख रचनाएं: [सूची]\\nसाहित्य में स्थान: [20-30 शब्द]","marks":10,"section":"खण्ड 'ब' (लेखक/कवि परिचय) - 5+5=10 अंक"}

श्लोक (प्र.27): {"questionType":"written","questionText":"कण्ठस्थ श्लोक लिखिए।","correctAnswer":"[श्लोक]\\nअर्थ: [विस्तृत अर्थ 40-50 शब्द]","marks":2,"section":"खण्ड 'ब' (कण्ठस्थ श्लोक) - 2 अंक"}

पत्र (प्र.28): {"questionType":"written","questionText":"पत्र लिखिए जिसमें निम्नलिखित बिंदुओं का समावेश हो:\\n- [बिंदु 1]\\n- [बिंदु 2]\\n- [बिंदु 3]\\n- [बिंदु 4]\\n- [बिंदु 5]","correctAnswer":"[पता]\\n[दिनांक]\\n\\n[संबोधन]\\n[विषय - औपचारिक के लिए]\\n\\n[प्रथम अनुच्छेद - परिचय/उद्देश्य - 50-60 शब्द]\\n\\n[द्वितीय अनुच्छेद - मुख्य विषय/विस्तार - 100-120 शब्द]\\n\\n[तृतीय अनुच्छेद - निवेदन/समापन - 50-60 शब्द]\\n\\n[समापन]\\n[हस्ताक्षर]\\n(कुल 250-300 शब्द)","marks":4,"section":"खण्ड 'ब' (पत्र लेखन) - 4 अंक","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा पत्र विषय + बिंदु]","alternativeAnswer":"[पूर्ण पत्र 250-300 शब्द - समान प्रारूप]"}

संस्कृत प्रश्न (प्र.29): {"questionType":"written","questionText":"संस्कृत में उत्तर दीजिए:\\n(i)...\\n(ii)...","correctAnswer":"(i) [संस्कृत उत्तर]\\n(ii) [संस्कृत उत्तर]","marks":2,"section":"खण्ड 'ब' (संस्कृत प्रश्न) - 1+1=2 अंक"}

निबन्ध (प्र.30): {"questionType":"written","questionText":"निबन्ध लिखिए:\\n(i)...\\n(ii)...\\n(iii)...","correctAnswer":"[शीर्षक]\\n\\nभूमिका (80-100 शब्द): [विषय का परिचय, महत्व, परिभाषा]\\n\\nमुख्य भाग:\\n1. [प्रथम बिंदु - 150-180 शब्द]\\n2. [द्वितीय बिंदु - 150-180 शब्द]\\n3. [तृतीय बिंदु - 150-180 शब्द]\\n\\nउपसंहार (80-100 शब्द): [निष्कर्ष, सुझाव]\\n\\n(कुल 700-900 शब्द - लगभग 2 पेज)","marks":7,"section":"खण्ड 'ब' (निबन्ध) - 1×7=7 अंक"}

STRICT RULES:
1. EXACTLY 30 questions (20 MCQ + 10 descriptive)
2. ALL in Hindi (Devanagari)
3. MCQ options: (A), (B), (C), (D)
4. प्र.21-24, प्र.28 need hasAlternative, alternativeQuestion, alternativeAnswer
5. गद्यांश: प्रश्न में पूरा गद्यांश (300-400 शब्द - 1 पेज), उत्तर प्रत्येक भाग 50-80 शब्द
6. पद्यांश: प्रश्न में पूरा पद्यांश (16-24 पंक्तियाँ - 1 पेज), उत्तर प्रत्येक भाग 50-80 शब्द
7. पत्र: प्रश्न में बिंदु दें, उत्तर में पूर्ण पत्र (250-300 शब्द)
8. निबन्ध: उत्तर 700-900 शब्द (2 पेज) - भूमिका, मुख्य भाग (3-4 बिंदु), उपसंहार
9. खण्डकाव्य: उत्तर 100-150 शब्द
10. लेखक/कवि परिचय: प्रत्येक 200-250 शब्द

Return ONLY valid JSON array with exactly 30 questions.`;
    } else if (examFormat === "upboard_sanskrit") {
      prompt = `UP BOARD CLASS 10 SANSKRIT PAPER (संस्कृत) - 70 अंक, 31 प्रश्न बनाएं।
Paper Code: 818(BP)

INPUT विषय/सामग्री: "${rawQuestions}"

STRUCTURE (31 questions = 70 marks):
खण्ड 'अ' (बहुविकल्पीय प्रश्न) - 20 अंक:
- उपखण्ड (क): गद्यांश आधारित MCQs (प्र.1-6) × 1 अंक = 6 अंक
- उपखण्ड (ख): व्याकरण MCQs (प्र.7-20) × 1 अंक = 14 अंक

खण्ड 'ब' (वर्णनात्मक प्रश्न) - 50 अंक:
- प्र.21: गद्यांश अनुवाद (4 अंक) - अथवा सहित
- प्र.22: पाठ सारांश (4 अंक) - अथवा सहित
- प्र.23: श्लोक व्याख्या (4 अंक) - अथवा सहित
- प्र.24: सूक्ति व्याख्या (3 अंक) - अथवा सहित
- प्र.25: श्लोक अर्थ (4 अंक) - अथवा सहित
- प्र.26: चरित्र-चित्रण (4 अंक) - अथवा सहित
- प्र.27: विभक्ति (2 अंक) + प्रत्यय (2 अंक) = 4 अंक
- प्र.28: वाच्य परिवर्तन (3 अंक)
- प्र.29: हिन्दी से संस्कृत अनुवाद (3×2=6 अंक)
- प्र.30: निबन्ध (8 अंक)
- प्र.31: पद प्रयोग (2×2=4 अंक)

=== ANSWER LENGTH - VERY DETAILED AND LONG ===
- 8 अंक (निबन्ध): 500-600 शब्द (संस्कृत में) - बहुत विस्तृत
- 6 अंक (अनुवाद): प्रत्येक वाक्य 25-35 शब्द विस्तृत व्याख्या सहित
- 4 अंक (गद्यांश/श्लोक/सारांश/चरित्र): 200-250 शब्द - सन्दर्भ 50 शब्द + अनुवाद/व्याख्या 150-200 शब्द
- 3 अंक (सूक्ति/वाच्य): 120-150 शब्द विस्तृत
- 2 अंक (विभक्ति/प्रत्यय/पद प्रयोग): 50-70 शब्द
- 1 अंक (MCQ): केवल सही विकल्प

JSON FORMAT:
MCQ: {"questionType":"mcq","questionText":"प्रश्न?","options":["(A) विकल्प","(B) विकल्प","(C) विकल्प","(D) विकल्प"],"correctOption":0,"marks":1,"section":"खण्ड 'अ' उपखण्ड (क/ख) - 1 अंक"}

गद्यांश अनुवाद (प्र.21): {"questionType":"written","questionText":"निम्नलिखित गद्यांश का सन्दर्भ-सहित हिन्दी में अनुवाद कीजिए:\\n\\n[संस्कृत गद्यांश]","correctAnswer":"सन्दर्भ (50 शब्द):\\nप्रस्तुत गद्यांश हमारी संस्कृत पाठ्यपुस्तक के '[पाठ नाम]' नामक पाठ से उद्धृत है। यह पाठ [विषय] का वर्णन करता है। इस गद्यांश में [मुख्य विषय] को प्रतिपादित किया गया है।\\n\\nअनुवाद (150 शब्द):\\n[विस्तृत हिन्दी अनुवाद - प्रत्येक वाक्य का अर्थ, व्याख्या सहित]","marks":4,"section":"खण्ड 'ब' उपखण्ड (क) - गद्यांश अनुवाद (4 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा संस्कृत गद्यांश]","alternativeAnswer":"सन्दर्भ (50 शब्द):...\\n\\nअनुवाद (150 शब्द):..."}

पाठ सारांश (प्र.22): {"questionType":"written","questionText":"'[पाठ नाम]' अथवा '[दूसरा पाठ]' पाठ का सारांश संस्कृत में लिखिए।","correctAnswer":"[पाठ नाम] (200-250 शब्द संस्कृत में):\\n\\n[पाठ का परिचय - 40-50 शब्द]\\n\\n[मुख्य विषय/कथा - 100-120 शब्द]\\n\\n[शिक्षा/महत्त्व - 40-50 शब्द]","marks":4,"section":"खण्ड 'ब' उपखण्ड (क) - पाठ सारांश (4 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n'[दूसरा पाठ]' पाठ का सारांश संस्कृत में लिखिए।","alternativeAnswer":"[संस्कृत में सारांश 200-250 शब्द]"}

श्लोक व्याख्या (प्र.23): {"questionType":"written","questionText":"निम्नलिखित श्लोक की सन्दर्भ-सहित हिन्दी में व्याख्या कीजिए:\\n\\n[श्लोक]","correctAnswer":"सन्दर्भ (50 शब्द):\\nप्रस्तुत श्लोक हमारी संस्कृत पाठ्यपुस्तक के '[पाठ नाम]' नामक पाठ से उद्धृत है। यह श्लोक [कवि/ग्रन्थ] द्वारा रचित है। इस श्लोक में [विषय] का वर्णन किया गया है।\\n\\nव्याख्या (150-200 शब्द):\\n[शब्दार्थ, भावार्थ, विस्तृत व्याख्या, जीवन में उपयोगिता, शिक्षा]","marks":4,"section":"खण्ड 'ब' उपखण्ड (क) - श्लोक व्याख्या (4 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा श्लोक]","alternativeAnswer":"सन्दर्भ (50 शब्द):...\\n\\nव्याख्या (150-200 शब्द):..."}

सूक्ति व्याख्या (प्र.24): {"questionType":"written","questionText":"निम्नलिखित सूक्ति की हिन्दी में व्याख्या कीजिए:\\n\\n'[सूक्ति]'","correctAnswer":"व्याख्या (120-150 शब्द):\\n\\n[शाब्दिक अर्थ]\\n\\n[स्रोत/ग्रन्थ]\\n\\n[विस्तृत व्याख्या - भाव, उदाहरण]\\n\\n[जीवन में महत्त्व/शिक्षा]","marks":3,"section":"खण्ड 'ब' उपखण्ड (क) - सूक्ति व्याख्या (3 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n'[दूसरी सूक्ति]'","alternativeAnswer":"व्याख्या (120-150 शब्द):..."}

श्लोक अर्थ (प्र.25): {"questionType":"written","questionText":"निम्नलिखित श्लोक का संस्कृत में अर्थ लिखिए:\\n\\n[श्लोक]","correctAnswer":"अर्थः (200-250 शब्द संस्कृत में):\\n\\n[श्लोक का परिचय]\\n\\n[प्रत्येक पद का अर्थ]\\n\\n[भाव/सन्देश]\\n\\n[महत्त्व]","marks":4,"section":"खण्ड 'ब' उपखण्ड (क) - श्लोक अर्थ (4 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा श्लोक]","alternativeAnswer":"अर्थः (200-250 शब्द संस्कृत में):..."}

चरित्र-चित्रण (प्र.26): {"questionType":"written","questionText":"'[पात्र नाम]' अथवा '[दूसरा पात्र]' का चरित्र-चित्रण संस्कृत में कीजिए।","correctAnswer":"[पात्र नाम] चरित्र-चित्रणम् (200-250 शब्द संस्कृत में):\\n\\n[परिचय - जन्म, स्थान]\\n\\n[जीवन/कार्य]\\n\\n[गुण/विशेषताएं]\\n\\n[रचनाएं/योगदान]\\n\\n[महत्त्व/उपसंहार]","marks":4,"section":"खण्ड 'ब' उपखण्ड (क) - चरित्र-चित्रण (4 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n'[दूसरा पात्र]' का चरित्र-चित्रण संस्कृत में कीजिए।","alternativeAnswer":"[संस्कृत में चरित्र-चित्रण 200-250 शब्द]"}

विभक्ति/प्रत्यय (प्र.27): {"questionType":"written","questionText":"(क) निम्नलिखित पदों में विभक्ति एवं वचन बताइए:\\n    (i) [पद] (ii) [पद] (iii) [पद] (iv) [पद]\\n\\n(ख) निम्नलिखित पदों में प्रत्यय बताइए:\\n    (i) [पद] (ii) [पद] (iii) [पद] (iv) [पद]","correctAnswer":"(क) विभक्ति एवं वचन (विस्तृत उत्तर):\\n\\n(i) [पद] - [विभक्ति], [वचन]\\n    व्याख्या: [शब्द का प्रकार, विभक्ति का कारण]\\n\\n(ii)-(iv) [इसी प्रकार]\\n\\n(ख) प्रत्यय (विस्तृत उत्तर):\\n\\n(i) [पद] - [प्रत्यय]\\n    व्याख्या: [धातु] + [प्रत्यय] = [पद]\\n\\n(ii)-(iv) [इसी प्रकार]","marks":4,"section":"खण्ड 'ब' उपखण्ड (ख) - विभक्ति/प्रत्यय (2+2=4 अंक)"}

वाच्य परिवर्तन (प्र.28): {"questionType":"written","questionText":"निम्नलिखित वाक्यों का वाच्य परिवर्तन कीजिए:\\n\\n(i) [वाक्य] (कर्मवाच्य में)\\n(ii) [वाक्य] (भाववाच्य में)\\n(iii) [वाक्य] (कर्मवाच्य में)","correctAnswer":"वाच्य परिवर्तन (विस्तृत उत्तर 120-150 शब्द):\\n\\n(i) कर्तृवाच्य: [मूल वाक्य]\\n    कर्मवाच्य: [परिवर्तित वाक्य]\\n    व्याख्या: [नियम की व्याख्या]\\n\\n(ii)-(iii) [इसी प्रकार]\\n\\nनियम: कर्मवाच्य में कर्ता तृतीया में, कर्म प्रथमा में, क्रिया आत्मनेपद में होती है।","marks":3,"section":"खण्ड 'ब' उपखण्ड (ख) - वाच्य परिवर्तन (3 अंक)"}

अनुवाद (प्र.29): {"questionType":"written","questionText":"निम्नलिखित वाक्यों का संस्कृत में अनुवाद कीजिए:\\n\\n(i) [हिन्दी वाक्य]\\n(ii) [हिन्दी वाक्य]\\n(iii) [हिन्दी वाक्य]","correctAnswer":"संस्कृत अनुवाद (विस्तृत उत्तर):\\n\\n(i) हिन्दी: [वाक्य]\\n    संस्कृत: [अनुवाद]\\n    व्याख्या: [कर्ता], [कर्म], [क्रिया] का विश्लेषण\\n\\n(ii)-(iii) [इसी प्रकार]\\n\\nअनुवाद के नियम: कर्ता प्रथमा में, कर्म द्वितीया में, क्रिया कर्ता के अनुसार पुरुष-वचन में होती है।","marks":6,"section":"खण्ड 'ब' उपखण्ड (ख) - हिन्दी से संस्कृत अनुवाद (3×2=6 अंक)"}

निबन्ध (प्र.30): {"questionType":"written","questionText":"निम्नलिखित विषयों में से किसी एक पर संस्कृत में निबन्ध लिखिए:\\n\\n(i) [विषय]\\n(ii) [विषय]\\n(iii) [विषय]\\n(iv) [विषय]\\n(v) [विषय]","correctAnswer":"[शीर्षक] (500-600 शब्द संस्कृत में)\\n\\nप्रस्तावना (80-100 शब्द):\\n[विषय का परिचय, परिभाषा, महत्त्व]\\n\\n[मुख्य भाग - प्रथम बिंदु] (150-180 शब्द):\\n[विस्तृत वर्णन]\\n\\n[मुख्य भाग - द्वितीय बिंदु] (150-180 शब्द):\\n[विस्तृत वर्णन]\\n\\n[मुख्य भाग - तृतीय बिंदु] (80-100 शब्द):\\n[विस्तृत वर्णन]\\n\\nउपसंहारः (80-100 शब्द):\\n[निष्कर्ष, शिक्षा, सुझाव]","marks":8,"section":"खण्ड 'ब' उपखण्ड (ख) - निबन्ध (8 अंक)"}

पद प्रयोग (प्र.31): {"questionType":"written","questionText":"निम्नलिखित पदों का वाक्यों में प्रयोग कीजिए:\\n\\n(i) [पद] (ii) [पद] (iii) [पद] (iv) [पद]","correctAnswer":"पद प्रयोग (विस्तृत उत्तर):\\n\\n(i) [पद] ([अर्थ]):\\n    वाक्य: [संस्कृत वाक्य]\\n    अर्थ: [हिन्दी अर्थ]\\n    व्याख्या: [धातु/प्रत्यय/लकार की जानकारी]\\n\\n(ii)-(iv) [इसी प्रकार]","marks":4,"section":"खण्ड 'ब' उपखण्ड (ख) - पद प्रयोग (2×2=4 अंक)"}

STRICT RULES:
1. EXACTLY 31 questions (20 MCQ + 11 descriptive)
2. Sanskrit/Hindi (Devanagari)
3. MCQ options: (A), (B), (C), (D)
4. प्र.21-26 need hasAlternative, alternativeQuestion, alternativeAnswer
5. ALL ANSWERS MUST BE VERY LONG AND DETAILED AS SHOWN IN EXAMPLES

Return ONLY valid JSON array with exactly 31 questions.`;
    } else {
      prompt = `You are a quiz question processor. Convert the following content into quiz questions.${languageNote}

${difficultyNote}

INPUT CONTENT/TOPIC:
"""
${rawQuestions}
"""

MAXIMUM TOTAL MARKS: ${maxMarks}

MARKS DISTRIBUTION:
"""
${marksDistribution || "Distribute marks based on question complexity"}
"""

${numberOfQuestions ? `GENERATE EXACTLY ${numberOfQuestions} QUESTIONS.` : "Generate appropriate number of questions from the content."}

CRITICAL JSON FORMAT - USE EXACTLY THESE FIELD NAMES:
{
  "questionText": "Your question here",
  "questionType": "mcq" or "written" or "truefalse" or "fillblank" or "matching",
  "options": ["A", "B", "C", "D"],
  "correctOption": 0,
  "correctAnswer": "Detailed answer text",
  "marks": 1
}

RULES:
1. If input is a TOPIC: Generate questions on that topic matching the difficulty level
2. If input is RAW QUESTIONS: Convert them to proper format
3. MUST use "questionText" field (not "question" or "text")
4. MUST use "questionType" field
5. MCQ: 4 options, correctOption 0-3
6. Written answers must match difficulty level:
   - Easy: 50-100 words
   - Medium: 150-250 words  
   - Hard: 300-500 words with derivations/proofs

Return ONLY a valid JSON array, no markdown.`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");

    if (jsonStart === -1 || jsonEnd === -1) {
      console.error("No JSON array found. Raw response:", text.substring(0, 500));
      throw new Error("No JSON array found in response");
    }

    text = text.substring(jsonStart, jsonEnd + 1);
    
    let questions;
    try {
      questions = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError.message);
      console.error("Raw text:", text.substring(0, 500));
      throw new Error("Failed to parse AI response as JSON");
    }

    if (!Array.isArray(questions)) {
      throw new Error("Response is not an array");
    }

    // Log first question to debug field names
    if (questions.length > 0) {
      console.log("Sample question structure:", JSON.stringify(questions[0], null, 2).substring(0, 500));
    }

    // Validate and normalize each question
    const validatedQuestions = [];
    
    for (let index = 0; index < questions.length; index++) {
      const q = questions[index];
      
      // Handle alternative field names for questionText
      if (!q.questionText) {
        q.questionText = q.question || q.text || q.Question || q.questiontext || 
                         q.question_text || q.QuestionText || q.content || q.prompt;
      }
      
      if (!q.questionText) {
        console.warn(`Skipping question at index ${index}: missing questionText. Keys: ${Object.keys(q).join(', ')}`);
        continue;
      }

      // Handle alternative field names for questionType
      if (!q.questionType) {
        q.questionType = q.type || q.Type || q.question_type || q.QuestionType || q.qtype;
      }

      // Normalize the question type
      const originalType = q.questionType;
      q.questionType = normalizeQuestionType(q.questionType);
      
      if (!q.questionType) {
        console.warn(`Question at index ${index}: unknown type "${originalType}", trying to infer...`);
        if (q.options && q.options.length === 4 && (typeof q.correctOption === "number" || typeof q.correct_option === "number")) {
          q.questionType = "mcq";
        } else if (q.options && q.options.length === 2 && 
                   (q.options[0]?.toLowerCase() === "true" || q.options[1]?.toLowerCase() === "false")) {
          q.questionType = "truefalse";
        } else if (q.correctAnswer || q.answer || q.Answer || q.correct_answer) {
          q.questionType = "written";
        } else if (q.blanks) {
          q.questionType = "fillblank";
        } else if (q.matchPairs || q.match_pairs) {
          q.questionType = "matching";
        } else {
          q.questionType = "written";
        }
      }

      // Handle alternative field names for correctAnswer
      if (!q.correctAnswer) {
        q.correctAnswer = q.answer || q.Answer || q.correct_answer || q.expectedAnswer || q.expected_answer;
      }

      // Handle alternative field names for correctOption
      if (q.correctOption === undefined) {
        q.correctOption = q.correct_option ?? q.correctIndex ?? q.correct ?? q.answerIndex ?? 0;
      }

      // Handle alternative field names for marks
      if (!q.marks || typeof q.marks !== "number") {
        q.marks = q.mark || q.points || q.score || 1;
      }

      try {
        switch (q.questionType) {
          case "mcq":
            if (!Array.isArray(q.options) || q.options.length < 4) {
              q.options = q.options || [];
              while (q.options.length < 4) {
                q.options.push(`Option ${q.options.length + 1}`);
              }
            }
            if (q.options.length > 4) {
              q.options = q.options.slice(0, 4);
            }
            if (typeof q.correctOption !== "number" || q.correctOption < 0 || q.correctOption > 3) {
              q.correctOption = 0;
            }
            break;

          case "written":
            if (!q.correctAnswer) {
              q.correctAnswer = "Answer not provided";
            }
            break;

          case "fillblank":
            if (!Array.isArray(q.blanks) || q.blanks.length === 0) {
              q.blanks = q.correctAnswer ? [q.correctAnswer] : ["answer"];
            }
            break;

          case "matching":
            if (!Array.isArray(q.matchPairs) || q.matchPairs.length < 2) {
              continue;
            }
            q.matchPairs = q.matchPairs.filter(pair => pair.left && pair.right);
            if (q.matchPairs.length < 2) continue;
            break;

          case "truefalse":
            q.options = ["True", "False"];
            if (typeof q.correctOption !== "number" || (q.correctOption !== 0 && q.correctOption !== 1)) {
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
      throw new Error("No valid questions could be processed. Please try again.");
    }

    return validatedQuestions;
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
