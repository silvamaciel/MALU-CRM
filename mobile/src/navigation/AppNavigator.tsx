import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';

import LeadsListScreen from '../screens/LeadsListScreen';
import LeadDetailScreen from '../screens/LeadDetailScreen';
import LeadFormScreen from '../screens/LeadFormScreen';

import ChatListScreen from '../screens/ChatListScreen';
import ChatThreadScreen from '../screens/ChatThreadScreen';

// ✅ use a tela completa que implementamos
import TasksScreen from '../screens/TasksScreen';
// (mantenha TaskDetail se você tiver implementado; se não, pode remover)
import TaskDetailScreen from '../screens/TaskDetailScreen';

import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const LeadsStack = createNativeStackNavigator();
const ChatStack = createNativeStackNavigator();
const TasksStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function LeadsNavigator() {
  return (
    <LeadsStack.Navigator>
      <LeadsStack.Screen name="LeadsList" component={LeadsListScreen} options={{ title: 'Leads' }} />
      <LeadsStack.Screen name="LeadDetail" component={LeadDetailScreen} options={{ title: 'Lead' }} />
      <LeadsStack.Screen name="LeadForm" component={LeadFormScreen} options={{ title: 'Novo Lead' }} />
    </LeadsStack.Navigator>
  );
}

function ChatNavigator() {
  return (
    <ChatStack.Navigator>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Conversas' }} />
      <ChatStack.Screen name="ChatThread" component={ChatThreadScreen} options={{ title: 'Chat' }} />
    </ChatStack.Navigator>
  );
}

function TasksNavigator() {
  return (
    <TasksStack.Navigator>
      {/* ✅ aqui trocamos para TasksScreen */}
      <TasksStack.Screen name="TasksList" component={TasksScreen} options={{ title: 'Tarefas' }} />
      <TasksStack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Tarefa' }} />
    </TasksStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </ProfileStack.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="LeadsTab"
        component={LeadsNavigator}
        options={{
          title: 'Leads',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatNavigator}
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="TasksTab"
        component={TasksNavigator}
        options={{
          title: 'Tarefas',
          tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-outline" size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer theme={DefaultTheme as Theme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="AppTabs" component={AppTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
