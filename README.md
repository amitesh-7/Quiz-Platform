# 📝 Quiz Platform

A production-ready **MERN Stack Quiz Platform** with Teacher & Student portals, featuring AI-powered question generation, OCR-based answer extraction, intelligent evaluation using Google's Gemini API, **UP Board Exam Paper Formats**, and advanced submission management with **multiple attempt tracking** and **teacher mark editing capabilities**.

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
- **Advanced Submission Management**:
  - Track multiple attempts per student with attempt numbers
  - View detailed scoring and AI evaluation for each submission
  - **Edit marks** for individual questions after submission
  - **Update correct answers** (MCQ options and written answers) in edit mode
  - Automatic recalculation of total score after mark updates
  - Visual indicators for attempted/unattempted questions
- **PDF Download**: Download question papers with answer keys in board exam format

### 📚 Student Portal

- **Browse Quizzes**: View all available active quizzes
- **Multiple Attempts**: Retake quizzes unlimited times with automatic attempt tracking
  - Each attempt creates a separate submission record
  - Attempt numbers displayed for easy tracking (#1, #2, #3...)
  - All previous attempts preserved with full history
- **Smart Answer Submission**:
  - Traditional text input for all question types
  - Upload answer sheet images (up to 10 per quiz)
  - AI automatically extracts and maps answers from images
  - Support for numbered answers (e.g., Ans29, Ans30)
- **Camera Integration**: Take photos directly from mobile device for answer submission
- **Real-time Timer**: Countdown timer with auto-submit on timeout
- **Comprehensive Results**: View detailed results with score breakdown

### 🏫 UP Board Exam Formats

Generate complete board exam papers with exact structure:

| Subject                | Paper Code | Total Marks | Questions | Language                  | Class |
| ---------------------- | ---------- | ----------- | --------- | ------------------------- | ----- |
| **Science (विज्ञान)**  | -          | 70          | 31        | Bilingual (Hindi/English) | 10    |
| **English (अंग्रेजी)** | 817(BH)    | 70          | 31        | English                   | 10    |
| **Hindi (हिन्दी)**     | 801(BA)    | 70          | 30        | Hindi                     | 10    |
| **Sanskrit (संस्कृत)** | 818(BP)    | 70          | 31        | Sanskrit/Hindi            | 10    |
| **Mathematics (गणित)** | 822(BV)    | 70          | 25        | Bilingual (Hindi/English) | 10    |
| **Physics (भौतिकी)**   | 346        | 70          | 9         | Bilingual (Hindi/English) | 12    |

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

### 📱 Mobile App (React Native)

- **Cross-platform**: iOS and Android support
- **Full feature parity**: Students can take quizzes, teachers can manage
- **Native experience**: Smooth animations, native UI components
- **Offline support**: View cached data offline
- **Dark/Light theme**: Full theme support matching web app

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
│   │   ├── db.js                    # MongoDB connection
│   │   └── gemini.js                # Gemini AI config & UP Board formats
│   ├── controllers/
│   │   ├── authController.js        # Authentication logic
│   │   ├── geminiController.js      # AI question generation
│   │   ├── questionController.js    # Question CRUD operations
│   │   ├── quizController.js        # Quiz management
│   │   └── submissionController.js  # Submission handling
│   ├── middleware/
│   │   ├── auth.js                  # JWT & role verification
│   │   └── validate.js              # Input validation
│   ├── models/
│   │   ├── Question.js              # Question schema
│   │   ├── Quiz.js                  # Quiz schema
│   │   ├── Submission.js            # Submission schema
│   │   └── User.js                  # User schema
│   ├── routes/
│   │   ├── auth.js                  # Auth endpoints
│   │   ├── gemini.js                # AI endpoints
│   │   ├── questions.js             # Question endpoints
│   │   ├── quizzes.js               # Quiz endpoints
│   │   ├── results.js               # Results endpoints
│   │   └── submissions.js           # Submission endpoints
│   ├── .env.example
│   ├── .gitignore
│   ├── app.js                       # Express app setup
│   ├── package.json
│   ├── server.js                    # Server entry point
│   └── vercel.json                  # Vercel deployment config
│
├── frontend/
│   ├── public/
│   │   └── quiz-icon.svg            # App icon
│   ├── src/
│   │   ├── components/
│   │   │   ├── Loading.jsx          # Loading spinner
│   │   │   ├── Navbar.jsx           # Navigation bar
│   │   │   ├── ParticleBackground.jsx # Particle effects
│   │   │   ├── PrivateRoute.jsx     # Route protection
│   │   │   └── ThemeToggle.jsx      # Dark/Light mode toggle
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Authentication context
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx        # Generic login
│   │   │   │   ├── Register.jsx     # User registration
│   │   │   │   ├── StudentLogin.jsx # Student login
│   │   │   │   └── TeacherLogin.jsx # Teacher login
│   │   │   ├── student/
│   │   │   │   ├── AttemptQuiz.jsx  # Quiz taking interface
│   │   │   │   ├── Dashboard.jsx    # Student dashboard
│   │   │   │   ├── MyResults.jsx    # Results history
│   │   │   │   └── QuizResult.jsx   # Detailed result view
│   │   │   ├── teacher/
│   │   │   │   ├── CreateQuiz.jsx   # Quiz creation
│   │   │   │   ├── Dashboard.jsx    # Teacher dashboard
│   │   │   │   ├── ManageQuiz.jsx   # Quiz management
│   │   │   │   ├── ManageStudents.jsx # Student management
│   │   │   │   ├── QuizSubmissions.jsx # View submissions
│   │   │   │   ├── StudentQuizzes.jsx # Student quiz history
│   │   │   │   └── SubmissionDetails.jsx # Detailed submission
│   │   │   └── Landing.jsx          # Landing page
│   │   ├── services/
│   │   │   └── api.js               # API client
│   │   ├── App.jsx                  # Main app component
│   │   ├── index.css                # Global styles
│   │   └── main.jsx                 # React entry point
│   ├── .env.example
│   ├── .gitignore
│   ├── index.html                   # HTML template
│   ├── package.json
│   ├── postcss.config.js            # PostCSS config
│   ├── tailwind.config.js           # Tailwind config
│   ├── vercel.json                  # Vercel deployment config
│   └── vite.config.js               # Vite config
│
├── mobile/                          # React Native Mobile App
│   ├── src/
│   │   ├── api/
│   │   │   ├── auth.ts              # Auth API calls
│   │   │   ├── axios.ts             # Axios instance setup
│   │   │   ├── index.ts             # API exports
│   │   │   ├── quiz.ts              # Quiz API calls
│   │   │   ├── student.ts           # Student API calls
│   │   │   └── submission.ts        # Submission API calls
│   │   ├── components/
│   │   │   └── common/
│   │   │       ├── Button.tsx       # Reusable button
│   │   │       ├── Card.tsx         # Card component
│   │   │       ├── EmptyState.tsx   # Empty state display
│   │   │       ├── Input.tsx        # Form input
│   │   │       ├── Loading.tsx      # Loading indicator
│   │   │       ├── Modal.tsx        # Modal component
│   │   │       └── index.ts         # Component exports
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx      # Auth state management
│   │   │   ├── ThemeContext.tsx     # Theme state management
│   │   │   └── index.ts             # Context exports
│   │   ├── hooks/
│   │   │   ├── index.ts             # Hook exports
│   │   │   ├── useAuth.ts           # Auth hook
│   │   │   ├── useForm.ts           # Form handling hook
│   │   │   ├── useTheme.ts          # Theme hook
│   │   │   └── useTimer.ts          # Timer hook
│   │   ├── navigation/
│   │   │   ├── AppNavigator.tsx     # Main navigator
│   │   │   ├── AuthNavigator.tsx    # Auth flow navigator
│   │   │   ├── StudentNavigator.tsx # Student tab navigator
│   │   │   ├── TeacherNavigator.tsx # Teacher tab navigator
│   │   │   └── index.ts             # Navigation exports
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   │   ├── RegisterScreen.tsx
│   │   │   │   ├── SplashScreen.tsx
│   │   │   │   ├── StudentLoginScreen.tsx
│   │   │   │   ├── TeacherLoginScreen.tsx
│   │   │   │   ├── WelcomeScreen.tsx
│   │   │   │   └── index.ts
│   │   │   ├── student/
│   │   │   │   ├── AttemptQuizScreen.tsx
│   │   │   │   ├── DashboardScreen.tsx
│   │   │   │   ├── MyQuizzesScreen.tsx
│   │   │   │   ├── ProfileScreen.tsx
│   │   │   │   ├── QuizResultScreen.tsx
│   │   │   │   ├── ResultsScreen.tsx
│   │   │   │   └── index.ts
│   │   │   ├── teacher/
│   │   │   │   ├── CreateQuizScreen.tsx
│   │   │   │   ├── DashboardScreen.tsx
│   │   │   │   ├── ManageQuizScreen.tsx
│   │   │   │   ├── ProfileScreen.tsx
│   │   │   │   ├── QuizSubmissionsScreen.tsx
│   │   │   │   ├── QuizzesScreen.tsx
│   │   │   │   ├── StudentQuizzesScreen.tsx
│   │   │   │   ├── StudentsScreen.tsx
│   │   │   │   ├── SubmissionDetailsScreen.tsx
│   │   │   │   └── index.ts
│   │   │   └── index.ts             # Screen exports
│   │   ├── services/
│   │   │   ├── index.ts             # Service exports
│   │   │   └── storage.ts           # AsyncStorage helper
│   │   ├── styles/
│   │   │   ├── colors.ts            # Color palette
│   │   │   ├── index.ts             # Style exports
│   │   │   ├── spacing.ts           # Spacing constants
│   │   │   └── typography.ts        # Font styles
│   │   ├── types/
│   │   │   ├── api.ts               # API types
│   │   │   ├── index.ts             # Type exports
│   │   │   ├── navigation.ts        # Navigation types
│   │   │   ├── quiz.ts              # Quiz types
│   │   │   └── user.ts              # User types
│   │   └── utils/
│   │       ├── constants.ts         # App constants
│   │       ├── helpers.ts           # Helper functions
│   │       ├── index.ts             # Util exports
│   │       └── validators.ts        # Validation functions
│   ├── .env.example
│   ├── App.tsx                      # App entry component
│   ├── app.json                     # Expo/RN config
│   ├── babel.config.js              # Babel config
│   ├── index.js                     # App entry point
│   ├── metro.config.js              # Metro bundler config
│   ├── package.json
│   ├── README.md                    # Mobile app docs
│   └── tsconfig.json                # TypeScript config
│
├── .gitignore
├── REACT_NATIVE_APP.md              # React Native documentation
└── README.md                        # Main project README
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

| Method | Endpoint               | Description                       |
| ------ | ---------------------- | --------------------------------- |
| POST   | `/api/submissions`     | Submit quiz (creates new attempt) |
| GET    | `/api/submissions/my`  | Get my submissions                |
| GET    | `/api/results/:quizId` | Get quiz result                   |

### Submissions (Teacher)

| Method | Endpoint                               | Description                      |
| ------ | -------------------------------------- | -------------------------------- |
| GET    | `/api/submissions/:quizId/all`         | Get all submissions for a quiz   |
| GET    | `/api/submissions/:submissionId`       | Get submission details           |
| PATCH  | `/api/submissions/:submissionId/marks` | Update marks and correct answers |

## 🔑 Environment Variables

### Backend

| Variable           | Description                          |
| ------------------ | ------------------------------------ |
| `MONGODB_URI`      | MongoDB connection string            |
| `JWT_SECRET`       | Secret key for JWT tokens            |
| `GEMINI_API_KEY`   | Primary Google Gemini API key        |
| `GEMINI_API_KEY_2` | Backup Gemini API key (optional)     |
| `GEMINI_API_KEY_3` | Backup Gemini API key (optional)     |
| `PORT`             | Server port (default: 5000)          |
| `NODE_ENV`         | Environment (development/production) |
| `FRONTEND_URL`     | Frontend URL for CORS                |

### Frontend

| Variable       | Description     |
| -------------- | --------------- |
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

### Physics (भौतिकी) - Paper Code: 346 - 70 Marks, 9 Questions (Class 12)

**Part-A (खण्ड अ)** - 35 marks

- Q1-Q7: 7 questions × 5 marks = 35 marks (descriptive)

**Part-B (खण्ड ब)** - 35 marks

- Q8-Q9: 2 questions × 7.5 marks each (with internal choice/अथवा)
- Total: 15 marks
- Additional questions: 20 marks (distributed across remaining questions)

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
  attemptNumber: Number,           // Track multiple attempts (1, 2, 3...)
  answers: [{
    questionId: ObjectId,
    questionText: String,          // Stored for AI-generated quizzes
    questionType: String,
    options: [String],
    correctOption: Number,
    correctAnswer: String,
    selectedOption: Number | String | [String],
    earnedMarks: Number,          // Editable by teacher
    marks: Number,                // Maximum marks for question
    isCorrect: Boolean,
    feedback: String,
    imageUrl: String
  }],
  score: Number,                  // Auto-calculated from earnedMarks
  submittedAt: Date
}
```

**Key Features:**

- Each quiz retake creates a new submission with incremented `attemptNumber`
- Teachers can edit `earnedMarks` for any question
- Teachers can update `correctOption` (MCQ) or `correctAnswer` (written)
- `score` is recalculated automatically when marks are updated
- Both regular and AI-generated questions supported with fallback IDs studentMatches: [{left, right}],
  isCorrect: Boolean,
  awardedM4.0 (Latest - January 2026)
- ✅ **Multiple Attempt Tracking**: Each quiz retake creates separate submission with attempt number
- ✅ **Teacher Mark Editing**: Edit earned marks for any question after submission
- ✅ **Correct Answer Updates**: Teachers can change correct options (MCQ) and correct answers (written)
- ✅ **Automatic Score Recalculation**: Total score updates when marks are edited
- ✅ **Marks Validation**: Prevents marks from exceeding question maximum
- ✅ **Attempt Badges**: Visual display of attempt numbers in submission lists
- ✅ **Enhanced Submission Details**: Shows all questions (attempted + unattempted)
- ✅ **Unique Question IDs**: Support for both manual and AI-generated questions
- ✅ **Camera Integration**: Mobile camera support for answer sheet uploads

### Version 3.0

- ✅ UP Board Physics format (Class 12, Paper 346, 70 marks, 9 questions)
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

### Version 2.0

- ✅ 5 question types (MCQ, Written, Fill Blanks, Matching, True/False)
- ✅ Multiple quiz attempt

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
