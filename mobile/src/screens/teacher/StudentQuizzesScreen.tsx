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
import {studentAPI} from '../../api';
import {Card, Loading, EmptyState} from '../../components/common';
import {spacing, borderRadius} from '../../styles/spacing';
import {Submission} from '../../types/quiz';
import {TeacherStackScreenProps} from '../../types/navigation';

type StudentQuizzesRouteProp = TeacherStackScreenProps<'StudentQuizzes'>['route'];

export default function StudentQuizzesScreen(): React.JSX.Element {
  const route = useRoute<StudentQuizzesRouteProp>();
  const navigation = useNavigation<TeacherStackScreenProps<'StudentQuizzes'>['navigation']>();
  const {theme} = useTheme();

  const {studentId, studentName} = route.params;

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['student-submissions', studentId],
    queryFn: () => studentAPI.getStudentSubmissions(studentId),
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
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, {backgroundColor: theme.primary}]}>
          <Text style={styles.avatarText}>
            {studentName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.title, {color: theme.text}]}>{studentName}</Text>
          <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
            {submissions.length} quiz{submissions.length !== 1 ? 'zes' : ''} attempted
          </Text>
        </View>
      </View>

      {/* Stats */}
      {submissions.length > 0 && (
        <View style={styles.statsRow}>
          <StatCard
            label="Quizzes"
            value={submissions.length}
            color={theme.primary}
          />
          <StatCard
            label="Avg Score"
            value={`${Math.round(
              submissions.reduce((acc, s) => {
                const total = s.answers?.reduce((a, ans) => a + (ans.marks || 0), 0) || 0;
                const max = s.answers?.reduce((a, ans) => a + (ans.maxMarks || 0), 0) || 1;
                return acc + (total / max) * 100;
              }, 0) / submissions.length,
            )}%`}
            color={theme.success}
          />
        </View>
      )}

      {/* Submissions List */}
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
                  studentName: studentName,
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
            title="No Quizzes Taken"
            message="This student hasn't attempted any quizzes yet"
          />
        }
      />
    </SafeAreaView>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
}

function StatCard({label, value, color}: StatCardProps): React.JSX.Element {
  const {theme} = useTheme();

  return (
    <Card style={styles.statCard}>
      <Text style={[styles.statValue, {color}]}>{value}</Text>
      <Text style={[styles.statLabel, {color: theme.textSecondary}]}>{label}</Text>
    </Card>
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
          <Text style={[styles.quizTitle, {color: theme.text}]} numberOfLines={1}>
            {submission.quiz?.title || 'Unknown Quiz'}
          </Text>
          <Text style={[styles.submissionMeta, {color: theme.textSecondary}]}>
            Score: {totalMarks}/{maxMarks} • {submittedAt}
          </Text>
        </View>

        <Icon name="chevron-forward" size={20} color={theme.textTertiary} />
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    paddingBottom: spacing[2],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerInfo: {
    marginLeft: spacing[3],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: spacing[0.5],
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
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
  quizTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  submissionMeta: {
    fontSize: 13,
    marginTop: 2,
  },
});
