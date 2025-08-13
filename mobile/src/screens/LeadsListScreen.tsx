import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Placeholder data
const DUMMY_LEADS = [
  { id: '1', name: 'Lead 1', status: 'Novo' },
  { id: '2', name: 'Lead 2', status: 'Em Contato' },
  { id: '3', name: 'Lead 3', status: 'Proposta' },
];

type RootStackParamList = {
  LeadDetail: { leadId: string };
  // other screens
};

type LeadsListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LeadDetail'>;

const LeadsListScreen = () => {
  const navigation = useNavigation<LeadsListScreenNavigationProp>();

  const renderItem = ({ item }: { item: typeof DUMMY_LEADS[0] }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => navigation.navigate('LeadDetail', { leadId: item.id })}
    >
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemStatus}>{item.status}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={DUMMY_LEADS}
        renderItem={renderItem}
        keyExtractor={item => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  itemContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemStatus: {
    fontSize: 14,
    color: 'gray',
  },
});

export default LeadsListScreen;
