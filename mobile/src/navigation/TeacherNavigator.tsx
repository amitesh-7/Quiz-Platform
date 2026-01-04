import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

import {TeacherStackParamList, TeacherTabParamList} from '../types/navigation';
import {useTheme} from '../contexts/ThemeContext';

// Screens
import DashboardScreen from '../screens/teacher/DashboardScreen';
import QuizzesScreen from '../screens/teacher/QuizzesScreen';
import StudentsScreen from '../screens/teacher/StudentsScreen';
import ProfileScreen from '../screens/teacher/ProfileScreen';
import CreateQuizScreen from '../screens/teacher/CreateQuizScreen';
import ManageQuizScreen from '../screens/teacher/ManageQuizScreen';
import QuizSubmissionsScreen from '../screens/teacher/QuizSubmissionsScreen';
import SubmissionDetailsScreen from '../screens/teacher/SubmissionDetailsScreen';
import StudentQuizzesScreen from '../screens/teacher/StudentQuizzesScreen';

const Tab = createBottomTabNavigator<TeacherTabParamList>();
const Stack = createNativeStackNavigator<TeacherStackParamList>();

function TeacherTabs(): React.JSX.Element {
  const {theme} = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Quizzes':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Students':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{tabBarLabel: 'Dashboard'}}
      />
      <Tab.Screen
        name="Quizzes"
        component={QuizzesScreen}
        options={{tabBarLabel: 'Quizzes'}}
      />
      <Tab.Screen
        name="Students"
        component={StudentsScreen}
        options={{tabBarLabel: 'Students'}}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{tabBarLabel: 'Profile'}}
      />
    </Tab.Navigator>
  );
}

export default function TeacherNavigator(): React.JSX.Element {
  const {theme} = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.surface,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen
        name="TeacherTabs"
        component={TeacherTabs}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="CreateQuiz"
        component={CreateQuizScreen}
        options={{title: 'Create Quiz'}}
      />
      <Stack.Screen
        name="ManageQuiz"
        component={ManageQuizScreen}
        options={{title: 'Manage Quiz'}}
      />
      <Stack.Screen
        name="QuizSubmissions"
        component={QuizSubmissionsScreen}
        options={({route}) => ({
          title: `${route.params.quizTitle} - Submissions`,
        })}
      />
      <Stack.Screen
        name="SubmissionDetails"
        component={SubmissionDetailsScreen}
        options={({route}) => ({
          title: `${route.params.studentName}'s Submission`,
        })}
      />
      <Stack.Screen
        name="StudentQuizzes"
        component={StudentQuizzesScreen}
        options={({route}) => ({
          title: `${route.params.studentName}'s Quizzes`,
        })}
      />
    </Stack.Navigator>
  );
}
