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

export default function PatientForgotPasswordScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [identifier, setIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const handleReset = async () => {
    if (!identifier.trim() || !newPassword || !confirmPassword) {
      showAlert("Required", "Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert("Password Mismatch", "Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("https://bmh-eitu.onrender.com/patient/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: identifier, // Handled as email or mobile in our custom backend forgotPassword controller
          newPassword,
          confirmPassword
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showAlert("Success", "Password reset successfully. Please log in.");
        router.replace('/login');
      } else {
        showAlert("Failed", data.message || "Failed to reset password");
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
              <Text style={styles.pillBadgeText}>ACCOUNT RECOVERY</Text>
            </View>

            <View style={styles.titleArea}>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Enter your email or phone number and a new password to recover your account.</Text>
            </View>

            <View style={styles.formGrid}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address or Mobile Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com or phone"
                  autoCapitalize="none"
                  value={identifier}
                  onChangeText={setIdentifier}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            {/* Actions */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.8 }]}
              activeOpacity={0.85}
              onPress={handleReset}
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
                    <Text style={styles.submitBtnText}>Reset Password</Text>
                    <ArrowRight size={16} color="#FFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.loginLink}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Right Side (Hero) */}
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
                <Text style={styles.heroTitle}>Secure and Easy.</Text>
                <Text style={styles.heroSubtitle}>
                  We prioritize your healthcare account security. Simply verify your details to regain access.
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
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
    flexGrow: 1,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 36,
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
    gap: 10,
  },
  brandLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandText: {
    fontSize: 16,
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
    fontSize: 11,
    fontWeight: '800',
    color: C.brand,
    letterSpacing: 1,
  },
  titleArea: {
    marginBottom: 28,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: C.ink,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
  },
  formGrid: {
    gap: 14,
    marginBottom: 20,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: C.inkSoft,
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: C.surface,
    color: C.ink,
    ...Platform.select({ web: { outlineStyle: "none" as any } }),
  },
  submitBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  loginLink: {
    fontSize: 13,
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
