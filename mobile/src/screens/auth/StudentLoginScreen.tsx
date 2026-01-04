import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';

import {useAuth} from '../../contexts/AuthContext';
import {useTheme} from '../../contexts/ThemeContext';
import {AuthStackParamList} from '../../types/navigation';
import {Button, Input} from '../../components/common';
import {spacing} from '../../styles/spacing';

type StudentLoginNavigation = NativeStackNavigationProp<AuthStackParamList, 'StudentLogin'>;

export default function StudentLoginScreen(): React.JSX.Element {
  const navigation = useNavigation<StudentLoginNavigation>();
  const {studentLogin, loading} = useAuth();
  const {theme} = useTheme();

  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setError('');

    try {
      await studentLogin(name.trim());
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Something went wrong');
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, {backgroundColor: theme.surfaceVariant}]}>
              <Icon name="school-outline" size={40} color={theme.primary} />
            </View>
            <Text style={[styles.title, {color: theme.text}]}>Student Login</Text>
            <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
              Enter your name to access available quizzes
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Your Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={text => {
                setName(text);
                setError('');
              }}
              error={error}
              leftIcon="person-outline"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <Button
              title="Continue"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleLogin}
              style={styles.loginButton}
            />
          </View>

          {/* Info */}
          <View style={[styles.infoBox, {backgroundColor: theme.surfaceVariant}]}>
            <Icon name="information-circle-outline" size={20} color={theme.primary} />
            <Text style={[styles.infoText, {color: theme.textSecondary}]}>
              Students don't need a password. Just enter your name to start taking
              quizzes.
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
    flexGrow: 1,
    padding: spacing[6],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: spacing[6],
  },
  loginButton: {
    marginTop: spacing[2],
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[4],
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    marginLeft: spacing[2],
    lineHeight: 20,
  },
});
