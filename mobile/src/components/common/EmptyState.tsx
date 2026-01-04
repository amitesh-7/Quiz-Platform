import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../../contexts/ThemeContext';
import {spacing} from '../../styles/spacing';
import Button from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon = 'folder-open-outline',
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps): React.JSX.Element {
  const {theme} = useTheme();

  return (
    <View style={styles.container}>
      <Icon name={icon} size={64} color={theme.textTertiary} />
      <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
      {message && (
        <Text style={[styles.message, {color: theme.textSecondary}]}>{message}</Text>
      )}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing[4],
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    marginTop: spacing[2],
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: spacing[4],
  },
});
