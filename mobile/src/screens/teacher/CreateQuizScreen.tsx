import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';

import {useTheme} from '../../contexts/ThemeContext';
import {quizAPI} from '../../api';
import {Card, Button, Input} from '../../components/common';
import {spacing} from '../../styles/spacing';

export default function CreateQuizScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const {theme} = useTheme();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    duration: '30',
    totalMarks: '100',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: any) => quizAPI.createQuiz(data),
    onSuccess: response => {
      queryClient.invalidateQueries({queryKey: ['teacher-quizzes']});
      Alert.alert('Success', 'Quiz created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            const quizId = response.data?.quiz?._id;
            if (quizId) {
              navigation.goBack();
            }
          },
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create quiz');
    },
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
    setErrors(prev => ({...prev, [field]: ''}));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.duration.trim()) {
      newErrors.duration = 'Duration is required';
    } else if (isNaN(Number(formData.duration)) || Number(formData.duration) <= 0) {
      newErrors.duration = 'Enter a valid duration';
    }

    if (!formData.totalMarks.trim()) {
      newErrors.totalMarks = 'Total marks is required';
    } else if (isNaN(Number(formData.totalMarks)) || Number(formData.totalMarks) <= 0) {
      newErrors.totalMarks = 'Enter a valid total marks';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = () => {
    if (!validate()) return;

    createMutation.mutate({
      title: formData.title.trim(),
      subject: formData.subject.trim() || undefined,
      description: formData.description.trim() || undefined,
      duration: Number(formData.duration),
      totalMarks: Number(formData.totalMarks),
      isActive: false,
    });
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* Info Card */}
          <Card style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Icon name="information-circle" size={24} color={theme.primary} />
              <Text style={[styles.infoTitle, {color: theme.text}]}>
                Create New Quiz
              </Text>
            </View>
            <Text style={[styles.infoText, {color: theme.textSecondary}]}>
              Fill in the basic details. You can add questions after creating the
              quiz from the web dashboard.
            </Text>
          </Card>

          {/* Form */}
          <Card style={styles.formCard}>
            <Input
              label="Quiz Title *"
              placeholder="Enter quiz title"
              value={formData.title}
              onChangeText={text => updateField('title', text)}
              error={errors.title}
              leftIcon="document-text-outline"
            />

            <Input
              label="Subject"
              placeholder="e.g., Mathematics, Science"
              value={formData.subject}
              onChangeText={text => updateField('subject', text)}
              leftIcon="book-outline"
            />

            <Input
              label="Description"
              placeholder="Brief description of the quiz"
              value={formData.description}
              onChangeText={text => updateField('description', text)}
              leftIcon="text-outline"
              multiline
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  label="Duration (minutes) *"
                  placeholder="30"
                  value={formData.duration}
                  onChangeText={text => updateField('duration', text)}
                  error={errors.duration}
                  leftIcon="time-outline"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="Total Marks *"
                  placeholder="100"
                  value={formData.totalMarks}
                  onChangeText={text => updateField('totalMarks', text)}
                  error={errors.totalMarks}
                  leftIcon="star-outline"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Button
              title="Create Quiz"
              variant="primary"
              size="lg"
              fullWidth
              loading={createMutation.isPending}
              onPress={handleCreate}
              icon={<Icon name="add-circle" size={20} color="#fff" />}
              style={styles.createButton}
            />
          </Card>

          {/* Note */}
          <View style={styles.noteContainer}>
            <Icon name="bulb-outline" size={20} color={theme.warning} />
            <Text style={[styles.noteText, {color: theme.textSecondary}]}>
              After creating the quiz, use the web dashboard to add questions
              using AI generation or manual input.
            </Text>
          </View>
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
  infoCard: {
    marginBottom: spacing[4],
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    marginBottom: spacing[4],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  halfInput: {
    flex: 1,
  },
  createButton: {
    marginTop: spacing[2],
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    paddingHorizontal: spacing[2],
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
