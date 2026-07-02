import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface CustomTimePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function CustomTimePicker({ value, onChange, placeholder = "Select Time" }: CustomTimePickerProps) {
  const [show, setShow] = useState(false);

  const getParsedDate = () => {
    const d = new Date();
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      d.setHours(parseInt(h, 10) || 0);
      d.setMinutes(parseInt(m, 10) || 0);
      d.setSeconds(0);
    }
    return d;
  };

  const handleChange = (event: any, selectedDate?: Date) => {
    setShow(Platform.OS === 'ios');
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      onChange(`${hours}:${minutes}`);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        {React.createElement(
          'input',
          {
            type: 'time',
            value: value,
            onChange: (e: any) => onChange(e.target.value),
            onClick: (e: any) => {
              try {
                if (e.target && typeof e.target.showPicker === 'function') {
                  e.target.showPicker();
                }
              } catch(err) {}
            },
            style: { 
              width: '100%', 
              height: '100%', 
              border: '1px solid #E2E8F0', 
              backgroundColor: '#FFF', 
              padding: '12px 16px', 
              fontSize: '14px', 
              color: value ? '#0F172A' : '#94A3B8',
              borderRadius: '8px',
              outline: 'none',
              cursor: 'pointer'
            }
          }
        )}
      </View>
    );
  }

  return (
    <View style={styles.mobileContainer}>
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => setShow(true)} 
        style={styles.mobileButton}
      >
        <Text style={{ color: value ? '#0F172A' : '#94A3B8', fontSize: 14 }}>
          {value || placeholder}
        </Text>
        <Clock size={18} color="#64748B" />
      </TouchableOpacity>
      
      {show && (
        <DateTimePicker
          value={getParsedDate()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    height: 46,
    width: '100%',
  },
  mobileContainer: {
    width: '100%'
  },
  mobileButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 46,
  }
});
