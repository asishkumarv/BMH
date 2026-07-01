import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

interface Option {
  label: string;
  value: string;
}

interface CustomDropdownProps {
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function CustomDropdown({ options, value, onChange, placeholder = "Select an option" }: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  
  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        {React.createElement(
          'select',
          {
            value: value,
            onChange: (e: any) => onChange(e.target.value),
            style: { 
              width: '100%', 
              height: '100%', 
              border: '1px solid #E2E8F0', 
              backgroundColor: '#F8FAFC', 
              padding: '12px 16px', 
              fontSize: '15px', 
              color: value ? '#0F172A' : '#94A3B8',
              borderRadius: '8px',
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer'
            }
          },
          React.createElement('option', { value: '', disabled: true }, placeholder),
          ...options.map((o) => React.createElement('option', { key: o.value, value: o.value }, o.label))
        )}
        <View style={styles.webIconContainer} pointerEvents="none">
          <ChevronDown size={20} color="#64748B" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mobileContainer}>
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => setOpen(!open)} 
        style={styles.mobileButton}
      >
        <Text style={{ color: value ? '#0F172A' : '#94A3B8', fontSize: 15 }}>
          {displayLabel}
        </Text>
        <ChevronDown size={20} color="#64748B" />
      </TouchableOpacity>
      
      {open && (
        <View style={styles.dropdownMenu}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {options.map((o) => (
              <TouchableOpacity 
                key={o.value} 
                style={styles.dropdownItem} 
                onPress={() => { onChange(o.value); setOpen(false); }}
              >
                <Text style={{ color: String(value) === String(o.value) ? '#3B82F6' : '#334155', fontWeight: String(value) === String(o.value) ? '600' : '400' }}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    position: 'relative',
    height: 46,
    width: '100%',
  },
  webIconContainer: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center'
  },
  mobileContainer: {
    zIndex: 1000, 
    position: 'relative', 
    width: '100%'
  },
  mobileButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 46,
  },
  dropdownMenu: {
    position: 'absolute', 
    top: 50, 
    left: 0, 
    right: 0, 
    backgroundColor: 'white', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 8, 
    zIndex: 9999, 
    maxHeight: 250, 
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  dropdownItem: {
    padding: 14, 
    borderBottomWidth: 1, 
    borderColor: '#F1F5F9'
  }
});
