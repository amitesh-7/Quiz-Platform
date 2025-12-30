# 📝 Quiz Platform

A production-ready **MERN Stack Quiz Platform** with Teacher & Student portals, featuring AI-powered question generation using Google's Gemini API.

![Quiz Platform](https://img.shields.io/badge/Stack-MERN-green) ![React](https://img.shields.io/badge/React-18-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen)

## ✨ Features

### 🎓 Teacher Portal

- Create and manage quizzes
- Add questions manually or generate with AI (Gemini API)
- Set quiz duration and total marks
- Activate/deactivate quizzes
- View student submissions and scores

### 📚 Student Portal

- Browse available quizzes
- Attempt quizzes with countdown timer
- Auto-submit on timeout
- View detailed results with question review
- Track all past submissions

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
│   │   ├── components/
│   │   │   ├── Loading.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── ParticleBackground.jsx
│   │   │   └── PrivateRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   ├── teacher/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── CreateQuiz.jsx
│   │   │   │   ├── ManageQuiz.jsx
│   │   │   │   └── QuizSubmissions.jsx
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

### Gemini AI (Teacher)

| Method | Endpoint               | Description                |
| ------ | ---------------------- | -------------------------- |
| POST   | `/api/gemini/generate` | Generate questions with AI |

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

- Create a new quiz
- Add questions manually or use AI generation
- Activate the quiz

### 3. As Student

- View available quizzes
- Attempt a quiz (timer will start)
- View results after submission

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
  questionText: String,
  options: [String] (4 options),
  correctOption: Number (0-3),
  marks: Number
}
```

### Submission

```javascript
{
  quizId: ObjectId (Quiz),
  studentId: ObjectId (User),
  answers: [{questionId, selectedOption}],
  score: Number,
  submittedAt: Date
}
```

## ⚠️ Security Considerations

1. **Gemini API Key**: Never expose to frontend
2. **JWT Secret**: Use strong, unique secret in production
3. **Password**: Minimum 6 characters, bcrypt hashed
4. **CORS**: Configure for production domains
5. **Input Validation**: All inputs are validated

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
