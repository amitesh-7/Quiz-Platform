import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation} from '@react-navigation/native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';

import {useTheme} from '../../contexts/ThemeContext';
import {quizAPI} from '../../api';
import {Card, Button, Input, Loading} from '../../components/common';
import {spacing} from '../../styles/spacing';
import {TeacherStackScreenProps} from '../../types/navigation';

type ManageQuizRouteProp = TeacherStackScreenProps<'ManageQuiz'>['route'];

export default function ManageQuizScreen(): React.JSX.Element {
  const route = useRoute<ManageQuizRouteProp>();
  const navigation = useNavigation();
  const {theme} = useTheme();
  const queryClient = useQueryClient();

  const {quizId} = route.params;

  const {data, isLoading} = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => quizAPI.getQuizById(quizId),
  });

  const quiz = data?.data?.quiz;

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    duration: '30',
    totalMarks: '100',
    isActive: false,
  });

  const [isEditing, setIsEditing] = useState(false);

  React.useEffect(() => {
    if (quiz) {
      setFormData({
        title: quiz.title || '',
        subject: quiz.subject || '',
        description: quiz.description || '',
        duration: String(quiz.duration || 30),
        totalMarks: String(quiz.totalMarks || 100),
        isActive: quiz.isActive || false,
      });
    }
  }, [quiz]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => quizAPI.updateQuiz(quizId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['quiz', quizId]});
      queryClient.invalidateQueries({queryKey: ['teacher-quizzes']});
      setIsEditing(false);
      Alert.alert('Success', 'Quiz updated successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update quiz');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => quizAPI.deleteQuiz(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['teacher-quizzes']});
      Alert.alert('Success', 'Quiz deleted successfully!', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to delete quiz');
    },
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const handleUpdate = () => {
    updateMutation.mutate({
      title: formData.title.trim(),
      subject: formData.subject.trim() || undefined,
      description: formData.description.trim() || undefined,
      duration: Number(formData.duration),
      totalMarks: Number(formData.totalMarks),
      isActive: formData.isActive,
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Quiz',
      'Are you sure you want to delete this quiz? This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading quiz..." />;
  }

  if (!quiz) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
        <View style={styles.centerContent}>
          <Icon name="document-text-outline" size={48} color={theme.textTertiary} />
          <Text style={[styles.errorText, {color: theme.textSecondary}]}>
            Quiz not found
          </Text>
          <Button
            title="Go Back"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* Status Card */}
          <Card style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusInfo}>
                <Text style={[styles.statusLabel, {color: theme.textSecondary}]}>
                  Status
                </Text>
                <Text
                  style={[
                    styles.statusValue,
                    {color: formData.isActive ? theme.success : theme.textTertiary},
                  ]}>
                  {formData.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
              <Switch
                value={formData.isActive}
                onValueChange={value => {
                  updateField('isActive', value);
                  if (!isEditing) {
                    updateMutation.mutate({isActive: value});
                  }
                }}
                trackColor={{false: theme.border, true: theme.success + '60'}}
                thumbColor={formData.isActive ? theme.success : theme.textTertiary}
              />
            </View>
          </Card>

          {/* Form */}
          <Card style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={[styles.formTitle, {color: theme.text}]}>Quiz Details</Text>
              {!isEditing && (
                <Button
                  title="Edit"
                  variant="outline"
                  size="sm"
                  onPress={() => setIsEditing(true)}
                  icon={<Icon name="pencil" size={16} color={theme.primary} />}
                />
              )}
            </View>

            <Input
              label="Quiz Title"
              placeholder="Enter quiz title"
              value={formData.title}
              onChangeText={text => updateField('title', text)}
              leftIcon="document-text-outline"
              editable={isEditing}
            />

            <Input
              label="Subject"
              placeholder="e.g., Mathematics, Science"
              value={formData.subject}
              onChangeText={text => updateField('subject', text)}
              leftIcon="book-outline"
              editable={isEditing}
            />

            <Input
              label="Description"
              placeholder="Brief description of the quiz"
              value={formData.description}
              onChangeText={text => updateField('description', text)}
              leftIcon="text-outline"
              multiline
              editable={isEditing}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  label="Duration (min)"
                  placeholder="30"
                  value={formData.duration}
                  onChangeText={text => updateField('duration', text)}
                  leftIcon="time-outline"
                  keyboardType="number-pad"
                  editable={isEditing}
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="Total Marks"
                  placeholder="100"
                  value={formData.totalMarks}
                  onChangeText={text => updateField('totalMarks', text)}
                  leftIcon="star-outline"
                  keyboardType="number-pad"
                  editable={isEditing}
                />
              </View>
            </View>

            {isEditing && (
              <View style={styles.editActions}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  size="md"
                  onPress={() => {
                    setIsEditing(false);
                    if (quiz) {
                      setFormData({
                        title: quiz.title || '',
                        subject: quiz.subject || '',
                        description: quiz.description || '',
                        duration: String(quiz.duration || 30),
                        totalMarks: String(quiz.totalMarks || 100),
                        isActive: quiz.isActive || false,
                      });
                    }
                  }}
                  style={styles.cancelButton}
                />
                <Button
                  title="Save Changes"
                  variant="primary"
                  size="md"
                  loading={updateMutation.isPending}
                  onPress={handleUpdate}
                  style={styles.saveButton}
                />
              </View>
            )}
          </Card>

          {/* Delete Button */}
          <Button
            title="Delete Quiz"
            variant="danger"
            size="lg"
            fullWidth
            onPress={handleDelete}
            loading={deleteMutation.isPending}
            icon={<Icon name="trash-outline" size={20} color="#fff" />}
          />
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  errorText: {
    fontSize: 16,
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  backButton: {
    minWidth: 120,
  },
  statusCard: {
    marginBottom: spacing[4],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {},
  statusLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  formCard: {
    marginBottom: spacing[4],
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  halfInput: {
    flex: 1,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});
