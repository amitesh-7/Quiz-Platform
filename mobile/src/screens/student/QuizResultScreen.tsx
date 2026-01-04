import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import Icon from "react-native-vector-icons/Ionicons";
import { format } from "date-fns";

import { useTheme } from "../../contexts/ThemeContext";
import { submissionAPI } from "../../api";
import { Card, Button, Loading } from "../../components/common";
import { spacing, borderRadius } from "../../styles/spacing";
import { StudentStackScreenProps } from "../../types/navigation";

type RouteParams = StudentStackScreenProps<"QuizResult">["route"];

export default function QuizResultScreen(): React.JSX.Element {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { submissionId } = route.params;

  const { data, isLoading } = useQuery({
    queryKey: ["submission", submissionId],
    queryFn: () => submissionAPI.getSubmission(submissionId),
  });

  const submission = data?.data?.submission;
  const quiz =
    typeof submission?.quizId === "object" ? submission.quizId : null;

  if (isLoading) {
    return <Loading fullScreen message="Loading result..." />;
  }

  if (!submission) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.text }]}>
            Result not found
          </Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const percentage = Math.round(submission.percentage || 0);
  const getScoreColor = (pct: number): string => {
    if (pct >= 80) return theme.success;
    if (pct >= 60) return theme.warning;
    return theme.error;
  };
  const scoreColor = getScoreColor(percentage);

  const getGrade = (pct: number): string => {
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B";
    if (pct >= 60) return "C";
    if (pct >= 50) return "D";
    return "F";
  };

  const getMessage = (pct: number): string => {
    if (pct >= 80) return "Excellent work! Keep it up! 🎉";
    if (pct >= 60) return "Good job! Room for improvement. 👍";
    if (pct >= 40) return "Keep practicing. You can do better! 💪";
    return "Don't give up! Try again. 📚";
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Score Card */}
        <Card style={styles.scoreCard}>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.percentage, { color: scoreColor }]}>
              {percentage}%
            </Text>
            <Text style={[styles.grade, { color: theme.textSecondary }]}>
              Grade: {getGrade(percentage)}
            </Text>
          </View>

          <Text style={[styles.message, { color: theme.text }]}>
            {getMessage(percentage)}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {submission.obtainedMarks}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Obtained
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {submission.totalMarks}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Total Marks
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {submission.answers?.length || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Questions
              </Text>
            </View>
          </View>
        </Card>

        {/* Quiz Info */}
        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Quiz Details
          </Text>

          <View style={styles.infoRow}>
            <Icon
              name="document-text-outline"
              size={20}
              color={theme.textSecondary}
            />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Title
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {quiz?.title || "Quiz"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Icon
              name="calendar-outline"
              size={20}
              color={theme.textSecondary}
            />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Submitted
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {format(new Date(submission.submittedAt), "MMM d, yyyy h:mm a")}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Icon
              name="hourglass-outline"
              size={20}
              color={theme.textSecondary}
            />
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Status
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    submission.status === "evaluated"
                      ? theme.success + "20"
                      : theme.warning + "20",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      submission.status === "evaluated"
                        ? theme.success
                        : theme.warning,
                  },
                ]}
              >
                {submission.status === "evaluated"
                  ? "Evaluated"
                  : "Pending Review"}
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Back to Dashboard"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: "StudentTabs" as never }],
              })
            }
            icon={<Icon name="home-outline" size={20} color="#fff" />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing[4],
  },
  scoreCard: {
    alignItems: "center",
    padding: spacing[6],
    marginBottom: spacing[4],
  },
  scoreCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  percentage: {
    fontSize: 42,
    fontWeight: "700",
  },
  grade: {
    fontSize: 14,
    marginTop: spacing[1],
  },
  message: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: spacing[6],
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 40,
  },
  infoCard: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing[4],
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actions: {
    marginTop: spacing[4],
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
