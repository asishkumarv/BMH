import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Wallet, User, LogOut } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import axios from 'axios';

type TopHeaderProps = {
  userType: 'super_admin' | 'department_admin' | 'employee';
};

export function TopHeader({ userType }: TopHeaderProps) {
  const router = useRouter();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [ringColor, setRingColor] = useState<string>('transparent');

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      let dataStr = null;
      if (Platform.OS === 'web') {
        if (userType === 'super_admin') dataStr = localStorage.getItem('superAdminUser');
        else if (userType === 'department_admin') dataStr = localStorage.getItem('subAdminUser');
        else if (userType === 'employee') dataStr = localStorage.getItem('empUser');
      } else {
        if (userType === 'super_admin') dataStr = await AsyncStorage.getItem('superAdminUser');
        else if (userType === 'department_admin') dataStr = await AsyncStorage.getItem('subAdminUser');
        else if (userType === 'employee') dataStr = await AsyncStorage.getItem('empUser');
      }

      if (dataStr) {
        const user = JSON.parse(dataStr);
        if (user.profile_photo) {
          setProfilePhoto(user.profile_photo);
        }
        if (userType === 'employee' && user.id) {
          fetchAttendanceStatus(user.id);
        }
      }
    };
    loadUser();
  }, [userType]);

  const fetchAttendanceStatus = async (userId: string | number) => {
      const res = await axios.get(`https://bmh-eitu.onrender.com/attendance/today/${userId}`);
        if (res.data.success && res.data.data) {
           const color = res.data.data.color;
           setRingColor(color === 'green' ? '#22c55e' : color === 'yellow' ? '#eab308' : '#ef4444');
        }
    } catch (e) {
      console.log('Error fetching attendance status', e);
    }
  };

  const handleWalletClick = () => {
    if (userType === 'super_admin') {
      router.push('/admin/dashboard/wallet');
    } else if (userType === 'department_admin') {
      router.push('/department/dashboard/wallet');
    } else if (userType === 'employee') {
      router.push('/employee/dashboard/wallet');
    }
  };

  const handleProfileClick = () => {
    if (userType === 'super_admin') {
      router.push('/admin/dashboard/profile');
    } else if (userType === 'department_admin') {
      router.push('/department/dashboard/profile');
    } else if (userType === 'employee') {
      router.push('/employee/dashboard/profile');
    }
    setDropdownVisible(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconButton} onPress={handleWalletClick}>
          <Wallet size={24} color={Colors.light.text} />
        </TouchableOpacity>

        <View style={styles.profileContainer}>
          <TouchableOpacity 
            style={[styles.profileButton, userType === 'employee' && { borderColor: ringColor, borderWidth: 3 }]}
            onPress={() => setDropdownVisible(!dropdownVisible)}
          >
            {profilePhoto ? (
              <Image source={{ uri: `https://bmh-eitu.onrender.com${profilePhoto}` }} style={styles.profileImage} />
            ) : (
              <User size={24} color={Colors.light.text} />
            )}
          </TouchableOpacity>

          {dropdownVisible && (
            <View style={styles.dropdown}>
              <TouchableOpacity style={styles.dropdownItem} onPress={handleProfileClick}>
                <User size={18} color={Colors.light.text} style={styles.dropdownIcon} />
                <Text style={styles.dropdownText}>Profile</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
                <LogOut size={18} color="#ef4444" style={styles.dropdownIcon} />
                <Text style={[styles.dropdownText, { color: '#ef4444' }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    zIndex: 100, // For dropdown
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
  },
  profileContainer: {
    position: 'relative',
    zIndex: 100,
  },
  profileButton: {
    padding: 8,
    borderRadius: 24,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 150,
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  dropdownIcon: {
    marginRight: 10,
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 4,
  }
});
