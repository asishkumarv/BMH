import { StyleSheet } from "react-native";

export const DB_COLORS = {
  primary: "#0D47A1",
  secondary: "#1565C0",
  accent: "#10B981",
  background: "#F4F6F9",
  surface: "#FFFFFF",
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  border: "#E2E8F0",
  inputBg: "#F8FAFC",
  danger: "#DC2626",
};

export const DB_BASE = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: DB_COLORS.background,
  },
  screenContent: {
    flexGrow: 1,
    padding: 18,
    paddingBottom: 34,
  },
  card: {
    backgroundColor: DB_COLORS.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: DB_COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  section: {
    marginBottom: 22,
  },
  input: {
    backgroundColor: DB_COLORS.inputBg,
    borderWidth: 1,
    borderColor: DB_COLORS.border,
    borderRadius: 14,
    padding: 14,
    color: DB_COLORS.textPrimary,
  },
  buttonPrimary: {
    backgroundColor: DB_COLORS.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: DB_COLORS.surface,
    fontWeight: "700",
    fontSize: 15,
  },
});

export default function DummyTheme() { return null; }
