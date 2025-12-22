import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';


export const CustomHeader = (props: {
  location?: string;
  isAllEntitiesOptionEnabled?: boolean;
  headerHeight: number;
}) => {
  return (
    <LinearGradient
      colors={['#0C9EFF', 'black']}
      start={{ x: 0.3, y: -1 }}
      end={{ x: 0.3, y: 1 }}
      style={[styles.header, { height: props.headerHeight }]} // uses headerHeight
    >
      <View style={{ 
        height: 12, 
        alignSelf: 'stretch',
        borderTopRightRadius: 12, 
        borderTopLeftRadius: 12, 
        backgroundColor: 'white' 
      }}/>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    justifyContent: 'flex-end',    // instead of 'flex-end'
    alignItems: 'center',
    overflow: 'visible',             // let it overflow for debugging
  },
});