import React from 'react';
import {View, ActivityIndicator, StyleSheet, Text} from 'react-native';
import {useTheme} from '../../contexts/ThemeContext';
import {spacing} from '../../styles/spacing';

export default function SplashScreen(): React.JSX.Element {
  const {theme} = useTheme();

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <Text style={[styles.logo, {color: theme.primary}]}>📚</Text>
      <Text style={[styles.title, {color: theme.text}]}>Quiz Platform</Text>
      <ActivityIndicator
        size="large"
        color={theme.primary}
        style={styles.loader}
      />
      <Text style={[styles.loadingText, {color: theme.textSecondary}]}>
        Loading...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 64,
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing[8],
  },
  loader: {
    marginBottom: spacing[3],
  },
  loadingText: {
    fontSize: 14,
  },
});
