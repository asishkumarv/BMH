import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { ChevronDown, Search, X } from 'lucide-react-native';

interface Option {
  label: string;
  value: string | number;
}

interface SearchableDropdownProps {
  options: Option[];
  value: string | number;
  onChange: (val: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  style?: any;
}

export default function SearchableDropdown({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select option", 
  searchPlaceholder = "Search...",
  style
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const filteredOptions = options.filter(o => 
    (o.label || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (val: string | number) => {
    onChange(String(val));
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => setOpen(true)} 
        style={styles.button}
      >
        <Text 
          style={{ color: value ? '#1e293b' : '#94a3b8', fontSize: 13, fontWeight: '500' }} 
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
        <ChevronDown size={16} color="#64748b" style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      <Modal 
        visible={open} 
        transparent 
        animationType="fade" 
        onRequestClose={() => { setOpen(false); setSearchQuery(''); }}
      >
        <TouchableWithoutFeedback onPress={() => { setOpen(false); setSearchQuery(''); }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdownCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{placeholder}</Text>
                  <TouchableOpacity onPress={() => { setOpen(false); setSearchQuery(''); }}>
                    <X size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchBarContainer}>
                  <Search size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoFocus={Platform.OS === 'web'}
                  />
                </View>

                <ScrollView 
                  keyboardShouldPersistTaps="handled" 
                  showsVerticalScrollIndicator={true}
                  style={styles.optionsScroll}
                >
                  {filteredOptions.map((o) => {
                    const isSelected = String(value) === String(o.value);
                    return (
                      <TouchableOpacity 
                        key={String(o.value)} 
                        style={[styles.optionItem, isSelected && styles.optionItemActive]} 
                        onPress={() => handleSelect(o.value)}
                      >
                        <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                          {o.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {filteredOptions.length === 0 && (
                    <View style={styles.noResults}>
                      <Text style={styles.noResultsText}>No matches found</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%'
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 360,
    maxHeight: 400,
    padding: 16,
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a'
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none'
      }
    })
  } as any,
  optionsScroll: {
    maxHeight: 250,
  },
  optionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  optionItemActive: {
    backgroundColor: '#eff6ff',
  },
  optionText: {
    fontSize: 13,
    color: '#334155',
  },
  optionTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  noResults: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#94a3b8',
    fontSize: 13,
  }
});
