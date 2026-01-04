# 📱 Quiz Platform - React Native Mobile App Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Development Environment Setup](#development-environment-setup)
4. [Project Structure](#project-structure)
5. [API Integration](#api-integration)
6. [Feature Implementation](#feature-implementation)
7. [Build & Deployment](#build--deployment)
8. [App Store Submission](#app-store-submission)

---

## 🎯 Overview

This document provides complete guidance for creating a React Native mobile application for the Quiz Platform. The mobile app will provide native iOS and Android experiences while connecting to the existing backend API.

### App Features

| Feature                | Student | Teacher |
| ---------------------- | ------- | ------- |
| Login/Register         | ✅      | ✅      |
| View Quizzes           | ✅      | ✅      |
| Attempt Quiz           | ✅      | ❌      |
| View Results           | ✅      | ✅      |
| Camera Answer Upload   | ✅      | ❌      |
| Create Quiz            | ❌      | ✅      |
| AI Question Generation | ❌      | ✅      |
| Manage Students        | ❌      | ✅      |
| Edit Submissions       | ❌      | ✅      |
| Push Notifications     | ✅      | ✅      |
| Offline Mode           | ✅      | ❌      |

---

## 🔧 Prerequisites

### Software Requirements

| Software       | Version | Purpose                      |
| -------------- | ------- | ---------------------------- |
| Node.js        | 18+ LTS | JavaScript runtime           |
| npm/yarn       | Latest  | Package manager              |
| Git            | Latest  | Version control              |
| VS Code        | Latest  | Code editor                  |
| Xcode          | 15+     | iOS development (macOS only) |
| Android Studio | Latest  | Android development          |
| JDK            | 17      | Java Development Kit         |
| Watchman       | Latest  | File watching (macOS)        |

### Hardware Requirements

#### For Development

| Platform                   | Minimum      | Recommended               |
| -------------------------- | ------------ | ------------------------- |
| **macOS** (for iOS)        | macOS 12+    | macOS 14+ with M1/M2 chip |
| **Windows** (Android only) | 8GB RAM, SSD | 16GB RAM, SSD             |
| **Linux** (Android only)   | 8GB RAM      | 16GB RAM                  |

#### For Testing

- **iOS Simulator** (requires macOS)
- **Android Emulator** or physical Android device
- Physical iPhone (for camera testing)
- Physical Android phone (for camera testing)

### Accounts Required

| Account             | Purpose                       | Cost                |
| ------------------- | ----------------------------- | ------------------- |
| Apple Developer     | iOS App Store                 | $99/year            |
| Google Play Console | Android Play Store            | $25 one-time        |
| Expo Account        | Build service (optional)      | Free tier available |
| Firebase Account    | Push notifications, analytics | Free tier available |

---

## 🛠️ Development Environment Setup

### Step 1: Install Node.js

```bash
# Windows (using Chocolatey)
choco install nodejs-lts

# macOS (using Homebrew)
brew install node

# Verify installation
node --version  # Should be 18+
npm --version
```

### Step 2: Install React Native CLI

```bash
# Install React Native CLI globally
npm install -g react-native-cli

# OR use npx (recommended)
npx react-native --version
```

### Step 3: Android Setup

#### Install Android Studio

1. Download from https://developer.android.com/studio
2. Install with default settings
3. Open Android Studio → More Actions → SDK Manager

#### Configure SDK

```
SDK Platforms:
  ✅ Android 14 (API 34)
  ✅ Android 13 (API 33)

SDK Tools:
  ✅ Android SDK Build-Tools 34
  ✅ Android SDK Command-line Tools
  ✅ Android Emulator
  ✅ Android SDK Platform-Tools
  ✅ Intel x86 Emulator Accelerator (HAXM)
```

#### Set Environment Variables

**Windows (PowerShell - Run as Admin):**

```powershell
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
[Environment]::SetEnvironmentVariable("Path", "$env:Path;$env:LOCALAPPDATA\Android\Sdk\platform-tools", "User")
```

**macOS/Linux (~/.zshrc or ~/.bashrc):**

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

#### Create Android Emulator

1. Android Studio → More Actions → Virtual Device Manager
2. Create Device → Pixel 7 → Next
3. Select System Image: API 34 (Download if needed)
4. Finish

### Step 4: iOS Setup (macOS Only)

```bash
# Install Xcode from App Store (15+ GB)

# Install Xcode Command Line Tools
xcode-select --install

# Install CocoaPods
sudo gem install cocoapods

# Install Watchman
brew install watchman

# Verify
pod --version
watchman --version
```

### Step 5: Verify Setup

```bash
# Check React Native doctor
npx react-native doctor

# Should show all green checkmarks:
# ✓ Node.js
# ✓ npm
# ✓ Watchman
# ✓ Xcode
# ✓ Android Studio
# ✓ Android SDK
# ✓ ANDROID_HOME
```

---

## 📁 Project Structure

### Initialize Project

```bash
# Create new React Native project
npx react-native@latest init QuizPlatformMobile

# OR with Expo (easier setup, limited native access)
npx create-expo-app QuizPlatformMobile

# Navigate to project
cd QuizPlatformMobile
```

### Recommended Folder Structure

```
QuizPlatformMobile/
├── android/                    # Android native code
├── ios/                        # iOS native code
├── src/
│   ├── api/
│   │   ├── axios.ts           # API client configuration
│   │   ├── auth.ts            # Auth API calls
│   │   ├── quiz.ts            # Quiz API calls
│   │   ├── submission.ts      # Submission API calls
│   │   └── gemini.ts          # AI API calls
│   │
│   ├── assets/
│   │   ├── fonts/
│   │   ├── images/
│   │   └── icons/
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── Modal.tsx
│   │   ├── quiz/
│   │   │   ├── QuizCard.tsx
│   │   │   ├── QuestionView.tsx
│   │   │   ├── OptionButton.tsx
│   │   │   └── Timer.tsx
│   │   └── camera/
│   │       ├── CameraView.tsx
│   │       └── ImagePreview.tsx
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useQuiz.ts
│   │   ├── useCamera.ts
│   │   └── useOffline.ts
│   │
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── StudentNavigator.tsx
│   │   └── TeacherNavigator.tsx
│   │
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── SplashScreen.tsx
│   │   ├── student/
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── QuizListScreen.tsx
│   │   │   ├── AttemptQuizScreen.tsx
│   │   │   ├── ResultScreen.tsx
│   │   │   └── MyResultsScreen.tsx
│   │   └── teacher/
│   │       ├── DashboardScreen.tsx
│   │       ├── CreateQuizScreen.tsx
│   │       ├── ManageQuizScreen.tsx
│   │       ├── SubmissionsScreen.tsx
│   │       └── StudentsScreen.tsx
│   │
│   ├── services/
│   │   ├── storage.ts         # AsyncStorage wrapper
│   │   ├── notifications.ts   # Push notifications
│   │   └── offline.ts         # Offline sync
│   │
│   ├── styles/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── theme.ts
│   │
│   ├── types/
│   │   ├── api.ts
│   │   ├── quiz.ts
│   │   ├── user.ts
│   │   └── navigation.ts
│   │
│   ├── utils/
│   │   ├── helpers.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   │
│   └── App.tsx
│
├── __tests__/                  # Test files
├── .env                        # Environment variables
├── .env.example
├── app.json                    # App configuration
├── babel.config.js
├── metro.config.js
├── package.json
├── tsconfig.json
└── README.md
```

### Install Essential Dependencies

```bash
# Navigation
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# State Management
npm install @tanstack/react-query zustand

# API & Network
npm install axios

# Storage
npm install @react-native-async-storage/async-storage

# Camera & Image
npm install react-native-vision-camera react-native-image-picker

# UI Components
npm install react-native-vector-icons react-native-svg
npm install react-native-reanimated react-native-gesture-handler

# Forms
npm install react-hook-form @hookform/resolvers zod

# Push Notifications
npm install @react-native-firebase/app @react-native-firebase/messaging

# Utilities
npm install date-fns react-native-device-info

# Development
npm install --save-dev typescript @types/react @types/react-native
npm install --save-dev jest @testing-library/react-native

# iOS specific
cd ios && pod install && cd ..
```

---

## 🔌 API Integration

### API Client Setup

```typescript
// src/api/axios.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = __DEV__
  ? "http://localhost:5000/api" // Development
  : "https://your-api.vercel.app/api"; // Production

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(["token", "user"]);
      // Navigate to login (use navigation ref)
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Auth API

```typescript
// src/api/auth.ts
import api from "./axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      _id: string;
      name: string;
      email: string;
      role: "teacher" | "student";
    };
  };
}

export const authAPI = {
  // Student login (name only)
  studentLogin: async (name: string): Promise<LoginResponse> => {
    const response = await api.post("/auth/student-login", { name });
    const { token, user } = response.data.data;
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("user", JSON.stringify(user));
    return response.data;
  },

  // Teacher login (email + password)
  teacherLogin: async (
    email: string,
    password: string
  ): Promise<LoginResponse> => {
    const response = await api.post("/auth/login", { email, password });
    const { token, user } = response.data.data;
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("user", JSON.stringify(user));
    return response.data;
  },

  // Register teacher
  register: async (data: {
    name: string;
    email: string;
    password: string;
    secretKey: string;
  }): Promise<LoginResponse> => {
    const response = await api.post("/auth/register", {
      ...data,
      role: "teacher",
    });
    const { token, user } = response.data.data;
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("user", JSON.stringify(user));
    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    await AsyncStorage.multiRemove(["token", "user"]);
  },

  // Get current user
  getStoredUser: async () => {
    const userStr = await AsyncStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },
};
```

### Quiz API

```typescript
// src/api/quiz.ts
import api from "./axios";
import { Quiz, Question } from "../types/quiz";

export const quizAPI = {
  // Get all quizzes for student
  getStudentQuizzes: async (): Promise<Quiz[]> => {
    const response = await api.get("/quizzes");
    return response.data.data.quizzes;
  },

  // Get quiz with questions
  getQuizWithQuestions: async (
    quizId: string
  ): Promise<{
    quiz: Quiz;
    questions: Question[];
  }> => {
    const [quizRes, questionsRes] = await Promise.all([
      api.get(`/quizzes/${quizId}`),
      api.get(`/questions/${quizId}`),
    ]);
    return {
      quiz: quizRes.data.data.quiz,
      questions: questionsRes.data.data.questions,
    };
  },

  // Teacher: Create quiz
  createQuiz: async (data: Partial<Quiz>): Promise<Quiz> => {
    const response = await api.post("/quizzes", data);
    return response.data.data.quiz;
  },

  // Teacher: Get quizzes created by teacher
  getTeacherQuizzes: async (): Promise<Quiz[]> => {
    const response = await api.get("/quizzes");
    return response.data.data.quizzes;
  },
};
```

### Submission API

```typescript
// src/api/submission.ts
import api from "./axios";

interface Answer {
  questionId: string;
  selectedOption: number | string | string[] | Record<string, string>;
  imageUrl?: string;
}

interface SubmitQuizData {
  quizId: string;
  answers: Answer[];
  questionsData?: any[];
}

export const submissionAPI = {
  // Submit quiz answers
  submit: async (data: SubmitQuizData) => {
    const response = await api.post("/submissions", data);
    return response.data;
  },

  // Get student's submissions
  getMySubmissions: async () => {
    const response = await api.get("/submissions/my");
    return response.data.data.submissions;
  },

  // Teacher: Get submissions for a quiz
  getQuizSubmissions: async (quizId: string) => {
    const response = await api.get(`/submissions/quiz/${quizId}`);
    return response.data.data.submissions;
  },

  // Teacher: Get submission details
  getSubmissionDetails: async (submissionId: string) => {
    const response = await api.get(`/submissions/${submissionId}`);
    return response.data.data.submission;
  },

  // Teacher: Update marks
  updateMarks: async (submissionId: string, updatedAnswers: any[]) => {
    const response = await api.patch(`/submissions/${submissionId}/marks`, {
      updatedAnswers,
    });
    return response.data;
  },
};
```

---

## 🎨 Feature Implementation

### Navigation Setup

```typescript
// src/navigation/AppNavigator.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../hooks/useAuth";

import AuthNavigator from "./AuthNavigator";
import StudentNavigator from "./StudentNavigator";
import TeacherNavigator from "./TeacherNavigator";
import SplashScreen from "../screens/auth/SplashScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : user.role === "teacher" ? (
          <Stack.Screen name="Teacher" component={TeacherNavigator} />
        ) : (
          <Stack.Screen name="Student" component={StudentNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Auth Context

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI } from "../api/auth";

interface User {
  _id: string;
  name: string;
  email?: string;
  role: "teacher" | "student";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  studentLogin: (name: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedUser = await authAPI.getStoredUser();
      setUser(storedUser);
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authAPI.teacherLogin(email, password);
    setUser(response.data.user);
  };

  const studentLogin = async (name: string) => {
    const response = await authAPI.studentLogin(name);
    setUser(response.data.user);
  };

  const register = async (data: any) => {
    const response = await authAPI.register(data);
    setUser(response.data.user);
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, studentLogin, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

### Camera Integration

```typescript
// src/components/camera/CameraView.tsx
import React, { useRef, useState } from "react";
import { View, TouchableOpacity, StyleSheet, Image } from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import { launchImageLibrary } from "react-native-image-picker";

interface CameraViewProps {
  onCapture: (imageBase64: string) => void;
  onClose: () => void;
}

export default function CameraView({ onCapture, onClose }: CameraViewProps) {
  const camera = useRef<Camera>(null);
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  React.useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  const takePhoto = async () => {
    if (camera.current) {
      const photo = await camera.current.takePhoto({
        qualityPrioritization: "quality",
      });

      // Convert to base64
      const base64 = await RNFS.readFile(photo.path, "base64");
      setCapturedImage(`data:image/jpeg;base64,${base64}`);
    }
  };

  const pickFromGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: "photo",
      includeBase64: true,
      quality: 0.8,
    });

    if (result.assets?.[0]?.base64) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setCapturedImage(base64);
    }
  };

  const confirmImage = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  if (!device || !hasPermission) {
    return <View style={styles.container} />;
  }

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedImage }} style={styles.preview} />
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={() => setCapturedImage(null)}
            style={styles.retakeBtn}
          >
            <Text>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmImage} style={styles.confirmBtn}>
            <Text>Use Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />
      <View style={styles.controls}>
        <TouchableOpacity onPress={pickFromGallery} style={styles.galleryBtn}>
          <Text>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={takePhoto} style={styles.captureBtn} />
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  preview: { flex: 1, resizeMode: "contain" },
  controls: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    borderWidth: 4,
    borderColor: "#ddd",
  },
  // ... more styles
});
```

### Quiz Timer Component

```typescript
// src/components/quiz/Timer.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useKeepAwake } from "expo-keep-awake";

interface TimerProps {
  durationMinutes: number;
  onTimeUp: () => void;
}

export default function Timer({ durationMinutes, onTimeUp }: TimerProps) {
  const [seconds, setSeconds] = useState(durationMinutes * 60);
  useKeepAwake(); // Prevent screen from sleeping during quiz

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTimeUp]);

  const formatTime = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }, []);

  const isLowTime = seconds < 60;

  return (
    <View style={[styles.container, isLowTime && styles.lowTime]}>
      <Text style={[styles.text, isLowTime && styles.lowTimeText]}>
        ⏱️ {formatTime(seconds)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#1e3a8a",
  },
  lowTime: {
    backgroundColor: "#dc2626",
  },
  text: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  lowTimeText: {
    color: "#fff",
  },
});
```

### Offline Support

```typescript
// src/services/offline.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const OFFLINE_SUBMISSIONS_KEY = "offline_submissions";

export const offlineService = {
  // Check if online
  isOnline: async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  },

  // Save submission for later sync
  saveOfflineSubmission: async (submission: any) => {
    const existing = await AsyncStorage.getItem(OFFLINE_SUBMISSIONS_KEY);
    const submissions = existing ? JSON.parse(existing) : [];
    submissions.push({
      ...submission,
      savedAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(
      OFFLINE_SUBMISSIONS_KEY,
      JSON.stringify(submissions)
    );
  },

  // Get pending offline submissions
  getOfflineSubmissions: async (): Promise<any[]> => {
    const data = await AsyncStorage.getItem(OFFLINE_SUBMISSIONS_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Sync all offline submissions
  syncOfflineSubmissions: async (submitFn: (data: any) => Promise<any>) => {
    const submissions = await offlineService.getOfflineSubmissions();
    const results = [];

    for (const submission of submissions) {
      try {
        await submitFn(submission);
        results.push({ success: true, submission });
      } catch (error) {
        results.push({ success: false, submission, error });
      }
    }

    // Remove successfully synced submissions
    const failed = results.filter((r) => !r.success).map((r) => r.submission);
    await AsyncStorage.setItem(OFFLINE_SUBMISSIONS_KEY, JSON.stringify(failed));

    return results;
  },

  // Clear offline data
  clearOfflineData: async () => {
    await AsyncStorage.removeItem(OFFLINE_SUBMISSIONS_KEY);
  },
};
```

---

## 🏗️ Build & Deployment

### Development Builds

```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios

# Run on specific device
npx react-native run-android --deviceId="device_id"
npx react-native run-ios --device "iPhone Name"
```

### Production Builds

#### Android APK/AAB

```bash
# Generate keystore (one-time)
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore quiz-platform.keystore -alias quiz-platform -keyalg RSA -keysize 2048 -validity 10000

# Configure gradle.properties
MYAPP_UPLOAD_STORE_FILE=quiz-platform.keystore
MYAPP_UPLOAD_KEY_ALIAS=quiz-platform
MYAPP_UPLOAD_STORE_PASSWORD=your-password
MYAPP_UPLOAD_KEY_PASSWORD=your-password

# Build APK (for testing)
cd android
./gradlew assembleRelease

# Build AAB (for Play Store)
./gradlew bundleRelease

# Output locations:
# APK: android/app/build/outputs/apk/release/app-release.apk
# AAB: android/app/build/outputs/bundle/release/app-release.aab
```

#### iOS IPA

```bash
# Open in Xcode
cd ios && open QuizPlatformMobile.xcworkspace

# In Xcode:
# 1. Select "Any iOS Device" as target
# 2. Product → Archive
# 3. Window → Organizer
# 4. Distribute App → App Store Connect
```

### Using Expo EAS Build (Easier)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure builds
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## 📱 App Store Submission

### Google Play Store

#### Requirements Checklist

- [ ] Signed AAB file
- [ ] App icon (512x512 PNG)
- [ ] Feature graphic (1024x500 PNG)
- [ ] Screenshots (min 2, max 8 per device type)
  - Phone: 16:9 or 9:16 aspect ratio
  - Tablet: 16:9 aspect ratio (optional)
- [ ] Short description (80 chars max)
- [ ] Full description (4000 chars max)
- [ ] Privacy policy URL
- [ ] App category: Education
- [ ] Content rating questionnaire
- [ ] Target age group declaration

#### Submission Steps

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Fill app details and content rating
4. Upload AAB to Internal Testing track first
5. Test thoroughly
6. Promote to Production
7. Submit for review (1-3 days)

### Apple App Store

#### Requirements Checklist

- [ ] IPA file (via Xcode or EAS)
- [ ] App icon (1024x1024 PNG, no alpha)
- [ ] Screenshots for each device size:
  - 6.7" (iPhone 15 Pro Max): 1290 x 2796
  - 6.5" (iPhone 15 Plus): 1284 x 2778
  - 5.5" (iPhone 8 Plus): 1242 x 2208
  - iPad Pro 12.9": 2048 x 2732
- [ ] App name (30 chars max)
- [ ] Subtitle (30 chars max)
- [ ] Description (4000 chars max)
- [ ] Keywords (100 chars total)
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Marketing URL (optional)
- [ ] App category: Education
- [ ] Age rating questionnaire

#### Submission Steps

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app
3. Fill app information
4. Upload build via Xcode/Transporter
5. Add screenshots and metadata
6. Submit for review (1-7 days)

---

## 📊 Version History

| Version | Date | Changes         |
| ------- | ---- | --------------- |
| 1.0.0   | -    | Initial release |

---

## 🔗 Useful Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Vision Camera](https://mrousavy.com/react-native-vision-camera/)
- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Store Connect Help](https://developer.apple.com/app-store-connect/)

---

## 💡 Tips & Best Practices

1. **Test on real devices** - Emulators don't fully replicate camera/GPS behavior
2. **Handle network errors gracefully** - Mobile networks are unreliable
3. **Implement offline-first** - Users expect apps to work without internet
4. **Optimize images** - Compress before upload to save data
5. **Use push notifications** - Notify students of new quizzes
6. **Test on low-end devices** - Not everyone has flagship phones
7. **Handle interruptions** - Phone calls, notifications during quiz
8. **Secure storage** - Use encrypted storage for tokens
9. **Performance monitoring** - Use Firebase Performance
10. **Crash reporting** - Use Firebase Crashlytics or Sentry

---

_Document Version: 1.0_
_Last Updated: January 4, 2026_
_Author: Quiz Platform Team_
