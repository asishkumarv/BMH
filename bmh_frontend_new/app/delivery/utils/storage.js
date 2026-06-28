import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const getEmployeeId = async () => {
  try {
    let userStr = null;
    if (Platform.OS === 'web') {
      userStr = localStorage.getItem('deliveryUser') || localStorage.getItem('employeeUser');
    } else {
      userStr = await AsyncStorage.getItem('deliveryUser') || await AsyncStorage.getItem('employeeUser');
    }
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id || user.delivery_boy_id || user.employee_id || '';
    }
    return '';
  } catch (error) {
    console.error('Error getting ID', error);
    return '';
  }
};

export const clearStorage = async () => {
  if (Platform.OS === 'web') {
    localStorage.removeItem('deliveryUser');
    localStorage.removeItem('employeeUser');
  } else {
    await AsyncStorage.removeItem('deliveryUser');
    await AsyncStorage.removeItem('employeeUser');
  }
};
