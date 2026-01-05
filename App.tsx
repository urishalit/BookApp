import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const App = (): React.JSX.Element => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>great success</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
});

export default App;

