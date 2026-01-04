import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../types/navigation';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import StudentLoginScreen from '../screens/auth/StudentLoginScreen';
import TeacherLoginScreen from '../screens/auth/TeacherLoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="StudentLogin" component={StudentLoginScreen} />
      <Stack.Screen name="TeacherLogin" component={TeacherLoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
