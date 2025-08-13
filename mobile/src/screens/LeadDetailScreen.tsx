import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';

type RootStackParamList = {
  LeadDetail: { leadId: string };
  // other screens
};

type LeadDetailScreenRouteProp = RouteProp<RootStackParamList, 'LeadDetail'>;

type Props = {
  route: LeadDetailScreenRouteProp;
};

const LeadDetailScreen = ({ route }: Props) => {
  const { leadId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detalhes do Lead</Text>
      <Text>ID do Lead: {leadId}</Text>
      {/* In a real app, you would fetch and display lead details here */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});

export default LeadDetailScreen;
