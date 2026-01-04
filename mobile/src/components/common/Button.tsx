import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import {useTheme} from '../../contexts/ThemeContext';
import {colors} from '../../styles/colors';
import {spacing, borderRadius} from '../../styles/spacing';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export default function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  style,
  ...props
}: ButtonProps): React.JSX.Element {
  const {theme, isDark} = useTheme();

  const getBackgroundColor = (): string => {
    if (disabled) return isDark ? colors.slate[700] : colors.gray[300];

    switch (variant) {
      case 'primary':
        return theme.primary;
      case 'secondary':
        return isDark ? colors.slate[700] : colors.gray[200];
      case 'outline':
      case 'ghost':
        return 'transparent';
      case 'danger':
        return theme.error;
      default:
        return theme.primary;
    }
  };

  const getTextColor = (): string => {
    if (disabled) return isDark ? colors.slate[500] : colors.gray[500];

    switch (variant) {
      case 'primary':
      case 'danger':
        return colors.white;
      case 'secondary':
        return theme.text;
      case 'outline':
      case 'ghost':
        return theme.primary;
      default:
        return colors.white;
    }
  };

  const getBorderColor = (): string => {
    if (variant === 'outline') {
      return disabled ? theme.border : theme.primary;
    }
    return 'transparent';
  };

  const getPadding = (): {paddingVertical: number; paddingHorizontal: number} => {
    switch (size) {
      case 'sm':
        return {paddingVertical: spacing[2], paddingHorizontal: spacing[3]};
      case 'lg':
        return {paddingVertical: spacing[4], paddingHorizontal: spacing[6]};
      default:
        return {paddingVertical: spacing[3], paddingHorizontal: spacing[4]};
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'sm':
        return 14;
      case 'lg':
        return 18;
      default:
        return 16;
    }
  };

  const buttonStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderColor: getBorderColor(),
    borderWidth: variant === 'outline' ? 2 : 0,
    borderRadius: borderRadius.md,
    ...getPadding(),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: fullWidth ? '100%' : undefined,
    opacity: loading ? 0.8 : 1,
  };

  const textStyle: TextStyle = {
    color: getTextColor(),
    fontSize: getFontSize(),
    fontWeight: '600',
    marginLeft: icon && iconPosition === 'left' ? spacing[2] : 0,
    marginRight: icon && iconPosition === 'right' ? spacing[2] : 0,
  };

  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle, style]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}>
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <Text style={textStyle}>{title}</Text>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
  },
});
