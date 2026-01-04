import React from 'react';
import {View, Text, StyleSheet, ScrollView, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {useAuth} from '../../contexts/AuthContext';
import {useTheme} from '../../contexts/ThemeContext';
import {Card, Button} from '../../components/common';
import {spacing, borderRadius} from '../../styles/spacing';

export default function ProfileScreen(): React.JSX.Element {
  const {user, logout} = useAuth();
  const {theme, isDark, toggleTheme} = useTheme();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, {backgroundColor: theme.primary}]}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'S'}
            </Text>
          </View>
          <Text style={[styles.name, {color: theme.text}]}>{user?.name}</Text>
          <View style={[styles.roleBadge, {backgroundColor: theme.primary + '20'}]}>
            <Icon name="school" size={14} color={theme.primary} />
            <Text style={[styles.roleText, {color: theme.primary}]}>Student</Text>
          </View>
        </View>

        {/* Settings */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
            APPEARANCE
          </Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name={isDark ? 'moon' : 'sunny'} size={22} color={theme.text} />
              <Text style={[styles.settingLabel, {color: theme.text}]}>Dark Mode</Text>
            </View>
            <Button
              title={isDark ? 'On' : 'Off'}
              variant={isDark ? 'primary' : 'secondary'}
              size="sm"
              onPress={toggleTheme}
            />
          </View>
        </Card>

        {/* App Info */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
            APP INFO
          </Text>

          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>Version</Text>
            <Text style={[styles.infoValue, {color: theme.text}]}>1.0.0</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>
              Account Type
            </Text>
            <Text style={[styles.infoValue, {color: theme.text}]}>Student</Text>
          </View>
        </Card>

        {/* Logout Button */}
        <Button
          title="Logout"
          variant="danger"
          size="lg"
          fullWidth
          onPress={handleLogout}
          icon={<Icon name="log-out-outline" size={20} color="#fff" />}
          style={styles.logoutButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[6],
    marginTop: spacing[4],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.full,
    gap: spacing[1],
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: spacing[4],
  },
});
