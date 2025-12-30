# 📝 Quiz Platform

A production-ready **MERN Stack Quiz Platform** with Teacher & Student portals, featuring AI-powered question generation, OCR-based answer extraction, and intelligent evaluation using Google's Gemini API.

![Quiz Platform](https://img.shields.io/badge/Stack-MERN-green) ![React](https://img.shields.io/badge/React-18-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen) ![AI](https://img.shields.io/badge/AI-Gemini-purple)

## ✨ Features

### 🎓 Teacher Portal

- **Quiz Management**: Create and manage quizzes with multiple question types
- **AI Question Generation**:
  - Generate questions using AI from topics
  - Bulk question processing from raw text
  - Extract questions from uploaded images (test papers, worksheets)
- **5 Question Types**: MCQ, Written, Fill in the Blanks, Matching, True/False
- **Flexible Quiz Settings**: Set duration, total marks, and activation status
- **Student Management**: View all students and their quiz attempts
- **Detailed Analytics**: View submissions with detailed scoring and evaluation

### 📚 Student Portal

- **Browse Quizzes**: View all available active quizzes
- **Multiple Attempts**: Retake quizzes unlimited times (results update automatically)
- **Smart Answer Submission**:
  - Traditional text input for all question types
  - Upload answer sheet images (up to 10 per quiz)
  - AI automatically extracts and maps answers from images
  - Support for numbered answers (e.g., Ans29, Ans30)
- **Real-time Timer**: Countdown timer with auto-submit on timeout
- **Comprehensive Results**: View detailed results with:
  - Score breakdown and percentage
  - Question-wise review with correct answers
  - AI feedback for written answers
  - Proportional marking display

### 🤖 AI-Powered Features

- **Question Generation**: Generate diverse questions on any topic
- **Image Processing**:
  - Extract questions from images (OCR)
  - Extract handwritten/printed answers from student submissions
- **Smart Answer Parsing**: Automatically detect and map answers like "Ans32: [text]"
- **Proportional Marking**: AI evaluates written answers with detailed marking:
  - 95-100% match: Full marks
  - 75-94%: Minor deduction (1-2 marks)
  - 50-74%: Moderate deduction (30-50%)
  - 25-49%: Major deduction (50-75%)
  - 1-24%: Minimal marks (1-2)
  - 0%: Zero marks
- **Feedback Generation**: Detailed AI-generated feedback for written answers

### 🔐 Security

- JWT-based authentication
- Role-based access control (Teacher/Student)
- Password hashing with bcrypt
- Protected API routes
- Gemini API key secured on backend only

### 🎨 UI/UX

- Glassmorphism design
- Particle background effects
- Smooth animations with Framer Motion
- Fully responsive design
- Dark theme optimized

## 🛠️ Tech Stack

### Frontend

- **React 18** (Vite)
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **react-tsparticles** - Particle background
- **Axios** - HTTP client
- **React Router DOM** - Navigation
- **React Hot Toast** - Notifications

### Backend

- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose**
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **@google/generative-ai** - Gemini API integration
- **express-validator** - Input validation

## 📦 Project Structure

```
Quiz Platform/
├── backend/
│   ├── config/
│   │   ├── db.js           # MongoDB connection
│   │   └── gemini.js       # Gemini AI configuration
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── quizController.js
│   │   ├── questionController.js
│   │   ├── geminiController.js
│   │   └── submissionController.js
│   ├── middleware/
│   │   ├── auth.js         # JWT & role verification
│   │   └── validate.js     # Input validation
│   ├── models/
│   │   ├── User.js
│   │   ├── Quiz.js
│   │   ├── Question.js
│   │   └── Submission.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── quizzes.js
│   │   ├── questions.js
│   │   ├── gemini.js
│   │   ├── submissions.js
│   │   └── results.js
│   ├── app.js
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── components/
│   │   │   ├── Loading.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── ParticleBackground.jsx
│   │   │   ├── PrivateRoute.jsx
│   │   │   └── ThemeToggle.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Register.jsx
│   │   │   │   ├── StudentLogin.jsx
│   │   │   │   └── TeacherLogin.jsx
│   │   │   ├── teacher/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── CreateQuiz.jsx
│   │   │   │   ├── ManageQuiz.jsx
│   │   │   │   ├── ManageStudents.jsx
│   │   │   │   ├── QuizSubmissions.jsx
│   │   │   │   └── StudentQuizzes.jsx
│   │   │   └── student/
│   │   │       ├── Dashboard.jsx
│   │   │       ├── AttemptQuiz.jsx
│   │   │       ├── QuizResult.jsx
│   │   │       └── MyResults.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- Google Gemini API key

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Quiz Platform"
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` with your credentials:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quiz-platform
JWT_SECRET=your-super-secret-jwt-key-change-in-production
GEMINI_API_KEY=your-gemini-api-key
PORT=5000
NODE_ENV=development
```

```bash
# Start the server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

```bash
# Start the development server
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## 📡 API Endpoints

### Authentication

| Method | Endpoint             | Description       |
| ------ | -------------------- | ----------------- |
| POST   | `/api/auth/register` | Register new user |
| POST   | `/api/auth/login`    | Login user        |
| GET    | `/api/auth/me`       | Get current user  |

### Quizzes (Teacher)

| Method | Endpoint           | Description     |
| ------ | ------------------ | --------------- |
| POST   | `/api/quizzes`     | Create quiz     |
| GET    | `/api/quizzes`     | Get all quizzes |
| GET    | `/api/quizzes/:id` | Get quiz by ID  |
| PUT    | `/api/quizzes/:id` | Update quiz     |
| DELETE | `/api/quizzes/:id` | Delete quiz     |

### Questions (Teacher)

| Method | Endpoint                 | Description           |
| ------ | ------------------------ | --------------------- |
| POST   | `/api/questions`         | Create question       |
| POST   | `/api/questions/bulk`    | Bulk create questions |
| GET    | `/api/questions/:quizId` | Get quiz questions    |
| PUT    | `/api/questions/:id`     | Update question       |
| DELETE | `/api/questions/:id`     | Delete question       |

### Gemini AI

| Method | Endpoint                        | Description                     |
| ------ | ------------------------------- | ------------------------------- |
| POST   | `/api/gemini/generate`          | Generate questions with AI      |
| POST   | `/api/gemini/process-questions` | Process raw text to quiz format |
| POST   | `/api/gemini/extract-questions` | Extract questions from image    |
| POST   | `/api/gemini/ocr`               | Extract text from image (OCR)   |

### Submissions (Student)

| Method | Endpoint               | Description        |
| ------ | ---------------------- | ------------------ |
| POST   | `/api/submissions`     | Submit quiz        |
| GET    | `/api/submissions/my`  | Get my submissions |
| GET    | `/api/results/:quizId` | Get quiz result    |

## 🔑 Environment Variables

### Backend

| Variable         | Description                          |
| ---------------- | ------------------------------------ |
| `MONGODB_URI`    | MongoDB connection string            |
| `JWT_SECRET`     | Secret key for JWT tokens            |
| `GEMINI_API_KEY` | Google Gemini API key                |
| `PORT`           | Server port (default: 5000)          |
| `NODE_ENV`       | Environment (development/production) |
| `FRONTEND_URL`   | Frontend URL for CORS                |

### Frontend

| Variable       | Description     |
| -------------- | --------------- |
| `VITE_API_URL` | Backend API URL |

## 🌐 Deployment

### Frontend (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Backend (Render/Railway)

1. Push to GitHub
2. Create new web service
3. Set environment variables
4. Deploy

### Database (MongoDB Atlas)

1. Create cluster
2. Add database user
3. Whitelist IP addresses
4. Get connection string

## 🧪 Testing the Application

### 1. Register Users

- Create a teacher account
- Create a student account

### 2. As Teacher

**Manual Question Creation:**

- Create a new quiz
- Add questions of different types (MCQ, Written, Fill Blanks, Matching, True/False)
- Set marks for each question
- Activate the quiz

**AI-Powered Question Creation:**

- Use "Generate with AI" to create questions from a topic
- Use "Process Raw Questions" to convert plain text into quiz format
- Upload an image of a test paper to extract questions automatically

### 3. As Student

**Traditional Approach:**

- View available quizzes
- Attempt a quiz (timer will start)
- Answer each question individually
- Submit and view results

**Answer Sheet Upload:**

- Navigate to the last question of the quiz
- Upload images of your handwritten answer sheets (up to 10)
- Ensure answers are labeled with numbers (e.g., Ans1, Ans29, Ans30)
- AI will extract and map answers automatically
- Submit and view results with AI feedback

### 4. Multiple Attempts

- Students can retake any quiz unlimited times
- Results are updated with each new submission
- View all attempt history in "My Results"

## 🎯 Question Types Guide

### 1. Multiple Choice Questions (MCQ)

- 4 options (A, B, C, D)
- Single correct answer
- Binary scoring (correct/incorrect)

### 2. True/False Questions

- 2 options (True, False)
- Single correct answer
- Binary scoring

### 3. Written Answer Questions

- Open-ended text response
- AI-powered evaluation with proportional marking
- Detailed feedback provided
- Support for image upload with OCR

### 4. Fill in the Blanks

- Multiple blanks possible
- Exact match scoring
- Case-insensitive comparison

### 5. Matching Questions

- Pairs of items to match
- Left column and right column
- All pairs must be correct for full marks

## 📸 Image Upload Features

### For Teachers

- **Extract Questions**: Upload test paper images to automatically generate quiz questions
- **Bulk Processing**: Convert raw text questions to structured format

### For Students

- **Answer Sheet Upload**: Upload up to 10 images of handwritten answers
- **Auto-Mapping**: AI detects answer numbers (Ans1, Ans29, etc.) and maps to questions
- **OCR Processing**: Extracts text from handwritten or printed answers
- **Smart Evaluation**: AI evaluates written answers with proportional marking

### Best Practices for Image Upload

- Use clear, well-lit photos
- Write on white paper with dark ink
- Label each answer with its number (e.g., Ans1, Ans32)
- Maximum 5MB per image
- Supported formats: JPG, PNG, JPEG

## 🎨 UI Components

### Glassmorphism Classes

```css
.glass {
  @apply bg-white/10 backdrop-blur-lg border border-white/20;
}

.glass-card {
  @apply bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6;
}

.btn-primary {
  @apply bg-gradient-to-r from-blue-600 to-purple-600 text-white;
}
```

## 📝 Database Schemas

### User

```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: "teacher" | "student"
}
```

### Quiz

```javascript
{
  title: String,
  description: String,
  createdBy: ObjectId (User),
  duration: Number (minutes),
  totalMarks: Number,
  isActive: Boolean
}
```

### Question

```javascript
{
  quizId: ObjectId (Quiz),
  questionType: "mcq" | "written" | "fillblank" | "matching" | "truefalse",
  questionText: String,

  // For MCQ and True/False
  options: [String],
  correctOption: Number (0-3),

  // For Written Answer
  correctAnswer: String,

  // For Fill in the Blanks
  blanks: [String],

  // For Matching
  matchPairs: [{left: String, right: String}],

  marks: Number (1-10)
}
```

### Submission

```javascript
{
  quizId: ObjectId (Quiz),
  studentId: ObjectId (User),
  answers: [
    {
      questionId: ObjectId,
      selectedOption: Number,        // For MCQ/True-False
      studentAnswer: String,         // For written/fill blank
      studentMatches: [{left, right}], // For matching
      isCorrect: Boolean,
      awardedMarks: Number,          // For proportional marking
      feedback: String               // AI feedback for written answers
    }
  ],
  score: Number,
  totalMarks: Number,
  percentage: Number,
  submittedAt: Date
}
```

## ⚠️ Security Considerations

1. **Gemini API Key**: Never expose to frontend
2. **JWT Secret**: Use strong, unique secret in production
3. **Password**: Minimum 6 characters, bcrypt hashed
4. **CORS**: Configure for production domains
5. **Input Validation**: All inputs are validated
6. **File Upload**: Images validated for type and size (max 5MB)
7. **API Rate Limiting**: Consider implementing for Gemini API calls

## 🚀 Performance Optimization

- **OCR Caching**: Consider caching OCR results for identical images
- **Lazy Loading**: Images and components loaded on demand
- **Optimistic Updates**: UI updates before server confirmation
- **Debounced Requests**: Reduced API calls for text inputs

## 🔄 Recent Updates

### Version 2.0 (Latest)

- ✅ Added 5 question types (MCQ, Written, Fill Blanks, Matching, True/False)
- ✅ Multiple quiz attempts with result updates
- ✅ Image upload for answer sheets (up to 10 per quiz)
- ✅ Smart answer parsing with number detection (Ans29, Ans30, etc.)
- ✅ AI-powered proportional marking for written answers
- ✅ OCR-based text extraction from images
- ✅ Bulk question processing from raw text
- ✅ Question extraction from uploaded images
- ✅ Enhanced result display for all question types
- ✅ Detailed AI feedback for written answers

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

Built with ❤️ using the MERN Stack

---

**Happy Quizzing! 🎉**
