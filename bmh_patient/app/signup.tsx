import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  useWindowDimensions,
  SafeAreaView,
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator
} from "react-native";
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';

const C = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  ink: "#1E293B",
  inkSoft: "#334155",
  muted: "#64748B",
  mutedSoft: "#94A3B8",
  line: "#E2E8F0",
  lineSoft: "#F1F5F9",
  brand: "#3B82F6",
  brandSoft: "#E6F2F2",
  brandHover: "#2563EB",
  danger: "#EF4444",
  dangerSoft: "#FEF2F2",
  hero: "#0F172A",
};

export default function PatientSignUpScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    mobile: "",
    email: "",
    password: "",
    confirm_password: "",
    age: "",
    gender: "Male",
    blood_group: "",
    city: "",
    pin_code: "",
    guardian_name: ""
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (name: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const handleSignUp = async () => {
    const { first_name, last_name, mobile, password, confirm_password, age } = form;
    if (!first_name || !last_name || !mobile || !password || !confirm_password || !age) {
      showAlert("Required Fields", "Please fill in all required fields marked with *");
      return;
    }

    if (password !== confirm_password) {
      showAlert("Password Mismatch", "Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("https://bmh-eitu.onrender.com/patient/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showAlert("Success", "Account created successfully. Please log in.");
        router.replace('/login');
      } else {
        showAlert("Sign Up Failed", data.message || "Could not register account");
      }
    } catch (e) {
      console.error(e);
      showAlert("Error", "Something went wrong. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const logoImage = require('../assets/Logo.jpg');

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle={isDesktop ? "light-content" : "dark-content"} backgroundColor={isDesktop ? C.hero : C.surface} />

      <View style={[styles.container, isDesktop && styles.containerDesktop]}>

        {/* Form Column */}
        <View style={styles.formSection}>
          <ScrollView
            contentContainerStyle={styles.formScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <ArrowLeft size={20} color={C.inkSoft} />
              </TouchableOpacity>
              <View style={styles.brandRow}>
                <Image source={logoImage} style={styles.brandLogo} resizeMode="contain" />
                <Text style={styles.brandText}>
                  Bharat <Text style={{ color: C.brand }}>Medical</Text>
                </Text>
              </View>
            </View>

            <View style={styles.pillBadge}>
              <Text style={styles.pillBadgeText}>NEW PATIENT REGISTER</Text>
            </View>

            <View style={styles.titleArea}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Fill in your details to set up your personal health account.</Text>
            </View>

            <View style={styles.formGrid}>
              {/* Row: First Name & Last Name */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>First Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="First name"
                    value={form.first_name}
                    onChangeText={(val: string) => handleChange('first_name', val)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Last Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Last name"
                    value={form.last_name}
                    onChangeText={(val: string) => handleChange('last_name', val)}
                  />
                </View>
              </View>

              {/* Row: Mobile & Email */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Mobile Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit number"
                    keyboardType="phone-pad"
                    value={form.mobile}
                    onChangeText={(val: string) => handleChange('mobile', val)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Email (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="name@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.email}
                    onChangeText={(val: string) => handleChange('email', val)}
                  />
                </View>
              </View>

              {/* Row: Password & Confirm Password */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    secureTextEntry
                    value={form.password}
                    onChangeText={(val: string) => handleChange('password', val)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Confirm Password *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    secureTextEntry
                    value={form.confirm_password}
                    onChangeText={(val: string) => handleChange('confirm_password', val)}
                  />
                </View>
              </View>

              {/* Row: Age & Gender */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Age *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Age"
                    keyboardType="numeric"
                    value={form.age}
                    onChangeText={(val: string) => handleChange('age', val)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity style={[styles.toggleBtn, form.gender === 'Male' && styles.toggleBtnActive]} onPress={() => handleChange('gender', 'Male')}>
                      <Text style={[styles.toggleText, form.gender === 'Male' && styles.toggleTextActive]}>Male</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.toggleBtn, form.gender === 'Female' && styles.toggleBtnActive]} onPress={() => handleChange('gender', 'Female')}>
                      <Text style={[styles.toggleText, form.gender === 'Female' && styles.toggleTextActive]}>Female</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Row: Blood Group & City */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Blood Group</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. O+"
                    value={form.blood_group}
                    onChangeText={(val: string) => handleChange('blood_group', val)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="City"
                    value={form.city}
                    onChangeText={(val: string) => handleChange('city', val)}
                  />
                </View>
              </View>

              {/* Row: Pin Code & Guardian */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Pin Code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Postal Code"
                    keyboardType="numeric"
                    value={form.pin_code}
                    onChangeText={(val: string) => handleChange('pin_code', val)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Guardian Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Guardian Name"
                    value={form.guardian_name}
                    onChangeText={(val: string) => handleChange('guardian_name', val)}
                  />
                </View>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.8 }]}
              activeOpacity={0.85}
              onPress={handleSignUp}
              disabled={loading}
            >
              <LinearGradient
                colors={["#3B82F6", "#2563EB"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtnInner}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Create Account</Text>
                    <ArrowRight size={16} color="#FFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.loginLink}>Login here</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Right Side: Hero (Desktop Only) */}
        {isDesktop && (
          <View style={styles.heroSection}>
            <LinearGradient
              colors={["#0F172A", "#1E1B4B"]}
              style={styles.heroGradient}
            >
              <View style={styles.heroGlowA} />
              <View style={styles.heroGlowB} />

              <View style={styles.heroContent}>
                <View style={styles.heroLogoWrapper}>
                  <Image source={logoImage} style={styles.heroLogo} resizeMode="contain" />
                </View>
                <Text style={styles.heroTitle}>Join Bharat Medical Today.</Text>
                <Text style={styles.heroSubtitle}>
                  Take control of your health. Manage visits, view histories, and download receipts in a single secure platform.
                </Text>
              </View>
            </LinearGradient>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
  },
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  containerDesktop: {
    flexDirection: 'row-reverse',
  },
  formSection: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  formScroll: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  brandText: {
    fontSize: 15,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.5,
  },
  pillBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    marginBottom: 12,
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.brand,
    letterSpacing: 1,
  },
  titleArea: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: C.ink,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
  },
  formGrid: {
    gap: 12,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: C.inkSoft,
    marginBottom: 4,
  },
  input: {
    height: 38,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    backgroundColor: C.surface,
    color: C.ink,
    ...Platform.select({ web: { outlineStyle: "none" as any } }),
  },
  toggleRow: {
    flexDirection: 'row',
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
    backgroundColor: C.surface,
  },
  toggleBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: C.brand,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
  },
  toggleTextActive: {
    color: '#FFF',
  },
  submitBtn: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 8,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  loginText: {
    fontSize: 12,
    color: C.muted,
  },
  loginLink: {
    fontSize: 12,
    fontWeight: '700',
    color: C.brand,
  },
  heroSection: {
    flex: 1,
    position: 'relative',
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  heroGlowA: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(59,130,246,0.18)",
    ...Platform.select({ web: { filter: "blur(90px)" } }),
  },
  heroGlowB: {
    position: "absolute",
    bottom: -100,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(124,58,237,0.15)",
    ...Platform.select({ web: { filter: "blur(90px)" } }),
  },
  heroContent: {
    maxWidth: 400,
  },
  heroLogoWrapper: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroLogo: {
    width: 30,
    height: 30,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
});
