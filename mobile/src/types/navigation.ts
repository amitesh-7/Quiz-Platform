import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {CompositeScreenProps, NavigatorScreenParams} from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Welcome: undefined;
  StudentLogin: undefined;
  TeacherLogin: undefined;
  Register: undefined;
};

// Student Tab Navigator
export type StudentTabParamList = {
  Dashboard: undefined;
  MyQuizzes: undefined;
  Results: undefined;
  Profile: undefined;
};

// Student Stack (nested screens)
export type StudentStackParamList = {
  StudentTabs: NavigatorScreenParams<StudentTabParamList>;
  AttemptQuiz: {quizId: string; quizTitle: string};
  QuizResult: {submissionId: string};
};

// Teacher Tab Navigator
export type TeacherTabParamList = {
  Dashboard: undefined;
  Quizzes: undefined;
  Students: undefined;
  Profile: undefined;
};

// Teacher Stack (nested screens)
export type TeacherStackParamList = {
  TeacherTabs: NavigatorScreenParams<TeacherTabParamList>;
  CreateQuiz: undefined;
  ManageQuiz: {quizId: string};
  QuizSubmissions: {quizId: string; quizTitle: string};
  SubmissionDetails: {submissionId: string; studentName: string};
  StudentQuizzes: {studentId: string; studentName: string};
};

// Root Stack
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Student: NavigatorScreenParams<StudentStackParamList>;
  Teacher: NavigatorScreenParams<TeacherStackParamList>;
};

// Screen Props Types
export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

export type StudentTabScreenProps<T extends keyof StudentTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<StudentTabParamList, T>,
  NativeStackScreenProps<StudentStackParamList>
>;

export type StudentStackScreenProps<T extends keyof StudentStackParamList> = NativeStackScreenProps<
  StudentStackParamList,
  T
>;

export type TeacherTabScreenProps<T extends keyof TeacherTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TeacherTabParamList, T>,
  NativeStackScreenProps<TeacherStackParamList>
>;

export type TeacherStackScreenProps<T extends keyof TeacherStackParamList> = NativeStackScreenProps<
  TeacherStackParamList,
  T
>;

// Declare global navigation types
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
