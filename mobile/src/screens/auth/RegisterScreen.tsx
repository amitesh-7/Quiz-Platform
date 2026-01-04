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

type RegisterNavigation = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  secretKey?: string;
}

export default function RegisterScreen(): React.JSX.Element {
  const navigation = useNavigation<RegisterNavigation>();
  const {register, loading} = useAuth();
  const {theme} = useTheme();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    secretKey: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
    setErrors(prev => ({...prev, [field]: undefined}));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.secretKey.trim()) {
      newErrors.secretKey = 'Secret key is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        secretKey: formData.secretKey.trim(),
      });
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Something went wrong');
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
            <Text style={[styles.title, {color: theme.text}]}>Create Account</Text>
            <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
              Register as a teacher to create and manage quizzes
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.name}
              onChangeText={text => updateField('name', text)}
              error={errors.name}
              leftIcon="person-outline"
              autoCapitalize="words"
              autoCorrect={false}
            />

            <Input
              label="Email"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={text => updateField('email', text)}
              error={errors.email}
              leftIcon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Password"
              placeholder="Create a password"
              value={formData.password}
              onChangeText={text => updateField('password', text)}
              error={errors.password}
              leftIcon="lock-closed-outline"
              secureTextEntry
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={text => updateField('confirmPassword', text)}
              error={errors.confirmPassword}
              leftIcon="lock-closed-outline"
              secureTextEntry
            />

            <Input
              label="Teacher Secret Key"
              placeholder="Enter the teacher secret key"
              value={formData.secretKey}
              onChangeText={text => updateField('secretKey', text)}
              error={errors.secretKey}
              leftIcon="key-outline"
              secureTextEntry
            />

            <Button
              title="Create Account"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleRegister}
              style={styles.registerButton}
            />
          </View>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, {color: theme.textSecondary}]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('TeacherLogin')}>
              <Text style={[styles.loginLink, {color: theme.primary}]}>Sign in</Text>
            </TouchableOpacity>
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
    marginBottom: spacing[6],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  form: {
    marginBottom: spacing[6],
  },
  registerButton: {
    marginTop: spacing[2],
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
