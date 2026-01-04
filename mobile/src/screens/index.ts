// Export auth screens
export * from "./auth";

// Export student screens with aliases to avoid conflicts
export {
  DashboardScreen as StudentDashboard,
  MyQuizzesScreen,
  ResultsScreen,
  ProfileScreen as StudentProfile,
  AttemptQuizScreen,
  QuizResultScreen,
} from "./student";

// Export teacher screens with aliases to avoid conflicts
export {
  DashboardScreen as TeacherDashboard,
  QuizzesScreen,
  StudentsScreen,
  ProfileScreen as TeacherProfile,
  CreateQuizScreen,
  ManageQuizScreen,
  QuizSubmissionsScreen,
  SubmissionDetailsScreen,
  StudentQuizzesScreen,
} from "./teacher";
