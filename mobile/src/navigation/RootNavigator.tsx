import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import LeadsListScreen from '../screens/LeadsListScreen';
import LeadDetailScreen from '../screens/LeadDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator();

const RootNavigator = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="LeadsList" component={LeadsListScreen} options={{ title: 'Leads' }} />
          <Stack.Screen name="LeadDetail" component={LeadDetailScreen} options={{ title: 'Detalhes do Lead' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configurações' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
