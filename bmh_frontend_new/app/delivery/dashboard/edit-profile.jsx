import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { DB_BASE } from "./DeliveryBoyTheme";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { getEmployeeId } from "../utils/storage"; 

const BASE_URL = "https://hospitaldatabasemanagement.onrender.com";

export default function EmployeeUpdateScreen({ navigation }) {
  const [employeeId, setEmployeeId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [image, setImage] = useState(null);

  const [form, setForm] = useState({
    fullName: "", email: "", password: "", confirmPassword: "", mobile: "", familyNumber: "",
    age: "", experience: "", bloodGroup: "", aadhar: "", pan: "", esiNumber: "", reportingManager: "",
    department: "", role: "", dob: new Date(), scheduleIn: "", scheduleOut: "", breakIn: "", breakOut: "",
    monthlySalary: "", jobDescription: "", employmentType: "", category: "", ifsc: "", branchName: "",
    bankName: "", accountNumber: "", temporaryAddresses: [{ street: "", state: "", pincode: "", city: "" }],
    permanentAddresses: [{ street: "", state: "", pincode: "", city: "" }], dateOfJoining: new Date(),
  });

  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isDesktop = SCREEN_WIDTH > 800;
  const containerWidth = isDesktop ? 900 : SCREEN_WIDTH;

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  useEffect(() => {
    const fetchStoredEmployeeId = async () => {
      const storedId = await getEmployeeId();
      if (storedId) setEmployeeId(storedId);
      else {
        showAlert("Error", "No employee ID found. Please log in again.");
        router.back();
      }
    };
    fetchStoredEmployeeId();
  }, []);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [deptRes, roleRes] = await Promise.all([
          fetch(`${BASE_URL}/department/all`),
          fetch(`${BASE_URL}/role/all`),
        ]);
        const deptData = await deptRes.json();
        const roleData = await roleRes.json();
        if (deptRes.ok && Array.isArray(deptData)) setDepartmentOptions(deptData);
        if (roleRes.ok && Array.isArray(roleData)) setRoleOptions(roleData);
      } catch (error) { console.log("Dropdown fetch error", error); }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${BASE_URL}/employee/${employeeId}`);
        const data = await response.json();
        if (response.ok && data.success && data.employee) {
          const emp = data.employee;
          setForm({
            ...form,
            fullName: emp.full_name || "", email: emp.email || "", mobile: emp.mobile || "",
            familyNumber: emp.family_number || "", age: emp.age ? String(emp.age) : "",
            experience: emp.experience ? String(emp.experience) : "", bloodGroup: emp.blood_group || "",
            aadhar: emp.aadhar || "", pan: emp.pan || "", esiNumber: emp.esi_number || "",
            reportingManager: emp.reporting_manager || "", department: emp.department || "",
            role: emp.role || "", dob: emp.dob ? new Date(emp.dob) : new Date(),
            scheduleIn: emp.schedule_in || "", scheduleOut: emp.schedule_out || "",
            breakIn: emp.break_in || "", breakOut: emp.break_out || "",
            monthlySalary: emp.monthly_salary ? String(emp.monthly_salary) : "",
            jobDescription: emp.job_description || "", employmentType: emp.employment_type || "",
            category: emp.category || "", ifsc: emp.ifsc || "", branchName: emp.branch_name || "",
            bankName: emp.bank_name || "", accountNumber: emp.account_number || "",
            temporaryAddresses: emp.temporary_addresses || [{ street: "", state: "", pincode: "", city: "" }],
            permanentAddresses: emp.permanent_addresses || [{ street: "", state: "", pincode: "", city: "" }],
            dateOfJoining: emp.date_of_joining ? new Date(emp.date_of_joining) : new Date(),
          });
          setImage(emp.image ? { uri: emp.image } : null);
        } else { showAlert("Error", data.message || "Failed to fetch employee details"); }
      } catch (error) { showAlert("Error", "Failed to fetch employee details"); }
      finally { setLoading(false); }
    };
    fetchEmployee();
  }, [employeeId]);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showAlert("Permission Denied", "Camera roll access is required.");
      return;
    }
    const galleryResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
    if (!galleryResult.canceled) setImage(galleryResult.assets[0]);
  };

  const handleUpdateEmployee = async () => {
    if (!employeeId) { showAlert("Error", "Employee ID not found."); return; }
    if (form.password && form.password !== form.confirmPassword) { showAlert("Validation Error", "Passwords do not match."); return; }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (["dob", "dateOfJoining"].includes(key)) formData.append(key, value.toISOString().split("T")[0]);
      else if (["temporaryAddresses", "permanentAddresses"].includes(key)) formData.append(key, JSON.stringify(value));
      else formData.append(key, value);
    });

    if (image && image.uri && !image.uri.startsWith("http")) {
      const uriParts = image.uri.split(".");
      const fileType = uriParts[uriParts.length - 1];
      formData.append("image", { uri: image.uri, name: `profile.${fileType}`, type: `image/${fileType}` });
    }

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/employee/update/${employeeId}`, {
        method: "PUT",
        body: formData,
      });      
      const result = await response.json();
      if (response.ok && result.success) {
        showAlert("Success", "Employee updated successfully");
        router.push("DeliverBoyProfileScreen", { refresh: true });
      } else { showAlert("Update Failed", result.message || "Something went wrong"); }
    } catch (error) { showAlert("Error", "Failed to update employee"); }
    finally { setLoading(false); }
  };

  if (loading && !form.fullName) return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color="#0ea5e9" />
      <Text style={styles.loaderText}>Fetching Records...</Text>
    </View>
  );

  const InputField = ({ placeholder, value, keyName, icon, keyboardType, secureTextEntry }) => (
    <View style={[styles.inputWrapper, isDesktop && styles.desktopInput]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={18} color="#0ea5e9" />
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || "default"}
        onChangeText={(text) => setForm({ ...form, [keyName]: text })}
        placeholderTextColor="#94a3b8"
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, DB_BASE.page]}>
      {/* Header Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainWrapper, { width: containerWidth, alignSelf: "center" }]}>
          
          {/* Profile Header Card */}
          <View style={styles.profileCard}>
            <TouchableOpacity style={styles.imageWrapper} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: image.uri }} style={styles.image} />
              ) : (
                <Ionicons name="camera" size={40} color="#94a3b8" />
              )}
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.imageHint}>Tap to change profile picture</Text>
          </View>

          {/* Form Sections */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Identity & Contact</Text>
            </View>
            <View style={styles.grid}>
                <InputField placeholder="Full Name" value={form.fullName} keyName="fullName" icon="person-outline" />
                <InputField placeholder="Email" value={form.email} keyName="email" keyboardType="email-address" icon="mail-outline" />
                <InputField placeholder="Mobile" value={form.mobile} keyName="mobile" keyboardType="phone-pad" icon="call-outline" />
                <InputField placeholder="Family Contact" value={form.familyNumber} keyName="familyNumber" keyboardType="phone-pad" icon="people-outline" />
                <InputField placeholder="Aadhar Number" value={form.aadhar} keyName="aadhar" keyboardType="numeric" icon="card-outline" />
                <InputField placeholder="PAN Number" value={form.pan} keyName="pan" icon="document-text-outline" />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Job & Experience</Text>
            </View>
            <View style={styles.grid}>
                <InputField placeholder="Age" value={form.age} keyName="age" keyboardType="numeric" icon="calendar-outline" />
                <InputField placeholder="Experience" value={form.experience} keyName="experience" icon="school-outline" />
                <InputField placeholder="Reporting Manager" value={form.reportingManager} keyName="reportingManager" icon="person-circle-outline" />
                <InputField placeholder="Salary (Monthly)" value={form.monthlySalary} keyName="monthlySalary" keyboardType="numeric" icon="cash-outline" />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Banking Information</Text>
            </View>
            <View style={styles.grid}>
                <InputField placeholder="Bank Name" value={form.bankName} keyName="bankName" icon="business-outline" />
                <InputField placeholder="Account Number" value={form.accountNumber} keyName="accountNumber" keyboardType="numeric" icon="card-outline" />
                <InputField placeholder="IFSC Code" value={form.ifsc} keyName="ifsc" icon="key-outline" />
                <InputField placeholder="Branch Name" value={form.branchName} keyName="branchName" icon="location-outline" />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Security</Text>
            </View>
            <View style={styles.grid}>
                <InputField placeholder="New Password" value={form.password} keyName="password" secureTextEntry={true} icon="lock-closed-outline" />
                <InputField placeholder="Confirm Password" value={form.confirmPassword} keyName="confirmPassword" secureTextEntry={true} icon="lock-closed-outline" />
            </View>
          </View>

          {/* Update Button */}
          <TouchableOpacity style={styles.updateButton} onPress={handleUpdateEmployee} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.updateButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  topHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0'
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  backBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 10 },
  
  mainWrapper: { padding: 16 },
  profileCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 10, elevation: 2
  },
  imageWrapper: { 
    width: 100, height: 100, borderRadius: 50, backgroundColor: "#f1f5f9", 
    justifyContent: "center", alignItems: "center", overflow: "hidden",
    borderWidth: 2, borderColor: '#0ea5e9', position: 'relative'
  },
  image: { width: "100%", height: "100%" },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0ea5e9',
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff'
  },
  imageHint: { fontSize: 12, color: '#94a3b8', marginTop: 10, fontWeight: '500' },

  section: { 
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: '#e2e8f0'
  },
  sectionHeader: { 
    borderLeftWidth: 4, borderLeftColor: '#0ea5e9', 
    paddingLeft: 10, marginBottom: 20 
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  inputWrapper: { 
    flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", 
    borderRadius: 12, paddingHorizontal: 12, marginBottom: 15, 
    borderWidth: 1, borderColor: "#e2e8f0", width: '100%'
  },
  desktopInput: { width: '48.5%' },
  iconContainer: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
    borderWidth: 1, borderColor: '#e2e8f0'
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#1e293b', fontWeight: '500' },

  updateButton: { 
    backgroundColor: "#1e293b", padding: 18, borderRadius: 15, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: "#0ea5e9", shadowOpacity: 0.2, shadowRadius: 10, elevation: 5
  },
  updateButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#fff' },
  loaderText: { marginTop: 10, color: '#64748b', fontWeight: '600' }
});