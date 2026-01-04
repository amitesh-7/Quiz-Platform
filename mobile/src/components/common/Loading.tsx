import React from 'react';
import {View, ActivityIndicator, Text, StyleSheet} from 'react-native';
import {useTheme} from '../../contexts/ThemeContext';
import {spacing} from '../../styles/spacing';

interface LoadingProps {
  size?: 'small' | 'large';
  message?: string;
  fullScreen?: boolean;
}

export default function Loading({
  size = 'large',
  message,
  fullScreen = false,
}: LoadingProps): React.JSX.Element {
  const {theme} = useTheme();

  const containerStyle = fullScreen
    ? [styles.container, styles.fullScreen, {backgroundColor: theme.background}]
    : styles.container;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={theme.primary} />
      {message && (
        <Text style={[styles.message, {color: theme.textSecondary}]}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  fullScreen: {
    flex: 1,
  },
  message: {
    marginTop: spacing[3],
    fontSize: 14,
    textAlign: 'center',
  },
});
