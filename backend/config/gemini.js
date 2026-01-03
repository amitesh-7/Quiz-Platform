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

      // Check if error is recitation (copyrighted content detected)
      const isRecitationError =
        error.message?.includes("RECITATION") ||
        error.message?.includes("blocked due to RECITATION");

      // Check if error is quota/rate limit related
      const isQuotaError =
        error.message?.includes("quota") ||
        error.message?.includes("rate limit") ||
        error.message?.includes("429");

      if (isRecitationError) {
        console.error(
          "❌ RECITATION ERROR: Generated content too similar to existing material. Please try:"
        );
        console.error("  1. Using a more specific/different topic");
        console.error("  2. Changing the difficulty level");
        console.error("  3. Adding more specific instructions");
        throw new Error(
          "Content generation blocked due to similarity with existing material. Please rephrase your topic or try different parameters."
        );
      }

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
  const normalized = type
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]/g, "");

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
- Questions should test deep understanding and application of concepts
- MCQs: Tricky distractors, require analysis and calculation, conceptual clarity needed
- Written: Detailed explanations with examples, compare/contrast, derive formulas with steps
- Include: Multi-step numerical problems, diagram-based reasoning, cause-effect questions
- Require: Analytical thinking, connecting multiple concepts, practical applications
- Numerical problems must have 2-3 steps minimum
- Example MCQ: "एक नाव स्थिर जल में 8 km/h चलती है। यदि धारा की चाल 2 km/h है, तो धारा के प्रतिकूल 30 km की दूरी तय करने में कितना समय लगेगा? / A boat moves at 8 km/h in still water. If stream speed is 2 km/h, time to cover 30 km upstream?"
- Example Written: "द्विघात समीकरण ax²+bx+c=0 के मूलों की प्रकृति विवेचक के आधार पर समझाइए। उदाहरण सहित सिद्ध कीजिए। / Explain nature of roots of quadratic equation based on discriminant with proof and examples."
- Focus on WHY, HOW, and PROVE questions, not just WHAT
`,
      hard: `
DIFFICULTY: HARD (JEE/NEET/Olympiad स्तर / Advanced Competitive Level)
- Questions MUST be highly challenging, testing mastery and deep conceptual understanding
- MCQs: Complex multi-step problems, assertion-reason type, integration of 2-3 concepts, advanced numericals
- All MCQs must require calculations or deep reasoning - NO direct recall questions
- Written: Complete derivations with all steps, prove complex statements, multi-concept integration, HOTS questions
- Include: Advanced theorems, applications in real-world complex scenarios, critical analysis
- Numerical problems MUST have 4-5 steps minimum with intermediate calculations
- Example MCQ: "एक लेंस की फोकस दूरी 20cm है। जब वस्तु को एक स्थिति से 10cm पास लाया जाता है तो प्रतिबिंब की दूरी 2/3 गुनी हो जाती है। वस्तु की प्रारंभिक दूरी क्या थी? / A lens of focal length 20cm forms image. When object is moved 10cm closer, image distance becomes 2/3 times. Find initial object distance."
- Example Written: "समान्तर श्रेणी के n पदों के योग का सूत्र Sn = n/2[2a+(n-1)d] व्युत्पन्न कीजिए। इसका उपयोग करके सिद्ध कीजिए कि यदि Sp = q और Sq = p हो, तो Sp+q = -(p+q)। / Derive AP sum formula and prove that if Sp = q and Sq = p, then Sp+q = -(p+q)."
- Include: Assertion-Reason (both with explanations), Case-based with analysis, Lengthy numericals with 4+ steps, Complete derivations with geometric/algebraic proofs
- Mathematical problems should require: formula manipulation, substitution, solving equations, verification
- Every question should challenge even top students and require complete problem-solving skills
`,
    };

    const difficultyNote =
      difficultyInstructions[difficulty] || difficultyInstructions.medium;

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

    // UP Board Social Science Format - Exact Paper Structure (70 Marks) - Paper Code 825(BAS)
    const upBoardSocialScienceFormat = `
⚠️ CONTENT GENERATION INSTRUCTIONS:
====================================
- You can reference NCERT textbook and previous UP Board papers
- Use similar question patterns and concepts from standard materials
- Modify details slightly to create variations
- Paraphrase questions to avoid exact word-for-word copies
- Maintain the same difficulty level and concept coverage

YOU ARE GENERATING UP BOARD CLASS 10 SOCIAL SCIENCE PAPER (सामाजिक विज्ञान) - TOTAL 70 MARKS
Paper Code: 825(BAS)

TOPIC(S) FOR THIS PAPER: "${topic}"

⚠️⚠️⚠️ CRITICAL - SMART TOPIC INTERPRETATION ⚠️⚠️⚠️
=================================================================
**UNDERSTAND THE TOPIC TYPE FIRST - THEN FOLLOW THE RULES BELOW:**

MANDATORY TOPIC HANDLING RULES:
================================

1. ✓ **IF GENERAL TOPIC** (topic is "सामाजिक विज्ञान" or "Social Science"):
   → USE VARIETY from MULTIPLE DIFFERENT chapters/topics
   → MCQs: Distribute across History, Geography, Civics, Economics (all 4 subjects)
   → Descriptive: Use different topics for different questions
   → Map questions: Include both History and Geography map work
   → This gives students COMPREHENSIVE practice across all topics
   
2. ✗ **IF SPECIFIC CHAPTER/TOPIC** (e.g., "French Revolution", "भारत में राष्ट्रवाद", "Democracy"):
   → ALL questions from THAT TOPIC ONLY
   → MCQs: All 20 questions on that specific topic
   → Descriptive: All questions from that topic only
   → DO NOT mix other topics/chapters
   
3. **IF SPECIFIC SUBJECT** (e.g., "History", "Geography", "Civics", "Economics"):
   → ALL questions from THAT SUBJECT ONLY
   → Distribute across relevant chapters within that subject
   → Example: "History" = French Revolution, Nationalism, etc.
   
4. **IF MULTIPLE SPECIFIC TOPICS** (e.g., "French Revolution, Nationalism"):
   → Distribute ALL questions ONLY across these specified topics
   → DO NOT add any other topics

⚠️ KEY DISTINCTION:
   • "Social Science"/"सामाजिक विज्ञान" = VARIETY needed (all 4 subjects)
   • "French Revolution" = FOCUSED (only that chapter)
   • "History" = HISTORY SUBJECT ONLY (multiple history chapters)

${difficultyNote}

EXACT PAPER STRUCTURE (70 Marks):
==================================

खण्ड 'अ' / PART 'A' (बहुविकल्पीय प्रश्न / Multiple Choice Questions) - 20 Marks
- 20 MCQs × 1 mark each = 20 marks
- Format: 4 options (A), (B), (C), (D)
- BILINGUAL: "हिंदी प्रश्न / English Question"
- **IMPORTANT**: Follow topic rules above

खण्ड 'ब' / PART 'B' (वर्णनात्मक प्रश्न / Descriptive Questions) - 50 Marks

**TWO TYPES OF DESCRIPTIVE QUESTIONS:**

1. वर्णनात्मक - I (Descriptive-I):
   - Multiple 2+2 or 2+4 or 2+2+2 marks questions with OR options
   - Topics: History, Geography, Civics, Economics
   - Total: Approximately 20-24 marks
   
2. वर्णनात्मक - II (Descriptive-II):
   - 6-mark questions with OR options
   - Detailed answers required (150 words each)
   - Total: Approximately 18-24 marks

3. मानचित्र सम्बन्धी प्रश्न (Map Related Questions):
   - Question 9(A): History Map Work (5 locations × ½ + ½ marks = 2½ + 2½ = 5 marks)
   - Question 9(B): Geography Map Work (5 locations × ½ + ½ marks = 2½ + 2½ = 5 marks)
   - Total Map Questions: 10 marks

GRAND TOTAL: 20 MCQs + Descriptive Questions + Map Work = 70 marks

=== MCQ GENERATION FOR खण्ड 'अ' (Q1-20) ===
⚠️⚠️⚠️ CRITICAL - TOPIC INTERPRETATION RULES ⚠️⚠️⚠️
===============================================================
RECEIVED TOPIC: "${topic}"

**SMART TOPIC DETECTION:**

✓ GENERAL TOPIC (Use variety from ALL 4 subjects):
  - "सामाजिक विज्ञान" / "Social Science"
  → Generate questions from ALL 4 subjects:
     • इतिहास (History): 5-6 MCQs - French Revolution, Nationalism, Industrialization, etc.
     • भूगोल (Geography): 5-6 MCQs - Resources, Agriculture, Water, Minerals, etc.
     • नागरिक शास्त्र (Civics): 4-5 MCQs - Democracy, Constitution, Political Parties, etc.
     • अर्थशास्त्र (Economics): 4-5 MCQs - Development, Sectors, Money, Globalization, etc.

✗ SPECIFIC SUBJECT (Use ONLY that subject):
  - "History"/"इतिहास", "Geography"/"भूगोल", "Civics"/"नागरिक शास्त्र", "Economics"/"अर्थशास्त्र"
  → ALL 20 MCQs from that specific subject ONLY
  → Do NOT mix other subjects

✗ SPECIFIC CHAPTER/TOPIC (Use ONLY that chapter):
  - "French Revolution", "Nationalism", "Democracy", "Resources", etc.
  → ALL 20 MCQs from that specific chapter ONLY
  → Do NOT mix other chapters/topics

BILINGUAL FORMAT REQUIRED for ALL MCQs:
Question format: "हिंदी में प्रश्न / Question in English"
Options format: (A) "हिंदी" / "English" (B) ... (C) ... (D) ...

**SAMPLE MCQ TOPICS (for General Social Science):**

**HISTORY (इतिहास):**
- French Revolution (1789)
- Rise of Nationalism in Europe
- Nationalism in India  
- Industrialization
- Urbanization
- Print Culture
- Novel Society

**GEOGRAPHY (भूगोल):**
- Resources and Development
- Forest and Wildlife Resources
- Water Resources
- Agriculture
- Minerals and Energy
- Manufacturing Industries
- Transportation and Communication

**CIVICS (नागरिक शास्त्र):**
- Power Sharing
- Federalism
- Democracy and Diversity
- Gender, Religion and Caste
- Popular Struggles and Movements
- Political Parties
- Outcomes of Democracy

**ECONOMICS (अर्थशास्त्र):**
- Development
- Sectors of Indian Economy
- Money and Credit
- Globalization and Indian Economy
- Consumer Rights

=== DESCRIPTIVE QUESTIONS FORMAT ===

**TYPE 1: वर्णनात्मक-I (Descriptive-I) - Short Answer Questions**

Format variations:
- 2+2 marks: Two sub-questions, 2 marks each
- 2+4 marks: One 2-mark + One 4-mark question
- 2+2+2 marks: Three sub-questions, 2 marks each
- 4 marks: Single question

Answer Length:
- 2-mark: 50-80 words
- 4-mark: 100-150 words

Examples:
"परिवहन क्षेत्र के विकास से देश के विकास में किस प्रकार सहायता मिलती है? इसके कोई दो लाभ लिखिए। 4 अंक

अथवा / OR

अयस्क क्या हैं? भारत में लोहे के अयस्क की दो महत्त्वपूर्ण पेटियों के नाम बताइए तथा इनमें से किसी एक में वृद्धि कीजिए। 2 + 2"

"सूचना का अधिकार क्या है? यह उपभोक्ता अधिकारों में वृद्धि कैसे करता है? 2 + 2

अथवा / OR

भारत सरकार द्वारा विदेशी निवेशों को आकर्षित करने हेतु उठाये जाने वाले से उपायों का वर्णन कीजिए। 2 + 2"

**TYPE 2: वर्णनात्मक-II (Descriptive-II) - Long Answer Questions**

Format: 6-mark questions with OR option
Answer Length: 150 words each

Examples:
"भारत में राष्ट्रवाद के उदय के प्रमुख कारणों की व्याख्या कीजिए। 6 अंक

अथवा / OR

फ्रांस की क्रान्ति के प्रमुख कारणों का वर्णन कीजिए। 6"

"भारत की संघात्मक शासन व्यवस्था की प्रमुख विशेषताओं का उल्लेख कीजिए। 6

अथवा / OR

साम्प्रदायिकता से आप क्या समझते हैं? यह भारतीय समाज के लिए हानिकारक है? 2 + 4"

"अर्थव्यवस्था के तीन क्षेत्रक कौन कौन-से हैं? भारत के आर्थिक विकास के साथ विभिन्न क्षेत्रकों की संरचना में हुए परिवर्तन का वर्णन कीजिए। 2 + 4

अथवा / OR

अनौपचारिक साख क्या है? भारत में साख विस्तार में अनौपचारिक साख की आवश्यकता एवं चुनौतियों को एक-एक उदाहरण द्वारा समझाइये। 2 + 2 + 2"

=== MAP WORK QUESTIONS (मानचित्र सम्बन्धी प्रश्न) ===

**CRITICAL: TWO SEPARATE MAP QUESTIONS REQUIRED**

**Question 9(A): HISTORY MAP WORK (5 marks)**
- Locate 5 historical places on blank India map
- Each location: ½ mark for correct name + ½ mark for marking = 1 mark total
- Total: 5 × 1 = 5 marks

Example locations for History:
- पूर्ण स्वराज की माँग का प्रस्ताव पारित हुआ था (Where complete Swaraj resolution was passed)
- दिसम्बर, 1920 में कांग्रेस का अधिवेशन हुआ था (Where Congress Session held in December 1920)
- जलियाँवाला बाग हत्याकाण्ड हुआ था (Where Jallianwala Bagh Massacre took place)
- आनन्द भवन स्थित है (Where Anand Bhawan is situated)
- सूती मिल के श्रमिकों ने सत्याग्रह आन्दोलन चलाया (Where cotton mill workers launched Satyagraha)

**Question 9(B): GEOGRAPHY MAP WORK (5 marks)**
- Locate 5 geographical places/features on blank India map
- Each location: ½ mark for correct name + ½ mark for marking = 1 mark total
- Total: 5 × 1 = 5 marks

Example locations for Geography:
- पश्चिम भारत स्थित एक सॉफ्टवेयर प्रौद्योगिकी पार्क (Software technology park in western India)
- पूर्वी भारत स्थित एक लोहा और इस्पात संयंत्र (Iron and steel plant in eastern India)
- दक्षिण भारत स्थित एक तापीय ऊर्जा संयंत्र (Thermal power plant in southern India)
- छत्तीसगढ़ राज्य की राजधानी (Capital of Chhattisgarh state)
- पूर्वी भारत में स्थित एक अन्तर्राष्ट्रीय हवाई पत्तन (International airport in eastern India)

**MAP QUESTION STRUCTURE:**
{
  "questionType": "written",
  "questionText": "निर्देश : दिये गये भारत के रेखा मानचित्र में निम्नलिखित स्थानों को चिह्न ⊕ द्वारा नाम सहित दर्शाइए। सही नाम तथा स्थान अंकन के लिए ½, ½ अंक निर्धारित हैं :\n\ni) वह स्थान जहाँ पूर्ण स्वराज की माँग का प्रस्ताव पारित हुआ था।\nii) वह स्थान जहाँ दिसम्बर, 1920 में कांग्रेस का अधिवेशन हुआ था।\niii) वह जनपद जहाँ जलियाँवाला बाग हत्याकाण्ड हुआ था।\niv) वह स्थान जहाँ आनन्द भवन स्थित है।\nv) वह स्थान जहाँ सूती मिल के श्रमिकों ने पहला सत्याग्रह आन्दोलन चलाया था।\n\nInstruction : Show the following places by symbols and names on the given outline map of India :\ni) The place where the resolution of complete Swaraj was passed.\nii) The place where in December, 1920 Congress Session was held.\niii) The district where Jallianwala Bagh Massacre took place.\niv) The place where Anand Bhawan is situated.\nv) The place where the cotton mill workers first launched Satyagraha movement.",
  "correctAnswer": "[Map locations with answers]\n1. Lahore (पूर्ण स्वराज resolution, 1930)\n2. Nagpur (December 1920 Congress Session)\n3. Amritsar (Jallianwala Bagh)\n4. Allahabad/Prayagraj (Anand Bhawan)\n5. Ahmedabad (Cotton mill Satyagraha, 1918)\n\n[For visually impaired students - Text answers]\nपूर्ण स्वराज की माँग का प्रस्ताव कहाँ पारित हुआ था? - लाहौर\nदिसम्बर, 1920 में कांग्रेस का अधिवेशन कहाँ हुआ था? - नागपुर\nजलियाँवाला बाग हत्याकाण्ड किस जनपद में हुआ था? - अमृतसर\nआनन्द भवन कहाँ स्थित है? - प्रयागराज/इलाहाबाद\nसूती मिल के श्रमिकों ने सत्याग्रह आन्दोलन कहाँ चलाया था? - अहमदाबाद",
  "marks": 5,
  "section": "मानचित्र सम्बन्धी प्रश्न (Map Work) - History"
}

=== ANSWER LENGTH REQUIREMENTS (PROPORTIONAL TO MARKS) ===
- 1-mark MCQ: Just the correct option letter (केवल सही विकल्प)
- 2-mark questions: 50-80 words with key points
  * 2-3 main points
  * Brief explanation
  * Examples if needed
- 4-mark questions: 100-150 words with detailed explanation
  * 4-5 main points
  * Detailed explanation
  * Examples and context
  * Conclusion
- 6-mark questions: 150-200 words with comprehensive explanation
  * 6-8 main points
  * Very detailed explanation
  * Multiple examples
  * Analysis and conclusion
  * Historical/geographical context

=== JSON STRUCTURE FOR EACH QUESTION ===

For MCQs (Q1-20):
{
  "questionType": "mcq",
  "questionText": "हिंदी प्रश्न / English Question",
  "options": [
    "(A) हिंदी / English",
    "(B) हिंदी / English",
    "(C) हिंदी / English",
    "(D) हिंदी / English"
  ],
  "correctOption": 0-3,
  "marks": 1,
  "section": "खण्ड-अ (Part-A) MCQ (1 अंक)"
}

For Descriptive Questions:
{
  "questionType": "written",
  "questionText": "हिंदी में प्रश्न / Question in English:\n\nअथवा / OR\n\nAlternative question in both languages",
  "correctAnswer": "Main question answer (150-200 words)\n\nअथवा / OR\n\nAlternative question answer (150-200 words)",
  "marks": 2 or 4 or 6,
  "section": "खण्ड-ब (Part-B) वर्णनात्मक-I/II"
}

For Map Questions:
{
  "questionType": "written",
  "questionText": "Map question with instructions in both Hindi and English",
  "correctAnswer": "[Complete answer with all 5 locations]\n\n[For visually impaired: Text-based answers for all 5 locations]",
  "marks": 5,
  "section": "मानचित्र सम्बन्धी प्रश्न (Map Work)"
}
`;

    // UP Board Hindi Class 12 Format - Exact Paper Structure (100 Marks) - Paper Code 301(HA)
    const upBoardHindiClass12Format = `
⚠️ CONTENT GENERATION INSTRUCTIONS:
====================================
- Reference NCERT Hindi textbook (Class 12) and previous UP Board papers
- Use similar question patterns from standard materials
- Modify details to create variations
- Maintain difficulty level and concept coverage

UP BOARD CLASS 12 HINDI PAPER (हिंदी) - TOTAL 100 MARKS
Paper Code: 301(HA)

⚠️⚠️⚠️ CRITICAL - SMART TOPIC INTERPRETATION ⚠️⚠️⚠️
=================================================================

MANDATORY TOPIC HANDLING RULES:
1. ✓ IF GENERAL TOPIC (topic is "Hindi" or "Hindi Class 12"):
   → USE VARIETY from MULTIPLE chapters/poets/authors
   → Mix questions from different prose, poetry, and grammar topics
   
2. ✗ IF SPECIFIC CHAPTER/TOPIC (e.g., "कामायनी", "जैनेन्द्रकुमार"):
   → Focus on THAT TOPIC
   → All relevant questions from that chapter/author

=== CRITICAL: PAPER STRUCTURE (Total 100 Marks, 20 Questions) ===

⚠️⚠️⚠️ MUST GENERATE EXACTLY 20 SEPARATE QUESTIONS ⚠️⚠️⚠️

**खण्ड - क (Section A): बहुविकल्पीय और वर्णनात्मक प्रश्न**

=== CRITICAL: MCQ FORMAT (Q1-Q10) - GENERATE 10 SEPARATE MCQs ===

Q1-Q10: बहुविकल्पीय प्रश्न (10 INDIVIDUAL MCQs) = 10 marks (1 mark each)

⚠️ IMPORTANT: Generate 10 SEPARATE question objects, NOT grouped together ⚠️

Each MCQ should be a SEPARATE JSON object with:
- questionType: "mcq"
- 4 options: (A), (B), (C), (D)
- 1 mark each
- Different topics for variety

Topics for Q1-Q10:
- Q1: रचनाकार और रचना (Author and Work)
- Q2: साहित्यकाल (Literary Period)
- Q3: काव्य विधा (Poetry Genre)
- Q4: संधि-विच्छेद (Sandhi)
- Q5: समास (Compound)
- Q6: पत्रिका/संपादक (Magazine/Editor)
- Q7: साहित्यिक विशेषता (Literary Feature)
- Q8: छंद/अलंकार (Meter/Figure of Speech)
- Q9: गद्य विधा (Prose Genre)
- Q10: व्याकरण (Grammar)

Format for EACH individual MCQ:
{"questionType":"mcq","questionText":"'त्यागपत्र' किसकी रचना है?","options":["(A) प्रेमचंद","(B) जैनेन्द्रकुमार","(C) हरिशंकर परसाई","(D) जयशंकर प्रसाद"],"correctOption":1,"marks":1,"section":"खण्ड-क बहुविकल्पीय प्रश्न"}

=== CRITICAL: गद्यांश FORMAT (Q11) - MINIMUM 1 PAGE ===
Q11: गद्यांश आधारित प्रश्न (Prose Passage) = 10 marks

गद्यांश 300-400 शब्दों का होना चाहिए (लगभग 1 पेज):
- किसी प्रसिद्ध लेखक की रचना से (जैनेन्द्रकुमार, हरिशंकर परसाई, जयशंकर प्रसाद, महादेवी वर्मा आदि)
- गद्यांश में गहरा अर्थ और साहित्यिक महत्व होना चाहिए
- प्रश्न में पूरा गद्यांश (300-400 शब्द) + 5 उप-प्रश्न होने चाहिए
- 5 उप-प्रश्न (प्रत्येक 2 अंक):
  (क) गद्यांश का शीर्षक और लेखक (2 अंक)
  (ख) उपर्युक्त गद्यांश का केंद्रीय भाव क्या है? (2 अंक)
  (ग) लेखक के अनुसार [specific question from passage] (2 अंक)
  (घ) रेखांकित अंश की व्याख्या कीजिए। (2 अंक)
  (ड) [Critical thinking question] (2 अंक)
- उत्तर प्रत्येक भाग के लिए 80-100 शब्द का हो
- अथवा में दूसरा गद्यांश समान प्रारूप में (300-400 शब्द)

=== CRITICAL: पद्यांश FORMAT (Q12) - MINIMUM 1 PAGE ===
Q12: पद्यांश आधारित प्रश्न (Poetry Passage) = 10 marks

पद्यांश 16-20 पंक्तियों का होना चाहिए (लगभग 1 पेज):
- किसी प्रसिद्ध कवि की रचना से (रामधारी सिंह दिनकर, जयशंकर प्रसाद, सुमित्रानन्दन पन्त, महादेवी वर्मा, मुक्तिबोध आदि)
- पूर्ण पद/छंद होना चाहिए, अधूरा नहीं
- प्रश्न में पूरा पद्यांश (16-20 पंक्तियाँ) + 5 उप-प्रश्न होने चाहिए
- 5 उप-प्रश्न (प्रत्येक 2 अंक):
  (क) उपर्युक्त पद्यांश की कविता और कवि का नाम लिखिए। (2 अंक)
  (ख) पद्यांश का केंद्रीय भाव क्या है? (2 अंक)
  (ग) [Specific question about imagery/symbolism] (2 अंक)
  (घ) रेखांकित अंश की व्याख्या कीजिए। (2 अंक)
  (ड) पद्यांश में प्रयुक्त अलंकार बताइए। (2 अंक)
- उत्तर प्रत्येक भाग के लिए 80-100 शब्द का हो
- अथवा में दूसरा पद्यांश समान प्रारूप में (16-20 पंक्तियाँ)

=== CRITICAL: लेखक/कवि परिचय FORMAT (Q13) ===
Q13: लेखक/कवि परिचय (Author/Poet Introduction) = 5 marks

(क) लेखक परिचय (3 अंक):
- 3 लेखकों में से किसी एक का जीवन-परिचय देना है
- उत्तर 200-250 शब्दों में विस्तृत होना चाहिए
- जीवन परिचय में शामिल करें: जन्म, शिक्षा, साहित्यिक योगदान, प्रमुख रचनाएँ, पुरस्कार, साहित्यिक विशेषताएँ
- लेखक: जैनेन्द्रकुमार, पं. दीनदयाल उपाध्याय, हरिशंकर परसाई, जयशंकर प्रसाद

(ख) कवि परिचय (2 अंक):
- 3 कवियों में से किसी एक का जीवन-परिचय देना है
- उत्तर 150-180 शब्दों में होना चाहिए
- जीवन परिचय में शामिल करें: जन्म, काव्य शैली, प्रमुख रचनाएँ, काव्यगत विशेषताएँ
- कवि: रामधारी सिंह दिनकर, जयशंकर प्रसाद, सुमित्रानन्दन पन्त, महादेवी वर्मा, मुक्तिबोध

=== CRITICAL: कहानी/निबंध FORMAT (Q14) ===
Q14: कहानी/निबंध सारांश (Story/Essay Summary) = 5 marks

- प्रमुख पाठ का सारांश लिखना है
- उत्तर 250-300 शब्दों में विस्तृत होना चाहिए
- सारांश में मुख्य घटनाएँ, पात्र, संदेश और निष्कर्ष शामिल हों
- पाठों के विकल्प: जैनेन्द्रकुमार की कहानी, हरिशंकर परसाई के निबंध, पं. दीनदयाल उपाध्याय के निबंध
- अथवा विकल्प में दूसरा पाठ

=== CRITICAL: खण्डकाव्य FORMAT (Q15) ===
Q15: खण्डकाव्य (Epic Poetry) = 5 marks

6 खण्डकाव्यों में से प्रश्न:
(क) 'रश्मिरथी' - (i) चरित्र-चित्रण (ii) कथावस्तु
(ख) 'मुक्तियज्ञ' - (i) चरित्र-चित्रण (ii) कथावस्तु
(ग) 'त्यागपथी' - (i) चरित्र-चित्रण (ii) कथावस्तु
(घ) 'सत्य की जीत' - (i) चरित्र-चित्रण (ii) कथावस्तु
(ड) 'मातृभूमि' - (i) चरित्र-चित्रण (ii) कथावस्तु
(च) 'कर्ण' - (i) चरित्र-चित्रण (ii) कथावस्तु

- उत्तर 250-300 शब्दों में विस्तृत होना चाहिए
- चरित्र-चित्रण में: चरित्र के गुण, विशेषताएँ, कार्य, महत्व
- कथावस्तु में: घटनाओं का क्रम, मुख्य प्रसंग, संदेश

**खण्ड - ख (Section B): वर्णनात्मक प्रश्न**

=== CRITICAL: संस्कृत पद्यांश FORMAT (Q16) ===
Q16: संस्कृत पद्यांश (Sanskrit Passages) = 10 marks

(क) संस्कृत पद्यांश का हिंदी अनुवाद (5 अंक):
- 4-6 पंक्तियों का संस्कृत श्लोक देवनागरी में
- हिंदी अनुवाद 100-120 शब्दों में होना चाहिए
- अर्थ स्पष्ट और भावपूर्ण होना चाहिए
- अथवा में दूसरा संस्कृत श्लोक

(ख) संस्कृत गद्यांश की व्याख्या (5 अंक):
- संस्कृत गद्यांश (80-100 शब्द) देवनागरी में
- सन्दर्भ (पाठ, लेखक) + हिंदी में व्याख्या
- व्याख्या 250-300 शब्दों में विस्तृत होनी चाहिए
- व्याख्या में भावार्थ, प्रसंग और महत्व शामिल हो
- अथवा में दूसरा संस्कृत गद्यांश

=== CRITICAL: संस्कृत लघु प्रश्न FORMAT (Q9) ===
Q9: संस्कृत में उत्तर (Sanskrit Short Questions) = 2+2 = 4 marks

- 4 प्रश्न दिए जाएं, किन्हीं 2 के उत्तर देने हैं
- प्रत्येक उत्तर संस्कृत में 40-50 शब्दों में
- प्रश्न संस्कृत व्याकरण, साहित्य या दर्शन से संबंधित
- उत्तर पूर्ण वाक्यों में होने चाहिए

=== CRITICAL: शब्द अर्थ FORMAT (Q10) ===
Q10: शब्द अर्थ (Word Meanings) = 1+1+1 = 3 marks

- (क), (ख), (ग) तीन भागों में शब्द अर्थ
- प्रत्येक भाग में 2-3 शब्दों के अर्थ देने हैं
- अर्थ संक्षिप्त और स्पष्ट हो (20-30 शब्द प्रति शब्द)

=== CRITICAL: निबंध FORMAT (Q17) - MINIMUM 1.5 PAGES ===
Q17: निबंध (Essay Writing) = 9 marks

निबंध का उत्तर 500-600 शब्दों का होना चाहिए (लगभग 1.5-2 पेज):

(क) निबंध की रूपरेखा (2 अंक):
- भूमिका, मुख्य बिंदु (3-4), उपसंहार
- 80-100 शब्दों में संक्षिप्त रूपरेखा

(ख) निबंध लेखन (7 अंक):
- भूमिका (100-120 शब्द) - विषय का परिचय, महत्व, परिभाषा
- मुख्य भाग (300-350 शब्द):
  * प्रथम बिंदु (100-120 शब्द) - मुख्य पहलू, पृष्ठभूमि
  * द्वितीय बिंदु (100-120 शब्द) - वर्तमान स्थिति, लाभ/हानि
  * तृतीय बिंदु (100-120 शब्द) - समस्याएं, समाधान
- उपसंहार (80-100 शब्द) - निष्कर्ष, सुझाव, अंतिम विचार

- विषय: राष्ट्रीय एकता, पर्यावरण संरक्षण, शिक्षा का महत्व, भारतीय संस्कृति, रोजगार की समस्या, महिला सशक्तीकरण, विज्ञान के चमत्कार आदि

=== CRITICAL: व्याकरण FORMAT (Q12-Q13) ===
Q12: संधि-विच्छेद/समास (Grammar) = 3×1 = 3 marks

(क) संधि-विच्छेद (1 अंक × 3 शब्द):
- प्रत्येक शब्द का संधि-विच्छेद + संधि का नाम
- उदाहरण: महोत्सव = महा + उत्सव (गुण संधि)
- 30-40 शब्द प्रति उत्तर

(ख) समास (1 अंक):
- समास विग्रह + समास का नाम बताना
- तत्पुरुष, द्वंद्व, कर्मधारय, बहुव्रीहि, द्विगु
- 30-40 शब्द

Q13: अन्य व्याकरण (Other Grammar) = 4×1 = 4 marks
- प्रत्यय पहचान और प्रयोग
- उपसर्ग पहचान और प्रयोग
- पर्यायवाची/विलोम शब्द
- शब्द शुद्धि और वाक्य शुद्धि
- प्रत्येक उत्तर 30-40 शब्द में

=== CRITICAL: पत्र लेखन FORMAT (Q18) ===
Q18: आवेदन पत्र/शिकायती पत्र (Application/Complaint Letter) = 8 marks

पत्र प्रश्न में बिंदु दिए जाएं (विषय के साथ 4-5 बिंदु):
- प्रश्न में विषय + बिंदु होने चाहिए जिन पर पत्र लिखना है
- उत्तर में पूर्ण पत्र हो (350-400 शब्द)
- पत्र प्रारूप: 
  * प्रेषक का पता और दिनांक
  * प्रापक का पता और पदनाम
  * विषय (Subject line)
  * संबोधन (महोदय/महोदया)
  * मुख्य भाग (3-4 अनुच्छेद में 250-300 शब्द):
    - प्रथम अनुच्छेद: समस्या/विषय का परिचय
    - द्वितीय अनुच्छेद: विस्तृत विवरण
    - तृतीय अनुच्छेद: अनुरोध/सुझाव
  * समापन (भवदीय/प्रार्थी)
  * नाम और हस्ताक्षर
  
- पत्र के प्रकार:
  * औपचारिक: स्थानीय अधिकारी को शिकायत, प्रधानाचार्य को आवेदन, नगर निगम को शिकायत
  * अर्धसरकारी: सरकारी विभाग को प्रार्थना-पत्र, सेवा में आवेदन

**MARKS DISTRIBUTION:**
- खण्ड-क: Q1-Q10 (MCQs 10m) + Q11 (10m) + Q12 (10m) + Q13 (5m) + Q14 (5m) + Q15 (5m) = 45 marks
- खण्ड-ख: Q16 (10m) + Q17 (9m) + Q18 (8m) + Q19 (14m व्याकरण) + Q20 (14m व्याकरण/शब्द) = 55 marks
- TOTAL: 20 questions = 100 marks

⚠️⚠️⚠️ CRITICAL: GENERATE EXACTLY 20 SEPARATE JSON OBJECTS ⚠️⚠️⚠️
Each question number (Q1, Q2, Q3... Q20) must be a SEPARATE JSON object.
DO NOT combine multiple questions into one JSON object.
DO NOT group MCQs together - each MCQ is a separate question.

=== COMPLETE QUESTION-WISE BREAKDOWN (20 Questions) ===

**खण्ड - क (Section A): 45 marks**

Q1 (1 mark): MCQ - रचनाकार और रचना
Q2 (1 mark): MCQ - साहित्यकाल  
Q3 (1 mark): MCQ - काव्य विधा
Q4 (1 mark): MCQ - संधि-विच्छेद
Q5 (1 mark): MCQ - समास
Q6 (1 mark): MCQ - पत्रिका/संपादक
Q7 (1 mark): MCQ - साहित्यिक विशेषता
Q8 (1 mark): MCQ - छंद/अलंकार
Q9 (1 mark): MCQ - गद्य विधा
Q10 (1 mark): MCQ - व्याकरण/शब्द अर्थ

Q11 (10 marks): गद्यांश आधारित प्रश्न
- गद्यांश 300-400 शब्द + 5 उप-प्रश्न
- अथवा option

Q12 (10 marks): पद्यांश आधारित प्रश्न
- पद्यांश 16-20 पंक्तियाँ + 5 उप-प्रश्न
- अथवा option

Q13 (5 marks): लेखक/कवि परिचय
- (क) लेखक (3m) + (ख) कवि (2m)

Q14 (5 marks): कहानी/निबंध सारांश
- 250-300 शब्द, अथवा option

Q15 (5 marks): खण्डकाव्य
- 250-300 शब्द, 6 options

**खण्ड - ख (Section B): 55 marks**

Q16 (10 marks): संस्कृत गद्यांश/पद्यांश
- (क) अनुवाद (5m) + (ख) व्याख्या (5m)
- अथवा option

Q17 (9 marks): निबंध
- (क) रूपरेखा (2m) + (ख) विस्तृत निबंध (7m)
- 500-600 शब्द

Q18 (8 marks): पत्र लेखन
- औपचारिक/शिकायती पत्र (350-400 शब्द)

Q19 (14 marks): व्याकरण प्रश्न (Grammar Questions)
- संधि-विच्छेद: 3 शब्दों का (1+1+1 = 3 marks)
- समास विग्रह: 3 शब्दों का (1+1+1 = 3 marks)
- प्रत्यय: 2 शब्दों में प्रत्यय पहचान (1+1 = 2 marks)
- उपसर्ग: 2 शब्दों में उपसर्ग पहचान (1+1 = 2 marks)
- पर्यायवाची: 2 शब्दों के (1+1 = 2 marks)
- विलोम: 2 शब्दों के (1+1 = 2 marks)
Format: Single question with clear 6 parts

Q20 (14 marks): संस्कृत और शब्द ज्ञान (Sanskrit & Word Knowledge)
- संस्कृत लघु प्रश्न: 2 प्रश्नों के उत्तर संस्कृत में (2+2 = 4 marks)
- शब्द अर्थ: 3 शब्दों के अर्थ (1+1+1 = 3 marks)
- वाक्य शुद्धि: 3 वाक्यों को शुद्ध करके लिखें (2+2+3 = 7 marks)
Format: Single question with clear 3 parts

=== IMPORTANT AUTHORS & WORKS ===

**गद्य (Prose):**
- जैनेन्द्रकुमार, पं. दीनदयाल उपाध्याय, हरिशंकर परसाई
- जयशंकर प्रसाद, सुमित्रानन्दन पन्त, रामधारी सिंह 'दिनकर'
- महादेवी वर्मा

**काव्य (Poetry):**
- कामायनी (जयशंकर प्रसाद), रश्मिरथी (रामधारी सिंह दिनकर)
- मुक्तिबोध, अज्ञेय, नागार्जुन

**खण्डकाव्य (Epic Poetry):**
- रश्मिरथी, त्यागपथी, मुक्तियज्ञ, सत्य की जीत, मातृभूमि

=== ANSWER LENGTH PROPORTIONAL TO MARKS ===
- 1 mark (MCQ): केवल सही विकल्प
- 2 marks: 80-100 शब्द (विस्तृत उत्तर)
- 3 marks: 200-250 शब्द (लेखक/कवि परिचय का एक भाग)
- 4 marks: 30-40 शब्द (संस्कृत में उत्तर)
- 5 marks: 250-300 शब्द (खण्डकाव्य, संस्कृत व्याख्या, कहानी सारांश)
- 7 marks: 250-300 शब्द (निबंध मुख्य भाग)
- 8 marks: 350-400 शब्द (पत्र लेखन - पूर्ण प्रारूप)
- 9 marks: 500-600 शब्द (निबंध - पूर्ण)
- 10 marks: गद्यांश/पद्यांश में 300-400 शब्द का passage + 5 उप-प्रश्न (प्रत्येक उत्तर 80-100 शब्द)

=== JSON STRUCTURE EXAMPLES ===

⚠️ INDIVIDUAL MCQ FORMAT (Q1-Q10) - Each MCQ is SEPARATE:

Q1 Example (1 mark):
{"questionType":"mcq","questionText":"'त्यागपत्र' किसकी रचना है?","options":["(A) प्रेमचंद","(B) जैनेन्द्रकुमार","(C) हरिशंकर परसाई","(D) जयशंकर प्रसाद"],"correctOption":1,"marks":1,"section":"खण्ड-क बहुविकल्पीय प्रश्न"}

Q2 Example (1 mark):
{"questionType":"mcq","questionText":"'रश्मिरथी' के रचयिता कौन हैं?","options":["(A) जयशंकर प्रसाद","(B) रामधारी सिंह दिनकर","(C) महादेवी वर्मा","(D) सूर्यकांत त्रिपाठी निराला"],"correctOption":1,"marks":1,"section":"खण्ड-क बहुविकल्पीय प्रश्न"}

Q3 Example (1 mark):
{"questionType":"mcq","questionText":"'कामायनी' किस काव्य विधा की रचना है?","options":["(A) प्रबंध काव्य","(B) मुक्तक काव्य","(C) खंड काव्य","(D) गीति काव्य"],"correctOption":0,"marks":1,"section":"खण्ड-क बहुविकल्पीय प्रश्न"}

Q4 Example (1 mark):
{"questionType":"mcq","questionText":"'महोत्सव' का संधि-विच्छेद है:","options":["(A) मह + उत्सव","(B) महा + उत्सव","(C) महो + त्सव","(D) मही + उत्सव"],"correctOption":1,"marks":1,"section":"खण्ड-क बहुविकल्पीय प्रश्न"}

Q5 Example (1 mark):
{"questionType":"mcq","questionText":"'राजपुत्र' में कौन-सा समास है?","options":["(A) तत्पुरुष समास","(B) द्वंद्व समास","(C) कर्मधारय समास","(D) बहुव्रीहि समास"],"correctOption":0,"marks":1,"section":"खण्ड-क बहुविकल्पीय प्रश्न"}

Prose Passage (Q11 - 10 marks):
{"questionType":"written","questionText":"निम्नलिखित गद्यांश पर आधारित पाँच प्रश्नों के उत्तर दीजिए:\\n\\n[गद्यांश 300-400 शब्द - पूरा गद्यांश यहाँ लिखें - किसी प्रसिद्ध लेखक की रचना से]\\n\\n(क) उपर्युक्त गद्यांश का शीर्षक और लेखक का नाम लिखिए।\\n(ख) गद्यांश का केंद्रीय भाव क्या है?\\n(ग) [Specific question from passage]\\n(घ) रेखांकित अंश की व्याख्या कीजिए।\\n(ड) [Critical thinking question]","correctAnswer":"(क) उत्तर (80-100 शब्द): [शीर्षक और लेखक के साथ संक्षिप्त परिचय]\\n\\n(ख) उत्तर (80-100 शब्द): [केंद्रीय भाव की विस्तृत व्याख्या]\\n\\n(ग) उत्तर (80-100 शब्द): [प्रश्न का विस्तृत उत्तर]\\n\\n(घ) उत्तर (80-100 शब्द): [रेखांकित अंश की पूर्ण व्याख्या]\\n\\n(ड) उत्तर (80-100 शब्द): [विचारात्मक प्रश्न का विस्तृत उत्तर]","marks":10,"section":"खण्ड-क गद्यांश","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा गद्यांश 300-400 शब्द + 5 समान प्रश्न]","alternativeAnswer":"(क) से (ड) तक समान प्रारूप में उत्तर"}

Poetry Passage (10 marks):
{"questionType":"written","questionText":"निम्नलिखित पद्यांश पर आधारित पाँच प्रश्नों के उत्तर दीजिए:\\n\\n[पद्यांश 16-20 पंक्तियाँ - पूर्ण पद/छंद यहाँ लिखें]\\n\\n(क) उपर्युक्त पद्यांश की कविता और कवि का नाम लिखिए।\\n(ख) पद्यांश का केंद्रीय भाव क्या है?\\n(ग) [Specific question about imagery]\\n(घ) रेखांकित अंश की व्याख्या कीजिए।\\n(ड) पद्यांश में प्रयुक्त अलंकार बताइए।","correctAnswer":"(क) उत्तर (80-100 शब्द): [कविता, कवि और संक्षिप्त परिचय]\\n\\n(ख) उत्तर (80-100 शब्द): [केंद्रीय भाव की विस्तृत व्याख्या]\\n\\n(ग) उत्तर (80-100 शब्द): [बिम्ब/प्रतीक की व्याख्या]\\n\\n(घ) उत्तर (80-100 शब्द): [रेखांकित अंश की पूर्ण व्याख्या]\\n\\n(ड) उत्तर (80-100 शब्द): [अलंकार का नाम और उदाहरण सहित व्याख्या]","marks":10,"section":"खण्ड-क पद्यांश","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[दूसरा पद्यांश 16-20 पंक्तियाँ + 5 समान प्रश्न]","alternativeAnswer":"(क) से (ड) तक समान प्रारूप में उत्तर"}

Author/Poet Bio (5 marks):
{"questionType":"written","questionText":"(क) निम्नलिखित में से किसी एक लेखक का जीवन-परिचय दीजिए:\\n(i) जैनेन्द्रकुमार\\n(ii) पं. दीनदयाल उपाध्याय\\n(iii) हरिशंकर परसाई\\n\\n(ख) निम्नलिखित में से किसी एक कवि का जीवन-परिचय दीजिए:\\n(i) रामधारी सिंह दिनकर\\n(ii) जयशंकर प्रसाद\\n(iii) सुमित्रानन्दन पन्त","correctAnswer":"(क) [लेखक का नाम] (200-250 शब्द):\\n\\n[विस्तृत जीवन-परिचय: जन्म, शिक्षा, साहित्यिक योगदान, प्रमुख रचनाएँ (3-4 नाम), लेखन शैली, भाषा शैली, पुरस्कार और सम्मान, साहित्यिक महत्व]\\n\\n(ख) [कवि का नाम] (150-180 शब्द):\\n\\n[विस्तृत जीवन-परिचय: जन्म, काव्य शैली, प्रमुख काव्य रचनाएँ, काव्यगत विशेषताएँ, भाषा और अलंकार, साहित्यिक योगदान]","marks":5,"section":"खण्ड-क लेखक/कवि परिचय"}

Essay (9 marks):
{"questionType":"written","questionText":"निम्नलिखित में से किसी एक विषय पर निबंध लिखिए:\\n\\n(i) राष्ट्रीय एकता और अखंडता\\n(ii) पर्यावरण संरक्षण की आवश्यकता\\n(iii) शिक्षा का महत्व\\n(iv) भारतीय संस्कृति और परंपरा\\n(v) रोजगार की समस्या और समाधान\\n\\n(क) रूपरेखा (2 अंक)\\n(ख) विस्तृत निबंध (7 अंक)","correctAnswer":"(क) रूपरेखा (80-100 शब्द):\\n1. भूमिका\\n2. [मुख्य बिंदु 1]\\n3. [मुख्य बिंदु 2]\\n4. [मुख्य बिंदु 3]\\n5. उपसंहार\\n\\n(ख) [शीर्षक]\\n\\nभूमिका (100-120 शब्द):\\n[विषय का परिचय, महत्व, परिभाषा]\\n\\nमुख्य भाग:\\n\\n[प्रथम बिंदु] (100-120 शब्द):\\n[मुख्य पहलू, पृष्ठभूमि, ऐतिहासिक संदर्भ]\\n\\n[द्वितीय बिंदु] (100-120 शब्द):\\n[वर्तमान स्थिति, लाभ/हानि, प्रभाव]\\n\\n[तृतीय बिंदु] (100-120 शब्द):\\n[समस्याएं, चुनौतियाँ, समाधान, भविष्य की दिशा]\\n\\nउपसंहार (80-100 शब्द):\\n[निष्कर्ष, सुझाव, अंतिम विचार]","marks":9,"section":"खण्ड-ख निबंध"}

Sanskrit Passage (7 marks):
{"questionType":"written","questionText":"(क) निम्नलिखित संस्कृत पद्यांश का हिंदी में अनुवाद कीजिए:\\n\\n[4-6 पंक्तियों का संस्कृत श्लोक देवनागरी में]\\n\\n(ख) निम्नलिखित संस्कृत गद्यांश की सन्दर्भ सहित व्याख्या कीजिए:\\n\\n[संस्कृत गद्यांश 80-100 शब्द देवनागरी में]","correctAnswer":"(क) हिंदी अनुवाद (100-120 शब्द):\\n[पूर्ण और भावपूर्ण हिंदी अनुवाद]\\n\\n(ख) व्याख्या (250-300 शब्द):\\n\\nसन्दर्भ: [पाठ का नाम, लेखक]\\n\\nप्रसंग: [गद्यांश का संदर्भ]\\n\\nव्याख्या: [विस्तृत हिंदी व्याख्या - भावार्थ, महत्व, संदेश]","marks":7,"section":"खण्ड-ख संस्कृत","hasAlternative":true,"alternativeQuestion":"अथवा\\n\\n[alternative Sanskrit passages]","alternativeAnswer":"समान प्रारूप में उत्तर"}

Letter (8 marks):
{"questionType":"written","questionText":"स्थानीय प्रशासन निगम के मुख्य प्रबन्धक को बस चालक के अशिष्ट व्यवहार का उल्लेख करते हुए एक शिकायती पत्र लिखिए।\\n\\nबिंदु:\\n1. घटना की तिथि और समय\\n2. बस संख्या और मार्ग\\n3. चालक का व्यवहार\\n4. यात्रियों पर प्रभाव\\n5. कार्यवाही का अनुरोध","correctAnswer":"प्रेषक का पता:\\n[पूरा पता]\\n\\nदिनांक: [Date]\\n\\nसेवा में,\\nमुख्य प्रबन्धक महोदय\\nस्थानीय प्रशासन निगम\\n[शहर]\\n\\nविषय: बस चालक के अशिष्ट व्यवहार की शिकायत\\n\\nमहोदय,\\n\\n[प्रथम अनुच्छेद - 80-100 शब्द: समस्या का परिचय, घटना की तिथि और समय]\\n\\n[द्वितीय अनुच्छेद - 100-120 शब्द: विस्तृत विवरण - बस संख्या, मार्ग, चालक का व्यवहार, यात्रियों पर प्रभाव]\\n\\n[तृतीय अनुच्छेद - 80-100 शब्द: कार्यवाही का अनुरोध, भविष्य में सुधार की अपेक्षा]\\n\\nआशा है कि आप इस विषय में शीघ्र कार्यवाही करेंगे।\\n\\nभवदीय/प्रार्थी\\n[नाम]","marks":8,"section":"खण्ड-ख पत्र"}

Grammar:
{"questionType":"written","questionText":"(क) निम्नलिखित शब्दों का संधि-विच्छेद कीजिए और संधि का नाम बताइए:\\n(i) महोत्सव\\n(ii) रामायण\\n(iii) सदैव\\n\\n(ख) निम्नलिखित का समास विग्रह करके समास का नाम लिखिए:\\n(i) राजपुत्र","correctAnswer":"(क) संधि-विच्छेद (30-40 शब्द प्रति उत्तर):\\n(i) महोत्सव = महा + उत्सव (गुण संधि - अ + उ = ओ)\\n(ii) रामायण = राम + अयन (अयादि संधि)\\n(iii) सदैव = सदा + एव (वृद्धि संधि - आ + ए = ऐ)\\n\\n(ख) समास विग्रह (30-40 शब्द):\\n(i) राजपुत्र = राजा का पुत्र (तत्पुरुष समास - षष्ठी तत्पुरुष)","marks":3,"section":"खण्ड-ख व्याकरण"}

⚠️ Q19 - व्याकरण प्रश्न (14 marks) - PROPER FORMATTING:
{"questionType":"written","questionText":"प्रश्न 19. व्याकरण प्रश्न:\\n\\n(क) निम्नलिखित शब्दों का संधि-विच्छेद कीजिए और संधि का नाम बताइए (3 अंक):\\n(i) परमौषधि\\n(ii) सदैव\\n(iii) महोत्सव\\n\\n(ख) निम्नलिखित का समास विग्रह करके समास का नाम लिखिए (3 अंक):\\n(i) राजपुत्र\\n(ii) चतुर्भुज\\n(iii) नीलकमल\\n\\n(ग) निम्नलिखित शब्दों में प्रत्यय पहचानिए (2 अंक):\\n(i) लेखक\\n(ii) मानवता\\n\\n(घ) निम्नलिखित शब्दों में उपसर्ग पहचानिए (2 अंक):\\n(i) अनुकूल\\n(ii) प्रगति\\n\\n(ङ) निम्नलिखित शब्दों के पर्यायवाची शब्द लिखिए (2 अंक):\\n(i) पुस्तक\\n(ii) सूर्य\\n\\n(च) निम्नलिखित शब्दों के विलोम शब्द लिखिए (2 अंक):\\n(i) सुख\\n(ii) दिन","correctAnswer":"(क) संधि-विच्छेद:\\n(i) परमौषधि = परम + औषधि (वृद्धि संधि)\\n(ii) सदैव = सदा + एव (वृद्धि संधि)\\n(iii) महोत्सव = महा + उत्सव (गुण संधि)\\n\\n(ख) समास विग्रह:\\n(i) राजपुत्र = राजा का पुत्र (तत्पुरुष समास)\\n(ii) चतुर्भुज = चार भुजाओं वाला (बहुव्रीहि समास)\\n(iii) नीलकमल = नीला है जो कमल (कर्मधारय समास)\\n\\n(ग) प्रत्यय:\\n(i) लेखक में 'अक' प्रत्यय है\\n(ii) मानवता में 'ता' प्रत्यय है\\n\\n(घ) उपसर्ग:\\n(i) अनुकूल में 'अनु' उपसर्ग है\\n(ii) प्रगति में 'प्र' उपसर्ग है\\n\\n(ङ) पर्यायवाची:\\n(i) पुस्तक = ग्रंथ, किताब\\n(ii) सूर्य = रवि, दिनकर\\n\\n(च) विलोम:\\n(i) सुख × दुःख\\n(ii) दिन × रात","marks":14,"section":"खण्ड-ख व्याकरण"}

⚠️ Q20 - संस्कृत और शब्द ज्ञान (14 marks) - PROPER FORMATTING:
{"questionType":"written","questionText":"प्रश्न 20. संस्कृत और शब्द ज्ञान:\\n\\n(क) निम्नलिखित में से किन्हीं दो प्रश्नों के उत्तर संस्कृत में दीजिए (4 अंक):\\n(i) संस्कृत भाषायाः किं महत्त्वं वर्तते?\\n(ii) सिद्धार्थः कः आसीत्?\\n(iii) हस्तिनापुरा कस्य दुहिता आसीत्?\\n(iv) शिक्षायाः उद्देश्यं किम्?\\n\\n(ख) निम्नलिखित शब्दों के अर्थ हिंदी में लिखिए (3 अंक):\\n(i) सर्वसिम्\\n(ii) गंगानर्णी\\n(iii) वसुधा\\n\\n(ग) निम्नलिखित वाक्यों को शुद्ध करके पुनः लिखिए (7 अंक):\\n(i) उसने नौकर को आज्ञा दिया। (2 अंक)\\n(ii) केवल दस रुपया मात्र दीजिए। (2 अंक)\\n(iii) श्रीकृष्ण के अनेकों नाम हैं। (3 अंक)","correctAnswer":"(क) संस्कृत उत्तर (किन्हीं दो):\\n(i) संस्कृत भाषा विश्वस्य सर्वाधिक प्राचीना भाषा अस्ति। एषा भाषा सर्वेषां भाषाणां जननी अस्ति। संस्कृतेन ज्ञानस्य प्रसारः भवति।\\n\\n(ii) सिद्धार्थः शाक्यवंशस्य राजपुत्रः आसीत्। सः कपिलवस्तुनः राज्ञः शुद्धोदनस्य पुत्रः आसीत्। सः भगवान् बुद्धः इति ज्ञायते।\\n\\n(iii) हस्तिनापुरा कुरुराजस्य दुहिता आसीत्। सा अत्यन्तं रूपवती च गुणवती आसीत्। तस्याः विवाहः महान् राजकुमारेण सह अभवत्।\\n\\n(ख) शब्द अर्थ:\\n(i) सर्वसिम् = सबका हित करने वाला\\n(ii) गंगानर्णी = गंगा की नदी\\n(iii) वसुधा = पृथ्वी\\n\\n(ग) शुद्ध वाक्य:\\n(i) उसने नौकर को आज्ञा दी। (क्रिया लिंग सुधार)\\n(ii) केवल दस रुपये दीजिए। (अनावश्यक शब्द हटाया)\\n(iii) श्रीकृष्ण के अनेक नाम हैं। ('अनेकों' के स्थान पर 'अनेक')","marks":14,"section":"खण्ड-ख संस्कृत और शब्द ज्ञान"}

=== IMPORTANT REMINDERS ===
1. गद्यांश MUST be 300-400 words (लगभग 1 page)
2. पद्यांश MUST be 16-20 lines (पूर्ण पद/छंद)
3. Each answer for 2-mark questions: 80-100 words
4. Author/Poet bio: 200-250 words (for 3 marks), 150-180 words (for 2 marks)
5. Essay: 500-600 words total with proper structure
6. Letter: 350-400 words with complete format
7. Sanskrit explanation: 250-300 words
8. All written answers should be DETAILED and COMPREHENSIVE

STRICT RULES:
1. Generate all sections = 100 marks total
2. HINDI language throughout
3. Include OR options where specified
4. Proper word limits for all answers
5. Mix of prose, poetry, Sanskrit, grammar, essay, letter

Return ONLY valid JSON array with all questions. No markdown, no explanation.
`;

    // UP Board Chemistry Class 12 Format - Exact Paper Structure (70 Marks) - Paper Code 347(JZ)
    const upBoardChemistryClass12Format = `
⚠️ CONTENT GENERATION INSTRUCTIONS:
====================================
- Reference NCERT Chemistry textbook (Class 12) and previous UP Board papers
- Use similar question patterns from standard materials
- Include proper chemical equations, formulas, and nomenclature
- Maintain difficulty level appropriate for Class 12

UP BOARD CLASS 12 CHEMISTRY PAPER (रसायन विज्ञान) - TOTAL 70 MARKS
Paper Code: 347(JZ)

TOPIC(S) FOR THIS PAPER: "${topic}"

⚠️⚠️⚠️ CRITICAL - SMART TOPIC INTERPRETATION ⚠️⚠️⚠️
=================================================================

MANDATORY TOPIC HANDLING RULES:
1. ✓ IF GENERAL TOPIC (topic is "Chemistry" or "Chemistry Class 12"):
   → USE VARIETY from ALL units
   → Mix questions from Physical, Organic, and Inorganic Chemistry
   → Cover different chapters: Solutions, Electrochemistry, Chemical Kinetics, d-f block, Coordination Compounds, Haloalkanes, Alcohols, Aldehydes, Amines, Biomolecules, Polymers
   
2. ✗ IF SPECIFIC CHAPTER/TOPIC (e.g., "Electrochemistry", "Coordination Compounds", "Aldehydes and Ketones"):
   → Focus primarily on THAT TOPIC
   → Can include related concepts but emphasize the specified topic

=== PAPER STRUCTURE (Total 70 Marks, 7 Questions) ===

**Questions 1-6: Individual MCQs (6 marks total)**
- Question 1: MCQ (1 mark)
- Question 2: MCQ (1 mark)
- Question 3: MCQ (1 mark)
- Question 4: MCQ (1 mark)
- Question 5: MCQ (1 mark)
- Question 6: MCQ (1 mark)
- Each MCQ has four options (A), (B), (C), (D)
- Topics: Solid solutions, magnetic moment, coordination complexes, organic reactions, IUPAC nomenclature, sugars, reagents, etc.

**Question 7: Short Answer Questions (8 marks)**
- 4 sub-parts × 2 marks = 8 marks
- (क), (ख), (ग), (घ)
- Calculate molality, solubility concepts, oxidation states, geometrical isomers
- Numerical problems and conceptual questions
- Brief answers with proper units and calculations

**Question 8: Short Answer Questions (8 marks)**
- 4 sub-parts × 2 marks = 8 marks (with OR options)
- (क), (ख), (ग), (घ)
- Explain chemical reactions, distinguish between compounds, name reactions
- Give examples of vitamins and deficiency diseases
- Conceptual understanding questions

**Question 9: Numerical/Theory Questions (12 marks)**
- 4 parts with calculations and theory
- Raoult's Law calculations
- Electrochemistry: resistance, conductivity, molar conductivity
- Explain chemical concepts with proper reasoning
- Order of reaction calculations

**Question 10: Theory Questions (12 marks)**
- 4 parts with detailed explanations
- Kohlrausch Law calculations
- Conductivity concepts
- Chemical kinetics
- Differentiate between concepts
- IUPAC nomenclature of complexes
- Oxidation states and coordination chemistry
- DNA and RNA differences

**Question 11: Organic Chemistry (12 marks)**
- Structure and IUPAC names (5 compounds)
- OR: Explain chemical reactions/mechanisms
- Conversion reactions with equations (5 conversions)
- OR: Synthesis reactions
- Chemical equations must be balanced and accurate

**Question 12: Organic Chemistry Concepts (12 marks)**
- Define terms with examples (5 terms like Aldol, Schiff's base, Cannizaro's reaction, Oxime, Acetal)
- OR: Write reaction products (5 reactions with proper chemical equations)
- Arrange in order (5 comparisons): pKb, basic strength, boiling point, solubility
- OR: Give reasons for chemical properties (3 reasons)

=== MARKS DISTRIBUTION ===
- Questions 1-6: 6 marks total (Individual MCQs, 1 mark each)
- Question 7: 8 marks (Short answers - 4 sub-parts × 2 marks)
- Question 8: 8 marks (Short answers with OR - 4 sub-parts × 2 marks)
- Question 9: 12 marks (Numerical/calculations)
- Question 10: 12 marks (Theory/concepts)
- Question 11: 12 marks (Organic - structures/conversions with OR)
- Question 12: 12 marks (Organic - definitions/orders with OR)
TOTAL: 70 marks

=== MAJOR TOPICS (Class 12 Chemistry) ===

**Physical Chemistry:**
- Solutions: Molality, molarity, mole fraction, Raoult's Law, colligative properties
- Electrochemistry: Conductivity, molar conductivity, Kohlrausch Law, electrochemical cells
- Chemical Kinetics: Rate of reaction, order of reaction, molecularity, rate constant
- Surface Chemistry: Adsorption, catalysis, colloids

**Inorganic Chemistry:**
- d and f Block Elements: Electronic configuration, oxidation states, magnetic properties
- Coordination Compounds: IUPAC nomenclature, isomerism (geometrical, optical), magnetic moment, hybridization, VBT, CFT
- Lanthanides and Actinides: Properties, oxidation states

**Organic Chemistry:**
- Haloalkanes and Haloarenes: IUPAC names, reactions, SN1, SN2 mechanisms
- Alcohols, Phenols and Ethers: Preparation, reactions, acidity
- Aldehydes and Ketones: Preparation, nucleophilic addition, Aldol, Cannizaro, Clemmensen, Wolf-Kishner
- Amines: Classification, basicity, Gabriel phthalimide synthesis, diazotization
- Biomolecules: Carbohydrates, proteins, vitamins, nucleic acids
- Polymers: Types, preparation, examples

=== ANSWER LENGTH GUIDELINES ===
- 1 mark (MCQ): Select correct option only
- 2 marks: 30-40 words, brief explanation with equations where needed
- 3 marks: 50-60 words, detailed explanation
- 4 marks: 80-100 words, comprehensive answer with examples/equations
- Chemical equations must be balanced and complete
- Include structural formulas where necessary
- Use proper IUPAC nomenclature

=== JSON STRUCTURE EXAMPLES ===

MCQ (1 mark):
{"questionType":"mcq","questionText":"एक ऐसे ठोस विलयन का उदाहरण दीजिए जिसमें विलेय गैस हो।","options":["(A) जल में घुली हुई ऑक्सीजन","(B) नाइट्रोजन में कपूर का विलयन","(C) पैलेडियम में हाइड्रोजन का विलयन","(D) जल में घुला हुआ ग्लूकोज"],"correctOption":2,"marks":1,"section":"Question 1 - MCQ"}

Short Answer (2 marks):
{"questionType":"written","questionText":"5.0 g एथेनोइक अम्ल (CH₃COOH) के 150.0 g बेन्जीन में विलयन की मोललता की गणना कीजिए।","correctAnswer":"दिया है:\\nएथेनोइक अम्ल का द्रव्यमान = 5.0 g\\nबेन्जीन का द्रव्यमान = 150.0 g = 0.150 kg\\nCH₃COOH का मोलर द्रव्यमान = 60 g/mol\\n\\nमोलों की संख्या = 5.0/60 = 0.0833 mol\\n\\nमोललता (m) = मोलों की संख्या / विलायक का द्रव्यमान (kg)\\nm = 0.0833 / 0.150 = 0.555 mol/kg\\n\\nउत्तर: मोललता = 0.555 m या 0.56 m","marks":2,"section":"Question 2"}

Numerical Problem (3 marks):
{"questionType":"written","questionText":"राउल्ट का नियम समझाइए। 298 K पर क्लोरोफॉर्म (CHCl₃) एवं डाइक्लोरोमेथेन (CH₂Cl₂) के वाष्पदाब क्रमशः 200 mm Hg व 4.5 mm Hg हैं। 51 g CHCl₃ व 20 g CH₂Cl₂ को मिलाकर बने विलयन के वाष्पदाब की गणना 298 K पर कीजिए।","correctAnswer":"राउल्ट का नियम: किसी विलयन में वाष्पशील विलायक का आंशिक वाष्पदाब, विलयन में उसके मोल अंश के समानुपाती होता है।\\nP = P° × X\\n\\nगणना:\\nCHCl₃ का मोलर द्रव्यमान = 119.5 g/mol\\nCH₂Cl₂ का मोलर द्रव्यमान = 85 g/mol\\n\\nn₁ (CHCl₃) = 51/119.5 = 0.427 mol\\nn₂ (CH₂Cl₂) = 20/85 = 0.235 mol\\nकुल मोल = 0.662 mol\\n\\nX₁ = 0.427/0.662 = 0.645\\nX₂ = 0.235/0.662 = 0.355\\n\\nP₁ = 200 × 0.645 = 129 mm Hg\\nP₂ = 4.5 × 0.355 = 1.6 mm Hg\\n\\nकुल वाष्पदाब = P₁ + P₂ = 129 + 1.6 = 130.6 mm Hg","marks":3,"section":"Question 4"}

Organic Structure (2 marks per compound):
{"questionType":"written","questionText":"sec-butyl chloride का संरचनात्मक सूत्र तथा IUPAC नाम लिखिए।","correctAnswer":"संरचनात्मक सूत्र:\\n    CH₃\\n    |\\nCH₃-CH-CH₂Cl\\n\\nIUPAC नाम: 2-क्लोरोब्यूटेन (2-Chlorobutane)","marks":2,"section":"Question 6"}

Chemical Reaction (1 mark):
{"questionType":"written","questionText":"Wurtz अभिक्रिया को उपयुक्त रासायनिक समीकरण द्वारा समझाइए।","correctAnswer":"Wurtz अभिक्रिया: ऐल्किल हैलाइड की सोडियम धातु के साथ शुष्क ईथर में अभिक्रिया से उच्च ऐल्केन बनता है।\\n\\n2R-X + 2Na ---शुष्क ईथर---> R-R + 2NaX\\n\\nउदाहरण:\\n2CH₃-Cl + 2Na ---शुष्क ईथर---> CH₃-CH₃ + 2NaCl\\n         (मेथिल क्लोराइड)        (एथेन)","marks":1,"section":"Question 3"}

=== IMPORTANT REMINDERS ===
1. All chemical equations must be balanced
2. Use proper chemical formulas and IUPAC nomenclature
3. Include units in all numerical answers
4. Show step-by-step calculations
5. Structural formulas should be clear
6. Include proper reaction conditions
7. OR options should be of similar difficulty

Return ONLY valid JSON array with all questions. No markdown, no explanation.
`;

    // UP Board English Class 12 Format - Exact Paper Structure (100 Marks) - Paper Code 316(HV)
    const upBoardEnglishClass12Format = `
⚠️ CONTENT GENERATION INSTRUCTIONS:
====================================
- You can reference NCERT English textbook (Class 12) and previous UP Board papers
- Use similar question patterns and concepts from standard materials
- Modify details slightly to create variations
- Paraphrase questions to avoid exact word-for-word copies
- Maintain the same difficulty level and concept coverage

YOU ARE GENERATING UP BOARD CLASS 12 ENGLISH PAPER (अंग्रेजी) - TOTAL 100 MARKS
Paper Code: 316(HV)

TOPIC(S) FOR THIS PAPER: "${topic}"

⚠️⚠️⚠️ CRITICAL - SMART TOPIC INTERPRETATION ⚠️⚠️⚠️
=================================================================
**UNDERSTAND THE TOPIC TYPE FIRST - THEN FOLLOW THE RULES BELOW:**

MANDATORY TOPIC HANDLING RULES:
================================

1. ✓ **IF GENERAL TOPIC** (topic is "English" or "English Class 12"):
   → USE VARIETY from MULTIPLE chapters/topics
   → Reading: General comprehension passage
   → Writing: Various topics for articles and letters
   → Literature: Mix questions from different chapters and poems
   → This gives students COMPREHENSIVE practice across all topics
   
2. ✗ **IF SPECIFIC CHAPTER/TOPIC** (e.g., "The Last Lesson", "Lost Spring", "Deep Water"):
   → Focus on THAT TOPIC
   → Literature questions should be from that chapter/poem
   → Reading passage can be related to the theme
   
=== PAPER STRUCTURE (Total 100 Marks) ===

**SECTION - A: READING (25 marks)**
- Question 1: Unseen Passage (400-450 words)
  * (a) 3 marks - Comprehension question
  * (b) 3 marks - Comprehension question
  * (c) 3 marks - Comprehension question
  * (d) 3 marks - Comprehension question
  * (e) Vocabulary (3 parts):
    - (i) 1 mark - Find word meaning
    - (ii) 1 mark - Find word meaning
    - (iii) 1 mark - Find opposite word
  * Total: 3+3+3+3+1+1+1 = 15 marks

- Question 1 continued or Question 2: Additional passage questions = 10 marks
  * Total Section A = 25 marks

**SECTION - B: WRITING (20 marks)**
- Question 2: Article Writing (10 marks)
  * Topics: Social issues, current affairs, environmental concerns
  * Word limit: 100-150 words
  * 3 topic options provided, student chooses one
  
- Question 3: Letter/Application (10 marks) with OR option
  * Formal letter OR Application
  * Word limit: 100-120 words
  * Examples: Letter to DM, Principal application, complaint letter

**SECTION - C: GRAMMAR (15 marks)**
- Question 4: Multiple Choice Questions (10 marks)
  * 5 questions × 2 marks = 10 marks
  * Topics: Vocabulary, idioms, synonyms, sentence correction
  
- Question 5 or 6: Translation (5 marks)
  * Hindi to English translation
  * 3-4 sentences in Hindi
  * Proper grammar and vocabulary required

**SECTION - D: LITERATURE (40 marks)**

Prose/Fiction Questions:
- Question 7: Short Answer (8 marks) - 4+4 = 8 marks
  * Two parts (a) and (b), each with OR option
  * Answer in about 40 words each
  * Based on prose chapters

- Question 8: Long Answer (7 marks)
  * Answer any ONE from 2 options
  * Answer in about 80 words
  * Based on prose chapters

Poetry Questions:
- Question 9: Extract-based Questions (6 marks) - 3×2 = 6 marks
  * Poetry extract given
  * Three questions based on the extract
  * 2 marks each

- Question 10: Central Idea (4 marks)
  * Write central idea of any ONE poem from 3 options
  * 50-60 words

Supplementary Reader/Vistas:
- Question 11: Short Answer (8 marks) - 4+4 = 8 marks
  * Two parts (a) and (b), each with OR option
  * Answer in about 40 words each

- Question 12: Long Answer (7 marks)
  * Answer any ONE from 2 options
  * Answer in about 80 words

=== MAJOR TOPICS (Class 12 English) ===

**Prose (Flamingo):**
- The Last Lesson
- Lost Spring
- Deep Water
- The Rattrap
- Indigo
- Poets and Pancakes
- The Interview
- Going Places

**Poetry (Flamingo):**
- My Mother at Sixty-six
- An Elementary School Classroom in a Slum
- Keeping Quiet
- A Thing of Beauty
- A Roadside Stand
- Aunt Jennifer's Tigers

**Supplementary (Vistas):**
- The Third Level
- The Tiger King
- The Enemy
- On the Face of It
- Memories of Childhood
- Should Wizard Hit Mommy

=== ANSWER LENGTH GUIDELINES ===

- 1-2 mark questions: 20-30 words, direct and precise
- 3 mark questions: 40-50 words, 2-3 main points
- 4 mark questions: 50-60 words, 3-4 main points with explanation
- 7-8 mark questions: 80-100 words, comprehensive answer with examples
- 10 mark questions: 100-150 words, well-structured with introduction and conclusion

=== JSON STRUCTURE FOR EACH QUESTION ===

For Reading Comprehension:
{
  "questionType": "written",
  "questionText": "[Passage text]\n\n(a) Question 1\n(b) Question 2\n(c) Question 3\n(d) Question 4\n(e) (i) Vocabulary (ii) Vocabulary (iii) Opposite word",
  "correctAnswer": "(a) Answer in 40-50 words\n(b) Answer in 40-50 words\n(c) Answer in 40-50 words\n(d) Answer in 40-50 words\n(e) (i) Word (ii) Word (iii) Word",
  "marks": 15,
  "section": "Section-A Reading"
}

For Article Writing:
{
  "questionType": "written",
  "questionText": "Write an article on any ONE of the following topics in about 100-150 words:\n(a) Topic 1\n(b) Topic 2\n(c) Topic 3",
  "correctAnswer": "[Sample article 100-150 words with title, introduction, body paragraphs, conclusion]",
  "marks": 10,
  "section": "Section-B Writing - Article"
}

For Letter/Application (with OR):
{
  "questionType": "written",
  "questionText": "Main prompt\n\nOR\n\nAlternative prompt",
  "correctAnswer": "Main letter format\n\nOR\n\nAlternative letter format",
  "marks": 10,
  "section": "Section-B Writing - Letter/Application"
}

For Grammar MCQs:
{
  "questionType": "mcq",
  "questionText": "Question text",
  "options": ["(i) Option 1", "(ii) Option 2", "(iii) Option 3", "(iv) Option 4"],
  "correctOption": 0,
  "marks": 2,
  "section": "Section-C Grammar - MCQ"
}

For Translation:
{
  "questionType": "written",
  "questionText": "Translate the following passage into English:\n\n[Hindi text]",
  "correctAnswer": "[English translation]",
  "marks": 5,
  "section": "Section-C Grammar - Translation"
}

For Literature Short Answer (with OR):
{
  "questionType": "written",
  "questionText": "(a) Question 1\n\nOR\n\nAlternative question\n\n(b) Question 2\n\nOR\n\nAlternative question",
  "correctAnswer": "(a) Answer in 40 words\n\nOR\n\nAlternative answer\n\n(b) Answer in 40 words\n\nOR\n\nAlternative answer",
  "marks": 8,
  "section": "Section-D Literature - Short Answer"
}

For Literature Long Answer:
{
  "questionType": "written",
  "questionText": "Answer any ONE:\n(a) Question 1\n(b) Question 2",
  "correctAnswer": "Comprehensive answer in 80 words with introduction, main points, examples, and conclusion",
  "marks": 7,
  "section": "Section-D Literature - Long Answer"
}

For Poetry Extract:
{
  "questionType": "written",
  "questionText": "Read the following extract and answer:\n\n[Poetry lines]\n\n(a) Question 1\n(b) Question 2\n(c) Question 3",
  "correctAnswer": "(a) Answer (20-30 words)\n(b) Answer (20-30 words)\n(c) Answer (20-30 words)",
  "marks": 6,
  "section": "Section-D Literature - Poetry"
}

For Central Idea:
{
  "questionType": "written",
  "questionText": "Write the central idea of any ONE:\n(a) Poem 1\n(b) Poem 2\n(c) Poem 3",
  "correctAnswer": "Central idea in 50-60 words covering theme, message, poetic devices, and significance",
  "marks": 4,
  "section": "Section-D Literature - Central Idea"
}
`;

    // UP Board Biology Format - Exact Paper Structure (70 Marks) - Paper Code 348(KH)
    const upBoardBiologyFormat = `
⚠️ CONTENT GENERATION INSTRUCTIONS:
====================================
- You can reference NCERT Biology textbook (Class 12) and previous UP Board papers
- Use similar question patterns and concepts from standard materials
- Modify details slightly to create variations
- Paraphrase questions to avoid exact word-for-word copies
- Maintain the same difficulty level and concept coverage

YOU ARE GENERATING UP BOARD CLASS 12 BIOLOGY PAPER (जीव विज्ञान) - TOTAL 70 MARKS
Paper Code: 348(KH)

TOPIC(S) FOR THIS PAPER: "${topic}"

⚠️⚠️⚠️ CRITICAL - SMART TOPIC INTERPRETATION ⚠️⚠️⚠️
=================================================================
**UNDERSTAND THE TOPIC TYPE FIRST - THEN FOLLOW THE RULES BELOW:**

MANDATORY TOPIC HANDLING RULES:
================================

1. ✓ **IF GENERAL TOPIC** (topic is "जीव विज्ञान" or "Biology" or "Bio"):
   → USE VARIETY from MULTIPLE DIFFERENT chapters/topics
   → MCQs: Distribute across Reproduction, Genetics, Evolution, Biotechnology, Ecology, etc.
   → Short Answer: Use different topics for different questions
   → Long Answer: Cover major topics with OR options
   → This gives students COMPREHENSIVE practice across all topics
   
2. ✗ **IF SPECIFIC CHAPTER/TOPIC** (e.g., "Reproduction", "Genetics", "DNA Replication", "Biotechnology"):
   → ALL questions from THAT TOPIC ONLY
   → MCQs: All questions on that specific topic
   → Short Answer: All questions from that topic only
   → Long Answer: All questions from that topic
   → DO NOT mix other topics/chapters
   
3. **IF SPECIFIC UNIT** (e.g., "Reproduction and Development", "Genetics and Evolution"):
   → ALL questions from THAT UNIT ONLY
   → Distribute across relevant chapters within that unit
   → Example: "Genetics" = Mendelian genetics, Molecular basis, DNA replication, etc.

=== PAPER STRUCTURE (Total 70 Marks) ===

**खण्ड-अ (Part-A) - बहुविकल्पीय प्रश्न (MCQs)**
- प्रश्न 1: (क), (ख), (ग), (घ) = 4 parts × 1 mark = 4 marks
- Bilingual format (Hindi / English)
- Options: (A), (B), (C), (D)

**खण्ड-ब (Part-B) - अति-लघु उत्तरीय प्रश्न (Very Short Answer)**
- प्रश्न 2: (क), (ख), (ग), (घ), (ड़) = 5 parts × 1 mark = 5 marks
- Answer length: 1-2 sentences (20-30 words)
- Topics: Definitions, full forms, names, basic concepts

**खण्ड-ग (Part-C) - लघु-उत्तरीय प्रश्न (Short Answer Type I)**
- प्रश्न 3: (क), (ख), (ग), (घ), (ड़) = 5 parts × 2 marks = 10 marks
- Answer length: 50-80 words
- Topics: Short notes, brief descriptions

**खण्ड-घ (Part-D) - लघु-उत्तरीय प्रश्न (Short Answer Type II)**
- प्रश्न 4: (क), (ख), (ग), (घ) = 4 parts × 3 marks = 12 marks
- Answer length: 80-120 words
- Some parts may have sub-questions (1+2=3 marks)
- Topics: Detailed short answers, diagrams

- प्रश्न 5: (क), (ख), (ग), (घ) = 4 parts × 3 marks = 12 marks
- Answer length: 80-120 words
- Some parts may have sub-questions (1+2=3 marks)
- Topics: Detailed short answers, processes

- प्रश्न 6: (क), (ख), (ग), (घ) = 4 parts × 3 marks = 12 marks
- Answer length: 80-120 words
- Some parts may have fractional marking (1½+1½=3 marks)
- Topics: Detailed descriptions, diagrams

**खण्ड-ङ (Part-E) - विस्तृत-उत्तरीय प्रश्न (Long Answer)**
- प्रश्न 7: 5 marks (with OR option)
  - Format: Main question / अथवा / OR / Alternative question
  - Answer length: 150-200 words
  - Marking: May be split (1+1+3=5 or 2+3=5)
  - Topics: Detailed processes, mechanisms

- प्रश्न 8: 5 marks (with OR option)
  - Format: Main question / अथवा / OR / Alternative question
  - Answer length: 150-200 words
  - Topics: Essays, detailed explanations, diagrams

- प्रश्न 9: 5 marks (with OR option)
  - Format: Main question / अथवा / OR / Alternative question
  - Answer length: 150-200 words
  - Topics: Ecosystem, biodiversity, conservation

=== MAJOR TOPICS (Class 12 Biology) ===

1. **Reproduction (प्रजनन)**:
   - Asexual and Sexual reproduction
   - Human reproduction system
   - Reproductive health

2. **Genetics (आनुवंशिकी)**:
   - Mendelian inheritance
   - Chromosomal theory
   - DNA structure and replication
   - Gene expression

3. **Evolution (जैव विकास)**:
   - Origin of life
   - Natural selection
   - Evidence of evolution

4. **Biotechnology (जैव प्रौद्योगिकी)**:
   - Genetic engineering
   - GMO
   - Applications (A.R.T., G.M.O.)

5. **Ecology and Environment (पारिस्थितिकी)**:
   - Ecosystem
   - Biodiversity
   - Conservation
   - Environmental issues

6. **Human Health (मानव स्वास्थ्य)**:
   - Immunity
   - Diseases
   - Drug abuse

=== ANSWER LENGTH GUIDELINES ===

- 1-mark questions (MCQ + Very Short): Direct answer, 1-2 sentences (20-30 words)
- 2-mark questions: 2-3 main points, 50-80 words
  * Brief explanation
  * Key concepts
- 3-mark questions: 3-4 main points, 80-120 words
  * Detailed explanation
  * Examples or diagrams if needed
- 5-mark questions: 5-6 main points, 150-200 words
  * Comprehensive explanation
  * Multiple aspects covered
  * Diagrams/examples where relevant
  * Conclusion

=== JSON STRUCTURE FOR EACH QUESTION ===

For MCQs (Q1 parts):
{
  "questionType": "mcq",
  "questionText": "हिंदी प्रश्न / English Question",
  "options": [
    "(A) हिंदी / English",
    "(B) हिंदी / English",
    "(C) हिंदी / English",
    "(D) हिंदी / English"
  ],
  "correctOption": 0-3,
  "marks": 1,
  "section": "खण्ड-अ (Part-A) बहुविकल्पीय (1 अंक)"
}

For Very Short Answer (Q2 parts):
{
  "questionType": "written",
  "questionText": "हिंदी प्रश्न / English Question",
  "correctAnswer": "Brief answer in 20-30 words",
  "marks": 1,
  "section": "खण्ड-ब (Part-B) अति-लघु उत्तरीय (1 अंक)"
}

For Short Answer Type I (Q3 parts):
{
  "questionType": "written",
  "questionText": "हिंदी प्रश्न / English Question",
  "correctAnswer": "Answer in 50-80 words with 2-3 main points",
  "marks": 2,
  "section": "खण्ड-ग (Part-C) लघु-उत्तरीय प्रथम (2 अंक)"
}

For Short Answer Type II (Q4/Q5/Q6 parts):
{
  "questionType": "written",
  "questionText": "हिंदी प्रश्न / English Question",
  "correctAnswer": "Answer in 80-120 words with 3-4 main points. Include diagrams if asked.",
  "marks": 3,
  "section": "खण्ड-घ (Part-D) लघु-उत्तरीय द्वितीय (3 अंक)"
}

For Long Answer (Q7/Q8/Q9):
{
  "questionType": "written",
  "questionText": "Main question in Hindi and English\n\nअथवा / OR\n\nAlternative question in Hindi and English",
  "correctAnswer": "Main question answer (150-200 words, 5-6 main points)\n\nअथवा / OR\n\nAlternative question answer (150-200 words, 5-6 main points)",
  "marks": 5,
  "section": "खण्ड-ङ (Part-E) विस्तृत-उत्तरीय (5 अंक)"
}

=== EXAMPLE QUESTIONS ===

MCQ Example:
{
  "questionText": "Tt अलील जोड़ा है / Tt alleles are pair of:\n(A) समयुग्मजी लम्बा / Homozygous long\n(B) विषमयुग्मजी लम्बा / Heterozygous long\n(C) समयुग्मजी बौना / Homozygous dwarf\n(D) विषमयुग्मजी बौना / Heterozygous dwarf",
  "correctOption": 1
}

Very Short Answer Example:
{
  "questionText": "आर्.टी. एक. का पूर्ण रूप लिखिए / Write the full form of abbreviation I.V.F.",
  "correctAnswer": "I.V.F. stands for In Vitro Fertilization (इन विट्रो फर्टिलाइजेशन). यह सहायक प्रजनन तकनीक है जिसमें शरीर के बाहर निषेचन कराया जाता है।"
}

Short Answer (2 marks) Example:
{
  "questionText": "ह्यूमस पर संक्षिप्त टिप्पणी लिखिए / Write a short note on Humus.",
  "correctAnswer": "Humus (ह्यूमस) मिट्टी की ऊपरी परत में पाया जाने वाला कार्बनिक पदार्थ है। यह मृत पौधों और जंतुओं के अपघटन से बनता है। ह्यूमस मिट्टी को उपजाऊ बनाता है, जल धारण क्षमता बढ़ाता है, और पोषक तत्व प्रदान करता है।"
}

Short Answer (3 marks) Example:
{
  "questionText": "आर.एन.ए. के सभी प्रकार के नाम लिखिए / Write the name of all types of RNA found in prokaryotes.",
  "correctAnswer": "Prokaryotes में तीन प्रकार के RNA पाए जाते हैं:\n1. mRNA (Messenger RNA): DNA से genetic information को ribosomes तक पहुंचाता है\n2. rRNA (Ribosomal RNA): Ribosomes का structural component है और protein synthesis में मदद करता है\n3. tRNA (Transfer RNA): Amino acids को ribosomes तक लाता है और protein synthesis में सहायक है"
}

Long Answer (5 marks) Example:
{
  "questionText": "परागण किसे कहते हैं ? परागण कितने प्रकार के होते हैं ? उदाहरण सहित वर्णन कीजिए।\n\nअथवा / OR\n\nWhat is Pollination ? How many types of pollination are there ? Describe with examples.",
  "correctAnswer": "परागण (Pollination) वह प्रक्रिया है जिसमें परागकण परागकोश से स्त्रीकेसर के वर्तिकाग्र तक पहुंचते हैं।\n\nपरागण के प्रकार:\n1. स्वपरागण (Self-pollination): जब परागकण उसी पुष्प या उसी पौधे के अन्य पुष्प के वर्तिकाग्र पर पहुंचते हैं। उदाहरण: मटर, टमाटर\n2. परपरागण (Cross-pollination): जब परागकण एक पौधे से दूसरे पौधे के पुष्प के वर्तिकाग्र पर पहुंचते हैं। उदाहरण: पपीता, मक्का\n\nपरपरागण के माध्यम: हवा (Wind), कीट (Insects), पानी (Water), जंतु (Animals)\n\nलाभ: Genetic variation बढ़ता है, स्वस्थ संतति उत्पन्न होती है, और प्रजाति में विविधता आती है।\n\nअथवा / OR\n\nPollination is the process of transfer of pollen grains from anther to the stigma of a flower.\n\nTypes of Pollination:\n1. Self-pollination: Transfer of pollen within the same flower or between flowers of the same plant. Example: Pea, Tomato\n2. Cross-pollination: Transfer of pollen from one plant to the stigma of another plant. Example: Papaya, Maize\n\nAgents: Wind, Insects, Water, Animals\n\nAdvantages: Increases genetic variation, produces healthy offspring, brings diversity in species."
}
`;

    // UP Board Mathematics Format - Exact Paper Structure (70 Marks) - Paper Code 822(BV)
    const upBoardMathsFormat = `
⚠️ CONTENT GENERATION INSTRUCTIONS:
====================================
- You can reference NCERT textbook and previous UP Board papers
- Use similar question patterns and concepts from standard materials
- Modify numerical values slightly to create variations
- Paraphrase questions to avoid exact word-for-word copies
- Maintain the same difficulty level and concept coverage

YOU ARE GENERATING UP BOARD CLASS 10 MATHEMATICS PAPER (गणित) - TOTAL 70 MARKS
Paper Code: 822(BV) | Roll No: 928 | Paper ID: 2162159 | Total Questions: 25

TOPIC(S) FOR THIS PAPER: "${topic}"

⚠️⚠️⚠️ CRITICAL - SMART TOPIC INTERPRETATION ⚠️⚠️⚠️
=================================================================
**UNDERSTAND THE TOPIC TYPE FIRST - THEN FOLLOW THE RULES BELOW:**

MANDATORY TOPIC HANDLING RULES:
================================

1. ✓ **IF GENERAL TOPIC** (topic is "गणित" or "Mathematics" or "Maths"):
   → USE VARIETY from MULTIPLE DIFFERENT chapters/topics
   → MCQs: Distribute across 6-8 different chapters (त्रिकोणमिति, निर्देशांक ज्यामिति, समान्तर श्रेढ़ी, सांख्यिकी, प्रायिकता, क्षेत्रमिति, etc.)
   → Descriptive: Use different chapters for different questions
   → This gives students COMPREHENSIVE practice across all topics
   
2. ✗ **IF SPECIFIC CHAPTER** (e.g., "त्रिकोणमिति", "समान्तर श्रेढ़ी", "Coordinate Geometry"):
   → ALL 25 questions from THAT CHAPTER ONLY
   → MCQs: All 20 questions on that specific chapter (vary subtopics within it)
   → Descriptive: All 5 question sets from that chapter only
   → DO NOT mix other chapters
   
3. **IF MULTIPLE SPECIFIC CHAPTERS** (e.g., "द्विघात समीकरण, त्रिकोणमिति"):
   → Distribute ALL 25 questions ONLY across these specified chapters
   → Example: 10 MCQs from each chapter
   → DO NOT add any other chapters

⚠️ KEY DISTINCTION:
   • "गणित"/"Mathematics" = VARIETY needed (different chapters)
   • "त्रिकोणमिति" = FOCUSED (only that chapter)

${difficultyNote}

EXACT PAPER STRUCTURE (70 Marks):
==================================

खण्ड 'अ' / SECTION 'A' (बहुविकल्पीय प्रश्न / Multiple Choice Questions) - 20 Marks
- 20 MCQs × 1 mark each = 20 marks
- **IMPORTANT**: Follow topic rules above
- Format: 4 options (A), (B), (C), (D)
- BILINGUAL: "हिंदी प्रश्न / English Question"

खण्ड 'ब' / SECTION 'B' (वर्णनात्मक प्रश्न / Descriptive Questions) - 50 Marks

1. प्रश्न 1 (Question 1) - सभी खण्ड कीजिए / Do all parts - 12 Marks
   - 6 parts: (क), (ख), (ग), (घ), (ङ), (च) OR (a), (b), (c), (d), (e), (f)
   - Each part = 2 marks
   - Total = 6 × 2 = 12 marks
   - All parts are COMPULSORY
   - Section value: "खण्ड-ब (Part-B) प्र.1 (2 अंक प्रत्येक)"

2. प्रश्न 2 (Question 2) - किन्हीं पाँच खण्डों को हल कीजिए / Do any five parts - 20 Marks
   - 6 parts given: (क), (ख), (ग), (घ), (ङ), (च) OR (a), (b), (c), (d), (e), (f)
   - Student attempts any 5 parts
   - Each part = 4 marks
   - Total = 5 × 4 = 20 marks (but generate 6 parts)
   - Section value: "खण्ड-ब (Part-B) प्र.2 (4 अंक प्रत्येक)"

3. प्रश्न 3 (Question 3) - अथवा सहित / With OR option - 6 Marks
   - One 6-mark question with अथवा / OR alternative
   - Section value: "खण्ड-ब (Part-B) प्र.3 (6 अंक)"

4. प्रश्न 4 (Question 4) - अथवा सहित / With OR option - 6 Marks
   - One 6-mark question with अथवा / OR alternative
   - Section value: "खण्ड-ब (Part-B) प्र.4 (6 अंक)"

5. प्रश्न 5 (Question 5) - अथवा सहित / With OR option - 6 Marks
   - One 6-mark question with अथवा / OR alternative
   - Section value: "खण्ड-ब (Part-B) प्र.5 (6 अंक)"

GRAND TOTAL: 25 question sets = 70 marks
(20 MCQs + 1 set of 6 parts(2m each) + 1 set of 6 parts(4m each, do 5) + 3 questions(6m each))

=== MCQ GENERATION FOR खण्ड 'अ' (Q1-20) ===
⚠️⚠️⚠️ CRITICAL - TOPIC INTERPRETATION RULES ⚠️⚠️⚠️
===============================================================
RECEIVED TOPIC: "${topic}"

**SMART TOPIC DETECTION:**

✓ GENERAL TOPICS (Use variety from DIFFERENT chapters):
  - "गणित" / "Mathematics" / "Maths" / "Math"
  - Any variation of general math terms
  → Generate questions from MULTIPLE different chapters:
     • त्रिकोणमिति (Trigonometry) 
     • निर्देशांक ज्यामिति (Coordinate Geometry)
     • समान्तर श्रेढ़ी (Arithmetic Progression)
     • द्विघात समीकरण (Quadratic Equations)
     • सांख्यिकी (Statistics)
     • प्रायिकता (Probability)
     • क्षेत्रमिति (Mensuration)
     • चतुर्भुज (Quadrilaterals)
     • त्रिभुज (Triangles)
     • वृत्त (Circles)
  → Distribute MCQs across 5-8 different chapters for variety

✗ SPECIFIC CHAPTER (Use ONLY that chapter):
  - "त्रिकोणमिति" / "Trigonometry"
  - "समान्तर श्रेढ़ी" / "Arithmetic Progression" / "AP"
  - "निर्देशांक ज्यामिति" / "Coordinate Geometry"
  - "सांख्यिकी" / "Statistics"
  - "प्रायिकता" / "Probability"
  - Any specific chapter name
  → ALL 20 MCQs from that specific chapter ONLY
  → Do NOT mix other chapters

BILINGUAL FORMAT REQUIRED for ALL MCQs:
Question format: "हिंदी में प्रश्न / Question in English:"
Options format: (A) "हिंदी" / "English" (B) ... (C) ... (D) ...

**MCQ DISTRIBUTION RULES:**

✓ IF General Topic ("गणित"/"Mathematics"):
→ ONLY THEN use variety from these standard topics:
1-2.   वास्तविक संख्याएं / Real Numbers: HCF/LCM, भाज्य गुणनखण्डन, परिमेय/अपरिमेय
3-4.   बहुपद / Polynomials: शून्यक और गुणांकों में संबंध, विभाजन एल्गोरिथ्म
5-6.   द्विघात समीकरण / Quadratic Equations: मूल की प्रकृति, विवेचक
7-8.   समान्तर श्रेढ़ी / AP: सार्व-अन्तर, nवां पद, प्रथम n पदों का योग
9-10.  निर्देशांक ज्यामिति / Coordinate Geometry: दूरी सूत्र, विभाजन बिंदु
11-12. त्रिकोणमिति / Trigonometry: त्रिकोणमितीय अनुपात, मान, सर्वसमिकाएँ
13-14. वृत्त / Circles: स्पर्श रेखा, त्रिज्या, जीवा
15-16. क्षेत्रमिति / Mensuration: शंकु/बेलन/गोला का आयतन/क्षेत्रफल
17-18. सांख्यिकी / Statistics: माध्य/माध्यिका/बहुलक, बारंबारता सारणी
19-20. प्रायिकता / Probability: सैद्धांतिक प्रायिकता, पासा/सिक्का

=== प्रश्न 1 FORMAT (12 अंक - 6 × 2) - सभी भाग अनिवार्य ===
⚠️⚠️⚠️ TOPIC RULE: "${topic}" ⚠️⚠️⚠️

Generate 6 parts with 2 marks each. All parts MUST be answered:

✓ **IF General Topic** ("गणित"/"Mathematics"): 
→ Use VARIETY - Each part from DIFFERENT chapter
→ Example: (क) Trigonometry, (ख) Coordinate Geometry, (ग) AP, (घ) Quadratic, (ङ) Statistics, (च) Probability

✗ **IF Specific Chapter** (e.g., "त्रिकोणमिति"): 
→ ALL 6 parts from that chapter ONLY (vary problem types within trigonometry)
✗ **IF Specific Chapter** (e.g., "त्रिकोणमिति"): 
→ ALL 6 parts from that chapter ONLY (vary problem types within trigonometry)

Example formats (showing variety for general topic):
- क्षेत्रमिति: शंकु/बेलन/गोला का आयतन या पृष्ठीय क्षेत्रफल
- वास्तविक संख्याएं: HCF या LCM अभाज्य गुणनखंडन विधि द्वारा
- निर्देशांक ज्यामिति: रेखाखंड विभाजन, दूरी सूत्र
- त्रिकोणमिति: मान ज्ञात करना, सर्वसमिका सिद्ध करना
- समान्तर श्रेढ़ी: nवां पद, सार्व-अन्तर, योग ज्ञात करना
- द्विघात समीकरण: विवेचक, मूलों की प्रकृति

=== प्रश्न 2 FORMAT (20 अंक - किन्हीं 5 × 4) ===
⚠️⚠️⚠️ TOPIC RULE: "${topic}" ⚠️⚠️⚠️

Generate 6 parts, student attempts any 5. Each part = 4 marks:

✓ **IF General Topic** ("गणित"/"Mathematics"):
→ Use VARIETY - Each part from DIFFERENT chapter
→ Example: (क) AP, (ख) Quadratic equations, (ग) Triangles, (घ) Quadrilaterals, (ङ) Statistics, (च) Probability

✗ **IF Specific Chapter** (e.g., "त्रिकोणमिति"):
→ ALL 6 parts from that chapter ONLY (vary problem types within trigonometry)

Example formats showing VARIETY for General topic ("गणित"):
(क) / (a) समान्तर श्रेढ़ी / AP - 4 marks
   17वां पद, सार्व-अन्तर, योग की समस्याएं
   Example: "किसी AP का तीसरा पद 5 है और सातवां पद 9 है। 17वां पद ज्ञात कीजिए"

(ख) / (b) द्विघात समीकरण / Quadratic Equation - 4 marks
   समीकरण के मूल ज्ञात करना
   Example: "समीकरण √2x² + 7x + 5√2 = 0 के मूल ज्ञात कीजिए"

(ग) / (c) त्रिभुज प्रमेय / Triangle Theorem - 4 marks
   बेसिक प्रमेय या पाइथागोरस प्रमेय सिद्ध करना
   Example: "त्रिभुज ABC की भुजा BC पर D एक बिंदु इस प्रकार है कि ∠ADC = ∠BAC. सिद्ध कीजिए कि CA² = CB × CD"

(घ) / (d) चतुर्भुज प्रमेय / Quadrilateral Theorem - 4 marks
   चतुर्भुज का वृत्त परिगत होना सिद्ध करना
   Example: "एक चतुर्भुज ABCD किसी वृत्त के परिगत खींचा गया है। सिद्ध कीजिए कि AB + CD = AD + BC"

(ङ) / (e) सांख्यिकी / Statistics - 4 marks
   दी गई बारंबारता वितरण का माध्यक ज्ञात करना
   Example: "यदि दिए गए आवृत्ति वितरण का माध्यक 28.5 है, तो 'x' और 'y' का मान ज्ञात कीजिए (दिया है n = 60)"

(च) / (f) प्रायिकता / Probability - 4 marks
   प्रायिकता की गणना
   Example: "किसी कारण 12 खराब पेन, 132 अच्छे पेनों में मिल गए हैं। इस मिश्रण में से एक पेन यादृच्छया निकाला जाता है। निकाले गए पेन के अच्छे होने की प्रायिकता ज्ञात कीजिए"

Example formats for SPECIFIC CHAPTER - Trigonometry:
- त्रिकोणमितीय मान: sin 30°, cos 45°, tan 60° से संबंधित समस्याएं
- सर्वसमिका सिद्ध करना: (1+tanθ)² + (1-tanθ)² = 2sec²θ
- ऊंचाई और दूरी: मीनार/भवन की ऊंचाई या दूरी ज्ञात करना
- कोण की गणना: त्रिकोणमितीय अनुपात से कोण निकालना
- समीकरण हल करना: 2sin²θ - 3sinθ + 1 = 0
- अनुपात सिद्ध करना: tanA/(1-cotA) + cotA/(1-tanA) = 1 + secA·cosecA

=== प्रश्न 3 FORMAT (6 अंक) - अथवा सहित ===
⚠️⚠️⚠️ TOPIC RULE: "${topic}" ⚠️⚠️⚠️

**IF General Topic** ("गणित"/"Mathematics"):
→ Main & OR can be from DIFFERENT chapters for variety

**IF Specific Chapter**:
→ Main & OR BOTH from that chapter ONLY

Example for TRIGONOMETRY topic:
Main: "यदि secθ + tanθ = p है, तो सिद्ध कीजिए कि (p² - 1)/(p² + 1) = sinθ"
अथवा: "सिद्ध कीजिए कि: √[(1+sinθ)/(1-sinθ)] = secθ + tanθ"

Example for COORDINATE GEOMETRY topic:
Main: "वह अनुपात ज्ञात कीजिए जिसमें बिंदु (-3, k) रेखाखंड जो बिंदुओं (-5, 4) और (-2, 3) को मिलाता है, को विभाजित करता है। k का मान भी ज्ञात कीजिए।"
अथवा: "△ABC के शीर्ष A(4, 2), B(6, 5) और C(1, 4) हैं। माध्यिका AD की लंबाई ज्ञात कीजिए।"

=== प्रश्न 4 FORMAT (6 अंक) - अथवा सहित ===
⚠️⚠️⚠️ TOPIC RULE: "${topic}" ⚠️⚠️⚠️

**IF General Topic** ("गणित"/"Mathematics"):
→ Main & OR can be from DIFFERENT chapters for variety

**IF Specific Chapter**:
→ Main & OR BOTH from that chapter ONLY

Example for TRIGONOMETRY topic (Heights & Distances):
Main: "एक 80 m चौड़ी सड़क के दोनों ओर आमने-सामने समान ऊँचाई वाले दो खंभे लगे हुए हैं। खंभों के बीच सड़क पर स्थित किसी बिंदु से इन दोनों खंभों के शिखर के उन्नयन कोण क्रमशः 60° और 30° हैं। खंभों की ऊँचाई और खंभों से बिंदु की दूरी ज्ञात कीजिए।"
अथवा: "भूमि के एक बिंदु से 20 m ऊँचे भवन के शिखर पर लगी एक मीनार के तल और शिखर के उन्नयन कोण क्रमशः 45° और 60° हैं। मीनार की ऊँचाई ज्ञात कीजिए।"

Example for AP/SEQUENCE topic:
Main: "किसी AP के n पद का योग 3n² + 5n है। इस AP का 25वां पद ज्ञात कीजिए।"
अथवा: "एक AP के 6वें और 17वें पदों का योग 40 है और 13वें पद 24 है। AP का प्रथम पद और सार्व-अन्तर ज्ञात कीजिए।"

=== प्रश्न 5 FORMAT (6 अंक) - अथवा सहित ===
⚠️⚠️⚠️ TOPIC RULE: "${topic}" ⚠️⚠️⚠️

**IF General Topic** ("गणित"/"Mathematics"):
→ Main & OR can be from DIFFERENT chapters for variety [चित्र आवश्यक if needed]

**IF Specific Chapter**:
→ Main & OR BOTH from that chapter ONLY [चित्र आवश्यक if needed]

Example for MENSURATION topic:
Main: "लकड़ी के एक ठोस बेलन के प्रत्येक सिरे पर एक अर्धगोला खोदकर निकालते हुए एक खिलौना बनाया गया है। यदि बेलन की ऊँचाई 10 cm है और आधार की त्रिज्या 3.5 cm है तो इस खिलौने का समग्र पृष्ठीय क्षेत्रफल ज्ञात कीजिए। (π = 22/7 लीजिए)"
Include: [चित्र की व्याख्या: बेलन (10 cm ऊँचाई, 3.5 cm त्रिज्या) के दोनों सिरों पर 3.5 cm त्रिज्या के अर्धगोले]
अथवा: "एक ठोस एक अर्धगोले पर खड़े शंकु के आकार का है, शंकु और अर्धगोले की त्रिज्याएँ समान हैं तथा इसका माप 3 cm है। यदि ठोस की ऊँचाई 6 cm है, तो ठोस का आयतन ज्ञात कीजिए।"

Example for TRIGONOMETRY topic:
Main: "सिद्ध कीजिए कि: (secA - tanA)² = (1 - sinA)/(1 + sinA)"
अथवा: "यदि cotθ + tanθ = x और secθ - cosθ = y है, तो सिद्ध कीजिए कि (x²y)^(2/3) - (xy²)^(2/3) = 1"

=== ANSWER LENGTH REQUIREMENTS (PROPORTIONAL TO MARKS) ===
- 1-mark MCQ: Just the correct option letter (केवल सही विकल्प)
- 2-mark questions: 50-80 words with step-by-step solution
  * Show all calculation steps
  * Include formulas used
  * Final answer clearly stated
- 4-mark questions: 100-150 words with complete detailed solution
  * Show all working steps
  * Include all formulas and substitutions
  * Explain the method/approach
  * Include intermediate results
  * Final answer with units
- 6-mark questions: 150-200 words with comprehensive solution
  * Detailed step-by-step working
  * All formulas with explanations
  * Multiple calculation steps shown
  * For word problems: define variables, form equations, solve, verify
  * For geometry: mention theorems used
  * For diagrams: describe figure measurements
  * Final answer with complete units and verification

=== MATHEMATICAL NOTATION RULES ===
- Use Unicode subscripts: H₂O, CO₂, x₁, x₂, aₙ
- Use Unicode superscripts: x², x³, 2ⁿ
- Square root: √2, √3, √(x² + y²)
- Fractions: 1/2, 3/4, (x+1)/(x-1)
- Greek letters: α (alpha), β (beta), θ (theta), π (pi)
- Angles: ∠ABC, ∠BAC
- Triangles: △ABC, △PQR
- Parallel: ||, Perpendicular: ⊥
- Approximately: ≈, Not equal: ≠
- Greater/Less: >, <, ≥, ≤

=== DIAGRAM DRAWING INSTRUCTIONS (चित्र कैसे बनाएं) ===

**CRITICAL: DO NOT try to generate diagrams. Instead, provide CLEAR STEP-BY-STEP DRAWING INSTRUCTIONS in the answer.**

For questions requiring diagrams, include detailed drawing instructions in the answer:

**1. GEOMETRY QUESTIONS (त्रिभुज, चतुर्भुज, वृत्त):**
Format: "[चित्र बनाने की विधि: Step 1: ... Step 2: ... Step 3: ...]"

Example for Triangle:
"[चित्र बनाने की विधि:
चरण 1: एक त्रिभुज ABC बनाइए जिसमें BC = 6 cm हो।
चरण 2: बिंदु D को BC पर इस प्रकार अंकित करें कि BD = 4 cm हो।
चरण 3: बिंदु A को D से और फिर B और C से जोड़िए।
चरण 4: ∠ADC और ∠BAC को दर्शाइए।]"

Example for Circle:
"[Drawing Instructions:
Step 1: Draw a circle with center O and radius 5 cm.
Step 2: Mark point P outside the circle at 13 cm from O.
Step 3: Draw two tangents PA and PB from point P to the circle.
Step 4: Label points A and B where tangents touch the circle.
Step 5: Join OA, OB, and OP.]"

**2. HEIGHT & DISTANCE (ऊँचाई और दूरी):**
Format: Include building/tower heights, angles, and observer position

Example:
"[चित्र बनाने की विधि:
चरण 1: एक क्षैतिज रेखा खींचें (भूमि को दर्शाने के लिए)।
चरण 2: बाईं ओर 80 m ऊँचा एक लंबवत खंभा AB बनाएं।
चरण 3: दाईं ओर समान ऊँचाई का दूसरा खंभा CD बनाएं।
चरण 4: भूमि पर बिंदु P अंकित करें (दोनों खंभों के बीच)।
चरण 5: P से A तक रेखा खींचें और उन्नयन कोण 60° दर्शाएं।
चरण 6: P से C तक रेखा खींचें और उन्नयन कोण 30° दर्शाएं।
चरण 7: सभी माप लेबल करें: ऊँचाई, दूरी, कोण।]"

**3. MENSURATION (क्षेत्रमिति) - COMBINED SOLIDS:**
Format: Detailed description of each solid component with measurements

Example for Cylinder with Hemispheres:
"[चित्र बनाने की विधि:
चरण 1: बीच में एक बेलन बनाएं (ऊँचाई 10 cm, त्रिज्या 3.5 cm)।
चरण 2: बेलन के ऊपरी सिरे पर एक अर्धगोला बनाएं (त्रिज्या 3.5 cm)।
चरण 3: बेलन के निचले सिरे पर एक अर्धगोला बनाएं (त्रिज्या 3.5 cm)।
चरण 4: सभी माप स्पष्ट रूप से लिखें।
चरण 5: बिंदीदार रेखाओं से छिपे भागों को दर्शाएं।]"

Example for Cone on Hemisphere:
"[Drawing Instructions:
Step 1: Draw a hemisphere with radius 3 cm (base at bottom).
Step 2: On top of hemisphere, draw a cone with same base radius 3 cm.
Step 3: Mark total height of solid as 6 cm.
Step 4: Since hemisphere radius = 3 cm, cone height = 6 - 3 = 3 cm.
Step 5: Label all dimensions clearly.
Step 6: Use dashed lines for hidden edges.]"

**4. COORDINATE GEOMETRY (निर्देशांक ज्यामिति):**
Format: X-Y axes with labeled points and coordinates

Example:
"[चित्र बनाने की विधि:
चरण 1: X और Y अक्ष खींचें (मूल बिंदु O पर मिलते हुए)।
चरण 2: बिंदु A(-1, 7) को अंकित करें।
चरण 3: बिंदु B(4, -3) को अंकित करें।
चरण 4: A और B को जोड़कर रेखाखंड AB बनाएं।
चरण 5: बिंदु P को AB पर अंकित करें जो AB को 2:3 में विभाजित करता है।
चरण 6: सभी निर्देशांक स्पष्ट लिखें।]"

**5. STATISTICAL GRAPHS (सांख्यिकी ग्राफ):**
Format: Frequency polygon, histogram, or ogive with labeled axes

Example:
"[Graph Drawing Instructions:
Step 1: Draw X-axis for class intervals (0-10, 10-20, etc.).
Step 2: Draw Y-axis for frequency.
Step 3: Mark midpoints of class intervals on X-axis.
Step 4: Plot frequency values at corresponding midpoints.
Step 5: Join all points with straight lines to form frequency polygon.
Step 6: Label axes: "वर्ग-अंतराल (Class Interval)" and "बारंबारता (Frequency)".]"

**IMPORTANT: Every diagram instruction MUST include:**
1. चरण-दर-चरण विधि (Step-by-step method)
2. सभी माप (All measurements)
3. कोण (Angles) if applicable
4. लेबल (Labels) for all parts
5. बिंदीदार रेखाएं (Dashed lines) for hidden parts

=== JSON STRUCTURE FOR EACH QUESTION ===

For MCQs (Q1-20):
{
  "questionType": "mcq",
  "questionText": "हिंदी प्रश्न / English Question:",
  "options": [
    "(A) हिंदी / English",
    "(B) हिंदी / English",
    "(C) हिंदी / English",
    "(D) हिंदी / English"
  ],
  "correctOption": 0-3,
  "marks": 1,
  "section": "खण्ड-अ (Section-A) MCQ (1 अंक)"
}

For प्रश्न 1 parts (6 parts × 2 marks):
{
  "questionType": "written",
  "questionText": "(क) / (a) प्रश्न हिंदी में / Question in English:",
  "correctAnswer": "Complete solution in 50-80 words with all steps",
  "marks": 2,
  "section": "खण्ड-ब (Part-B) प्र.1 (2 अंक प्रत्येक)",
  "partLabel": "(क)"  // or (ख), (ग), (घ), (ङ), (च)
}

For प्रश्न 2 parts (6 parts × 4 marks, attempt any 5):
{
  "questionType": "written",
  "questionText": "(क) / (a) प्रश्न हिंदी में / Question in English:",
  "correctAnswer": "Complete solution in 100-150 words with detailed steps",
  "marks": 4,
  "section": "खण्ड-ब (Part-B) प्र.2 (4 अंक प्रत्येक)",
  "partLabel": "(क)",  // or (ख), (ग), (घ), (ङ), (च)
  "attemptNote": "किन्हीं पाँच भागों को हल कीजिए / Do any five parts"
}

For प्रश्न 3, 4, 5 (6 marks each with OR):
{
  "questionType": "written",
  "questionText": "Main question (प्रश्न हिंदी में / Question in English):",
  "correctAnswer": "Comprehensive solution in 150-200 words with all calculation steps",
  "marks": 6,
  "section": "खण्ड-ब (Part-B) प्र.3 (6 अंक)",  // or प्र.4, प्र.5
  "hasAlternative": true,
  "alternativeQuestion": "अथवा / OR\n\nAlternative question (हिंदी / English):",
  "alternativeAnswer": "Complete alternative solution in 150-200 words"
}

CRITICAL REMINDERS:
1. ALWAYS use BILINGUAL format: "हिंदी / English" for ALL questions
2. MCQ options MUST have (A), (B), (C), (D) format
3. प्रश्न 1: All 6 parts COMPULSORY (सभी भाग अनिवार्य)
4. प्रश्न 2: Generate 6 parts, student does any 5 (किन्हीं 5 करें)
5. प्रश्न 3, 4, 5: Each has "अथवा / OR" with alternative question
6. Answer length MUST be proportional to marks (1:2:4:6 ratio)
7. **DIAGRAM INSTRUCTIONS**: DO NOT generate diagrams! Instead include detailed step-by-step drawing instructions in [चित्र बनाने की विधि: ...] format in the answer
8. For geometry/mensuration: Provide complete diagram drawing steps with all measurements, angles, and labels
9. Use correct Unicode mathematical symbols (√, ², ³, π, θ, ∠, △, etc.)
10. Show ALL calculation steps - marks are for METHOD, not just answer
11. For word problems: Define variables → Form equation → Solve → Verify → Answer
12. Every answer must include: Given data → Formula → Substitution → Calculation → Final Answer with units

RETURN ONLY valid JSON array with properly structured questions.
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
    } else if (examFormat === "upboard_maths") {
      finalNumberOfQuestions = 25; // 20 MCQ + 5 descriptive sets = 25
      finalQuestionTypes = ["mcq", "written"];
      finalLanguage = "bilingual";
    }

    // Exam format specific instructions
    const examFormatInstructions = {
      general: "",
      upboard_hindi: upBoardHindiFormat,
      upboard_science: upBoardScienceFormat,
      upboard_english: upBoardEnglishFormat,
      upboard_sanskrit: upBoardSanskritFormat,
      upboard_maths: upBoardMathsFormat,
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
    } else if (examFormat === "upboard_maths") {
      prompt = `UP BOARD CLASS 10 MATHEMATICS PAPER (गणित) - 70 अंक, 25 प्रश्न बनाएं।
Paper Code: 822(BV)

विषय: "${topic}"

संरचना (EXACT STRUCTURE - 25 questions = 70 marks):

खण्ड 'अ' (Section A) - बहुविकल्पीय प्रश्न (MCQ) - 20 अंक:
- 20 प्रश्न × 1 अंक = 20 अंक (प्र.1-20)
- Topics: वास्तविक संख्याएं, बहुपद, द्विघात समीकरण, समान्तर श्रेढ़ी, निर्देशांक ज्यामिति, त्रिकोणमिति, वृत्त, क्षेत्रमिति, सांख्यिकी, प्रायिकता

खण्ड 'ब' (Section B) - वर्णनात्मक प्रश्न - 50 अंक:
- प्र.21: 6 भाग × 2 अंक = 12 अंक (सभी करें)
- प्र.22: 6 भाग में से किन्हीं 5 × 4 अंक = 20 अंक
- प्र.23: 1 प्रश्न × 6 अंक = 6 अंक (अथवा सहित)
- प्र.24: 1 प्रश्न × 6 अंक = 6 अंक (अथवा सहित)
- प्र.25: 1 प्रश्न × 6 अंक = 6 अंक (अथवा सहित)

=== ANSWER LENGTH - DETAILED WITH FULL SOLUTION ===
- 6 अंक: 150-200 शब्द + पूर्ण हल (सभी चरण, सूत्र, गणना)
- 4 अंक: 100-150 शब्द + पूर्ण हल
- 2 अंक: 50-80 शब्द + संक्षिप्त हल
- 1 अंक (MCQ): केवल सही विकल्प

=== DIAGRAM-BASED QUESTIONS ===
- For geometry/mensuration questions, include [चित्र आवश्यक] tag
- Describe the figure in text with all measurements
- Example: "एक बेलन जिसकी ऊँचाई 10 cm और त्रिज्या 3.5 cm है [चित्र आवश्यक]"

JSON FORMAT:

MCQ (प्र.1-20):
{"questionType":"mcq","questionText":"यदि द्विघात समीकरण x² - 5x + 6 = 0 के मूल α और β हों, तो α + β का मान है / If roots of quadratic equation x² - 5x + 6 = 0 are α and β, then value of α + β is:","options":["(A) 5","(B) 6","(C) -5","(D) -6"],"correctOption":0,"marks":1,"section":"खण्ड 'अ' (Section A) - MCQ (1 अंक)"}

प्र.21 (12 अंक - 6×2) - सभी भाग करें:
{"questionType":"written","questionText":"निम्नलिखित प्रश्नों के उत्तर दीजिए / Answer the following questions:\\n\\n(क) एक शंकु की त्रिज्या 7 cm और ऊँचाई 24 cm है। इसका आयतन ज्ञात कीजिए। / A cone has radius 7 cm and height 24 cm. Find its volume. [चित्र आवश्यक]\\n\\n(ख) 12 और 18 का HCF ज्ञात कीजिए। / Find HCF of 12 and 18.\\n\\n(ग) बिंदु A(2, 3) और B(4, 1) को मिलाने वाले रेखाखण्ड को 1:1 के अनुपात में विभाजित करने वाले बिंदु के निर्देशांक ज्ञात कीजिए। / Find coordinates of point dividing line segment joining A(2, 3) and B(4, 1) in ratio 1:1.\\n\\n(घ) यदि sin θ = 3/5, तो cos θ का मान ज्ञात कीजिए। / If sin θ = 3/5, find value of cos θ.\\n\\n(ङ) दो बिंदुओं (1, 2) और (4, 6) के बीच की दूरी ज्ञात कीजिए। / Find distance between points (1, 2) and (4, 6).\\n\\n(च) सिद्ध कीजिए: sin²θ + cos²θ = 1 / Prove: sin²θ + cos²θ = 1","correctAnswer":"(क) शंकु का आयतन / Volume of cone:\\nदिया है / Given: r = 7 cm, h = 24 cm\\nसूत्र / Formula: V = (1/3)πr²h\\nV = (1/3) × (22/7) × 7² × 24\\nV = (1/3) × (22/7) × 49 × 24\\nV = (1/3) × 22 × 7 × 24\\nV = (22 × 7 × 24)/3\\nV = 3696/3 = 1232 cm³\\nअतः शंकु का आयतन = 1232 cm³\\n\\n(ख) HCF of 12 and 18:\\n12 = 2² × 3\\n18 = 2 × 3²\\nHCF = 2 × 3 = 6\\nअतः HCF = 6\\n\\n(ग) विभाजन बिंदु / Division point:\\nसूत्र / Formula: ((m×x₂ + n×x₁)/(m+n), (m×y₂ + n×y₁)/(m+n))\\nm:n = 1:1, A(2,3), B(4,1)\\nx = (1×4 + 1×2)/(1+1) = 6/2 = 3\\ny = (1×1 + 1×3)/(1+1) = 4/2 = 2\\nअतः बिंदु = (3, 2)\\n\\n(घ) cos θ का मान:\\nsin θ = 3/5\\nsin²θ + cos²θ = 1\\n(3/5)² + cos²θ = 1\\n9/25 + cos²θ = 1\\ncos²θ = 1 - 9/25 = 16/25\\ncos θ = 4/5\\n\\n(ङ) दूरी / Distance:\\nसूत्र / Formula: d = √[(x₂-x₁)² + (y₂-y₁)²]\\nd = √[(4-1)² + (6-2)²]\\nd = √[9 + 16] = √25 = 5 units\\n\\n(च) sin²θ + cos²θ = 1 का प्रमाण:\\nमाना एक समकोण त्रिभुज ABC में ∠B = 90°\\nsin θ = लम्ब/कर्ण = BC/AC\\ncos θ = आधार/कर्ण = AB/AC\\nsin²θ + cos²θ = (BC/AC)² + (AB/AC)²\\n= (BC² + AB²)/AC²\\nपाइथागोरस प्रमेय से: BC² + AB² = AC²\\n= AC²/AC² = 1\\nअतः सिद्ध हुआ।","marks":12,"section":"खण्ड 'ब' (Section B) - प्र.21 (6×2=12 अंक)"}

प्र.22 (20 अंक - किन्हीं 5×4):
{"questionType":"written","questionText":"निम्नलिखित में से किन्हीं पाँच प्रश्नों के उत्तर दीजिए / Answer any five of the following:\\n\\n(क) समान्तर श्रेढ़ी 5, 8, 11, 14, ... का 20वाँ पद ज्ञात कीजिए। / Find 20th term of AP 5, 8, 11, 14, ...\\n\\n(ख) द्विघात समीकरण x² - 7x + 12 = 0 को हल कीजिए। / Solve quadratic equation x² - 7x + 12 = 0\\n\\n(ग) सिद्ध कीजिए कि समरूप त्रिभुजों के क्षेत्रफलों का अनुपात उनकी संगत भुजाओं के वर्गों के अनुपात के बराबर होता है। / Prove that ratio of areas of similar triangles equals ratio of squares of corresponding sides.\\n\\n(घ) सिद्ध कीजिए कि वृत्त की स्पर्श रेखा स्पर्श बिंदु से होकर जाने वाली त्रिज्या पर लम्ब होती है। / Prove that tangent to a circle is perpendicular to radius at point of contact.\\n\\n(ङ) निम्नलिखित बारंबारता बंटन का माध्य ज्ञात कीजिए / Find mean of following frequency distribution:\\n| वर्ग अंतराल | 0-10 | 10-20 | 20-30 | 30-40 | 40-50 |\\n| बारंबारता | 5 | 8 | 15 | 16 | 6 |\\n\\n(च) एक थैले में 3 लाल और 5 काली गेंदें हैं। यादृच्छया एक गेंद निकाली जाती है। लाल गेंद आने की प्रायिकता ज्ञात कीजिए। / A bag contains 3 red and 5 black balls. One ball is drawn randomly. Find probability of getting red ball.","correctAnswer":"(क) AP का 20वाँ पद:\\na = 5, d = 8 - 5 = 3, n = 20\\naₙ = a + (n-1)d\\na₂₀ = 5 + (20-1) × 3\\na₂₀ = 5 + 19 × 3\\na₂₀ = 5 + 57 = 62\\nअतः 20वाँ पद = 62\\n\\n(ख) x² - 7x + 12 = 0 का हल:\\nमध्यपद विभाजन से:\\nx² - 4x - 3x + 12 = 0\\nx(x - 4) - 3(x - 4) = 0\\n(x - 4)(x - 3) = 0\\nx = 4 या x = 3\\nअतः मूल x = 3, 4\\n\\n(ग) समरूप त्रिभुजों के क्षेत्रफल:\\nमाना △ABC ~ △DEF\\nतब AB/DE = BC/EF = CA/FD = k\\nक्षेत्रफल(△ABC)/क्षेत्रफल(△DEF)\\n= (1/2 × AB × h₁)/(1/2 × DE × h₂)\\nचूँकि त्रिभुज समरूप हैं, h₁/h₂ = AB/DE\\n= (AB × AB)/(DE × DE) = AB²/DE²\\nअतः सिद्ध हुआ।\\n\\n(घ) स्पर्श रेखा प्रमेय:\\nमाना O केंद्र वाले वृत्त पर P स्पर्श बिंदु है।\\nPT स्पर्श रेखा है और OP त्रिज्या है।\\nमाना OP, PT पर लम्ब नहीं है।\\nतब O से PT पर लम्ब OQ खींचें जहाँ Q ≠ P\\nOQ < OP (लम्ब सबसे छोटी दूरी)\\nपरन्तु OP = त्रिज्या, अतः Q वृत्त के अंदर होगा\\nयह असंभव है क्योंकि PT स्पर्श रेखा है\\nअतः OP ⊥ PT सिद्ध हुआ।\\n\\n(ङ) माध्य गणना:\\n| वर्ग | f | x | fx |\\n| 0-10 | 5 | 5 | 25 |\\n| 10-20 | 8 | 15 | 120 |\\n| 20-30 | 15 | 25 | 375 |\\n| 30-40 | 16 | 35 | 560 |\\n| 40-50 | 6 | 45 | 270 |\\nΣf = 50, Σfx = 1350\\nमाध्य = Σfx/Σf = 1350/50 = 27\\n\\n(च) प्रायिकता:\\nकुल गेंदें = 3 + 5 = 8\\nलाल गेंदें = 3\\nP(लाल) = 3/8","marks":20,"section":"खण्ड 'ब' (Section B) - प्र.22 (किन्हीं 5×4=20 अंक)"}

प्र.23 (6 अंक - अथवा सहित):
{"questionType":"written","questionText":"एक नाव धारा के अनुकूल 30 km की दूरी 3 घंटे में तय करती है और धारा के प्रतिकूल उतनी ही दूरी 5 घंटे में तय करती है। नाव की स्थिर जल में चाल और धारा की चाल ज्ञात कीजिए। / A boat covers 30 km downstream in 3 hours and same distance upstream in 5 hours. Find speed of boat in still water and speed of stream.","correctAnswer":"हल / Solution:\\n\\nमाना नाव की स्थिर जल में चाल = x km/h\\nधारा की चाल = y km/h\\n\\nधारा के अनुकूल चाल = (x + y) km/h\\nधारा के प्रतिकूल चाल = (x - y) km/h\\n\\nप्रश्नानुसार:\\nधारा के अनुकूल: दूरी/समय = चाल\\n30/3 = x + y\\nx + y = 10 ... (1)\\n\\nधारा के प्रतिकूल:\\n30/5 = x - y\\nx - y = 6 ... (2)\\n\\nसमीकरण (1) और (2) को जोड़ने पर:\\n2x = 16\\nx = 8 km/h\\n\\nसमीकरण (1) में x = 8 रखने पर:\\n8 + y = 10\\ny = 2 km/h\\n\\nअतः नाव की स्थिर जल में चाल = 8 km/h\\nधारा की चाल = 2 km/h\\n\\nसत्यापन:\\nधारा के अनुकूल: 30/(8+2) = 30/10 = 3 घंटे ✓\\nधारा के प्रतिकूल: 30/(8-2) = 30/6 = 5 घंटे ✓","marks":6,"section":"खण्ड 'ब' (Section B) - प्र.23 (6 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा / OR\\n\\nएक समान्तर श्रेढ़ी के प्रथम 10 पदों का योग 155 है और प्रथम 20 पदों का योग 610 है। प्रथम पद और सार्व अन्तर ज्ञात कीजिए। / Sum of first 10 terms of an AP is 155 and sum of first 20 terms is 610. Find first term and common difference.","alternativeAnswer":"हल / Solution:\\n\\nमाना प्रथम पद = a, सार्व अन्तर = d\\n\\nसूत्र: Sₙ = n/2[2a + (n-1)d]\\n\\nप्रश्नानुसार:\\nS₁₀ = 155\\n10/2[2a + 9d] = 155\\n5[2a + 9d] = 155\\n2a + 9d = 31 ... (1)\\n\\nS₂₀ = 610\\n20/2[2a + 19d] = 610\\n10[2a + 19d] = 610\\n2a + 19d = 61 ... (2)\\n\\nसमीकरण (2) - (1):\\n10d = 30\\nd = 3\\n\\nसमीकरण (1) में d = 3 रखने पर:\\n2a + 27 = 31\\n2a = 4\\na = 2\\n\\nअतः प्रथम पद a = 2\\nसार्व अन्तर d = 3\\n\\nसत्यापन:\\nS₁₀ = 10/2[2×2 + 9×3] = 5[4 + 27] = 5 × 31 = 155 ✓\\nS₂₀ = 20/2[2×2 + 19×3] = 10[4 + 57] = 10 × 61 = 610 ✓"}

प्र.24 (6 अंक - अथवा सहित):
{"questionType":"written","questionText":"एक मीनार के आधार से 100 m दूर स्थित बिंदु से मीनार के शिखर का उन्नयन कोण 60° है। मीनार की ऊँचाई ज्ञात कीजिए। / From a point 100 m away from base of a tower, angle of elevation of top of tower is 60°. Find height of tower. [चित्र आवश्यक]","correctAnswer":"हल / Solution:\\n\\n[चित्र आवश्यक - समकोण त्रिभुज जिसमें मीनार लम्बवत है]\\n\\nमाना मीनार AB की ऊँचाई = h m\\nबिंदु C से मीनार की दूरी BC = 100 m\\nउन्नयन कोण ∠ACB = 60°\\n\\nसमकोण त्रिभुज ABC में:\\ntan 60° = AB/BC\\n√3 = h/100\\nh = 100√3 m\\nh = 100 × 1.732\\nh = 173.2 m\\n\\nअतः मीनार की ऊँचाई = 100√3 m या 173.2 m\\n\\nवैकल्पिक विधि:\\ntan θ = लम्ब/आधार\\ntan 60° = h/100\\n√3 = h/100\\nh = 100√3 ≈ 173.2 m","marks":6,"section":"खण्ड 'ब' (Section B) - प्र.24 (6 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा / OR\\n\\nएक हवाई जहाज जमीन से 3000 m की ऊँचाई पर उड़ रहा है। जमीन पर स्थित एक बिंदु से हवाई जहाज का उन्नयन कोण 60° है। हवाई जहाज की उस बिंदु से क्षैतिज दूरी ज्ञात कीजिए। / An airplane is flying at height 3000 m above ground. Angle of elevation from a point on ground is 60°. Find horizontal distance of airplane from that point. [चित्र आवश्यक]","alternativeAnswer":"हल / Solution:\\n\\n[चित्र आवश्यक]\\n\\nमाना हवाई जहाज A पर है\\nऊँचाई AB = 3000 m\\nउन्नयन कोण ∠ACB = 60°\\nक्षैतिज दूरी BC = ?\\n\\nसमकोण त्रिभुज ABC में:\\ntan 60° = AB/BC\\n√3 = 3000/BC\\nBC = 3000/√3\\nBC = 3000/√3 × √3/√3\\nBC = 3000√3/3\\nBC = 1000√3 m\\nBC = 1000 × 1.732\\nBC = 1732 m\\n\\nअतः क्षैतिज दूरी = 1000√3 m या 1732 m"}

प्र.25 (6 अंक - अथवा सहित):
{"questionType":"written","questionText":"एक ठोस लोहे के बेलन की त्रिज्या 3.5 cm और ऊँचाई 16 cm है। इसे पिघलाकर 7 cm त्रिज्या वाले कितने गोले बनाए जा सकते हैं? / A solid iron cylinder has radius 3.5 cm and height 16 cm. How many spheres of radius 7 cm can be made by melting it? [चित्र आवश्यक]","correctAnswer":"हल / Solution:\\n\\n[चित्र आवश्यक - बेलन और गोला]\\n\\nबेलन की त्रिज्या r₁ = 3.5 cm\\nबेलन की ऊँचाई h = 16 cm\\nगोले की त्रिज्या r₂ = 7 cm\\n\\nबेलन का आयतन = πr₁²h\\n= π × (3.5)² × 16\\n= π × 12.25 × 16\\n= 196π cm³\\n\\nएक गोले का आयतन = (4/3)πr₂³\\n= (4/3) × π × (7)³\\n= (4/3) × π × 343\\n= (1372/3)π cm³\\n\\nगोलों की संख्या = बेलन का आयतन / एक गोले का आयतन\\n= 196π / (1372π/3)\\n= 196 × 3 / 1372\\n= 588 / 1372\\n= 0.428...\\n\\nचूँकि गोलों की संख्या पूर्ण होनी चाहिए और 0.428 < 1\\n\\nनोट: प्रश्न में त्रुटि प्रतीत होती है। यदि गोले की त्रिज्या 0.7 cm हो तो:\\nगोले का आयतन = (4/3)π(0.7)³ = (4/3)π × 0.343 = 0.457π cm³\\nगोलों की संख्या = 196π / 0.457π ≈ 428 गोले\\n\\nअतः लगभग 428 गोले बनाए जा सकते हैं।","marks":6,"section":"खण्ड 'ब' (Section B) - प्र.25 (6 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा / OR\\n\\nएक शंकु की ऊँचाई 24 cm और आधार की त्रिज्या 6 cm है। इसका वक्र पृष्ठीय क्षेत्रफल और आयतन ज्ञात कीजिए। / A cone has height 24 cm and base radius 6 cm. Find its curved surface area and volume. [चित्र आवश्यक]","alternativeAnswer":"हल / Solution:\\n\\n[चित्र आवश्यक - शंकु]\\n\\nशंकु की ऊँचाई h = 24 cm\\nआधार की त्रिज्या r = 6 cm\\n\\nतिर्यक ऊँचाई l = √(h² + r²)\\nl = √(24² + 6²)\\nl = √(576 + 36)\\nl = √612\\nl = √(36 × 17)\\nl = 6√17 cm\\nl ≈ 6 × 4.123 = 24.74 cm\\n\\nवक्र पृष्ठीय क्षेत्रफल = πrl\\n= (22/7) × 6 × 6√17\\n= (22/7) × 36√17\\n= (792/7)√17\\n= 113.14 × 4.123\\n≈ 466.5 cm²\\n\\nआयतन = (1/3)πr²h\\n= (1/3) × (22/7) × 6² × 24\\n= (1/3) × (22/7) × 36 × 24\\n= (22 × 36 × 24)/(7 × 3)\\n= 19008/21\\n= 905.14 cm³\\n\\nअतः वक्र पृष्ठीय क्षेत्रफल ≈ 466.5 cm²\\nआयतन ≈ 905.14 cm³"}

STRICT RULES:
1. EXACTLY 25 questions (20 MCQ + 5 descriptive sets)
2. BILINGUAL format: Hindi / English in same questionText
3. MCQ options format: (A), (B), (C), (D)
4. प्र.23-25 MUST have hasAlternative, alternativeQuestion, alternativeAnswer
5. Include [चित्र आवश्यक] tag for geometry/mensuration questions
6. Mathematical formulas with proper notation
7. Complete step-by-step solutions in answers
8. Chemical formulas: H₂O, CO₂ (subscript notation)

Return ONLY valid JSON array with exactly 25 questions. No markdown, no explanation.`;
    } else if (examFormat === "upboard_socialscience") {
      prompt = `UP BOARD CLASS 10 SOCIAL SCIENCE PAPER (सामाजिक विज्ञान) - 70 अंक बनाएं।
Paper Code: 825(BAS)

विषय: "${topic}"

${upBoardSocialScienceFormat}

EXACT STRUCTURE:
- Q1-Q20: MCQs (1 mark each) = 20 marks
  * Bilingual format required
  * Cover: History, Geography, Civics, Economics (if general topic)
  * If specific topic: ALL MCQs from that topic only

- Descriptive-I: Short answer questions (2+2, 2+4, 2+2+2, 4 marks)
  * WITH OR options
  * 50-150 words answers
  * Examples: transport development, ores, consumer rights, government measures

- Descriptive-II: Long answer questions (6 marks each)
  * WITH OR options  
  * 150-200 words answers
  * Examples: Nationalism in India, French Revolution, Federal system, Communalism, Economic sectors

- Map Work (Question 9A and 9B): 10 marks total
  * 9(A): History Map - 5 locations (5 marks)
  * 9(B): Geography Map - 5 locations (5 marks)
  * Each location: ½ + ½ = 1 mark (name + marking)
  * MUST include text-based answers for visually impaired students

=== ANSWER LENGTH - DETAILED ===
- 6 अंक: 150-200 शब्द + विस्तृत व्याख्या (multiple points, examples, conclusion)
- 4 अंक: 100-150 शब्द + पूर्ण व्याख्या
- 2 अंक: 50-80 शब्द + संक्षिप्त व्याख्या
- 1 अंक (MCQ): केवल सही विकल्प
- Map: Location name + marking (for each)

JSON FORMAT:

MCQ (Q1-20):
{"questionType":"mcq","questionText":"फ्रांस की क्रान्ति कब हुई थी? / When did the French Revolution take place?","options":["(A) 1788 ई० / 1788 AD","(B) 1789 ई० / 1789 AD","(C) 1600 ई० / 1600 AD","(D) 1787 ई० / 1787 AD"],"correctOption":1,"marks":1,"section":"खण्ड-अ (Part-A) MCQ (1 अंक)"}

Descriptive (2+2 or 4 or 6 marks with OR):
{"questionType":"written","questionText":"परिवहन क्षेत्र के विकास से देश के विकास में किस प्रकार सहायता मिलती है? इसके कोई दो लाभ लिखिए। / How does development of transportation sector help the development of the country? Write any two benefits of it. 4 अंक\\n\\nअथवा / OR\\n\\nअयस्क क्या हैं? भारत में लोहे के अयस्क की दो महत्त्वपूर्ण पेटियों में से किसी एक में वृद्धि कीजिए। / What are the ores? Which are the two important belts of iron ores in India? 2 + 2","correctAnswer":"परिवहन क्षेत्र का विकास:\\n\\n1. आर्थिक विकास में सहायता:\\n   - माल और यात्रियों की आवाजाही सुगम होती है\\n   - व्यापार में वृद्धि होती है\\n   - बाजारों तक पहुंच बढ़ती है\\n\\n2. रोजगार सृजन:\\n   - परिवहन क्षेत्र में प्रत्यक्ष रोजगार\\n   - संबंधित उद्योगों में रोजगार\\n\\n3. सामाजिक विकास:\\n   - शिक्षा और स्वास्थ्य सुविधाओं तक पहुंच\\n   - क्षेत्रीय असमानता में कमी\\n\\n4. औद्योगिक विकास:\\n   - कच्चे माल की आपूर्ति सुगम\\n   - तैयार माल का वितरण आसान\\n\\nअतः परिवहन विकास का आधार है।\\n\\nअथवा / OR\\n\\nअयस्क:\\nअयस्क वे खनिज हैं जिनमें धातु पर्याप्त मात्रा में होती है और जिनसे धातु निकालना आर्थिक रूप से लाभदायक होता है।\\n\\nभारत में लोहे के अयस्क की दो महत्त्वपूर्ण पेटियाँ:\\n\\n1. उड़ीसा-झारखंड पेटी:\\n   - मयूरभंज और क्योंझर (उड़ीसा)\\n   - सिंहभूम (झारखंड)\\n   - उच्च गुणवत्ता का हेमेटाइट\\n   - भारत का 70% उत्पादन\\n\\n2. बैलाडीला-बस्तर-बैलाडीला पेटी:\\n   - छत्तीसगढ़ में स्थित\\n   - उच्च गुणवत्ता का लौह अयस्क\\n   - निर्यात के लिए महत्त्वपूर्ण","marks":4,"section":"खण्ड-ब (Part-B) वर्णनात्मक-I"}

Map Question 9(A) - History (5 marks):
{"questionType":"written","questionText":"निर्देश : दिये गये भारत के रेखा मानचित्र में निम्नलिखित स्थानों को चिह्न ⊕ द्वारा नाम सहित दर्शाइए। सही नाम तथा स्थान अंकन के लिए ½, ½ अंक निर्धारित हैं :\\n\\ni) वह स्थान जहाँ पूर्ण स्वराज की माँग का प्रस्ताव पारित हुआ था।\\nii) वह स्थान जहाँ दिसम्बर, 1920 में कांग्रेस का अधिवेशन हुआ था।\\niii) वह जनपद जहाँ जलियाँवाला बाग हत्याकाण्ड हुआ था।\\niv) वह स्थान जहाँ आनन्द भवन स्थित है।\\nv) वह स्थान जहाँ सूती मिल के श्रमिकों ने पहला सत्याग्रह आन्दोलन चलाया था।\\n\\nInstruction : Show the following places by symbols and names on the given outline map of India :\\ni) The place where the resolution of complete Swaraj was passed.\\nii) The place where in December, 1920 Congress Session was held.\\niii) The district where Jallianwala Bagh Massacre took place.\\niv) The place where Anand Bhawan is situated.\\nv) The place where the cotton mill workers first launched Satyagraha movement.","correctAnswer":"[Map locations with answers]\\n\\n1. लाहौर (Lahore) - पूर्ण स्वराज resolution, 1930 [½ + ½ = 1]\\n2. नागपुर (Nagpur) - December 1920 Congress Session [½ + ½ = 1]\\n3. अमृतसर (Amritsar) - Jallianwala Bagh Massacre [½ + ½ = 1]\\n4. प्रयागराज/इलाहाबाद (Prayagraj/Allahabad) - Anand Bhawan [½ + ½ = 1]\\n5. अहमदाबाद (Ahmedabad) - Cotton mill Satyagraha, 1918 [½ + ½ = 1]\\n\\nकुल अंक = 5\\n\\n[केवल दृष्टिबाधित परीक्षार्थियों के लिए मानचित्र कार्य के विकल्प के रूप में]\\n(Only for visually impaired examinees in lieu of Map work)\\n\\n1. पूर्ण स्वराज की माँग का प्रस्ताव कहाँ पारित हुआ था? - लाहौर (1930)\\n2. दिसम्बर, 1920 में कांग्रेस का अधिवेशन कहाँ हुआ था? - नागपुर\\n3. जलियाँवाला बाग हत्याकाण्ड किस जनपद में हुआ था? - अमृतसर\\n4. आनन्द भवन कहाँ स्थित है? - प्रयागराज/इलाहाबाद\\n5. सूती मिल के श्रमिकों ने पहला सत्याग्रह आन्दोलन कहाँ चलाया था? - अहमदाबाद","marks":5,"section":"मानचित्र सम्बन्धी प्रश्न (Map Work) - History"}

Map Question 9(B) - Geography (5 marks):
{"questionType":"written","questionText":"निर्देश : दिये गये भारत के रेखा मानचित्र में निम्नलिखित स्थानों को चिह्न द्वारा नाम सहित दर्शाइए :\\n\\ni) पश्चिम भारत स्थित एक सॉफ्टवेयर प्रौद्योगिकी पार्क का नाम लिखिए।\\nii) पूर्वी भारत में स्थित एक लोहा और इस्पात संयंत्र का नाम लिखिए।\\niii) दक्षिण भारत स्थित एक तापीय ऊर्जा संयंत्र का नाम लिखिए।\\niv) छत्तीसगढ़ राज्य की राजधानी का नाम लिखिए।\\nv) पूर्वी भारत में स्थित एक अन्तर्राष्ट्रीय हवाई पत्तन का नाम लिखिए।\\n\\nInstruction : Show the following places by symbols and names on the given outline map of India :\\ni) A software technology park situated in western part of India.\\nii) An iron and steel plant situated in eastern part of India.\\niii) A thermal power plant situated in southern part of India.\\niv) Capital of Chhattisgarh state.\\nv) An international airport situated in eastern part of India.","correctAnswer":"[Map locations with answers]\\n\\n1. पुणे/मुंबई (Pune/Mumbai) - Software technology park [½ + ½ = 1]\\n2. जमशेदपुर/भिलाई/दुर्गापुर (Jamshedpur/Bhilai/Durgapur) - Iron & steel plant [½ + ½ = 1]\\n3. नेवेली/चेन्नई (Neyveli/Chennai) - Thermal power plant [½ + ½ = 1]\\n4. रायपुर (Raipur) - Capital of Chhattisgarh [½ + ½ = 1]\\n5. कोलकाता (Kolkata) - International airport [½ + ½ = 1]\\n\\nकुल अंक = 5\\n\\n[केवल दृष्टिबाधित परीक्षार्थियों के लिए मानचित्र कार्य के विकल्प के रूप में]\\n(Only for visually impaired examinees in lieu of Map work)\\n\\n1. पश्चिम भारत में एक सॉफ्टवेयर प्रौद्योगिकी पार्क का नाम - पुणे/मुंबई\\n2. पूर्वी भारत में एक लोहा और इस्पात संयंत्र का नाम - जमशेदपुर/भिलाई/दुर्गापुर\\n3. दक्षिण भारत में एक तापीय ऊर्जा संयंत्र का नाम - नेवेली/चेन्नई\\n4. छत्तीसगढ़ राज्य की राजधानी का नाम - रायपुर\\n5. पूर्वी भारत में एक अन्तर्राष्ट्रीय हवाई पत्तन का नाम - कोलकाता","marks":5,"section":"मानचित्र सम्बन्धी प्रश्न (Map Work) - Geography"}

STRICT RULES:
1. Generate 20 MCQs + Multiple Descriptive Questions + 2 Map Questions = 70 marks total
2. BILINGUAL format: "Hindi question / English question"
3. MCQ options: (A), (B), (C), (D)
4. All descriptive questions MUST have OR options
5. Map questions MUST include text-based answers for visually impaired
6. Follow topic rules strictly (general vs specific)
7. Complete detailed answers for all questions

Return ONLY valid JSON array with all questions. No markdown, no explanation.`;
    } else if (examFormat === "upboard_englishclass12") {
      prompt = `UP BOARD CLASS 12 ENGLISH PAPER (अंग्रेजी) - 100 अंक बनाएं।
Paper Code: 316(HV)

विषय/Topic: "${topic}"

${upBoardEnglishClass12Format}

⚠️⚠️⚠️ CRITICAL: GENERATE EXACTLY 20 SEPARATE JSON QUESTION OBJECTS ⚠️⚠️⚠️

**HOW TO GENERATE 20 QUESTIONS:**

📖 Section A - Reading (2 questions = 25 marks):
1. Reading Passage 1 (15 marks) - with (a), (b), (c), (d), (e) parts
2. Reading Passage 2 or continuation (10 marks)

✍️ Section B - Writing (2 questions = 20 marks):
3. Article Writing (10 marks) - 3 topic options
4. Letter/Application (10 marks) - with OR

📝 Section C - Grammar (6 questions = 15 marks):
5. Grammar MCQ 1 (2 marks)
6. Grammar MCQ 2 (2 marks)
7. Grammar MCQ 3 (2 marks)
8. Grammar MCQ 4 (2 marks)
9. Grammar MCQ 5 (2 marks)
10. Translation (5 marks)

📚 Section D - Literature (10 questions = 40 marks):

Prose (3 questions):
11. Prose Short Answer Part (a) (4 marks) - with OR
12. Prose Short Answer Part (b) (4 marks) - with OR
13. Prose Long Answer (7 marks) - choose ONE from 2

Poetry (4 questions):
14. Poetry Extract Part (a) (2 marks)
15. Poetry Extract Part (b) (2 marks)
16. Poetry Extract Part (c) (2 marks)
17. Central Idea (4 marks) - choose ONE poem

Vistas/Supplementary (3 questions):
18. Vistas Short Answer Part (a) (4 marks) - with OR
19. Vistas Short Answer Part (b) (4 marks) - with OR
20. Vistas Long Answer (7 marks) - choose ONE from 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: EXACTLY 20 JSON OBJECTS = 100 MARKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

=== ANSWER LENGTH - DETAILED ===
- 10 अंक (Article/Letter): 100-150 शब्द
- 8 अंक: 80-100 शब्द (comprehensive with examples)
- 7 अंक: 80-100 शब्द (detailed answer)
- 6 अंक: 50-70 शब्द (poetry extract - 3 parts × 2 marks)
- 4 अंक: 50-60 शब्द (central idea)
- 3 अंक: 40-50 शब्द (comprehension)
- 2 अंक: 20-30 शब्द (MCQ explanation or short answer)
- 1 अंक: 10-20 शब्द (vocabulary)

JSON FORMAT:

Reading: {"questionType":"written","questionText":"[Passage 400-450 words]\n\n(a) Question\n(b) Question\n(c) Question\n(d) Question\n(e) (i) Vocab (ii) Vocab (iii) Opposite","correctAnswer":"(a) Answer 40-50 words\n(b) Answer\n(c) Answer\n(d) Answer\n(e) (i) Word (ii) Word (iii) Word","marks":15,"section":"Section-A Reading"}

Article: {"questionType":"written","questionText":"Write an article on any ONE (100-150 words):\n(a) Topic 1\n(b) Topic 2\n(c) Topic 3","correctAnswer":"[Title]\n\n[Article 100-150 words with intro, body, conclusion]","marks":10,"section":"Section-B Writing - Article"}

Letter: {"questionType":"written","questionText":"Letter prompt\n\nOR\n\nApplication prompt","correctAnswer":"[Letter format]\n\nOR\n\n[Application format]","marks":10,"section":"Section-B Writing - Letter/Application"}

Grammar MCQ: {"questionType":"mcq","questionText":"Question","options":["(i) Option 1","(ii) Option 2","(iii) Option 3","(iv) Option 4"],"correctOption":0,"marks":2,"section":"Section-C Grammar - MCQ"}

Translation: {"questionType":"written","questionText":"Translate into English:\n\n[Hindi text]","correctAnswer":"[English translation]","marks":5,"section":"Section-C Grammar - Translation"}

Literature Short (with OR): {"questionType":"written","questionText":"(a) Question\n\nOR\n\nAlternative\n\n(b) Question\n\nOR\n\nAlternative","correctAnswer":"(a) Answer 40 words\n\nOR\n\nAlt answer\n\n(b) Answer 40 words\n\nOR\n\nAlt answer","marks":8,"section":"Section-D Literature - Short Answer"}

Literature Long: {"questionType":"written","questionText":"Answer any ONE (80 words):\n(a) Question 1\n(b) Question 2","correctAnswer":"Comprehensive answer 80-100 words with introduction, points, examples, conclusion","marks":7,"section":"Section-D Literature - Long Answer"}

Poetry Extract: {"questionType":"written","questionText":"Extract:\n[Lines]\n\n(a) Q1 (b) Q2 (c) Q3","correctAnswer":"(a) Ans 20-30 words\n(b) Ans\n(c) Ans","marks":6,"section":"Section-D Literature - Poetry"}

Central Idea: {"questionType":"written","questionText":"Central idea of any ONE:\n(a) Poem 1\n(b) Poem 2\n(c) Poem 3","correctAnswer":"Central idea 50-60 words: theme, message, poetic devices, significance","marks":4,"section":"Section-D Literature - Central Idea"}

STRICT RULES:
1. Generate Reading + Writing + Grammar + Literature = 100 marks total
2. ALL content in ENGLISH language
3. Literature questions need OR options where specified
4. Follow topic rules strictly (general vs specific chapter)
5. Complete detailed answers with proper word count
6. Include sample passages, articles, letters, and literary analysis

Return ONLY valid JSON array with all questions. No markdown, no explanation.`;
    } else if (examFormat === "upboard_hindiclass12") {
      prompt = `UP BOARD CLASS 12 HINDI PAPER (हिंदी) - 100 अंक बनाएं।
Paper Code: 301(HA)

विषय/Topic: "${topic}"

${upBoardHindiClass12Format}

⚠️⚠️⚠️ CRITICAL: GENERATE EXACTLY 20 SEPARATE JSON OBJECTS = 100 MARKS ⚠️⚠️⚠️

**QUESTION BREAKDOWN:**

खण्ड-क (10 questions = 55 marks):
1-2. MCQs (10 questions total, but treat as 2 groups) = 10 marks
3. Prose passage (10 marks)
4. Poetry passage (10 marks)
5. Author bio (3 marks)
6. Poet bio (2 marks)
7. Story/Essay summary (5 marks)
8. Epic poetry (5 marks)
9. Another epic poetry question (5 marks)
10. Additional literature (5 marks)

खण्ड-ख (10 questions = 45 marks):
11. Sanskrit passage translation (2 marks)
12. Sanskrit passage explanation (5 marks)
13. Sanskrit short answer 1 (2 marks)
14. Sanskrit short answer 2 (2 marks)
15. Word meanings (3 marks)
16. Essay (9 marks)
17. Sandhi-vichchhed (1 mark)
18. Samas (1 mark)
19. Grammar (1 mark)
20. Letter writing (8 marks)

TOTAL: 20 JSON objects = 100 marks

=== ANSWER LENGTH ===
- 1 अंक: 10-20 शब्द
- 2 अंक: 30-40 शब्द
- 3 अंक: 40-50 शब्द
- 5 अंक: 70-80 शब्द
- 7-8 अंक: 80-100 शब्द
- 9 अंक: 100-120 शब्द

STRICT RULES:
1. Generate all sections = 100 marks
2. HINDI language
3. Include OR options
4. Proper word limits

Return ONLY valid JSON array.`;
    } else if (examFormat === "upboard_chemistryclass12") {
      prompt = `UP BOARD CLASS 12 CHEMISTRY PAPER (रसायन विज्ञान) - 70 अंक बनाएं।
Paper Code: 347(JZ)

विषय/Topic: "${topic}"

${upBoardChemistryClass12Format}

⚠️⚠️⚠️ CRITICAL: GENERATE EXACTLY 12 QUESTIONS = 70 MARKS ⚠️⚠️⚠️

**QUESTION BREAKDOWN:**

Questions 1-6: Individual MCQs (6 marks total)
- Question 1: MCQ (1 mark) - Solid solutions
- Question 2: MCQ (1 mark) - Magnetic moment
- Question 3: MCQ (1 mark) - Coordination complexes
- Question 4: MCQ (1 mark) - Organic reactions
- Question 5: MCQ (1 mark) - IUPAC nomenclature
- Question 6: MCQ (1 mark) - Sugars/Biomolecules
- Each as SEPARATE JSON object with section "Question 1", "Question 2", etc.

Question 7 (8 marks): Short answers
- 4 sub-parts (क), (ख), (ग), (घ) × 2 marks each
- Numerical calculations and brief explanations

Question 8 (8 marks): Short answers with OR
- 4 sub-parts (क), (ख), (ग), (घ) × 2 marks each
- Explain reactions, distinguish compounds, OR options

Question 9 (12 marks): Numerical/calculations
- Raoult's Law, electrochemistry calculations (resistance, conductivity)
- Explain concepts with reasoning
- Order of reaction calculations

Question 10 (12 marks): Theory questions  
- Kohlrausch Law, conductivity concepts
- Chemical kinetics
- IUPAC nomenclature of complexes
- DNA and RNA differences

Question 11 (12 marks): Organic chemistry
- Part (a): 5 structures with IUPAC names OR explain reactions
- Part (b): 5 conversion reactions with equations OR synthesis reactions

Question 12 (12 marks): Organic concepts
- Part (a): Define 5 terms with examples OR write reaction products
- Part (b): Arrange in order (5 comparisons) OR give reasons (3 reasons)

**LANGUAGE:** Mix of Hindi and English (technical terms in English)
**EQUATIONS:** Balanced chemical equations required
**FORMAT:** Include proper chemical formulas and structures

Return ONLY valid JSON array with 12 questions.`;
    } else if (examFormat === "upboard_biology") {
      prompt = `UP BOARD CLASS 12 BIOLOGY PAPER (जीव विज्ञान) - 70 अंक बनाएं।
Paper Code: 348(KH)

विषय: "${topic}"

${upBoardBiologyFormat}

EXACT STRUCTURE:
- Q1: MCQs (4 parts) (क), (ख), (ग), (घ) = 4 marks
  * Bilingual format required
  * Cover: Reproduction, Genetics, Evolution, Biotechnology, Ecology (if general topic)
  * If specific topic: ALL MCQs from that topic only

- Q2: Very Short Answer (5 parts) (क), (ख), (ग), (घ), (ड़) = 5 marks
  * 20-30 words each
  * Examples: Full forms, definitions, names, basic concepts

- Q3: Short Answer Type I (5 parts) × 2 marks = 10 marks
  * 50-80 words each
  * Examples: Brief descriptions, short notes

- Q4-Q6: Short Answer Type II (4 parts each) × 3 marks = 12+12+12 = 36 marks
  * 80-120 words each
  * Some with sub-questions (1+2=3 or 1½+1½=3)
  * Examples: Detailed explanations, diagrams

- Q7-Q9: Long Answer (5 marks each with OR) = 15 marks
  * 150-200 words each
  * WITH OR options mandatory
  * Examples: Pollination, Evidence of evolution, Ecosystem components

=== ANSWER LENGTH - DETAILED ===
- 1 अंक: 20-30 शब्द (Direct answer)
- 2 अंक: 50-80 शब्द + 2-3 मुख्य बिंदु
- 3 अंक: 80-120 शब्द + 3-4 मुख्य बिंदु (diagram if needed)
- 5 अंक: 150-200 शब्द + 5-6 मुख्य बिंदु (comprehensive explanation)

JSON FORMAT:

MCQ (Q1 parts):
{"questionType":"mcq","questionText":"Tt अलील जोड़ा है / Tt alleles are pair of:","options":["(A) समयुग्मजी लम्बा / Homozygous long","(B) विषमयुग्मजी लम्बा / Heterozygous long","(C) समयुग्मजी बौना / Homozygous dwarf","(D) विषमयुग्मजी बौना / Heterozygous dwarf"],"correctOption":1,"marks":1,"section":"खण्ड-अ (Part-A) बहुविकल्पीय (1 अंक)"}

Very Short Answer (Q2 parts):
{"questionType":"written","questionText":"आर्.टी. एक. का पूर्ण रूप लिखिए / Write the full form of abbreviation I.V.F.","correctAnswer":"I.V.F. stands for In Vitro Fertilization (इन विट्रो फर्टिलाइजेशन). यह सहायक प्रजनन तकनीक है जिसमें शरीर के बाहर निषेचन कराया जाता है।","marks":1,"section":"खण्ड-ब (Part-B) अति-लघु उत्तरीय (1 अंक)"}

Short Answer Type I (Q3 parts):
{"questionType":"written","questionText":"ह्यूमस पर संक्षिप्त टिप्पणी लिखिए / Write a short note on Humus.","correctAnswer":"Humus (ह्यूमस) मिट्टी की ऊपरी परत में पाया जाने वाला कार्बनिक पदार्थ है। यह मृत पौधों और जंतुओं के अपघटन से बनता है।\n\nमुख्य विशेषताएं:\n1. मिट्टी को उपजाऊ बनाता है\n2. जल धारण क्षमता बढ़ाता है\n3. पोषक तत्व प्रदान करता है\n4. मिट्टी की संरचना सुधारता है\n\nह्यूमस पारिस्थितिकी तंत्र में महत्वपूर्ण भूमिका निभाता है।","marks":2,"section":"खण्ड-ग (Part-C) लघु-उत्तरीय प्रथम (2 अंक)"}

Short Answer Type II (Q4-Q6 parts):
{"questionType":"written","questionText":"आर.एन.ए. के सभी प्रकार के नाम लिखिए / Write the name of all types of RNA found in prokaryotes.","correctAnswer":"Prokaryotes में तीन प्रकार के RNA पाए जाते हैं:\n\n1. mRNA (Messenger RNA):\n   - DNA से genetic information को ribosomes तक पहुंचाता है\n   - Protein synthesis के लिए template का काम करता है\n   - अस्थायी प्रकृति का होता है\n\n2. rRNA (Ribosomal RNA):\n   - Ribosomes का structural component है\n   - Protein synthesis में active role निभाता है\n   - सबसे अधिक मात्रा में पाया जाता है (80%)\n\n3. tRNA (Transfer RNA):\n   - Amino acids को ribosomes तक transport करता है\n   - Anticodon द्वारा mRNA से जुड़ता है\n   - Cloverleaf structure होती है\n\nये सभी RNA protein synthesis के लिए आवश्यक हैं।","marks":3,"section":"खण्ड-घ (Part-D) लघु-उत्तरीय द्वितीय (3 अंक)"}

Long Answer (Q7-Q9 with OR):
{"questionType":"written","questionText":"परागण किसे कहते हैं ? परागण कितने प्रकार के होते हैं ? उदाहरण सहित वर्णन कीजिए।\n\nअथवा / OR\n\nWhat is Pollination ? How many types of pollination are there ? Describe with examples.","correctAnswer":"परागण (Pollination):\nपरागण वह प्रक्रिया है जिसमें परागकण परागकोश (anther) से स्त्रीकेसर के वर्तिकाग्र (stigma) तक पहुंचते हैं। यह यौन प्रजनन का महत्वपूर्ण चरण है।\n\nपरागण के प्रकार:\n\n1. स्वपरागण (Self-pollination):\n   - परिभाषा: जब परागकण उसी पुष्प या उसी पौधे के अन्य पुष्प के वर्तिकाग्र पर पहुंचते हैं\n   - उदाहरण: मटर (Pea), टमाटर (Tomato), सूरजमुखी\n   - लाभ: संतति में uniformity, कम खर्चीला\n\n2. परपरागण (Cross-pollination):\n   - परिभाषा: जब परागकण एक पौधे से दूसरे पौधे के पुष्प के वर्तिकाग्र पर पहुंचते हैं\n   - उदाहरण: पपीता (Papaya), मक्का (Maize), सेब\n   - लाभ: Genetic variation, स्वस्थ संतति\n\nपरपरागण के माध्यम:\n- हवा (Wind) - घास, मक्का\n- कीट (Insects) - गुलाब, सूरजमुखी\n- पानी (Water) - जलीय पौधे\n- जंतु (Animals) - आम, अमरूद\n\nमहत्व: Genetic diversity बढ़ती है, प्रजाति का विकास होता है, और नई किस्में उत्पन्न होती हैं।\n\nअथवा / OR\n\nPollination:\nPollination is the process of transfer of pollen grains from the anther to the stigma of a flower. It is a crucial step in sexual reproduction of plants.\n\nTypes of Pollination:\n\n1. Self-pollination:\n   - Definition: Transfer of pollen within the same flower or between flowers of the same plant\n   - Examples: Pea, Tomato, Sunflower\n   - Advantages: Uniformity in offspring, economical process\n\n2. Cross-pollination:\n   - Definition: Transfer of pollen from one plant to the stigma of another plant of the same species\n   - Examples: Papaya, Maize, Apple\n   - Advantages: Genetic variation, healthy offspring\n\nAgents of Cross-pollination:\n- Wind - Grasses, Maize\n- Insects - Rose, Sunflower  \n- Water - Aquatic plants\n- Animals - Mango, Guava\n\nSignificance: Increases genetic diversity, promotes evolution of species, and produces new varieties with better adaptability.","marks":5,"section":"खण्ड-ङ (Part-E) विस्तृत-उत्तरीय (5 अंक)"}

STRICT RULES:
1. Generate 4 MCQs + 5 Very Short + 5 Short(2m) + 12 Short(3m) + 3 Long(5m) = 70 marks total
2. BILINGUAL format: "Hindi question / English question"
3. MCQ options: (A), (B), (C), (D)
4. All long answer questions (Q7-Q9) MUST have OR options
5. Follow topic rules strictly (general vs specific)
6. Complete detailed answers for all questions with proper word count
7. Include diagrams mention where applicable

Return ONLY valid JSON array with all questions. No markdown, no explanation.`;
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
${
  finalLanguage !== "english"
    ? `11. ALL text MUST be in ${finalLanguage} language`
    : ""
}

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
        console.warn(
          `Skipping question at index ${index}: missing questionText`
        );
        continue;
      }

      // Normalize the question type
      const originalType = q.questionType;
      q.questionType = normalizeQuestionType(q.questionType);

      if (!q.questionType) {
        console.warn(
          `Skipping question at index ${index}: unknown type "${originalType}"`
        );
        // Try to infer type from structure
        if (
          q.options &&
          q.options.length === 4 &&
          typeof q.correctOption === "number"
        ) {
          q.questionType = "mcq";
        } else if (
          q.options &&
          q.options.length === 2 &&
          (q.options[0].toLowerCase() === "true" ||
            q.options[1].toLowerCase() === "false")
        ) {
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
            if (
              typeof q.correctOption !== "number" ||
              q.correctOption < 0 ||
              q.correctOption > 3
            ) {
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
              console.warn(
                `Skipping matching question at index ${index}: insufficient pairs`
              );
              continue;
            }
            // Ensure all pairs have left and right
            q.matchPairs = q.matchPairs.filter(
              (pair) => pair.left && pair.right
            );
            if (q.matchPairs.length < 2) {
              continue;
            }
            break;

          case "truefalse":
            // Always set standard options
            q.options = ["True", "False"];
            if (
              typeof q.correctOption !== "number" ||
              (q.correctOption !== 0 && q.correctOption !== 1)
            ) {
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
        console.warn(
          `Skipping question at index ${index}: ${validationError.message}`
        );
      }
    }

    if (validatedQuestions.length === 0) {
      throw new Error(
        "No valid questions could be generated. Please try again."
      );
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

    // Calculate expected answer length based on marks
    const getExpectedLength = (marks) => {
      if (marks === 1) return "20-50 words (2-3 sentences)";
      if (marks === 2) return "50-100 words (5-7 sentences)";
      if (marks === 3) return "100-150 words (8-12 sentences)";
      if (marks === 4) return "150-200 words (12-15 sentences)";
      if (marks === 5) return "200-300 words (1.5-2 pages, 15-20 sentences)";
      if (marks === 6) return "250-350 words (2 pages, 20-25 sentences)";
      if (marks >= 8) return "400-500 words (2.5-3 pages, 30-40 sentences)";
      return "50-150 words";
    };

    const expectedLength = getExpectedLength(maxMarks);
    const studentWordCount = studentAnswer.trim().split(/\s+/).length;

    const prompt = `You are an expert answer evaluator. Compare the student's answer with the expected answer and evaluate it comprehensively.

Expected Answer: "${expectedAnswer}"

Student's Answer: "${studentAnswer}"

Maximum Marks: ${maxMarks}
Expected Answer Length: ${expectedLength}
Student's Word Count: ${studentWordCount} words

⚠️ CRITICAL EVALUATION CRITERIA (ALL MUST BE CONSIDERED):

1. ANSWER LENGTH & COMPLETENESS (30% weightage):
   - For ${maxMarks} marks, answer should be ${expectedLength}
   - If answer is too short (< 50% of expected length), maximum score is 50% of total marks
   - If answer is adequate length but missing depth, deduct 20-30%
   - Award proportional marks based on how well the answer length matches the marks allocated

2. CONTENT ACCURACY (40% weightage):
   - Are all key concepts explained correctly?
   - Are facts, definitions, and explanations accurate?
   - Is scientific/technical terminology used correctly?

3. KEY POINTS COVERAGE (30% weightage):
   - How many important points from expected answer are covered?
   - For ${maxMarks} marks, there should be ${maxMarks}-${
      maxMarks + 2
    } main points
   - Each missing major point should result in proportional deduction

DETAILED MARKING SCHEME FOR ${maxMarks} MARKS:

Full Marks (${maxMarks}): 
- Answer length is ${expectedLength} ✓
- All key points covered in detail ✓
- Factually accurate throughout ✓
- Well-structured and comprehensive ✓

Deductions:
- Too short (< 50% expected length): -40% to -50% marks
- Moderately short (50-80% expected length): -20% to -30% marks
- Missing 1 major point: -20% (${Math.round(maxMarks * 0.2)} marks)
- Missing 2 major points: -40% (${Math.round(maxMarks * 0.4)} marks)
- Missing 3+ major points: -60% or more
- Minor factual error: -10% (${Math.round(maxMarks * 0.1)} mark)
- Major factual error: -30% (${Math.round(maxMarks * 0.3)} marks)
- Incorrect concept/completely wrong: -50% or more

Be lenient with:
- Minor spelling/grammatical errors (no deduction if meaning is clear)
- Different word choices that convey same meaning
- Rephrased explanations with correct concepts

Be strict with:
- Insufficient answer length for marks allocated
- Missing key concepts or main points
- Factual inaccuracies or incorrect information
- Superficial answers without proper explanation

IMPORTANT: 
- A 5-mark answer MUST be detailed and comprehensive (200-300 words)
- A short answer cannot get full marks even if correct
- Marks should be proportional to both correctness AND completeness

Return ONLY a JSON object with this structure:
{
  "score": <number between 0 and ${maxMarks}>,
  "percentage": <number between 0 and 100>,
  "feedback": "<detailed feedback: mention answer length adequacy, key points covered/missing, accuracy, and specific suggestions>"
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
      hindi:
        "\n\nGenerate ALL content in Hindi (हिंदी). Use Devanagari script.",
      bilingual:
        "\n\nGenerate in BILINGUAL format: Hindi first, then English. Example: 'हिंदी प्रश्न / English question'",
      sanskrit:
        "\n\nGenerate ALL content in Sanskrit (संस्कृत). Use Devanagari script.",
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
- Written: derivations, prove statements, HOTS questions, case studies`,
    };

    const languageNote = languageInstructions[language] || "";
    const difficultyNote =
      difficultyInstructions[difficulty] || difficultyInstructions.medium;

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
    } else if (examFormat === "upboard_maths") {
      prompt = `Extract questions from images for UP BOARD CLASS 10 MATHEMATICS PAPER (गणित) - 70 marks, 25 questions.
Paper Code: 822(BV)

EXTRACT ONLY what is visible in images. Do NOT generate new questions.

STRUCTURE (25 questions = 70 marks):
खण्ड 'अ' (Section A) - बहुविकल्पीय प्रश्न (MCQ) - 20 अंक:
- 20 प्रश्न × 1 अंक = 20 अंक (प्र.1-20)

खण्ड 'ब' (Section B) - वर्णनात्मक प्रश्न - 50 अंक:
- प्र.21: 6 भाग × 2 अंक = 12 अंक (सभी करें)
- प्र.22: 6 भाग में से किन्हीं 5 × 4 अंक = 20 अंक
- प्र.23-25: 3 प्रश्न × 6 अंक = 18 अंक (अथवा सहित)

=== ANSWER LENGTH - DETAILED WITH FULL SOLUTION ===
- 6 अंक: 150-200 शब्द + पूर्ण हल (सभी चरण)
- 4 अंक: 100-150 शब्द + पूर्ण हल
- 2 अंक: 50-80 शब्द + संक्षिप्त हल
- 1 अंक (MCQ): केवल सही विकल्प

=== DIAGRAM-BASED QUESTIONS ===
- Include [चित्र आवश्यक] tag for geometry/mensuration
- Describe figure with measurements in text

JSON FORMAT:
MCQ: {"questionType":"mcq","questionText":"प्रश्न / Question","options":["(A) विकल्प","(B) विकल्प","(C) विकल्प","(D) विकल्प"],"correctOption":0,"marks":1,"section":"खण्ड 'अ' (Section A) - MCQ (1 अंक)"}

प्र.21 (12 अंक): {"questionType":"written","questionText":"(क)...(ख)...(ग)...(घ)...(ङ)...(च)...","correctAnswer":"(क) [पूर्ण हल]\\n(ख) [पूर्ण हल]...","marks":12,"section":"खण्ड 'ब' - प्र.21 (6×2=12 अंक)"}

प्र.22 (20 अंक): {"questionType":"written","questionText":"किन्हीं पाँच के उत्तर दीजिए...","correctAnswer":"[पूर्ण हल]","marks":20,"section":"खण्ड 'ब' - प्र.22 (5×4=20 अंक)"}

प्र.23-25 (6 अंक each): {"questionType":"written","questionText":"प्रश्न","correctAnswer":"[पूर्ण हल]","marks":6,"section":"खण्ड 'ब' - प्र.23/24/25 (6 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा...","alternativeAnswer":"[पूर्ण हल]"}

STRICT RULES:
1. Extract from images only - DO NOT generate new questions
2. 25 questions total (20 MCQ + 5 descriptive sets)
3. Bilingual (Hindi/English)
4. प्र.23-25 need hasAlternative, alternativeQuestion, alternativeAnswer
5. MCQ options: (A), (B), (C), (D) format
6. Complete step-by-step solutions in answers

Return ONLY valid JSON array.`;
    } else if (examFormat === "upboard_englishclass12") {
      prompt = `Extract questions from images for UP BOARD CLASS 12 ENGLISH PAPER (अंग्रेजी) - 100 marks.
Paper Code: 316(HV)

EXTRACT ONLY what is visible in images. Do NOT generate new questions.

${upBoardEnglishClass12Format}

⚠️⚠️⚠️ EXTRACT EXACTLY 20 SEPARATE JSON OBJECTS FROM IMAGES ⚠️⚠️⚠️

BREAKDOWN:
- Reading: 2 questions (25m)
- Writing: 2 questions (20m)
- Grammar: 6 questions (15m) - Extract each MCQ and Translation as separate objects
- Literature: 10 questions (40m) - Break multi-part questions into separate objects

TOTAL: 20 separate JSON objects = 100 marks

=== ANSWER LENGTH ===
- 10 अंक: 100-150 words
- 7-8 अंक: 80-100 words
- 4-6 अंक: 50-60 words
- 2-3 अंक: 20-40 words
- 1 अंक: 10-20 words

JSON FORMAT: (Same as Generate with AI)

STRICT RULES:
1. Extract from images only - DO NOT generate
2. ENGLISH language
3. Include OR options where visible
4. Complete answers with proper word count

Return ONLY valid JSON array.`;
    } else if (examFormat === "upboard_hindiclass12") {
      prompt = `Extract questions from images for UP BOARD CLASS 12 HINDI PAPER (हिंदी) - 100 marks.
Paper Code: 301(HA)

EXTRACT ONLY what is visible in images. Do NOT generate new questions.

${upBoardHindiClass12Format}

⚠️⚠️⚠️ EXTRACT EXACTLY 20 SEPARATE JSON OBJECTS FROM IMAGES ⚠️⚠️⚠️

BREAKDOWN:
- खण्ड-क: 10 questions (55m)
- खण्ड-ख: 10 questions (45m)

TOTAL: 20 JSON objects = 100 marks

Return ONLY valid JSON array.`;
    } else if (examFormat === "upboard_chemistryclass12") {
      prompt = `Extract questions from images for UP BOARD CLASS 12 CHEMISTRY PAPER (रसायन विज्ञान) - 70 marks.
Paper Code: 347(JZ)

EXTRACT ONLY what is visible in images. Do NOT generate new questions.

${upBoardChemistryClass12Format}

⚠️⚠️⚠️ EXTRACT EXACTLY 7 QUESTIONS FROM IMAGES ⚠️⚠️⚠️

BREAKDOWN:
- Question 1: 6 MCQs (6m)
- Question 2: 4 short answers (8m)
- Question 3: 4 short answers with OR (8m)
- Question 4: Numerical problems (12m)
- Question 5: Theory questions (12m)
- Question 6: Organic chemistry - structures/conversions with OR (12m)
- Question 7: Organic concepts - definitions/orders with OR (12m)

TOTAL: 7 questions = 70 marks

**IMPORTANT:** Include all chemical equations, formulas, and structures exactly as shown in images.

Return ONLY valid JSON array.`;
    } else if (examFormat === "upboard_biology") {
      prompt = `Extract questions from images for UP BOARD CLASS 12 BIOLOGY PAPER (जीव विज्ञान) - 70 marks.
Paper Code: 348(KH)

EXTRACT ONLY what is visible in images. Do NOT generate new questions.

${upBoardBiologyFormat}

STRUCTURE:
- Q1: MCQs (4 parts) (क), (ख), (ग), (घ) = 4 marks - Bilingual format
- Q2: Very Short Answer (5 parts) = 5 marks - 20-30 words each
- Q3: Short Answer Type I (5 parts × 2 marks) = 10 marks - 50-80 words
- Q4-Q6: Short Answer Type II (4 parts each × 3 marks) = 36 marks - 80-120 words
- Q7-Q9: Long Answer (5 marks each with OR) = 15 marks - 150-200 words

=== ANSWER LENGTH ===
- 5 अंक: 150-200 शब्द + 5-6 मुख्य बिंदु + विस्तृत व्याख्या
- 3 अंक: 80-120 शब्द + 3-4 मुख्य बिंदु + विस्तृत व्याख्या
- 2 अंक: 50-80 शब्द + 2-3 मुख्य बिंदु + संक्षिप्त व्याख्या
- 1 अंक: 20-30 शब्द (Direct answer)

JSON FORMAT:
MCQ: {"questionType":"mcq","questionText":"हिंदी प्रश्न / English Question","options":["(A) हिंदी / English","(B)...","(C)...","(D)..."],"correctOption":0,"marks":1,"section":"खण्ड-अ (Part-A) बहुविकल्पीय (1 अंक)"}

Very Short: {"questionType":"written","questionText":"प्रश्न / Question","correctAnswer":"Brief answer (20-30 words)","marks":1,"section":"खण्ड-ब (Part-B) अति-लघु उत्तरीय (1 अंक)"}

Short Type I: {"questionType":"written","questionText":"प्रश्न / Question","correctAnswer":"Answer (50-80 words, 2-3 points)","marks":2,"section":"खण्ड-ग (Part-C) लघु-उत्तरीय प्रथम (2 अंक)"}

Short Type II: {"questionType":"written","questionText":"प्रश्न / Question","correctAnswer":"Answer (80-120 words, 3-4 points, diagrams if needed)","marks":3,"section":"खण्ड-घ (Part-D) लघु-उत्तरीय द्वितीय (3 अंक)"}

Long Answer: {"questionType":"written","questionText":"Main question Hindi/English\n\nअथवा / OR\n\nAlternative question","correctAnswer":"Main answer (150-200 words, 5-6 points)\n\nअथवा / OR\n\nAlternative answer (150-200 words, 5-6 points)","marks":5,"section":"खण्ड-ङ (Part-E) विस्तृत-उत्तरीय (5 अंक)"}

STRICT RULES:
1. Extract from images only - DO NOT generate new questions
2. BILINGUAL format required (Hindi / English)
3. All long answer questions (Q7-Q9) need OR options
4. MCQ options: (A), (B), (C), (D) format
5. Complete detailed answers with proper word count

Return ONLY valid JSON array.`;
    } else if (examFormat === "upboard_socialscience") {
      prompt = `Extract questions from images for UP BOARD CLASS 10 SOCIAL SCIENCE PAPER (सामाजिक विज्ञान) - 70 marks.
Paper Code: 825(BAS)

EXTRACT ONLY what is visible in images. Do NOT generate new questions.

${upBoardSocialScienceFormat}

STRUCTURE:
- Q1-Q20: MCQs (1 mark each) = 20 marks - Bilingual format
- Descriptive-I: Short answer (2+2, 2+4, 4 marks) - With OR options
- Descriptive-II: Long answer (6 marks each) - With OR options
- Map Work Q9(A): History Map - 5 locations (5 marks)
- Map Work Q9(B): Geography Map - 5 locations (5 marks)

=== ANSWER LENGTH ===
- 6 अंक: 150-200 शब्द + विस्तृत व्याख्या
- 4 अंक: 100-150 शब्द + पूर्ण व्याख्या
- 2 अंक: 50-80 शब्द + संक्षिप्त व्याख्या
- 1 अंक (MCQ): केवल सही विकल्प
- Map: Location name + marking instructions

JSON FORMAT:
MCQ: {"questionType":"mcq","questionText":"हिंदी प्रश्न / English Question","options":["(A) हिंदी / English","(B)...","(C)...","(D)..."],"correctOption":0,"marks":1,"section":"खण्ड-अ (Part-A) MCQ (1 अंक)"}

Descriptive: {"questionType":"written","questionText":"प्रश्न / Question\\n\\nअथवा / OR\\n\\nAlternative","correctAnswer":"Main answer\\n\\nअथवा / OR\\n\\nAlternative answer","marks":2 or 4 or 6,"section":"खण्ड-ब (Part-B) वर्णनात्मक"}

Map 9(A): {"questionType":"written","questionText":"History map instructions in Hindi and English","correctAnswer":"[Map locations]\\n1. Location 1 [½+½=1]\\n2. Location 2 [½+½=1]...\\n\\n[For visually impaired: text answers]","marks":5,"section":"मानचित्र (Map Work) - History"}

Map 9(B): {"questionType":"written","questionText":"Geography map instructions in Hindi and English","correctAnswer":"[Map locations]\\n1. Location 1 [½+½=1]...\\n\\n[For visually impaired: text answers]","marks":5,"section":"मानचित्र (Map Work) - Geography"}

STRICT RULES:
1. Extract from images only - DO NOT generate new questions
2. BILINGUAL format required (Hindi / English)
3. All descriptive questions need OR options
4. Map questions need text-based answers for visually impaired
5. MCQ options: (A), (B), (C), (D) format

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
${
  additionalInstructions ||
  "Extract questions exactly as they appear in the images"
}

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
    const images = Array.isArray(imagesData)
      ? imagesData
      : [
          {
            base64Data: imagesData.base64Data || imagesData,
            mimeType: imagesData.mimeType || "image/jpeg",
          },
        ];

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

    text = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

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
      console.log(
        "Sample question structure:",
        JSON.stringify(questions[0], null, 2).substring(0, 500)
      );
    }

    // Validate and normalize each question (same logic as generateQuestions)
    const validatedQuestions = [];

    for (let index = 0; index < questions.length; index++) {
      const q = questions[index];

      // Handle alternative field names for questionText
      if (!q.questionText) {
        // Try common alternative field names
        q.questionText =
          q.question ||
          q.text ||
          q.Question ||
          q.questiontext ||
          q.question_text ||
          q.QuestionText ||
          q.content ||
          q.prompt;
      }

      if (!q.questionText) {
        console.warn(
          `Skipping question at index ${index}: missing questionText. Keys: ${Object.keys(
            q
          ).join(", ")}`
        );
        continue;
      }

      // Handle alternative field names for questionType
      if (!q.questionType) {
        q.questionType =
          q.type || q.Type || q.question_type || q.QuestionType || q.qtype;
      }

      // Normalize the question type
      const originalType = q.questionType;
      q.questionType = normalizeQuestionType(q.questionType);

      if (!q.questionType) {
        console.warn(
          `Question at index ${index}: unknown type "${originalType}", trying to infer...`
        );
        // Try to infer type from structure
        if (
          q.options &&
          q.options.length === 4 &&
          typeof q.correctOption === "number"
        ) {
          q.questionType = "mcq";
        } else if (
          q.options &&
          q.options.length === 2 &&
          (q.options[0]?.toLowerCase() === "true" ||
            q.options[1]?.toLowerCase() === "false")
        ) {
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
        q.correctAnswer =
          q.answer ||
          q.Answer ||
          q.correct_answer ||
          q.expectedAnswer ||
          q.expected_answer;
      }

      // Handle alternative field names for correctOption
      if (q.correctOption === undefined) {
        q.correctOption =
          q.correct_option ?? q.correctIndex ?? q.correct ?? q.answerIndex ?? 0;
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
            if (
              typeof q.correctOption !== "number" ||
              q.correctOption < 0 ||
              q.correctOption > 3
            ) {
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
              console.warn(
                `Skipping matching question at index ${index}: insufficient pairs`
              );
              continue;
            }
            q.matchPairs = q.matchPairs.filter(
              (pair) => pair.left && pair.right
            );
            if (q.matchPairs.length < 2) {
              continue;
            }
            break;

          case "truefalse":
            q.options = ["True", "False"];
            if (
              typeof q.correctOption !== "number" ||
              (q.correctOption !== 0 && q.correctOption !== 1)
            ) {
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
        console.warn(
          `Skipping question at index ${index}: ${validationError.message}`
        );
      }
    }

    if (validatedQuestions.length === 0) {
      throw new Error(
        "No valid questions could be extracted. Please try again with clearer images."
      );
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
      hindi:
        "\n\nGenerate ALL content in Hindi (हिंदी). Use Devanagari script.",
      bilingual:
        "\n\nGenerate in BILINGUAL format: Hindi first, then English. Example: 'हिंदी प्रश्न / English question'",
      sanskrit:
        "\n\nGenerate ALL content in Sanskrit (संस्कृत). Use Devanagari script.",
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
- Critical thinking, advanced reasoning required`,
    };

    const languageNote = languageInstructions[language] || "";
    const difficultyNote =
      difficultyInstructions[difficulty] || difficultyInstructions.medium;

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
    } else if (examFormat === "upboard_maths") {
      prompt = `UP BOARD CLASS 10 MATHEMATICS PAPER (गणित) - 70 अंक, 25 प्रश्न बनाएं।
Paper Code: 822(BV)

INPUT विषय/सामग्री: "${rawQuestions}"

STRUCTURE (25 questions = 70 marks):
खण्ड 'अ' (Section A) - बहुविकल्पीय प्रश्न (MCQ) - 20 अंक:
- 20 प्रश्न × 1 अंक = 20 अंक (प्र.1-20)

खण्ड 'ब' (Section B) - वर्णनात्मक प्रश्न - 50 अंक:
- प्र.21: 6 भाग × 2 अंक = 12 अंक (सभी करें)
- प्र.22: 6 भाग में से किन्हीं 5 × 4 अंक = 20 अंक
- प्र.23-25: 3 प्रश्न × 6 अंक = 18 अंक (अथवा सहित)

=== ANSWER LENGTH - DETAILED WITH FULL SOLUTION ===
- 6 अंक: 150-200 शब्द + पूर्ण हल (सभी चरण, सूत्र, गणना)
- 4 अंक: 100-150 शब्द + पूर्ण हल
- 2 अंक: 50-80 शब्द + संक्षिप्त हल
- 1 अंक (MCQ): केवल सही विकल्प

=== DIAGRAM-BASED QUESTIONS ===
- Include [चित्र आवश्यक] tag for geometry/mensuration
- Describe figure with measurements in text

JSON FORMAT:
MCQ: {"questionType":"mcq","questionText":"प्रश्न / Question","options":["(A) विकल्प","(B) विकल्प","(C) विकल्प","(D) विकल्प"],"correctOption":0,"marks":1,"section":"खण्ड 'अ' (Section A) - MCQ (1 अंक)"}

प्र.21 (12 अंक): {"questionType":"written","questionText":"(क)...(ख)...(ग)...(घ)...(ङ)...(च)...","correctAnswer":"(क) [पूर्ण हल]\\n(ख) [पूर्ण हल]...","marks":12,"section":"खण्ड 'ब' - प्र.21 (6×2=12 अंक)"}

प्र.22 (20 अंक): {"questionType":"written","questionText":"किन्हीं पाँच के उत्तर दीजिए...","correctAnswer":"[पूर्ण हल]","marks":20,"section":"खण्ड 'ब' - प्र.22 (5×4=20 अंक)"}

प्र.23-25 (6 अंक each): {"questionType":"written","questionText":"प्रश्न","correctAnswer":"[पूर्ण हल]","marks":6,"section":"खण्ड 'ब' - प्र.23/24/25 (6 अंक)","hasAlternative":true,"alternativeQuestion":"अथवा...","alternativeAnswer":"[पूर्ण हल]"}

STRICT RULES:
1. EXACTLY 25 questions (20 MCQ + 5 descriptive sets)
2. Bilingual (Hindi/English)
3. MCQ options: (A), (B), (C), (D)
4. प्र.23-25 need hasAlternative, alternativeQuestion, alternativeAnswer
5. Complete step-by-step solutions in answers

Return ONLY valid JSON array with exactly 25 questions.`;
    } else if (examFormat === "upboard_englishclass12") {
      prompt = `UP BOARD CLASS 12 ENGLISH PAPER (अंग्रेजी) - 100 अंक बनाएं।
Paper Code: 316(HV)

INPUT विषय/सामग्री: "${rawQuestions}"

${upBoardEnglishClass12Format}

⚠️⚠️⚠️ CRITICAL: GENERATE EXACTLY 20 SEPARATE JSON OBJECTS = 100 MARKS ⚠️⚠️⚠️

BREAKDOWN:
- Reading: 2 questions (25m)
- Writing: 2 questions (20m)
- Grammar: 6 questions (15m) - 5 separate MCQs + 1 Translation
- Literature: 10 questions (40m) - Break multi-part questions into separate objects

TOTAL: 20 separate JSON objects

=== ANSWER LENGTH ===
- 10 अंक: 100-150 words
- 7-8 अंक: 80-100 words
- 4 अंक: 50-60 words
- 3 अंक: 40-50 words
- 2 अंक: 20-30 words
- 1 अंक: 10-20 words

JSON FORMAT: (Same as Generate with AI)

STRICT RULES:
1. Generate all sections = 100 marks total
2. ENGLISH language throughout
3. OR options in writing and literature sections
4. Complete answers with proper formatting

Return ONLY valid JSON array.`;
    } else if (examFormat === "upboard_chemistryclass12") {
      prompt = `UP BOARD CLASS 12 CHEMISTRY PAPER (रसायन विज्ञान) - 70 अंक बनाएं।
Paper Code: 347(JZ)

INPUT विषय/सामग्री: "${rawQuestions}"

${upBoardChemistryClass12Format}

⚠️⚠️⚠️ CRITICAL: GENERATE EXACTLY 7 QUESTIONS = 70 MARKS ⚠️⚠️⚠️

BREAKDOWN:
- Question 1: 6 MCQs (6m)
- Question 2: Short answers (8m)
- Question 3: Short answers with OR (8m)
- Question 4: Numerical/calculations (12m)
- Question 5: Theory questions (12m)
- Question 6: Organic - structures/conversions with OR (12m)
- Question 7: Organic - definitions/orders with OR (12m)

TOTAL: 7 questions = 70 marks

**LANGUAGE:** Mix of Hindi/English (technical terms in English)
**EQUATIONS:** Include balanced chemical equations
**FORMAT:** Proper chemical formulas and structures

Return ONLY valid JSON array with 7 questions.`;
    } else if (examFormat === "upboard_hindiclass12") {
      prompt = `UP BOARD CLASS 12 HINDI PAPER (हिंदी) - 100 अंक बनाएं।
Paper Code: 301(HA)

INPUT विषय/सामग्री: "${rawQuestions}"

${upBoardHindiClass12Format}

⚠️⚠️⚠️ GENERATE EXACTLY 20 SEPARATE JSON OBJECTS = 100 MARKS ⚠️⚠️⚠️

BREAKDOWN:
- खण्ड-क: 10 questions (55m) - MCQs, passages, authors, literature
- खण्ड-ख: 10 questions (45m) - Sanskrit, essay, grammar, letter

TOTAL: 20 JSON objects = 100 marks

Return ONLY valid JSON array.`;
    } else if (examFormat === "upboard_biology") {
      prompt = `UP BOARD CLASS 12 BIOLOGY PAPER (जीव विज्ञान) - 70 अंक बनाएं।
Paper Code: 348(KH)

INPUT विषय/सामग्री: "${rawQuestions}"

${upBoardBiologyFormat}

STRUCTURE:
- Q1: MCQs (4 parts) (क), (ख), (ग), (घ) = 4 marks - Bilingual format
- Q2: Very Short Answer (5 parts) = 5 marks - 20-30 words each
- Q3: Short Answer Type I (5 parts × 2 marks) = 10 marks - 50-80 words
- Q4-Q6: Short Answer Type II (4 parts each × 3 marks) = 36 marks - 80-120 words
- Q7-Q9: Long Answer (5 marks each with OR) = 15 marks - 150-200 words

=== ANSWER LENGTH ===
- 5 अंक: 150-200 शब्द + 5-6 मुख्य बिंदु + विस्तृत व्याख्या
- 3 अंक: 80-120 शब्द + 3-4 मुख्य बिंदु + विस्तृत व्याख्या
- 2 अंक: 50-80 शब्द + 2-3 मुख्य बिंदु + संक्षिप्त व्याख्या
- 1 अंक: 20-30 शब्द (Direct answer)

JSON FORMAT:
MCQ: {"questionType":"mcq","questionText":"हिंदी प्रश्न / English Question","options":["(A) हिंदी / English","(B)...","(C)...","(D)..."],"correctOption":0,"marks":1,"section":"खण्ड-अ (Part-A) बहुविकल्पीय (1 अंक)"}

Very Short: {"questionType":"written","questionText":"प्रश्न / Question","correctAnswer":"Brief answer (20-30 words)","marks":1,"section":"खण्ड-ब (Part-B) अति-लघु उत्तरीय (1 अंक)"}

Short Type I: {"questionType":"written","questionText":"प्रश्न / Question","correctAnswer":"Answer (50-80 words, 2-3 points)","marks":2,"section":"खण्ड-ग (Part-C) लघु-उत्तरीय प्रथम (2 अंक)"}

Short Type II: {"questionType":"written","questionText":"प्रश्न / Question","correctAnswer":"Answer (80-120 words, 3-4 points, diagrams if needed)","marks":3,"section":"खण्ड-घ (Part-D) लघु-उत्तरीय द्वितीय (3 अंक)"}

Long Answer: {"questionType":"written","questionText":"Main question Hindi/English\n\nअथवा / OR\n\nAlternative question","correctAnswer":"Main answer (150-200 words, 5-6 points)\n\nअथवा / OR\n\nAlternative answer (150-200 words, 5-6 points)","marks":5,"section":"खण्ड-ङ (Part-E) विस्तृत-उत्तरीय (5 अंक)"}

STRICT RULES:
1. Generate 4 MCQs + 5 Very Short + 5 Short(2m) + 12 Short(3m) + 3 Long(5m) = 70 marks total
2. BILINGUAL format required (Hindi / English)
3. All long answer questions (Q7-Q9) need OR options
4. MCQ options: (A), (B), (C), (D) format
5. Complete detailed answers with proper word count
6. Follow topic rules (general vs specific)

Return ONLY valid JSON array.`;
    } else if (examFormat === "upboard_socialscience") {
      prompt = `UP BOARD CLASS 10 SOCIAL SCIENCE PAPER (सामाजिक विज्ञान) - 70 अंक बनाएं।
Paper Code: 825(BAS)

INPUT विषय/सामग्री: "${rawQuestions}"

${upBoardSocialScienceFormat}

STRUCTURE:
- Q1-Q20: MCQs (1 mark each) = 20 marks - Bilingual format
- Descriptive-I: Short answer (2+2, 2+4, 4 marks) - With OR options
- Descriptive-II: Long answer (6 marks each) - With OR options
- Map Work Q9(A): History Map - 5 locations (5 marks)
- Map Work Q9(B): Geography Map - 5 locations (5 marks)

=== ANSWER LENGTH ===
- 6 अंक: 150-200 शब्द + विस्तृत व्याख्या
- 4 अंक: 100-150 शब्द + पूर्ण व्याख्या
- 2 अंक: 50-80 शब्द + संक्षिप्त व्याख्या
- 1 अंक (MCQ): केवल सही विकल्प
- Map: Location name + marking instructions

JSON FORMAT:
MCQ: {"questionType":"mcq","questionText":"हिंदी प्रश्न / English Question","options":["(A) हिंदी / English","(B)...","(C)...","(D)..."],"correctOption":0,"marks":1,"section":"खण्ड-अ (Part-A) MCQ (1 अंक)"}

Descriptive: {"questionType":"written","questionText":"प्रश्न / Question\\n\\nअथवा / OR\\n\\nAlternative","correctAnswer":"Main answer\\n\\nअथवा / OR\\n\\nAlternative answer","marks":2 or 4 or 6,"section":"खण्ड-ब (Part-B) वर्णनात्मक"}

Map 9(A): {"questionType":"written","questionText":"History map instructions","correctAnswer":"[Map locations]\\n1. Location 1 [½+½=1]\\n2. Location 2 [½+½=1]...\\n\\n[For visually impaired: text answers]","marks":5,"section":"मानचित्र (Map Work) - History"}

Map 9(B): {"questionType":"written","questionText":"Geography map instructions","correctAnswer":"[Map locations]\\n1. Location 1 [½+½=1]...\\n\\n[For visually impaired: text answers]","marks":5,"section":"मानचित्र (Map Work) - Geography"}

STRICT RULES:
1. Generate 20 MCQs + Descriptive Questions + 2 Map Questions = 70 marks
2. BILINGUAL format required
3. All descriptive questions need OR options
4. Map questions need text-based answers for visually impaired
5. Follow topic rules (general vs specific)

Return ONLY valid JSON array.`;
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

${
  numberOfQuestions
    ? `GENERATE EXACTLY ${numberOfQuestions} QUESTIONS.`
    : "Generate appropriate number of questions from the content."
}

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

    text = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");

    if (jsonStart === -1 || jsonEnd === -1) {
      console.error(
        "No JSON array found. Raw response:",
        text.substring(0, 500)
      );
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
      console.log(
        "Sample question structure:",
        JSON.stringify(questions[0], null, 2).substring(0, 500)
      );
    }

    // Validate and normalize each question
    const validatedQuestions = [];

    for (let index = 0; index < questions.length; index++) {
      const q = questions[index];

      // Handle alternative field names for questionText
      if (!q.questionText) {
        q.questionText =
          q.question ||
          q.text ||
          q.Question ||
          q.questiontext ||
          q.question_text ||
          q.QuestionText ||
          q.content ||
          q.prompt;
      }

      if (!q.questionText) {
        console.warn(
          `Skipping question at index ${index}: missing questionText. Keys: ${Object.keys(
            q
          ).join(", ")}`
        );
        continue;
      }

      // Handle alternative field names for questionType
      if (!q.questionType) {
        q.questionType =
          q.type || q.Type || q.question_type || q.QuestionType || q.qtype;
      }

      // Normalize the question type
      const originalType = q.questionType;
      q.questionType = normalizeQuestionType(q.questionType);

      if (!q.questionType) {
        console.warn(
          `Question at index ${index}: unknown type "${originalType}", trying to infer...`
        );
        if (
          q.options &&
          q.options.length === 4 &&
          (typeof q.correctOption === "number" ||
            typeof q.correct_option === "number")
        ) {
          q.questionType = "mcq";
        } else if (
          q.options &&
          q.options.length === 2 &&
          (q.options[0]?.toLowerCase() === "true" ||
            q.options[1]?.toLowerCase() === "false")
        ) {
          q.questionType = "truefalse";
        } else if (
          q.correctAnswer ||
          q.answer ||
          q.Answer ||
          q.correct_answer
        ) {
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
        q.correctAnswer =
          q.answer ||
          q.Answer ||
          q.correct_answer ||
          q.expectedAnswer ||
          q.expected_answer;
      }

      // Handle alternative field names for correctOption
      if (q.correctOption === undefined) {
        q.correctOption =
          q.correct_option ?? q.correctIndex ?? q.correct ?? q.answerIndex ?? 0;
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
            if (
              typeof q.correctOption !== "number" ||
              q.correctOption < 0 ||
              q.correctOption > 3
            ) {
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
            q.matchPairs = q.matchPairs.filter(
              (pair) => pair.left && pair.right
            );
            if (q.matchPairs.length < 2) continue;
            break;

          case "truefalse":
            q.options = ["True", "False"];
            if (
              typeof q.correctOption !== "number" ||
              (q.correctOption !== 0 && q.correctOption !== 1)
            ) {
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
        console.warn(
          `Skipping question at index ${index}: ${validationError.message}`
        );
      }
    }

    if (validatedQuestions.length === 0) {
      throw new Error(
        "No valid questions could be processed. Please try again."
      );
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
