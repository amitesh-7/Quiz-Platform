import React, {useState} from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../../contexts/ThemeContext';
import {spacing, borderRadius} from '../../styles/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  secureTextEntry,
  ...props
}: InputProps): React.JSX.Element {
  const {theme} = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = secureTextEntry !== undefined;

  const inputContainerStyle: ViewStyle = {
    backgroundColor: theme.surface,
    borderColor: error ? theme.error : isFocused ? theme.borderFocused : theme.border,
    borderWidth: isFocused ? 2 : 1,
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, {color: theme.text}]}>{label}</Text>}

      <View style={[styles.inputContainer, inputContainerStyle]}>
        {leftIcon && (
          <Icon
            name={leftIcon}
            size={20}
            color={isFocused ? theme.primary : theme.textSecondary}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              paddingLeft: leftIcon ? 0 : spacing[3],
              paddingRight: rightIcon || isPassword ? 0 : spacing[3],
            },
          ]}
          placeholderTextColor={theme.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.rightIcon}>
            <Icon
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !isPassword && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            disabled={!onRightIconPress}>
            <Icon name={rightIcon} size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={14} color={theme.error} />
          <Text style={[styles.errorText, {color: theme.error}]}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing[1.5],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
  leftIcon: {
    marginLeft: spacing[3],
    marginRight: spacing[2],
  },
  rightIcon: {
    padding: spacing[3],
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing[3],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  errorText: {
    fontSize: 12,
    marginLeft: spacing[1],
  },
});
