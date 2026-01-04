import React from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';

import {useTheme} from '../../contexts/ThemeContext';
import {AuthStackParamList} from '../../types/navigation';
import {Button} from '../../components/common';
import {spacing} from '../../styles/spacing';
import {colors} from '../../styles/colors';

type WelcomeNavigation = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

export default function WelcomeScreen(): React.JSX.Element {
  const navigation = useNavigation<WelcomeNavigation>();
  const {theme, isDark} = useTheme();

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>📚</Text>
          <Text style={[styles.title, {color: theme.text}]}>Quiz Platform</Text>
          <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
            AI-Powered Quiz Management System
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem
            icon="sparkles"
            title="AI Question Generation"
            description="Generate questions from images or text"
          />
          <FeatureItem
            icon="timer-outline"
            title="Timed Quizzes"
            description="Set duration and track submissions"
          />
          <FeatureItem
            icon="analytics-outline"
            title="Instant Results"
            description="Get detailed performance analysis"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="I'm a Student"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => navigation.navigate('StudentLogin')}
            icon={<Icon name="school-outline" size={20} color={colors.white} />}
          />

          <Button
            title="I'm a Teacher"
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => navigation.navigate('TeacherLogin')}
            icon={<Icon name="briefcase-outline" size={20} color={theme.primary} />}
            style={styles.teacherButton}
          />
        </View>

        {/* Footer */}
        <Text style={[styles.footer, {color: theme.textTertiary}]}>
          Teachers can register for an account
        </Text>
      </View>
    </SafeAreaView>
  );
}

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureItem({icon, title, description}: FeatureItemProps): React.JSX.Element {
  const {theme} = useTheme();

  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, {backgroundColor: theme.surfaceVariant}]}>
        <Icon name={icon} size={24} color={theme.primary} />
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, {color: theme.text}]}>{title}</Text>
        <Text style={[styles.featureDesc, {color: theme.textSecondary}]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing[6],
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing[8],
  },
  logo: {
    fontSize: 64,
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  features: {
    marginVertical: spacing[8],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    marginLeft: spacing[3],
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 14,
  },
  actions: {
    marginBottom: spacing[4],
  },
  teacherButton: {
    marginTop: spacing[3],
  },
  footer: {
    textAlign: 'center',
    fontSize: 14,
  },
});
