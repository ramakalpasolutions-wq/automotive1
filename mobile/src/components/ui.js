import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../lib/config";
import { initials } from "../lib/catalog";

export function Button({ title, onPress, icon, variant = "primary", disabled, loading, style }) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={v.fg} />}
          <Text style={[styles.buttonText, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const VARIANTS = {
  primary: { bg: COLORS.amber, fg: COLORS.ink, border: COLORS.amber },
  dark: { bg: COLORS.ink, fg: "#fff", border: COLORS.ink },
  green: { bg: COLORS.green, fg: "#fff", border: COLORS.green },
  outline: { bg: "#fff", fg: COLORS.ink, border: COLORS.line },
  danger: { bg: "#fff", fg: COLORS.red, border: COLORS.redSoft },
};

export function SectionTitle({ children, right }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{children}</Text>
      {right}
    </View>
  );
}

export function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Loading({ label = "Loading…" }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.amber} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function ErrorView({ error, onRetry }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={40} color={COLORS.muted} />
      <Text style={[styles.muted, { textAlign: "center" }]}>{error?.message || "Could not load."}</Text>
      {onRetry && <Button title="Try again" onPress={onRetry} variant="dark" style={{ marginTop: 12 }} />}
    </View>
  );
}

export function BrandLogo({ brand, size = 56 }) {
  return (
    <View style={[styles.logo, { width: size, height: size }]}>
      {brand.logo ? (
        <Image source={brand.logo} style={{ width: size * 0.8, height: size * 0.8 }} contentFit="contain" alt={`${brand.label} logo`} />
      ) : (
        <Text style={styles.initials}>{initials(brand.name)}</Text>
      )}
    </View>
  );
}

export function CarPhoto({ uri, style, label }) {
  return uri ? (
    <Image source={uri} style={style} contentFit="cover" transition={150} alt={label || ""} />
  ) : (
    <View style={[style, styles.carFallback]}>
      <Ionicons name="car-sport" size={34} color="#cbd5e1" />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  buttonText: { fontSize: 15, fontWeight: "700" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 12 },
  section: { fontSize: 19, fontWeight: "700", color: COLORS.text },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipText: { fontSize: 14, color: COLORS.text, fontWeight: "500" },
  chipTextActive: { color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10, backgroundColor: COLORS.bg },
  muted: { color: COLORS.muted, fontSize: 15 },
  logo: { borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 18, fontWeight: "800", color: COLORS.muted },
  carFallback: { backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
});
