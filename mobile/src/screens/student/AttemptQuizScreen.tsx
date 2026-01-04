import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useQuery, useMutation } from "@tanstack/react-query";
import Icon from "react-native-vector-icons/Ionicons";

import { useTheme } from "../../contexts/ThemeContext";
import { quizAPI, submissionAPI } from "../../api";
import { Card, Button, Loading } from "../../components/common";
import { spacing, borderRadius } from "../../styles/spacing";
import { Question, Answer } from "../../types/quiz";
import { StudentStackScreenProps } from "../../types/navigation";

type RouteParams = StudentStackScreenProps<"AttemptQuiz">["route"];

export default function AttemptQuizScreen(): React.JSX.Element {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { quizId } = route.params;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);

  // Fetch quiz with questions
  const { data, isLoading } = useQuery({
    queryKey: ["quiz-attempt", quizId],
    queryFn: () => quizAPI.getQuizWithQuestions(quizId),
  });

  const quiz = data?.quiz;
  const questions = data?.questions || [];
  const currentQuestion = questions[currentIndex];

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: (submitData: { quizId: string; answers: Answer[] }) =>
      submissionAPI.submit(submitData),
    onSuccess: (response) => {
      const submissionId = response.data?.submission?._id;
      if (submissionId) {
        navigation.reset({
          index: 0,
          routes: [
            { name: "StudentTabs" as never },
            { name: "QuizResult" as never, params: { submissionId } },
          ],
        });
      }
    },
    onError: (error: any) => {
      Alert.alert(
        "Submission Failed",
        error.message || "Failed to submit quiz"
      );
    },
  });

  // Initialize timer
  useEffect(() => {
    if (quiz?.duration) {
      setTimeLeft(quiz.duration * 60);
    }
  }, [quiz?.duration]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Prevent back navigation
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        Alert.alert(
          "Exit Quiz?",
          "Your progress will be lost. Are you sure you want to exit?",
          [
            { text: "Stay", style: "cancel" },
            {
              text: "Exit",
              style: "destructive",
              onPress: () => navigation.goBack(),
            },
          ]
        );
        return true;
      }
    );

    return () => backHandler.remove();
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion._id]: value,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = useCallback(
    (autoSubmit = false) => {
      const submitQuiz = () => {
        const formattedAnswers: Answer[] = questions.map((q) => ({
          questionId: q._id,
          selectedOption: answers[q._id] ?? null,
          marks: 0, // Will be calculated on backend
        }));

        submitMutation.mutate({
          quizId,
          answers: formattedAnswers,
        });
      };

      if (autoSubmit) {
        Alert.alert("Time Up!", "Your quiz has been automatically submitted.", [
          { text: "OK", onPress: submitQuiz },
        ]);
      } else {
        const answeredCount = Object.keys(answers).length;
        const unanswered = questions.length - answeredCount;

        Alert.alert(
          "Submit Quiz",
          unanswered > 0
            ? `You have ${unanswered} unanswered question(s). Are you sure you want to submit?`
            : "Are you sure you want to submit your quiz?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Submit", onPress: submitQuiz },
          ]
        );
      }
    },
    [answers, questions, quizId, submitMutation]
  );

  if (isLoading) {
    return <Loading fullScreen message="Loading quiz..." />;
  }

  if (!quiz || questions.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.text }]}>
            Quiz not found or has no questions
          </Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const isLowTime = timeLeft < 60;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Timer Bar */}
      <View
        style={[
          styles.timerBar,
          { backgroundColor: isLowTime ? theme.error : theme.primary },
        ]}
      >
        <Icon name="time-outline" size={20} color="#fff" />
        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.primary,
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {currentIndex + 1} of {questions.length}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.questionCard}>
          <Text style={[styles.questionNumber, { color: theme.primary }]}>
            Question {currentIndex + 1}
          </Text>
          <Text style={[styles.questionText, { color: theme.text }]}>
            {currentQuestion.questionText}
          </Text>
          <Text style={[styles.marksText, { color: theme.textSecondary }]}>
            {currentQuestion.marks} mark{currentQuestion.marks > 1 ? "s" : ""}
          </Text>

          {/* Answer Options */}
          <View style={styles.optionsContainer}>
            <QuestionOptions
              question={currentQuestion}
              selectedAnswer={answers[currentQuestion._id]}
              onSelect={handleAnswer}
            />
          </View>
        </Card>
      </ScrollView>

      {/* Navigation */}
      <View style={[styles.footer, { backgroundColor: theme.surface }]}>
        <Button
          title="Previous"
          variant="outline"
          onPress={handlePrevious}
          disabled={currentIndex === 0}
          style={styles.navButton}
        />

        {currentIndex === questions.length - 1 ? (
          <Button
            title="Submit"
            variant="primary"
            onPress={() => handleSubmit(false)}
            loading={submitMutation.isPending}
            style={styles.navButton}
          />
        ) : (
          <Button
            title="Next"
            variant="primary"
            onPress={handleNext}
            style={styles.navButton}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

interface QuestionOptionsProps {
  question: Question;
  selectedAnswer: any;
  onSelect: (value: any) => void;
}

function QuestionOptions({
  question,
  selectedAnswer,
  onSelect,
}: QuestionOptionsProps): React.JSX.Element {
  const { theme } = useTheme();

  if (question.questionType === "multiple-choice" && question.options) {
    return (
      <>
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const optionText = typeof option === "string" ? option : option.text;
          return (
            <Button
              key={index}
              title={optionText}
              variant={isSelected ? "primary" : "outline"}
              onPress={() => onSelect(index)}
              style={styles.optionButton}
            />
          );
        })}
      </>
    );
  }

  if (question.questionType === "true-false") {
    return (
      <View style={styles.trueFalseContainer}>
        <Button
          title="True"
          variant={selectedAnswer === "true" ? "primary" : "outline"}
          onPress={() => onSelect("true")}
          style={styles.trueFalseButton}
        />
        <Button
          title="False"
          variant={selectedAnswer === "false" ? "primary" : "outline"}
          onPress={() => onSelect("false")}
          style={styles.trueFalseButton}
        />
      </View>
    );
  }

  // For other question types, show a placeholder
  return (
    <View style={[styles.textAnswerPlaceholder, { borderColor: theme.border }]}>
      <Icon name="create-outline" size={24} color={theme.textTertiary} />
      <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
        Text/Image answer - Available on web version
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  timerText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  progressContainer: {
    padding: spacing[4],
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: spacing[2],
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: spacing[4],
  },
  questionCard: {
    padding: spacing[5],
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: spacing[2],
  },
  questionText: {
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 26,
    marginBottom: spacing[2],
  },
  marksText: {
    fontSize: 13,
    marginBottom: spacing[4],
  },
  optionsContainer: {
    gap: spacing[3],
  },
  optionButton: {
    justifyContent: "flex-start",
    paddingVertical: spacing[3],
  },
  trueFalseContainer: {
    flexDirection: "row",
    gap: spacing[3],
  },
  trueFalseButton: {
    flex: 1,
  },
  textAnswerPlaceholder: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: borderRadius.md,
    padding: spacing[6],
    alignItems: "center",
    gap: spacing[2],
  },
  placeholderText: {
    fontSize: 14,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    padding: spacing[4],
    gap: spacing[3],
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  navButton: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[6],
    gap: spacing[4],
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
});
