import React from 'react';
import {View, StyleSheet, ViewStyle, ViewProps} from 'react-native';
import {useTheme} from '../../contexts/ThemeContext';
import {spacing, borderRadius, shadows} from '../../styles/spacing';

interface CardProps extends ViewProps {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export default function Card({
  variant = 'default',
  padding = 'md',
  children,
  style,
  ...props
}: CardProps): React.JSX.Element {
  const {theme} = useTheme();

  const getPadding = (): number => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return spacing[2];
      case 'lg':
        return spacing[6];
      default:
        return spacing[4];
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: theme.card,
    borderRadius: borderRadius.lg,
    padding: getPadding(),
    borderWidth: variant === 'outlined' ? 1 : 0,
    borderColor: theme.cardBorder,
    ...(variant === 'elevated' ? shadows.md : {}),
  };

  return (
    <View style={[styles.card, cardStyle, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
