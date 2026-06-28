import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from "react-native";
import { DB_BASE } from "./DeliveryBoyTheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getEmployeeId, clearStorage } from "../utils/storage"; 
import { useRouter } from 'expo-router';

export default function DeliveryBoyProfileScreen() {
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  
  const MAX_WIDTH = 1500;
  const containerWidth = SCREEN_WIDTH > MAX_WIDTH ? MAX_WIDTH : SCREEN_WIDTH;

  const showAlert = (title, message) => {
    if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  useEffect(() => {
    fetchEmployeeDetails();
  }, []);

  const fetchEmployeeDetails = async () => {
    try {
      const employeeId = await getEmployeeId();
      if (!employeeId) {
        showAlert("Error", "Employee ID not found. Please log in again.");
        router.push("Login");
        return;
      }

      const res = await fetch(
        `https://hospitaldatabasemanagement.onrender.com/employee/${employeeId}`
      );
      const data = await res.json();

      if (res.ok && data.success) {
        setEmployee(data.employee);
      } else {
        showAlert("Error", data.message || "Failed to fetch employee details");
      }
    } catch (error) {
      showAlert("Network Error", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearStorage();
    navigation.reset({
      index: 0,
      routes: [{ name: "SelectRole" }],
    });
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loaderText}>Loading Profile...</Text>
      </View>
    );
  }

  if (!employee) {
    return (
      <View style={styles.loader}>
        <Text style={{ color: "#64748b", fontSize: 16 }}>No employee data found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, DB_BASE.page]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity 
          style={styles.headerEditBtn}
          onPress={() => router.push("DeliverBoyEdit", { employee })}
        >
          <Ionicons name="create-outline" size={22} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.mainWrapper, { width: containerWidth, alignSelf: "center" }]}>
          
          {/* Profile Card Header */}
          <View style={styles.profileCard}>
            <View style={styles.imageWrapper}>
              <Image source={{ uri: employee.image }} style={styles.profileImage} />
              <View style={styles.statusBadge} />
            </View>
            <Text style={styles.name}>{employee.full_name}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="bicycle" size={14} color="#0ea5e9" />
              <Text style={styles.roleText}>{employee.role}</Text>
            </View>
          </View>

          <View style={styles.infoContainer}>
            <InfoSection
              title="Basic Information"
              icon="person"
              data={[
                { label: "Email", value: employee.email, icon: "mail-outline" },
                { label: "Mobile", value: employee.mobile, icon: "call-outline" },
                { label: "Department", value: employee.department, icon: "business-outline" },
                { label: "Age", value: `${employee.age} yrs`, icon: "calendar-outline" },
                { label: "Blood Group", value: employee.blood_group, icon: "water-outline" },
              ]}
            />

            <InfoSection 
              title="Job Details" 
              icon="briefcase" 
              data={[
                { label: "Employment", value: employee.employment_type, icon: "ribbon-outline" },
                { label: "Salary", value: `₹${employee.monthly_salary}`, icon: "wallet-outline" },
                { label: "Joining Date", value: new Date(employee.date_of_joining).toDateString(), icon: "calendar-clear-outline" },
              ]}
            />

            <InfoSection 
              title="Work Schedule" 
              icon="time" 
              data={[
                { label: "Shift", value: `${employee.schedule_in} - ${employee.schedule_out}`, icon: "sunny-outline" },
                { label: "Break", value: `${employee.break_in} - ${employee.break_out}`, icon: "cafe-outline" },
              ]}
            />

            <InfoSection 
              title="Bank Details" 
              icon="card" 
              data={[
                { label: "Bank", value: employee.bank_name, icon: "account-balance-outline" },
                { label: "A/C No", value: employee.account_number, icon: "finger-print-outline" },
                { label: "IFSC", value: employee.ifsc, icon: "code-working-outline" },
              ]}
            />

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out" size={20} color="#ef4444" style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
            
            <Text style={styles.versionText}>Version 1.0.2</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoSection = ({ title, icon, data }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={18} color="#0ea5e9" />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionBody}>
      {data.map((item, index) => (
        <View key={index} style={[styles.row, index === data.length - 1 && { borderBottomWidth: 0 }]}>
          <View style={styles.labelGroup}>
            <Ionicons name={item.icon} size={16} color="#94a3b8" style={{ marginRight: 8 }} />
            <Text style={styles.label}>{item.label}</Text>
          </View>
          <Text style={styles.value} numberOfLines={1}>{item.value || "N/A"}</Text>
        </View>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  topHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0'
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  backBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 10 },
  headerEditBtn: { padding: 8 },
  
  profileCard: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  imageWrapper: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: { 
    width: 100, height: 100, borderRadius: 50, 
    borderWidth: 3, borderColor: '#0ea5e9' 
  },
  statusBadge: {
    position: 'absolute', bottom: 5, right: 5,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#10b981', borderWidth: 3, borderColor: '#fff'
  },
  name: { fontSize: 22, fontWeight: "800", color: "#1e293b", marginBottom: 6 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0f9ff', paddingHorizontal: 12,
    paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: '#e0f2fe'
  },
  roleText: { color: '#0ea5e9', fontWeight: '600', fontSize: 13, marginLeft: 5 },

  infoContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  section: { 
    backgroundColor: "#fff", borderRadius: 20, 
    marginBottom: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0'
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  iconContainer: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center',
    marginRight: 10
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#334155" },
  sectionBody: { backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12 },
  row: { 
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", 
    paddingVertical: 12, borderBottomWidth: 1, borderColor: "#f1f5f9" 
  },
  labelGroup: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: "500", color: "#64748b" },
  value: { fontSize: 14, fontWeight: "600", color: "#1e293b", maxWidth: "50%" },
  
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  loaderText: { marginTop: 10, color: '#64748b', fontWeight: '500' },
  
  logoutButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff", paddingVertical: 15, borderRadius: 15,
    marginTop: 10, borderWidth: 1, borderColor: '#fecaca'
  },
  logoutText: { color: "#ef4444", fontSize: 16, fontWeight: "700" },
  versionText: { 
    textAlign: 'center', color: '#94a3b8', 
    fontSize: 12, marginTop: 20, fontWeight: '500' 
  }
});