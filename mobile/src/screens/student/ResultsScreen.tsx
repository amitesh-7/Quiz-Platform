import React from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import Icon from "react-native-vector-icons/Ionicons";
import { format } from "date-fns";

import { useTheme } from "../../contexts/ThemeContext";
import { submissionAPI } from "../../api";
import { Card, Loading, EmptyState, Button } from "../../components/common";
import { spacing, borderRadius } from "../../styles/spacing";
import { Submission } from "../../types/quiz";
import { StudentTabScreenProps } from "../../types/navigation";

export default function ResultsScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const navigation =
    useNavigation<StudentTabScreenProps<"Results">["navigation"]>();

  const {
    data: submissionsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: () => submissionAPI.getMySubmissions(),
  });

  const submissions = submissionsData?.data?.submissions || [];

  if (isLoading) {
    return <Loading fullScreen message="Loading results..." />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>My Results</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {submissions.length} quiz{submissions.length !== 1 ? "zes" : ""}{" "}
          completed
        </Text>
      </View>

      <FlatList
        data={submissions}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <ResultCard
            submission={item}
            onPress={() =>
              navigation.navigate("QuizResult", { submissionId: item._id })
            }
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="trophy-outline"
            title="No Results Yet"
            message="You haven't completed any quizzes. Start one now!"
            actionLabel="Browse Quizzes"
            onAction={() => navigation.navigate("MyQuizzes")}
          />
        }
      />
    </SafeAreaView>
  );
}

interface ResultCardProps {
  submission: Submission;
  onPress: () => void;
}

function ResultCard({
  submission,
  onPress,
}: ResultCardProps): React.JSX.Element {
  const { theme } = useTheme();

  const quiz = typeof submission.quizId === "object" ? submission.quizId : null;
  const quizTitle = quiz?.title || "Quiz";
  const percentage = Math.round(submission.percentage || 0);

  const getScoreColor = (pct: number): string => {
    if (pct >= 80) return theme.success;
    if (pct >= 60) return theme.warning;
    return theme.error;
  };

  const scoreColor = getScoreColor(percentage);

  return (
    <Card style={styles.resultCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={[styles.quizTitle, { color: theme.text }]}>
            {quizTitle}
          </Text>
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>
            {format(new Date(submission.submittedAt), "MMM d, yyyy • h:mm a")}
          </Text>
        </View>
        <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>
            {percentage}%
          </Text>
        </View>
      </View>

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
            Total
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

      <Button
        title="View Details"
        variant="outline"
        size="sm"
        onPress={onPress}
        style={styles.viewButton}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing[4],
    paddingBottom: spacing[2],
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: spacing[1],
  },
  listContent: {
    padding: spacing[4],
    paddingTop: spacing[2],
    flexGrow: 1,
  },
  resultCard: {
    marginBottom: spacing[4],
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing[4],
  },
  cardInfo: {
    flex: 1,
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
  },
  viewButton: {
    marginTop: spacing[1],
  },
});
