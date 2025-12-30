const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI with API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get the Gemini model
const getGeminiModel = () => {
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
};

// Generate quiz questions using Gemini
const generateQuestions = async (topic, numberOfQuestions, difficulty = 'medium') => {
  const model = getGeminiModel();

  const prompt = `Generate ${numberOfQuestions} multiple choice quiz questions about "${topic}" at ${difficulty} difficulty level.

IMPORTANT: Return ONLY a valid JSON array with no additional text, markdown, or formatting.

Each question object must have exactly this structure:
{
  "questionText": "The question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctOption": 0,
  "marks": 1
}

Rules:
- correctOption is the index (0-3) of the correct answer in the options array
- Each question should have exactly 4 options
- marks should be 1 for easy, 2 for medium, 3 for hard questions
- Questions should be clear and unambiguous
- Options should be plausible but only one should be correct

Return ONLY the JSON array, nothing else.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up the response - remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse the JSON response
    const questions = JSON.parse(text);

    // Validate the structure
    if (!Array.isArray(questions)) {
      throw new Error('Response is not an array');
    }

    // Validate each question
    questions.forEach((q, index) => {
      if (!q.questionText || !Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error(`Invalid question structure at index ${index}`);
      }
      if (typeof q.correctOption !== 'number' || q.correctOption < 0 || q.correctOption > 3) {
        throw new Error(`Invalid correctOption at index ${index}`);
      }
    });

    return questions;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error(`Failed to generate questions: ${error.message}`);
  }
};

module.exports = {
  getGeminiModel,
  generateQuestions
};
