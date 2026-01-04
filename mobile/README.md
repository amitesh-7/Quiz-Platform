# Quiz Platform - React Native Mobile App

A cross-platform mobile application for the Quiz Platform built with React Native and TypeScript.

## 📱 Features

### For Students
- **Simple Login**: Login with just your name
- **Browse Quizzes**: View all available active quizzes
- **Take Quizzes**: Attempt quizzes with timer, MCQ/text questions
- **View Results**: See detailed results with scores and grades
- **Dark Mode**: Full dark/light theme support

### For Teachers
- **Secure Login**: Email/password authentication
- **Dashboard**: View stats and recent activity
- **Manage Quizzes**: Create, edit, toggle, delete quizzes
- **View Submissions**: See all student submissions
- **Grade Answers**: Edit marks for text questions
- **Manage Students**: View students and their quiz history

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- npm or yarn
- React Native CLI
- Android Studio (for Android)
- Xcode (for iOS, macOS only)
- JDK 17

### Installation

1. **Navigate to mobile folder**:
   ```bash
   cd mobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API URL
   ```

4. **Install iOS pods** (macOS only):
   ```bash
   cd ios && pod install && cd ..
   ```

### Running the App

**Start Metro bundler**:
```bash
npm start
```

**Run on Android**:
```bash
npm run android
```

**Run on iOS** (macOS only):
```bash
npm run ios
```

## 📁 Project Structure

```
mobile/
├── src/
│   ├── api/              # API client and endpoints
│   │   ├── axios.ts      # Axios instance with interceptors
│   │   ├── auth.ts       # Authentication API
│   │   ├── quiz.ts       # Quiz API
│   │   ├── submission.ts # Submission API
│   │   └── student.ts    # Student management API
│   ├── components/
│   │   └── common/       # Reusable UI components
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Card.tsx
│   │       ├── Loading.tsx
│   │       ├── Modal.tsx
│   │       └── EmptyState.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx  # Authentication state
│   │   └── ThemeContext.tsx # Theme state
│   ├── hooks/
│   │   ├── useAuth.ts    # Auth hook
│   │   ├── useTheme.ts   # Theme hook
│   │   ├── useTimer.ts   # Quiz timer hook
│   │   └── useForm.ts    # Form handling hook
│   ├── navigation/
│   │   ├── AppNavigator.tsx     # Root navigator
│   │   ├── AuthNavigator.tsx    # Auth flow
│   │   ├── StudentNavigator.tsx # Student screens
│   │   └── TeacherNavigator.tsx # Teacher screens
│   ├── screens/
│   │   ├── auth/         # Login, Register screens
│   │   ├── student/      # Student screens
│   │   └── teacher/      # Teacher screens
│   ├── services/
│   │   └── storage.ts    # AsyncStorage wrapper
│   ├── styles/
│   │   ├── colors.ts     # Color palette
│   │   ├── typography.ts # Font styles
│   │   └── spacing.ts    # Spacing scale
│   ├── types/
│   │   ├── user.ts       # User types
│   │   ├── quiz.ts       # Quiz types
│   │   ├── navigation.ts # Navigation types
│   │   └── api.ts        # API response types
│   └── utils/
│       ├── helpers.ts    # Utility functions
│       ├── validators.ts # Form validation
│       └── constants.ts  # App constants
├── App.tsx               # App entry point
├── package.json
├── tsconfig.json
└── babel.config.js
```

## 🎨 Theme System

The app supports light and dark modes:

```typescript
// Use theme in components
const {theme, isDark, toggleTheme} = useTheme();

<View style={{backgroundColor: theme.background}}>
  <Text style={{color: theme.text}}>Hello</Text>
</View>
```

## 🔌 API Configuration

The API URL is configured in `src/api/axios.ts`:

- **Android Emulator**: `http://10.0.2.2:5000/api`
- **iOS Simulator**: `http://localhost:5000/api`
- **Physical Device**: Use your computer's IP address

## 🧪 Key Dependencies

| Package | Purpose |
|---------|---------|
| `react-native` | Core framework |
| `@react-navigation/native` | Navigation |
| `@tanstack/react-query` | Data fetching & caching |
| `zustand` | State management |
| `axios` | HTTP client |
| `react-native-vector-icons` | Icons |
| `react-native-reanimated` | Animations |

## 📦 Building for Production

### Android

```bash
# Generate release APK
cd android
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/
```

### iOS

Use Xcode to archive and submit to App Store.

## 🔒 Environment Variables

Create `.env` file:

```env
API_URL=http://10.0.2.2:5000/api
```

## 📄 License

MIT License
