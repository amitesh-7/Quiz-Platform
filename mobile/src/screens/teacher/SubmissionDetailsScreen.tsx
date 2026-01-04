import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Icon from "react-native-vector-icons/Ionicons";

import { useTheme } from "../../contexts/ThemeContext";
import { submissionAPI } from "../../api";
import { Card, Button, Input, Loading } from "../../components/common";
import { spacing, borderRadius } from "../../styles/spacing";
import { TeacherStackScreenProps } from "../../types/navigation";
import { Option } from "../../types/quiz";

type SubmissionDetailsRouteProp =
  TeacherStackScreenProps<"SubmissionDetails">["route"];

interface AnswerMark {
  questionId: string;
  marks: number;
}

export default function SubmissionDetailsScreen(): React.JSX.Element {
  const route = useRoute<SubmissionDetailsRouteProp>();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const { submissionId, studentName } = route.params;

  const { data, isLoading } = useQuery({
    queryKey: ["submission", submissionId],
    queryFn: () => submissionAPI.getSubmissionById(submissionId),
  });

  const submission = data?.data?.submission;
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  React.useEffect(() => {
    if (submission?.answers) {
      const initialMarks: Record<string, string> = {};
      submission.answers.forEach((answer) => {
        const questionId = answer.question?._id || answer.questionId;
        initialMarks[questionId] = String(answer.marks || 0);
      });
      setMarks(initialMarks);
    }
  }, [submission]);

  const updateMutation = useMutation({
    mutationFn: (data: { answers: AnswerMark[] }) =>
      submissionAPI.updateSubmissionMarks(submissionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submission", submissionId] });
      queryClient.invalidateQueries({ queryKey: ["quiz-submissions"] });
      setIsEditing(false);
      Alert.alert("Success", "Marks updated successfully!");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to update marks");
    },
  });

  const handleSaveMarks = () => {
    if (!submission) return;

    const answersData: AnswerMark[] = submission.answers.map((answer) => ({
      questionId: answer.question?._id || answer.questionId,
      marks: Number(marks[answer.question?._id || answer.questionId] || 0),
    }));

    updateMutation.mutate({ answers: answersData });
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading submission..." />;
  }

  if (!submission) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.centerContent}>
          <Icon
            name="document-text-outline"
            size={48}
            color={theme.textTertiary}
          />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>
            Submission not found
          </Text>
          <Button
            title="Go Back"
            variant="outline"
            onPress={() => navigation.goBack()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const totalMarks =
    submission.answers?.reduce(
      (acc, ans) =>
        acc + Number(marks[ans.question?._id || ans.questionId] || 0),
      0
    ) || 0;
  const maxMarks =
    submission.answers?.reduce(
      (acc, ans) => acc + (ans.maxMarks || ans.marks || 0),
      0
    ) || 1;
  const percentage = Math.round((totalMarks / maxMarks) * 100);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Summary Card */}
          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>
                  {studentName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.summaryInfo}>
                <Text style={[styles.studentName, { color: theme.text }]}>
                  {studentName}
                </Text>
                <Text
                  style={[styles.submittedAt, { color: theme.textSecondary }]}
                >
                  Submitted: {new Date(submission.submittedAt).toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={styles.scoreRow}>
              <View style={styles.scoreItem}>
                <Text
                  style={[styles.scoreLabel, { color: theme.textSecondary }]}
                >
                  Score
                </Text>
                <Text style={[styles.scoreValue, { color: theme.primary }]}>
                  {totalMarks}/{maxMarks}
                </Text>
              </View>
              <View style={styles.scoreItem}>
                <Text
                  style={[styles.scoreLabel, { color: theme.textSecondary }]}
                >
                  Percentage
                </Text>
                <Text
                  style={[
                    styles.scoreValue,
                    {
                      color:
                        percentage >= 60
                          ? theme.success
                          : percentage >= 40
                            ? theme.warning
                            : theme.error,
                    },
                  ]}
                >
                  {percentage}%
                </Text>
              </View>
            </View>
          </Card>

          {/* Edit Toggle */}
          <View style={styles.editHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Answers & Marks
            </Text>
            {!isEditing ? (
              <Button
                title="Edit Marks"
                variant="outline"
                size="sm"
                onPress={() => setIsEditing(true)}
                icon={<Icon name="pencil" size={16} color={theme.primary} />}
              />
            ) : (
              <View style={styles.editActions}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setIsEditing(false);
                    if (submission?.answers) {
                      const initialMarks: Record<string, string> = {};
                      submission.answers.forEach((answer) => {
                        const questionId =
                          answer.question?._id || answer.questionId;
                        initialMarks[questionId] = String(answer.marks || 0);
                      });
                      setMarks(initialMarks);
                    }
                  }}
                />
                <Button
                  title="Save"
                  variant="primary"
                  size="sm"
                  loading={updateMutation.isPending}
                  onPress={handleSaveMarks}
                />
              </View>
            )}
          </View>

          {/* Answers */}
          {submission.answers?.map((answer, index) => (
            <Card
              key={answer.question?._id || answer.questionId}
              style={styles.answerCard}
            >
              <View style={styles.questionHeader}>
                <Text
                  style={[
                    styles.questionNumber,
                    { color: theme.textSecondary },
                  ]}
                >
                  Question {index + 1}
                </Text>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: theme.primary + "20" },
                  ]}
                >
                  <Text style={[styles.typeText, { color: theme.primary }]}>
                    {(answer.question?.type ||
                      answer.question?.questionType) === "mcq"
                      ? "MCQ"
                      : "Text"}
                  </Text>
                </View>
              </View>

              <Text style={[styles.questionText, { color: theme.text }]}>
                {answer.question?.text || answer.question?.questionText || ""}
              </Text>

              {answer.question &&
                answer.question.type === "mcq" &&
                answer.question.options && (
                  <View style={styles.optionsContainer}>
                    {answer.question.options.map(
                      (option: string | Option, optIndex: number) => {
                        const isSelected = answer.selectedOption === optIndex;
                        const isCorrect =
                          answer.question?.correctOption === optIndex;
                        const optionText =
                          typeof option === "string" ? option : option.text;

                        return (
                          <View
                            key={optIndex}
                            style={[
                              styles.option,
                              {
                                backgroundColor: isCorrect
                                  ? theme.success + "20"
                                  : isSelected
                                    ? theme.error + "20"
                                    : theme.card,
                                borderColor: isCorrect
                                  ? theme.success
                                  : isSelected
                                    ? theme.error
                                    : theme.border,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.optionIndicator,
                                {
                                  backgroundColor: isCorrect
                                    ? theme.success
                                    : isSelected
                                      ? theme.error
                                      : theme.textTertiary,
                                },
                              ]}
                            >
                              {isCorrect ? (
                                <Icon name="checkmark" size={12} color="#fff" />
                              ) : isSelected ? (
                                <Icon name="close" size={12} color="#fff" />
                              ) : (
                                <Text style={styles.optionLetter}>
                                  {String.fromCharCode(65 + optIndex)}
                                </Text>
                              )}
                            </View>
                            <Text
                              style={[
                                styles.optionText,
                                {
                                  color:
                                    isCorrect || isSelected
                                      ? theme.text
                                      : theme.textSecondary,
                                },
                              ]}
                            >
                              {optionText}
                            </Text>
                          </View>
                        );
                      }
                    )}
                  </View>
                )}

              {(answer.question?.type || answer.question?.questionType) !==
                "mcq" && (
                <View style={styles.textAnswerContainer}>
                  <Text
                    style={[styles.answerLabel, { color: theme.textSecondary }]}
                  >
                    Student's Answer:
                  </Text>
                  <View
                    style={[
                      styles.textAnswer,
                      { backgroundColor: theme.background },
                    ]}
                  >
                    <Text
                      style={[styles.textAnswerText, { color: theme.text }]}
                    >
                      {answer.answer || "No answer provided"}
                    </Text>
                  </View>
                  {answer.question?.correctAnswer && (
                    <>
                      <Text
                        style={[styles.answerLabel, { color: theme.success }]}
                      >
                        Correct Answer:
                      </Text>
                      <View
                        style={[
                          styles.textAnswer,
                          { backgroundColor: theme.success + "10" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.textAnswerText,
                            { color: theme.success },
                          ]}
                        >
                          {typeof answer.question.correctAnswer === "string"
                            ? answer.question.correctAnswer
                            : Array.isArray(answer.question.correctAnswer)
                              ? answer.question.correctAnswer.join(", ")
                              : JSON.stringify(answer.question.correctAnswer)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* Marks Input */}
              <View style={styles.marksContainer}>
                <View style={styles.marksRow}>
                  <Text
                    style={[styles.marksLabel, { color: theme.textSecondary }]}
                  >
                    Marks:
                  </Text>
                  {isEditing ? (
                    <Input
                      value={
                        marks[answer.question?._id || answer.questionId] || "0"
                      }
                      onChangeText={(text) => {
                        const questionId =
                          answer.question?._id || answer.questionId;
                        setMarks((prev) => ({
                          ...prev,
                          [questionId]: text,
                        }));
                      }}
                      keyboardType="number-pad"
                      style={styles.marksInput}
                    />
                  ) : (
                    <Text style={[styles.marksValue, { color: theme.primary }]}>
                      {marks[answer.question?._id || answer.questionId] || 0}
                    </Text>
                  )}
                  <Text
                    style={[styles.maxMarks, { color: theme.textSecondary }]}
                  >
                    / {answer.maxMarks}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[4],
  },
  errorText: {
    fontSize: 16,
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  summaryCard: {
    marginBottom: spacing[4],
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  summaryInfo: {
    marginLeft: spacing[3],
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: "600",
  },
  submittedAt: {
    fontSize: 13,
    marginTop: 2,
  },
  scoreRow: {
    flexDirection: "row",
    gap: spacing[4],
  },
  scoreItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[3],
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: borderRadius.md,
  },
  scoreLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  editHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  editActions: {
    flexDirection: "row",
    gap: spacing[2],
  },
  answerCard: {
    marginBottom: spacing[4],
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: "600",
  },
  typeBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  questionText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing[3],
  },
  optionsContainer: {
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  optionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing[2],
  },
  optionLetter: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  optionText: {
    flex: 1,
    fontSize: 14,
  },
  textAnswerContainer: {
    marginBottom: spacing[3],
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: spacing[1],
  },
  textAnswer: {
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
  },
  textAnswerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  marksContainer: {
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  marksRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  marksLabel: {
    fontSize: 14,
    marginRight: spacing[2],
  },
  marksInput: {
    width: 60,
    marginBottom: 0,
  },
  marksValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  maxMarks: {
    fontSize: 14,
    marginLeft: 4,
  },
});
