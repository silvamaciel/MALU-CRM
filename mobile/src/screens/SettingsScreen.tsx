import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const SettingsScreen = () => {
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <Button title="Logout" onPress={logout} color="red" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default SettingsScreen;
