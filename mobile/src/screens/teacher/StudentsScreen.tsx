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
import {studentAPI} from '../../api';
import {Card, Loading, EmptyState} from '../../components/common';
import {spacing, borderRadius} from '../../styles/spacing';
import {User} from '../../types/user';
import {TeacherTabScreenProps} from '../../types/navigation';

export default function StudentsScreen(): React.JSX.Element {
  const {theme} = useTheme();
  const navigation = useNavigation<TeacherTabScreenProps<'Students'>['navigation']>();
  const queryClient = useQueryClient();

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['students'],
    queryFn: () => studentAPI.getStudents(),
  });

  const deleteMutation = useMutation({
    mutationFn: (studentId: string) => studentAPI.deleteStudent(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['students']});
    },
  });

  const students = data?.data?.students || [];

  const handleDelete = (student: User) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete "${student.name}"? This will also delete all their submissions.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(student._id),
        },
      ],
    );
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading students..." />;
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
      <View style={styles.header}>
        <Text style={[styles.title, {color: theme.text}]}>Students</Text>
        <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
          {students.length} student{students.length !== 1 ? 's' : ''} registered
        </Text>
      </View>

      <FlatList
        data={students}
        keyExtractor={item => item._id}
        renderItem={({item}) => (
          <StudentCard
            student={item}
            onPress={() =>
              navigation.navigate('StudentQuizzes', {
                studentId: item._id,
                studentName: item.name,
              })
            }
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No Students Yet"
            message="Students will appear here once they login and take quizzes"
          />
        }
      />
    </SafeAreaView>
  );
}

interface StudentCardProps {
  student: User;
  onPress: () => void;
  onDelete: () => void;
}

function StudentCard({student, onPress, onDelete}: StudentCardProps): React.JSX.Element {
  const {theme} = useTheme();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.studentCard}>
        <View style={[styles.avatar, {backgroundColor: theme.primary}]}>
          <Text style={styles.avatarText}>
            {student.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.studentInfo}>
          <Text style={[styles.studentName, {color: theme.text}]}>{student.name}</Text>
          <Text style={[styles.studentRole, {color: theme.textSecondary}]}>
            Student Account
          </Text>
        </View>

        <View style={styles.actions}>
          <Icon name="chevron-forward" size={20} color={theme.textTertiary} />
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Icon name="trash-outline" size={18} color={theme.error} />
          </TouchableOpacity>
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
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
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
  studentInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  studentRole: {
    fontSize: 13,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  deleteButton: {
    padding: spacing[2],
  },
});
