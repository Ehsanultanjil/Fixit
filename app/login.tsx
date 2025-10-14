import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/common/ThemeProvider';
import { Sun, Moon } from 'lucide-react-native';

export default function LoginScreen() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'student' | 'admin' | 'staff'>('student');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { isDark, toggleTheme, theme } = useTheme();
  
  const themeColor = selectedRole === 'admin' ? '#DC2626' : (selectedRole === 'staff' ? '#10B981' : '#2563EB');

  const handleLogin = async () => {
    if (!id || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const success = await login(id, password, selectedRole);
      if (success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Signing you in..." />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Dark Mode Toggle */}
        <TouchableOpacity
          onPress={toggleTheme}
          style={[
            styles.themeToggle,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
          ]}
          accessibilityLabel="Toggle Dark Mode"
        >
          {isDark ? (
            <Sun size={18} color={theme.colors.text} />
          ) : (
            <Moon size={18} color={theme.colors.text} />
          )}
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.logo, { color: themeColor }]}>FixIt</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>University Maintenance Reporting</Text>
        </View>

        <View style={styles.roleSelector}>
          <Text style={[styles.roleLabel, { color: theme.colors.text }]}>Log in as :</Text>
          <View style={styles.roleButtons}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                {
                  backgroundColor:
                    selectedRole === 'student'
                      ? '#2563EB'
                      : (isDark ? theme.colors.card : '#E0F2FE'),
                  borderWidth: selectedRole === 'student' ? 0 : 1,
                  borderColor: selectedRole === 'student' ? 'transparent' : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedRole('student')}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  { color: selectedRole === 'student' ? '#FFFFFF' : '#2563EB' },
                ]}
              >
                Student
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.roleButton,
                {
                  backgroundColor:
                    selectedRole === 'admin'
                      ? '#DC2626'
                      : (isDark ? theme.colors.card : '#FEE2E2'),
                  borderWidth: selectedRole === 'admin' ? 0 : 1,
                  borderColor: selectedRole === 'admin' ? 'transparent' : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedRole('admin')}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  { color: selectedRole === 'admin' ? '#FFFFFF' : '#DC2626' },
                ]}
              >
                Admin
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.roleButton,
                {
                  backgroundColor:
                    selectedRole === 'staff'
                      ? '#10B981'
                      : (isDark ? theme.colors.card : '#D1FAE5'),
                  borderWidth: selectedRole === 'staff' ? 0 : 1,
                  borderColor: selectedRole === 'staff' ? 'transparent' : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedRole('staff')}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  { color: selectedRole === 'staff' ? '#FFFFFF' : '#10B981' },
                ]}
              >
                Staff
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              {selectedRole === 'student' ? 'Student ID' : 'Staff ID'}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholderTextColor={theme.colors.textSecondary}
              value={id}
              onChangeText={setId}
              placeholder={selectedRole === 'student' 
                ? 'Enter your student ID' 
                : 'Enter your staff ID'
              }
              autoCapitalize="none"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Password</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholderTextColor={theme.colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
            />
          </View>

          <Button
            title="Sign in"
            onPress={handleLogin}
            style={{ ...styles.loginButton, backgroundColor: themeColor }}
          />

          {selectedRole === 'student' ? (
            <Button
              title="Create Student Account"
              onPress={() => router.push('/register')}
              variant="outline"
              style={{
                ...styles.registerButton,
                borderColor: themeColor,
                backgroundColor: isDark ? theme.colors.card : '#F1F5F9',
              }}
              textStyle={{ color: themeColor }}
            />
          ) : null}
        </View>

        <Text style={[styles.demo, { color: theme.colors.textSecondary }]}>
          Developed by TheArchitect
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
  },
  themeToggle: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  roleSelector: {
    marginBottom: 36,
  },
  roleLabel: {
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0F2FE',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1E293B',
  },
  loginButton: {
    marginTop: 12,
  },
  registerButton: {
    marginTop: 12,
    borderColor: '#2563EB',
  },
  demo: {
    textAlign: 'center',
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 24,
    letterSpacing: 0.2,
  },
});
