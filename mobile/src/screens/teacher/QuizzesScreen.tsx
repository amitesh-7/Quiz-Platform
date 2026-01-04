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
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';

import {useTheme} from '../../contexts/ThemeContext';
import {quizAPI} from '../../api';
import {Card, Loading, EmptyState, Button} from '../../components/common';
import {spacing, borderRadius} from '../../styles/spacing';
import {Quiz} from '../../types/quiz';
import {TeacherTabScreenProps} from '../../types/navigation';

export default function QuizzesScreen(): React.JSX.Element {
  const {theme} = useTheme();
  const navigation = useNavigation<TeacherTabScreenProps<'Quizzes'>['navigation']>();
  const queryClient = useQueryClient();

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['teacher-quizzes'],
    queryFn: () => quizAPI.getQuizzes(),
  });

  const toggleMutation = useMutation({
    mutationFn: (quizId: string) => quizAPI.toggleQuizStatus(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['teacher-quizzes']});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (quizId: string) => quizAPI.deleteQuiz(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['teacher-quizzes']});
    },
  });

  const quizzes = data?.data?.quizzes || [];

  const handleToggle = (quiz: Quiz) => {
    Alert.alert(
      quiz.isActive ? 'Deactivate Quiz' : 'Activate Quiz',
      `Are you sure you want to ${quiz.isActive ? 'deactivate' : 'activate'} "${quiz.title}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: quiz.isActive ? 'Deactivate' : 'Activate',
          onPress: () => toggleMutation.mutate(quiz._id),
        },
      ],
    );
  };

  const handleDelete = (quiz: Quiz) => {
    Alert.alert(
      'Delete Quiz',
      `Are you sure you want to delete "${quiz.title}"? This action cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(quiz._id),
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
        <View>
          <Text style={[styles.title, {color: theme.text}]}>My Quizzes</Text>
          <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
            {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} created
          </Text>
        </View>
        <Button
          title="Create"
          variant="primary"
          size="sm"
          onPress={() => navigation.navigate('CreateQuiz')}
          icon={<Icon name="add" size={18} color="#fff" />}
        />
      </View>

      <FlatList
        data={quizzes}
        keyExtractor={item => item._id}
        renderItem={({item}) => (
          <QuizCard
            quiz={item}
            onManage={() => navigation.navigate('ManageQuiz', {quizId: item._id})}
            onViewSubmissions={() =>
              navigation.navigate('QuizSubmissions', {
                quizId: item._id,
                quizTitle: item.title,
              })
            }
            onToggle={() => handleToggle(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No Quizzes Yet"
            message="Create your first quiz to get started"
            actionLabel="Create Quiz"
            onAction={() => navigation.navigate('CreateQuiz')}
          />
        }
      />
    </SafeAreaView>
  );
}

interface QuizCardProps {
  quiz: Quiz;
  onManage: () => void;
  onViewSubmissions: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

function QuizCard({
  quiz,
  onManage,
  onViewSubmissions,
  onToggle,
  onDelete,
}: QuizCardProps): React.JSX.Element {
  const {theme} = useTheme();

  return (
    <Card style={styles.quizCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.quizTitle, {color: theme.text}]} numberOfLines={1}>
              {quiz.title}
            </Text>
            <TouchableOpacity onPress={onToggle}>
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
            </TouchableOpacity>
          </View>
          {quiz.subject && (
            <Text style={[styles.subject, {color: theme.primary}]}>{quiz.subject}</Text>
          )}
        </View>
      </View>

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
      </View>

      <View style={styles.actionsRow}>
        <Button
          title="Manage"
          variant="outline"
          size="sm"
          onPress={onManage}
          style={styles.actionButton}
        />
        <Button
          title="Submissions"
          variant="secondary"
          size="sm"
          onPress={onViewSubmissions}
          style={styles.actionButton}
        />
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <Icon name="trash-outline" size={20} color={theme.error} />
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    marginBottom: spacing[3],
  },
  cardInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subject: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing[4],
    marginBottom: spacing[4],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  metaText: {
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
  },
  deleteButton: {
    padding: spacing[2],
  },
});
