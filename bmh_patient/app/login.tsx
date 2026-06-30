import React, { useState, useEffect } from "react";
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
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, MessageSquare, ShoppingCart, Calendar } from 'lucide-react-native';
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';

/* ─── Design tokens ──────────────────────────────────────── */
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

const shadow = (e: number) =>
  Platform.select({
    web: {
      boxShadow: `0 ${e * 2}px ${e * 8}px rgba(30,41,59,${0.04 + e * 0.015})`,
    },
    ios: {
      shadowColor: "#1E293B",
      shadowOpacity: 0.06 + e * 0.01,
      shadowRadius: e * 4,
      shadowOffset: { width: 0, height: e * 1.5 },
    },
    android: { elevation: e },
  });

export default function PatientLoginScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const [idFocused, setIdFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setErrors({
        identifier: !identifier ? "Required" : "",
        password: !password ? "Required" : ""
      });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("https://napi.bharatmedicalhallplus.com/patient/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: identifier, // Handled as email or mobile in our custom backend login controller
          password 
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.patient) {
        await AsyncStorage.setItem("patientUser", JSON.stringify(data.patient));
        router.replace('/dashboard');
      } else {
        showAlert("Login Failed", data.message || "Invalid credentials");
      }
    } catch (e) {
      console.error(e);
      showAlert("Error", "Something went wrong. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  const logoImage = require('../assets/Logo.jpg');

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle={isDesktop ? "light-content" : "dark-content"} backgroundColor={isDesktop ? C.hero : C.surface} />

      <View style={[styles.container, isDesktop && styles.containerDesktop]}>

        {/* Left Side: Form */}
        <View style={styles.formSection}>
          <ScrollView
            contentContainerStyle={styles.formScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Header / Brand */}
            <View style={styles.headerRow}>
              <View style={styles.brandRow}>
                <Image source={logoImage} style={styles.brandLogo} resizeMode="contain" />
                <Text style={styles.brandText}>
                  Bharat <Text style={{ color: C.brand }}>Medical</Text>
                </Text>
              </View>
            </View>

            {/* Pill Badge */}
            <View style={styles.pillBadge}>
              <Text style={styles.pillBadgeText}>PATIENT ACCESS</Text>
            </View>

            {/* Title Area */}
            <View style={styles.titleArea}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Enter your email/phone and password to access your patient dashboard.</Text>
            </View>

            {/* Inputs Grid */}
            <View style={styles.formGrid}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address or Mobile Number</Text>
                <View style={[
                  styles.inputWrapper,
                  idFocused && styles.inputWrapperFocused,
                  errors.identifier && styles.inputError
                ]}>
                  <View style={styles.inputIconWrapper}>
                    <Mail size={18} color={idFocused ? C.brand : C.muted} />
                  </View>
                  <TextInput
                    style={[styles.input, { paddingLeft: 40, paddingRight: 12 }]}
                    placeholder="name@example.com or 10-digit phone"
                    placeholderTextColor={C.mutedSoft}
                    autoCapitalize="none"
                    value={identifier}
                    onChangeText={(t: string) => { setIdentifier(t); setErrors({ ...errors, identifier: null }); }}
                    onFocus={() => setIdFocused(true)}
                    onBlur={() => setIdFocused(false)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[
                  styles.inputWrapper,
                  passwordFocused && styles.inputWrapperFocused,
                  errors.password && styles.inputError
                ]}>
                  <View style={styles.inputIconWrapper}>
                    <Lock size={18} color={passwordFocused ? C.brand : C.muted} />
                  </View>
                  <TextInput
                    style={[styles.input, { paddingLeft: 40, paddingRight: 42 }]}
                    placeholder="••••••••"
                    placeholderTextColor={C.mutedSoft}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(t: string) => { setPassword(t); setErrors({ ...errors, password: null }); }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtnAbsolute}>
                    {showPassword ? (
                      <EyeOff size={18} color={passwordFocused ? C.brand : C.muted} />
                    ) : (
                      <Eye size={18} color={passwordFocused ? C.brand : C.muted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={() => router.push('/forgot-password')}
              style={styles.forgotBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Actions */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.8 }]}
              activeOpacity={0.85}
              onPress={handleLogin}
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
                    <Text style={styles.submitBtnText}>Login to Dashboard</Text>
                    <ArrowRight size={16} color="#FFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.signupRow}>
              <Text style={styles.signupText}>New here?</Text>
              <TouchableOpacity onPress={() => router.push('/signup')}>
                <Text style={styles.signupLink}>Create an account</Text>
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

              <ScrollView
                style={styles.heroScroll}
                contentContainerStyle={styles.heroScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.heroContent}>
                  <View style={styles.heroLogoWrapper}>
                    <Image source={logoImage} style={styles.heroLogo} resizeMode="contain" />
                  </View>

                  <Text style={styles.heroTitle}>
                    Manage Your {'\n'}
                    <Text style={{ color: '#38BDF8' }}>Health</Text> On the Go.
                  </Text>

                  <Text style={styles.heroSubtitle}>
                    View prescriptions, track appointments, and stay in touch with your doctors 24/7.
                  </Text>

                  <View style={styles.featureList}>
                    {[
                      { title: "Secure Health Records", icon: ShieldCheck },
                      { title: "Instant Doctor Connectivity", icon: MessageSquare },
                      { title: "Express Medicine Delivery", icon: ShoppingCart },
                      { title: "Real-time Appointment Tracking", icon: Calendar }
                    ].map((feat, idx) => (
                      <View key={idx} style={styles.featureCard}>
                        <View style={styles.featureIconContainer}>
                          <feat.icon size={16} color="#38BDF8" />
                        </View>
                        <Text style={styles.featureCardTitle}>{feat.title}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </LinearGradient>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

/* ---------------- RESPONSIVE STYLES ---------------- */
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

  /* Form Section */
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

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 36,
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

  /* Pill Badge */
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

  /* Titles */
  titleArea: {
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: C.ink,
    letterSpacing: -1,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
  },

  /* Form Grid */
  formGrid: {
    gap: 14,
    marginBottom: 12,
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
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    overflow: 'hidden',
    ...shadow(1),
  },
  inputWrapperFocused: {
    borderColor: C.brand,
    backgroundColor: C.surface,
    ...Platform.select({
      web: {
        boxShadow: `0 0 0 3px rgba(59, 130, 246, 0.15)`,
      },
      ios: {
        shadowColor: C.brand,
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 3,
      }
    })
  },
  inputIconWrapper: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 2,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: C.ink,
    ...Platform.select({ web: { outlineStyle: "none" as any } }),
  },
  inputError: {
    borderColor: C.danger,
    backgroundColor: C.dangerSoft,
  },
  eyeBtnAbsolute: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    zIndex: 2,
  },

  /* Forgot Password */
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 28,
  },
  forgotText: {
    color: C.brand,
    fontWeight: '700',
    fontSize: 13,
  },

  /* Actions */
  submitBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
    ...shadow(3),
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
    letterSpacing: 0.5,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  signupText: {
    fontSize: 13,
    color: C.muted,
  },
  signupLink: {
    fontSize: 13,
    fontWeight: '700',
    color: C.brandHover,
  },

  /* Hero Section (Desktop) */
  heroSection: {
    flex: 1.2,
    position: 'relative',
  },
  heroGradient: {
    flex: 1,
    overflow: 'hidden',
  },
  heroGlowA: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "rgba(59,130,246,0.22)",
    ...Platform.select({ web: { filter: "blur(90px)" } }),
  },
  heroGlowB: {
    position: "absolute",
    bottom: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(124,58,237,0.18)",
    ...Platform.select({ web: { filter: "blur(90px)" } }),
  },
  heroScroll: {
    flex: 1,
    width: '100%',
  },
  heroScrollContent: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  heroContent: {
    width: '100%',
    maxWidth: 440,
    zIndex: 10,
  },
  heroLogoWrapper: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...shadow(4),
  },
  heroLogo: {
    width: 36,
    height: 36,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 42,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
    marginBottom: 20,
  },
  featureList: {
    gap: 8,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 10,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      }
    })
  },
  featureIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
