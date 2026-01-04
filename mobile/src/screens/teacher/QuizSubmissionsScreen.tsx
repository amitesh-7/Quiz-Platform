import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';

import {useTheme} from '../../contexts/ThemeContext';
import {submissionAPI} from '../../api';
import {Card, Loading, EmptyState} from '../../components/common';
import {spacing, borderRadius} from '../../styles/spacing';
import {Submission} from '../../types/quiz';
import {TeacherStackScreenProps} from '../../types/navigation';

type QuizSubmissionsRouteProp = TeacherStackScreenProps<'QuizSubmissions'>['route'];

export default function QuizSubmissionsScreen(): React.JSX.Element {
  const route = useRoute<QuizSubmissionsRouteProp>();
  const navigation = useNavigation<TeacherStackScreenProps<'QuizSubmissions'>['navigation']>();
  const {theme} = useTheme();

  const {quizId, quizTitle} = route.params;

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['quiz-submissions', quizId],
    queryFn: () => submissionAPI.getQuizSubmissions(quizId),
  });

  const submissions = data?.data?.submissions || [];

  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return theme.success;
    if (percentage >= 60) return theme.warning;
    return theme.error;
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading submissions..." />;
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
      <View style={styles.header}>
        <Text style={[styles.title, {color: theme.text}]} numberOfLines={1}>
          {quizTitle}
        </Text>
        <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
          {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={submissions}
        keyExtractor={item => item._id}
        renderItem={({item}) => {
          const totalMarks = item.answers?.reduce((acc, ans) => acc + (ans.marks || 0), 0) || 0;
          const maxMarks = item.answers?.reduce((acc, ans) => acc + (ans.maxMarks || 0), 0) || 1;
          const percentage = Math.round((totalMarks / maxMarks) * 100);

          return (
            <SubmissionCard
              submission={item}
              totalMarks={totalMarks}
              maxMarks={maxMarks}
              percentage={percentage}
              scoreColor={getScoreColor(percentage)}
              onPress={() =>
                navigation.navigate('SubmissionDetails', {
                  submissionId: item._id,
                  studentName: item.student?.name || 'Student',
                })
              }
            />
          );
        }}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No Submissions Yet"
            message="No students have submitted this quiz yet"
          />
        }
      />
    </SafeAreaView>
  );
}

interface SubmissionCardProps {
  submission: Submission;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  scoreColor: string;
  onPress: () => void;
}

function SubmissionCard({
  submission,
  totalMarks,
  maxMarks,
  percentage,
  scoreColor,
  onPress,
}: SubmissionCardProps): React.JSX.Element {
  const {theme} = useTheme();
  const submittedAt = new Date(submission.submittedAt).toLocaleDateString();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.submissionCard}>
        <View style={[styles.scoreCircle, {borderColor: scoreColor}]}>
          <Text style={[styles.scoreText, {color: scoreColor}]}>{percentage}%</Text>
        </View>

        <View style={styles.submissionInfo}>
          <Text style={[styles.studentName, {color: theme.text}]}>
            {submission.student?.name || 'Unknown Student'}
          </Text>
          <Text style={[styles.submissionMeta, {color: theme.textSecondary}]}>
            Score: {totalMarks}/{maxMarks} • {submittedAt}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          {submission.isGraded ? (
            <View style={[styles.gradedBadge, {backgroundColor: theme.success + '20'}]}>
              <Icon name="checkmark-circle" size={14} color={theme.success} />
              <Text style={[styles.badgeText, {color: theme.success}]}>Graded</Text>
            </View>
          ) : (
            <View style={[styles.pendingBadge, {backgroundColor: theme.warning + '20'}]}>
              <Icon name="time-outline" size={14} color={theme.warning} />
              <Text style={[styles.badgeText, {color: theme.warning}]}>Pending</Text>
            </View>
          )}
          <Icon name="chevron-forward" size={20} color={theme.textTertiary} />
        </View>
      </Card>
    </TouchableOpacity>
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
    fontSize: 20,
    fontWeight: '700',
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
  submissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  scoreCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submissionInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  submissionMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: spacing[1],
  },
  gradedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
