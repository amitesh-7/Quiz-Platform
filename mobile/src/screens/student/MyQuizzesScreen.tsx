import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';

import {useTheme} from '../../contexts/ThemeContext';
import {quizAPI, submissionAPI} from '../../api';
import {Card, Loading, EmptyState} from '../../components/common';
import {spacing, borderRadius} from '../../styles/spacing';
import {Quiz} from '../../types/quiz';
import {StudentTabScreenProps} from '../../types/navigation';

export default function MyQuizzesScreen(): React.JSX.Element {
  const {theme} = useTheme();
  const navigation = useNavigation<StudentTabScreenProps<'MyQuizzes'>['navigation']>();

  // Fetch quizzes
  const {
    data: quizzesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['student-quizzes'],
    queryFn: () => quizAPI.getQuizzes(),
  });

  // Fetch my submissions to check completed quizzes
  const {data: submissionsData} = useQuery({
    queryKey: ['my-submissions'],
    queryFn: () => submissionAPI.getMySubmissions(),
  });

  const quizzes = quizzesData?.data?.quizzes?.filter(q => q.isActive) || [];
  const submissions = submissionsData?.data?.submissions || [];
  const completedQuizIds = new Set(
    submissions.map(s =>
      typeof s.quizId === 'string' ? s.quizId : s.quizId._id,
    ),
  );

  const handleStartQuiz = (quiz: Quiz) => {
    if (completedQuizIds.has(quiz._id)) {
      Alert.alert(
        'Already Completed',
        'You have already submitted this quiz. Would you like to view your result?',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'View Result',
            onPress: () => {
              const submission = submissions.find(
                s =>
                  (typeof s.quizId === 'string' ? s.quizId : s.quizId._id) ===
                  quiz._id,
              );
              if (submission) {
                navigation.navigate('QuizResult', {submissionId: submission._id});
              }
            },
          },
        ],
      );
      return;
    }

    Alert.alert(
      'Start Quiz',
      `You are about to start "${quiz.title}".\n\nDuration: ${quiz.duration} minutes\nTotal Marks: ${quiz.totalMarks}\n\nOnce started, you cannot pause the quiz.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Start',
          onPress: () =>
            navigation.navigate('AttemptQuiz', {
              quizId: quiz._id,
              quizTitle: quiz.title,
            }),
        },
      ],
    );
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading quizzes..." />;
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
      <View style={styles.header}>
        <Text style={[styles.title, {color: theme.text}]}>Available Quizzes</Text>
        <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
          {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} available
        </Text>
      </View>

      <FlatList
        data={quizzes}
        keyExtractor={item => item._id}
        renderItem={({item}) => (
          <QuizCard
            quiz={item}
            isCompleted={completedQuizIds.has(item._id)}
            onPress={() => handleStartQuiz(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No Quizzes Available"
            message="Your teacher hasn't created any quizzes yet. Check back later!"
          />
        }
      />
    </SafeAreaView>
  );
}

interface QuizCardProps {
  quiz: Quiz;
  isCompleted: boolean;
  onPress: () => void;
}

function QuizCard({quiz, isCompleted, onPress}: QuizCardProps): React.JSX.Element {
  const {theme} = useTheme();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.quizCard}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.iconContainer,
              {backgroundColor: isCompleted ? theme.success + '20' : theme.primary + '20'},
            ]}>
            <Icon
              name={isCompleted ? 'checkmark-circle' : 'document-text'}
              size={24}
              color={isCompleted ? theme.success : theme.primary}
            />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.quizTitle, {color: theme.text}]}>{quiz.title}</Text>
            {quiz.subject && (
              <Text style={[styles.subject, {color: theme.primary}]}>{quiz.subject}</Text>
            )}
          </View>
          {isCompleted && (
            <View style={[styles.completedBadge, {backgroundColor: theme.success}]}>
              <Text style={styles.completedText}>Done</Text>
            </View>
          )}
        </View>

        {quiz.description && (
          <Text
            style={[styles.description, {color: theme.textSecondary}]}
            numberOfLines={2}>
            {quiz.description}
          </Text>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon name="time-outline" size={16} color={theme.textTertiary} />
            <Text style={[styles.metaText, {color: theme.textSecondary}]}>
              {quiz.duration} min
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="star-outline" size={16} color={theme.textTertiary} />
            <Text style={[styles.metaText, {color: theme.textSecondary}]}>
              {quiz.totalMarks} marks
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="help-circle-outline" size={16} color={theme.textTertiary} />
            <Text style={[styles.metaText, {color: theme.textSecondary}]}>
              {quiz.questionsCount || '?'} questions
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.actionText, {color: theme.primary}]}>
            {isCompleted ? 'View Result →' : 'Start Quiz →'}
          </Text>
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
    fontSize: 24,
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
  quizCard: {
    marginBottom: spacing[4],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  subject: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  completedBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  completedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing[3],
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing[4],
    marginBottom: spacing[3],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  metaText: {
    fontSize: 13,
  },
  cardFooter: {
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
