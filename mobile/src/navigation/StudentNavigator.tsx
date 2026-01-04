import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

import {StudentStackParamList, StudentTabParamList} from '../types/navigation';
import {useTheme} from '../contexts/ThemeContext';

// Screens
import DashboardScreen from '../screens/student/DashboardScreen';
import MyQuizzesScreen from '../screens/student/MyQuizzesScreen';
import ResultsScreen from '../screens/student/ResultsScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import AttemptQuizScreen from '../screens/student/AttemptQuizScreen';
import QuizResultScreen from '../screens/student/QuizResultScreen';

const Tab = createBottomTabNavigator<StudentTabParamList>();
const Stack = createNativeStackNavigator<StudentStackParamList>();

function StudentTabs(): React.JSX.Element {
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
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'MyQuizzes':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Results':
              iconName = focused ? 'trophy' : 'trophy-outline';
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
        options={{tabBarLabel: 'Home'}}
      />
      <Tab.Screen
        name="MyQuizzes"
        component={MyQuizzesScreen}
        options={{tabBarLabel: 'Quizzes'}}
      />
      <Tab.Screen
        name="Results"
        component={ResultsScreen}
        options={{tabBarLabel: 'Results'}}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{tabBarLabel: 'Profile'}}
      />
    </Tab.Navigator>
  );
}

export default function StudentNavigator(): React.JSX.Element {
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
        name="StudentTabs"
        component={StudentTabs}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="AttemptQuiz"
        component={AttemptQuizScreen}
        options={({route}) => ({
          title: route.params.quizTitle,
          headerBackVisible: false,
          gestureEnabled: false,
        })}
      />
      <Stack.Screen
        name="QuizResult"
        component={QuizResultScreen}
        options={{
          title: 'Quiz Result',
          headerBackVisible: true,
        }}
      />
    </Stack.Navigator>
  );
}
