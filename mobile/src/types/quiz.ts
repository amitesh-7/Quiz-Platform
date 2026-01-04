// Quiz types
export interface Quiz {
  _id: string;
  title: string;
  description?: string;
  subject?: string;
  duration: number; // in minutes
  totalMarks: number;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  questionsCount?: number;
}

export interface Option {
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  _id: string;
  quizId: string;
  text?: string; // Alias for questionText
  questionText: string;
  type?: string; // Alias for questionType
  questionType:
    | "multiple-choice"
    | "mcq"
    | "true-false"
    | "short-answer"
    | "long-answer"
    | "fill-in-the-blank"
    | "written"
    | "fillblank"
    | "matching"
    | "truefalse"
    | "assertion-reason";
  options?: Option[] | string[];
  correctOption?: number;
  correctAnswer?: string | string[] | Record<string, string>;
  marks: number;
  imageUrl?: string;
  order: number;
}

export interface Answer {
  questionId: string;
  questionText?: string;
  questionType?: "mcq" | "written" | "fillblank" | "matching" | "truefalse";
  options?: string[];
  correctOption?: number;
  correctAnswer?: string;
  blanks?: string[];
  matchPairs?: Array<{ left: string; right: string }>;
  marks: number;
  earnedMarks?: number;
  maxMarks?: number;
  selectedOption?: number | string | string[] | Record<string, string>;
  answer?: string;
  textAnswer?: string;
  imageUrl?: string;
  marksObtained?: number;
  isCorrect?: boolean;
  feedback?: string;
  question?: Question; // Populated from backend
}

export interface Submission {
  _id: string;
  quizId: string | Quiz;
  studentId: string;
  studentName?: string;
  student?: {
    _id: string;
    name: string;
    email?: string;
    role: string;
  };
  quiz?: Quiz;
  answers: Answer[];
  totalMarks?: number;
  score: number;
  obtainedMarks?: number;
  percentage?: number;
  attemptNumber?: number;
  submittedAt: string;
  status?: "pending" | "evaluated" | "partial";
  isGraded?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
