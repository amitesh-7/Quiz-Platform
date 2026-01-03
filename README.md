# 📝 Quiz Platform

A production-ready **MERN Stack Quiz Platform** with Teacher & Student portals, featuring AI-powered question generation, OCR-based answer extraction, intelligent evaluation using Google's Gemini API, and **UP Board Exam Paper Formats**.

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
- **PDF Download**: Download question papers with answer keys in board exam format

### 📚 Student Portal

- **Browse Quizzes**: View all available active quizzes
- **Multiple Attempts**: Retake quizzes unlimited times (results update automatically)
- **Smart Answer Submission**:
  - Traditional text input for all question types
  - Upload answer sheet images (up to 10 per quiz)
  - AI automatically extracts and maps answers from images
  - Support for numbered answers (e.g., Ans29, Ans30)
- **Real-time Timer**: Countdown timer with auto-submit on timeout
- **Comprehensive Results**: View detailed results with score breakdown

### 🏫 UP Board Exam Formats (Class 10)

Generate complete board exam papers with exact structure:

| Subject | Paper Code | Total Marks | Questions | Language |
|---------|------------|-------------|-----------|----------|
| **Science (विज्ञान)** | - | 70 | 31 | Bilingual (Hindi/English) |
| **English (अंग्रेजी)** | 817(BH) | 70 | 31 | English |
| **Hindi (हिन्दी)** | 801(BA) | 70 | 30 | Hindi |
| **Sanskrit (संस्कृत)** | 818(BP) | 70 | 31 | Sanskrit/Hindi |
| **Mathematics (गणित)** | 822(BV) | 70 | 25 | Bilingual (Hindi/English) |

Each format includes:
- Exact section-wise structure (खण्ड अ/ब)
- Proper marks distribution
- MCQ with (A), (B), (C), (D) format
- Descriptive questions with अथवा/OR options
- Answer length proportional to marks

### 🤖 AI-Powered Features

- **Question Generation**: Generate diverse questions on any topic
- **Image Processing**: Extract questions from images (OCR)
- **Smart Answer Parsing**: Automatically detect and map answers
- **Proportional Marking**: AI evaluates written answers with detailed marking
- **Feedback Generation**: Detailed AI-generated feedback for written answers

### 🔐 Security

- JWT-based authentication
- Role-based access control (Teacher/Student)
- Password hashing with bcrypt
- Protected API routes
- Gemini API key secured on backend only

### 🎨 UI/UX

- Glassmorphism design with dark theme
- Particle background effects
- Smooth animations with Framer Motion
- Fully responsive design

## 🛠️ Tech Stack

### Frontend
- **React 18** (Vite)
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **react-tsparticles** - Particle background
- **Axios** - HTTP client
- **React Router DOM** - Navigation
- **React Hot Toast** - Notifications
- **React Icons** - Icon library

### Backend
- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose**
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **@google/generative-ai** - Gemini API integration
- **express-validator** - Input validation

## 📦 Project Structure

```
quiz-platform/
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── gemini.js          # Gemini AI config & UP Board formats
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── geminiController.js
│   │   ├── questionController.js
│   │   ├── quizController.js
│   │   └── submissionController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT & role verification
│   │   └── validate.js        # Input validation
│   ├── models/
│   │   ├── Question.js
│   │   ├── Quiz.js
│   │   ├── Submission.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── gemini.js
│   │   ├── questions.js
│   │   ├── quizzes.js
│   │   ├── results.js
│   │   └── submissions.js
│   ├── .env.example
│   ├── .gitignore
│   ├── app.js
│   ├── package.json
│   ├── server.js
│   └── vercel.json
│
├── frontend/
│   ├── public/
│   │   └── quiz-icon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── Loading.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── ParticleBackground.jsx
│   │   │   ├── PrivateRoute.jsx
│   │   │   └── ThemeToggle.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Register.jsx
│   │   │   │   ├── StudentLogin.jsx
│   │   │   │   └── TeacherLogin.jsx
│   │   │   ├── student/
│   │   │   │   ├── AttemptQuiz.jsx
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── MyResults.jsx
│   │   │   │   └── QuizResult.jsx
│   │   │   ├── teacher/
│   │   │   │   ├── CreateQuiz.jsx
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── ManageQuiz.jsx
│   │   │   │   ├── ManageStudents.jsx
│   │   │   │   ├── QuizSubmissions.jsx
│   │   │   │   ├── StudentQuizzes.jsx
│   │   │   │   └── SubmissionDetails.jsx
│   │   │   └── Landing.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vercel.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Google Gemini API key(s)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd quiz-platform
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quiz-platform
JWT_SECRET=your-super-secret-jwt-key
GEMINI_API_KEY=your-primary-gemini-api-key
GEMINI_API_KEY_2=your-backup-gemini-api-key-2
GEMINI_API_KEY_3=your-backup-gemini-api-key-3
PORT=5000
NODE_ENV=development
```

```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

### 4. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### Quizzes (Teacher)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/quizzes` | Create quiz |
| GET | `/api/quizzes` | Get all quizzes |
| GET | `/api/quizzes/:id` | Get quiz by ID |
| PUT | `/api/quizzes/:id` | Update quiz |
| DELETE | `/api/quizzes/:id` | Delete quiz |

### Questions (Teacher)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/questions` | Create question |
| POST | `/api/questions/bulk` | Bulk create questions |
| GET | `/api/questions/:quizId` | Get quiz questions |
| PUT | `/api/questions/:id` | Update question |
| DELETE | `/api/questions/:id` | Delete question |

### Gemini AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/gemini/generate` | Generate questions with AI |
| POST | `/api/gemini/process-questions` | Process raw text to quiz format |
| POST | `/api/gemini/extract-questions` | Extract questions from image |
| POST | `/api/gemini/ocr` | Extract text from image (OCR) |

### Submissions (Student)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/submissions` | Submit quiz |
| GET | `/api/submissions/my` | Get my submissions |
| GET | `/api/results/:quizId` | Get quiz result |

## 🔑 Environment Variables

### Backend
| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `GEMINI_API_KEY` | Primary Google Gemini API key |
| `GEMINI_API_KEY_2` | Backup Gemini API key (optional) |
| `GEMINI_API_KEY_3` | Backup Gemini API key (optional) |
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | Environment (development/production) |
| `FRONTEND_URL` | Frontend URL for CORS |

### Frontend
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |

## 🏫 UP Board Paper Formats

### Science (विज्ञान) - 70 Marks, 31 Questions

**खण्ड-अ (Part-A)** - 20 MCQs × 1 mark = 20 marks
- उप-भाग I: 7 MCQs (Q1-Q7)
- उप-भाग II: 6 MCQs (Q8-Q13)
- उप-भाग III: 7 MCQs (Q14-Q20)

**खण्ड-ब (Part-B)** - 50 marks
- उप-भाग I: 4 questions × 4 marks (Q21-Q24)
- उप-भाग II: 4 questions × 4 marks (Q25-Q28)
- उप-भाग III: 3 questions × 6 marks with OR (Q29-Q31)

### English (अंग्रेजी) - Paper Code: 817(BH) - 70 Marks, 31 Questions

**Part-A** - 20 MCQs × 1 mark = 20 marks

**Part-B** - 50 marks
- Q21: Reading Comprehension (8 marks)
- Q22: Letter/Application Writing (4 marks) with OR
- Q23: Article/Essay Writing (6 marks) with OR
- Q24-Q27: Grammar Questions (4 × 2 marks = 8 marks)
- Q28-Q31: Literature Questions (4 × 6 marks = 24 marks) with OR

### Hindi (हिन्दी) - Paper Code: 801(BA) - 70 Marks, 30 Questions

**खण्ड 'अ'** - 20 MCQs × 1 mark = 20 marks

**खण्ड 'ब'** - 50 marks
- प्र.21: गद्यांश (3×2=6 अंक) with अथवा
- प्र.22: पद्यांश (3×2=6 अंक) with अथवा
- प्र.23-24: संस्कृत अनुवाद (5+5=10 अंक)
- प्र.25: खण्डकाव्य (3 अंक)
- प्र.26: लेखक/कवि परिचय (5+5=10 अंक)
- प्र.27: कण्ठस्थ श्लोक (2 अंक)
- प्र.28: पत्र लेखन (4 अंक)
- प्र.29: संस्कृत प्रश्न (2 अंक)
- प्र.30: निबन्ध (7 अंक)

### Sanskrit (संस्कृत) - Paper Code: 818(BP) - 70 Marks, 31 Questions

**खण्ड 'अ'** - 20 MCQs = 20 marks
- उपखण्ड (क): गद्यांश आधारित MCQs (प्र.1-6)
- उपखण्ड (ख): व्याकरण MCQs (प्र.7-20)

**खण्ड 'ब'** - 50 marks
- प्र.21-26: गद्यांश/श्लोक/सारांश/चरित्र (23 अंक) with अथवा
- प्र.27-31: व्याकरण/अनुवाद/निबन्ध (27 अंक)

### Mathematics (गणित) - Paper Code: 822(BV) - 70 Marks, 25 Questions

**खण्ड 'अ' (Section A)** - 20 MCQs × 1 mark = 20 marks
- Topics: वास्तविक संख्याएं, बहुपद, द्विघात समीकरण, समान्तर श्रेढ़ी, निर्देशांक ज्यामिति, त्रिकोणमिति, वृत्त, क्षेत्रमिति, सांख्यिकी, प्रायिकता

**खण्ड 'ब' (Section B)** - 50 marks
- प्र.1: 6 parts × 2 marks = 12 marks (सभी करें)
- प्र.2: 5 parts × 4 marks = 20 marks (किन्हीं 5, 6 में से)
- प्र.3-5: 3 questions × 6 marks = 18 marks (अथवा सहित)

**Note for Diagram-Based Questions:**
- AI generates questions with `[चित्र आवश्यक]` tag
- Describes figure measurements in text
- Teachers need to add actual diagrams manually

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
- Add questions of different types
- Set marks for each question
- Activate the quiz

**AI-Powered Question Creation:**
- Use "Generate with AI" - select exam format (General/UP Board)
- Use "Process Raw Questions" to convert plain text
- Upload images to extract questions automatically

**UP Board Paper Generation:**
- Select exam format (e.g., "UP Board Science")
- Enter topic(s) - single or comma-separated
- AI generates complete 70-mark paper with exact structure
- Download as PDF with answer key

### 3. As Student
- View available quizzes
- Attempt quiz with timer
- Upload answer sheet images (optional)
- Submit and view results

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
  options: [String],           // For MCQ/True-False
  correctOption: Number,       // 0-3
  correctAnswer: String,       // For written
  blanks: [String],           // For fill blanks
  matchPairs: [{left, right}], // For matching
  marks: Number,
  section: String,            // For board exams
  subParts: [{part, question, answer, marks}],
  hasAlternative: Boolean,
  alternativeQuestion: String,
  alternativeAnswer: String
}
```

### Submission
```javascript
{
  quizId: ObjectId (Quiz),
  studentId: ObjectId (User),
  answers: [{
    questionId: ObjectId,
    selectedOption: Number,
    studentAnswer: String,
    studentMatches: [{left, right}],
    isCorrect: Boolean,
    awardedMarks: Number,
    feedback: String
  }],
  score: Number,
  totalMarks: Number,
  percentage: Number,
  submittedAt: Date
}
```

## ⚠️ Security Considerations

1. **Gemini API Keys**: Never expose to frontend, supports multiple keys with fallback
2. **JWT Secret**: Use strong, unique secret in production
3. **Password**: Minimum 6 characters, bcrypt hashed
4. **CORS**: Configure for production domains
5. **Input Validation**: All inputs are validated
6. **File Upload**: Images validated for type and size (max 5MB)

## 🔄 Recent Updates

### Version 3.0 (Latest)
- ✅ UP Board Science format (70 marks, 31 questions)
- ✅ UP Board English format (70 marks, 31 questions)
- ✅ UP Board Hindi format (70 marks, 30 questions)
- ✅ UP Board Sanskrit format (70 marks, 31 questions)
- ✅ UP Board Mathematics format (70 marks, 25 questions)
- ✅ Multiple Gemini API keys with automatic fallback
- ✅ PDF download with board exam styling
- ✅ Detailed answers proportional to marks
- ✅ Questions with अथवा/OR alternatives
- ✅ Section-wise question organization
- ✅ Submission details page for teachers

### Version 2.0
- ✅ 5 question types (MCQ, Written, Fill Blanks, Matching, True/False)
- ✅ Multiple quiz attempts with result updates
- ✅ Image upload for answer sheets (up to 10 per quiz)
- ✅ AI-powered proportional marking
- ✅ OCR-based text extraction

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
