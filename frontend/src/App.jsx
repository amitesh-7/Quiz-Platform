import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import ParticleBackground from './components/ParticleBackground';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Teacher Pages
import TeacherDashboard from './pages/teacher/Dashboard';
import CreateQuiz from './pages/teacher/CreateQuiz';
import ManageQuiz from './pages/teacher/ManageQuiz';
import QuizSubmissions from './pages/teacher/QuizSubmissions';

// Student Pages
import StudentDashboard from './pages/student/Dashboard';
import AttemptQuiz from './pages/student/AttemptQuiz';
import QuizResult from './pages/student/QuizResult';
import MyResults from './pages/student/MyResults';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ParticleBackground />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Teacher Routes */}
          <Route path="/teacher" element={<PrivateRoute role="teacher" />}>
            <Route index element={<TeacherDashboard />} />
            <Route path="create-quiz" element={<CreateQuiz />} />
            <Route path="quiz/:quizId" element={<ManageQuiz />} />
            <Route path="quiz/:quizId/submissions" element={<QuizSubmissions />} />
          </Route>
          
          {/* Student Routes */}
          <Route path="/student" element={<PrivateRoute role="student" />}>
            <Route index element={<StudentDashboard />} />
            <Route path="quiz/:quizId" element={<AttemptQuiz />} />
            <Route path="result/:quizId" element={<QuizResult />} />
            <Route path="results" element={<MyResults />} />
          </Route>
          
          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
