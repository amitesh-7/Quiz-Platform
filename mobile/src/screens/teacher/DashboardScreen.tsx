import React from 'react';
import {View, Text, StyleSheet, ScrollView, RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';

import {useAuth} from '../../contexts/AuthContext';
import {useTheme} from '../../contexts/ThemeContext';
import {quizAPI, studentAPI} from '../../api';
import {Card, Loading, Button} from '../../components/common';
import {spacing} from '../../styles/spacing';
import {TeacherTabScreenProps} from '../../types/navigation';

export default function DashboardScreen(): React.JSX.Element {
  const {user} = useAuth();
  const {theme} = useTheme();
  const navigation = useNavigation<TeacherTabScreenProps<'Dashboard'>['navigation']>();

  // Fetch quizzes
  const {
    data: quizzesData,
    isLoading: quizzesLoading,
    refetch: refetchQuizzes,
  } = useQuery({
    queryKey: ['teacher-quizzes'],
    queryFn: () => quizAPI.getQuizzes(),
  });

  // Fetch students
  const {
    data: studentsData,
    isLoading: studentsLoading,
    refetch: refetchStudents,
  } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentAPI.getStudents(),
  });

  const quizzes = quizzesData?.data?.quizzes || [];
  const students = studentsData?.data?.students || [];
  const activeQuizzes = quizzes.filter(q => q.isActive).length;
  const totalSubmissions = quizzes.reduce(
    (acc, q) => acc + (q.questionsCount || 0),
    0,
  );

  const isLoading = quizzesLoading || studentsLoading;

  const onRefresh = async () => {
    await Promise.all([refetchQuizzes(), refetchStudents()]);
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading dashboard..." />;
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} />
        }>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, {color: theme.textSecondary}]}>
            Welcome back,
          </Text>
          <Text style={[styles.name, {color: theme.text}]}>{user?.name} 👋</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <StatCard
            icon="document-text"
            label="Total Quizzes"
            value={quizzes.length}
            color={theme.primary}
          />
          <StatCard
            icon="checkmark-circle"
            label="Active"
            value={activeQuizzes}
            color={theme.success}
          />
          <StatCard
            icon="people"
            label="Students"
            value={students.length}
            color={theme.warning}
          />
        </View>

        {/* Quick Actions */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionButton
              icon="add-circle-outline"
              label="Create Quiz"
              onPress={() => navigation.navigate('CreateQuiz')}
            />
            <ActionButton
              icon="list-outline"
              label="All Quizzes"
              onPress={() => navigation.navigate('Quizzes')}
            />
          </View>
        </Card>

        {/* Recent Quizzes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, {color: theme.text}]}>
              Recent Quizzes
            </Text>
            <Button
              title="See All"
              variant="ghost"
              size="sm"
              onPress={() => navigation.navigate('Quizzes')}
            />
          </View>

          {quizzes.length === 0 ? (
            <Card>
              <View style={styles.emptyState}>
                <Icon name="document-text-outline" size={40} color={theme.textTertiary} />
                <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
                  No quizzes created yet
                </Text>
                <Button
                  title="Create First Quiz"
                  variant="primary"
                  size="sm"
                  onPress={() => navigation.navigate('CreateQuiz')}
                  style={styles.emptyButton}
                />
              </View>
            </Card>
          ) : (
            quizzes.slice(0, 3).map(quiz => (
              <Card key={quiz._id} style={styles.quizCard}>
                <View style={styles.quizInfo}>
                  <View style={styles.quizHeader}>
                    <Text style={[styles.quizTitle, {color: theme.text}]}>
                      {quiz.title}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: quiz.isActive
                            ? theme.success + '20'
                            : theme.textTertiary + '20',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.statusText,
                          {color: quiz.isActive ? theme.success : theme.textTertiary},
                        ]}>
                        {quiz.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.quizMeta, {color: theme.textSecondary}]}>
                    {quiz.duration} min • {quiz.totalMarks} marks
                  </Text>
                </View>
                <Button
                  title="Manage"
                  variant="outline"
                  size="sm"
                  onPress={() => navigation.navigate('ManageQuiz', {quizId: quiz._id})}
                />
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatCardProps {
  icon: string;
  label: string;
  value: number;
  color: string;
}

function StatCard({icon, label, value, color}: StatCardProps): React.JSX.Element {
  const {theme} = useTheme();

  return (
    <Card style={styles.statCard}>
      <Icon name={icon} size={24} color={color} />
      <Text style={[styles.statValue, {color: theme.text}]}>{value}</Text>
      <Text style={[styles.statLabel, {color: theme.textSecondary}]}>{label}</Text>
    </Card>
  );
}

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
}

function ActionButton({icon, label, onPress}: ActionButtonProps): React.JSX.Element {
  const {theme} = useTheme();

  return (
    <Button
      title={label}
      variant="secondary"
      onPress={onPress}
      icon={<Icon name={icon} size={20} color={theme.text} />}
      style={styles.actionButton}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  header: {
    marginBottom: spacing[6],
  },
  greeting: {
    fontSize: 16,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing[4],
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: spacing[2],
  },
  statLabel: {
    fontSize: 11,
    marginTop: spacing[1],
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  actionButton: {
    flex: 1,
  },
  quizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  quizInfo: {
    flex: 1,
  },
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: 4,
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  quizMeta: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing[6],
  },
  emptyText: {
    marginTop: spacing[2],
    fontSize: 14,
  },
  emptyButton: {
    marginTop: spacing[3],
  },
});
