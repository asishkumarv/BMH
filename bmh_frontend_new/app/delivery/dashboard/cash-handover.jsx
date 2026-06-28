import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
} from "react-native";
import { DB_BASE } from "./DeliveryBoyTheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import Signature from "react-native-signature-canvas";
import SignatureCanvas from "react-signature-canvas"; // For web
import { useRouter } from 'expo-router';

export default function CashHandoverScreen() {
  const router = useRouter();
  const route = useRoute();
  const { deliveryBoyId } = route.params;

  const [collections, setCollections] = useState({ total_cash: 0, total_digital: 0 });
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [signature, setSignature] = useState(null);

  const cameraRef = useRef(null);
  const signatureRef = useRef(null);
  const webSigRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isDesktop = SCREEN_WIDTH > 800;
  const MAX_WIDTH = 1100;
  const containerWidth = SCREEN_WIDTH > MAX_WIDTH ? MAX_WIDTH : SCREEN_WIDTH - 32;

  const showAlert = (title, message) => {
    if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const date = new Date().toISOString().split("T")[0];
      const res = await fetch(
        `https://hospitaldatabasemanagement.onrender.com/deliveryboy/${deliveryBoyId}/collections?date=${date}`
      );
      const data = await res.json();
      if (data.success) {
        setCollections({
          total_cash: data.total_cash || 0,
          total_digital: data.total_digital || 0,
        });
      }
    } catch {
      showAlert("Error", "Failed to fetch daily collections");
    } finally {
      setLoading(false);
    }
  };

  const totalCollected = Number(collections.total_cash) + Number(collections.total_digital);

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    const result = await cameraRef.current.takePictureAsync({ quality: 0.6 });
    setPhoto(result.uri);
    setShowCamera(false);
  };

  const saveSignature = (sig) => {
    setSignature(sig);
    showAlert("Confirmed", "Cashier signature captured.");
  };

 const handleHandover = async () => {
  if (!photo) return showAlert("Required", "Please take cashier photo");
  if (!signature) return showAlert("Required", "Signature is mandatory for settlement");

  try {
    const formData = new FormData();

    if (Platform.OS === "web") {
      const photoBlob = await fetch(photo).then(res => res.blob());
      formData.append("cashier_photo", photoBlob, "cashier.jpg");
      const sigBlob = await (await fetch(signature)).blob();
      formData.append("signature", sigBlob, "signature.png");
    } else {
      formData.append("cashier_photo", { uri: photo, type: "image/jpeg", name: "cashier.jpg" });
      formData.append("signature", { uri: signature, type: "image/png", name: "signature.png" });
    }

const totalCollected = Number(collections.total_cash) + Number(collections.total_digital);
    formData.append("date", new Date().toISOString().split("T")[0]);
    formData.append("total_cash", collections.total_cash);
    formData.append("total_digital", collections.total_digital);
    formData.append("cash_returned", totalReturned);

    const res = await fetch(
      `https://hospitaldatabasemanagement.onrender.com/deliveryboy/${deliveryBoyId}/handover`,
      { method: "POST", body: formData }
    );

    const data = await res.json();
    if (data.success) {
      showAlert("Settled ✅", "Daily cash handover completed successfully.");

      // Reset UI state
      setCollections({ total_cash: 0, total_digital: 0 });
      setPhoto(null);
      setSignature(null);

      router.push("DeliverBoyDashboard");
    }
  } catch (err) {
    console.error(err);
    showAlert("Error", "Submission failed. Check your connection.");
  }
};

  const signatureStyle = `
    .m-signature-pad { border: none; box-shadow: none; background-color: transparent; width: 100%; height: 100%; }
    .m-signature-pad--body { border: 1px dashed #cbd5e1; border-radius: 12px; background-color: #f8fafc; left: 0; right: 0; top: 0; bottom: 0; }
    .m-signature-pad--footer { display: none; }
    canvas { width: 100% !important; height: 100% !important; border-radius: 12px; }
  `;

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color="#0ea5e9" />
      <Text style={styles.loaderText}>Syncing collections...</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, DB_BASE.page]}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Settlement</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : null}>
        <View style={[styles.mainWrapper, { width: containerWidth, alignSelf: "center", flex: 1 }]}>

          <View style={[styles.layoutRow, { flexDirection: isDesktop ? 'row' : 'column' }]}>

            {/* LEFT COLUMN: Summary & Photo */}
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              style={[styles.leftColumn, isDesktop && { flex: 1.2 }]}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Collection (Today)</Text>
                <Text style={styles.totalValue}>₹{totalCollected.toLocaleString()}</Text>
                <View style={styles.divider} />
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownItem}>
                    <Text style={styles.bLabel}>CASH</Text>
                    <Text style={styles.bValue}>₹{collections.total_cash}</Text>
                  </View>
                  <View style={[styles.breakdownItem, { borderLeftWidth: 1, borderLeftColor: '#e2e8f0' }]}>
                    <Text style={styles.bLabel}>DIGITAL</Text>
                    <Text style={styles.bValue}>₹{collections.total_digital}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="camera-outline" size={20} color="#0ea5e9" />
                  <Text style={styles.sectionTitle}>Cashier Photo</Text>
                </View>
                
                {showCamera ? (
                  <View style={styles.cameraContainer}>
                    <CameraView ref={cameraRef} style={styles.camera} />
                    <TouchableOpacity style={styles.captureCircle} onPress={takePhoto}>
                      <View style={styles.captureInner} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[styles.uploadPlaceholder, photo && styles.uploadActive]} 
                    onPress={() => setShowCamera(true)}
                  >
                    {photo ? (
                      <Image source={{ uri: photo }} style={styles.fullPreview} />
                    ) : (
                      <>
                        <Ionicons name="person-add-outline" size={32} color="#94a3b8" />
                        <Text style={styles.uploadText}>Click to take cashier photo</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
<View style={styles.infoBox}>
  <Ionicons name="information-circle" size={18} color="#0369a1" />
  <Text style={styles.infoText}>
    Hand over ₹{totalCollected.toLocaleString()} to the cashier.
  </Text>
</View>
              {!isDesktop && <View style={{ height: 450 }} />}
            </ScrollView>

            {/* RIGHT COLUMN: Signature & Confirmation */}
            <View style={[
              isDesktop ? styles.rightSidebar : styles.stickySignatureMobile,
              isDesktop && { flex: 0.8 }
            ]}>
              <View style={styles.cardHeader}>
                <Ionicons name="pencil-outline" size={18} color="#0ea5e9" />
                <Text style={styles.sectionTitle}>Cashier Signature</Text>
                {signature && <Ionicons name="checkmark-circle" size={18} color="#10b981" />}
              </View>

              <View style={styles.signatureWrapper}>
                {Platform.OS === "web" ? (
  <div style={{ width: "100%", height: 180 }}>
    <SignatureCanvas
      ref={webSigRef}
      penColor="black"
      minWidth={1}
      maxWidth={2.5}
      throttle={16}
      canvasProps={{
        style: {
          width: "100%",
          height: "100%",
          backgroundColor: "#f8fafc",
          borderRadius: "12px",
          border: "1px dashed #cbd5e1",
          cursor: "crosshair"
        }
      }}
      onEnd={() => {
        const data = webSigRef.current.toDataURL("image/png");
        setSignature(data);
      }}
    />
  </div>
) : (
                  <Signature
                    ref={signatureRef}
                    onOK={saveSignature}
                    autoClear={false}
                    bgWidth={isDesktop ? (containerWidth * 0.4) : (containerWidth - 40)}
                    bgHeight={180}
                    descriptionText="Please sign inside the box"
                    webStyle={signatureStyle}
                  />
                )}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={styles.clearBtn} 
                  onPress={() => {
                    if (Platform.OS === "web") webSigRef.current.clear();
                    else signatureRef.current?.clearSignature();
                    setSignature(null);
                  }}
                >
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveBtn, signature && { backgroundColor: '#10b981' }]} 
                  onPress={() => {
                    if (Platform.OS === "web") {
                      const data = webSigRef.current.toDataURL();
                      setSignature(data);
                      showAlert("Confirmed", "Cashier signature captured.");
                    } else signatureRef.current?.readSignature();
                  }}
                >
                  <Text style={styles.saveText}>{signature ? "Saved" : "Save Signature"}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.desktopSpacer} />

              <TouchableOpacity style={styles.finalBtn} onPress={handleHandover}>
                <Text style={styles.finalBtnText}>Confirm Handover</Text>
                <Ionicons name="checkmark-done" size={20} color="#fff" />
              </TouchableOpacity>
              
              {isDesktop && (
                <Text style={styles.warningText}>
                  Once submitted, the cash collection for today will be closed and cannot be modified.
                </Text>
              )}
            </View>

          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ... Keep all your styles as-is from your original code
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  mainWrapper: { flex: 1 },
  layoutRow: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#fff' },
  loaderText: { marginTop: 10, color: '#64748b', fontWeight: '500' },
  topHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0'
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  backBtn: { padding: 5, backgroundColor: '#f1f5f9', borderRadius: 8 },
  scrollContent: { padding: 16 },
  leftColumn: { flex: 1 },
  summaryCard: {
    backgroundColor: "#1e293b",
    padding: 24, borderRadius: 24, alignItems: "center", marginBottom: 20,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
  },
  summaryLabel: { color: "#94a3b8", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  totalValue: { fontSize: 36, fontWeight: "800", color: "#fff" },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', width: '100%', marginVertical: 15 },
  breakdownRow: { flexDirection: 'row', width: '100%' },
  breakdownItem: { flex: 1, alignItems: 'center' },
  bLabel: { color: "#64748b", fontSize: 10, fontWeight: "700", marginBottom: 4 },
  bValue: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionCard: { backgroundColor: "#fff", padding: 16, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  uploadPlaceholder: {
    height: 180, backgroundColor: '#f8fafc', borderRadius: 15,
    borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center'
  },
  uploadActive: { borderStyle: 'solid', overflow: 'hidden' },
  fullPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  uploadText: { marginTop: 8, color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  cameraContainer: { height: 300, borderRadius: 15, overflow: 'hidden', backgroundColor: '#000' },
  camera: { flex: 1 },
  captureCircle: {
    position: 'absolute', bottom: 20, alignSelf: 'center',
    width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center'
  },
  captureInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff' },
  infoBox: {
    flexDirection: 'row', gap: 10, backgroundColor: "#f0f9ff",
    padding: 15, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#bae6fd'
  },
  infoText: { color: "#0369a1", fontSize: 13, fontWeight: '500', flex: 1 },
  rightSidebar: {
    padding: 24, backgroundColor: '#fff', borderLeftWidth: 1, borderLeftColor: '#e2e8f0', height: '100%',
  },
  stickySignatureMobile: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", padding: 20,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10
  },
  signatureWrapper: { 
    height: 200, marginBottom: 15, backgroundColor: '#f8fafc', borderRadius: 12, overflow: 'hidden'
  },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  clearBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 12, backgroundColor: '#f1f5f9' },
  clearText: { color: '#64748b', fontWeight: '700' },
  saveBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 12, backgroundColor: '#0ea5e9' },
  saveText: { color: '#fff', fontWeight: '700' },
  finalBtn: {
    backgroundColor: "#1e293b", paddingVertical: 18, borderRadius: 18,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10
  },
  finalBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  desktopSpacer: { height: 20 },
  warningText: { marginTop: 15, color: '#94a3b8', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
