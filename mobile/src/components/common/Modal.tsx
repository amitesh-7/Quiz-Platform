import React from 'react';
import {
  View,
  Text,
  Modal as RNModal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../../contexts/ThemeContext';
import {spacing, borderRadius} from '../../styles/spacing';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

export default function Modal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  closeOnBackdrop = true,
  size = 'md',
}: ModalProps): React.JSX.Element {
  const {theme} = useTheme();

  const getModalWidth = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return {width: '75%', maxWidth: 300};
      case 'lg':
        return {width: '95%', maxWidth: 600};
      case 'full':
        return {width: '100%', height: '100%', borderRadius: 0};
      default:
        return {width: '85%', maxWidth: 450};
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <TouchableWithoutFeedback onPress={closeOnBackdrop ? onClose : undefined}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContainer,
                {backgroundColor: theme.card},
                getModalWidth(),
              ]}>
              {(title || showCloseButton) && (
                <View style={[styles.header, {borderBottomColor: theme.border}]}>
                  {title && (
                    <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
                  )}
                  {showCloseButton && (
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                      <Icon name="close" size={24} color={theme.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <View style={styles.content}>{children}</View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: spacing[1],
    marginLeft: spacing[2],
  },
  content: {
    padding: spacing[4],
  },
});
