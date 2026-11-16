import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo, ErrorView, Loading, SectionTitle } from "../../components/ui";
import { useCatalog } from "../../lib/catalog";
import { BUSINESS, COLORS } from "../../lib/config";

export default function Home() {
  const insets = useSafeAreaInsets();
  const { data, error, loading, refresh } = useCatalog();

  if (!data && loading) return <Loading />;
  if (!data) return <ErrorView error={error} onRetry={refresh} />;

  const quick = [
    { icon: "calendar", label: "Book service", onPress: () => router.navigate("/book") },
    { icon: "call", label: "Call us", onPress: () => Linking.openURL(`tel:${BUSINESS.phone}`) },
    { icon: "logo-whatsapp", label: "WhatsApp", onPress: () => Linking.openURL(`https://wa.me/${BUSINESS.whatsapp}`) },
    { icon: "navigate", label: "Directions", onPress: () => Linking.openURL(BUSINESS.maps) },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: COLORS.bg }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <Image source={require("../../../assets/logo.png")} style={styles.logo} contentFit="contain" alt="Automotive Car Care logo" />
        <Text style={styles.heroTitle}>Car service & repair{"\n"}in Guntur</Text>
        <Text style={styles.heroText}>All brands · Diagnostics · AC · Electrical · ECU · Keys</Text>
        <View style={styles.quickRow}>
          {quick.map(q => (
            <Pressable key={q.label} onPress={q.onPress} style={styles.quick} accessibilityRole="button">
              <View style={styles.quickIcon}>
                <Ionicons name={q.icon} size={22} color={COLORS.ink} />
              </View>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.body}>
        <SectionTitle right={<Text style={styles.link} onPress={() => router.navigate("/services")}>See all</Text>}>
          Our services
        </SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {data.services.map(s => (
            <Pressable key={s.slug} style={styles.serviceCard} onPress={() => router.push(`/service/${s.slug}`)}>
              <Image source={s.hero} style={styles.serviceImg} contentFit="cover" alt="" />
              <View style={styles.serviceShade} />
              <Text style={styles.serviceTag}>{s.type === "special" ? "SPECIAL" : "GENERAL"}</Text>
              <Text style={styles.serviceName} numberOfLines={2}>{s.title}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionTitle>Brands we service</SectionTitle>
        <View style={styles.brandGrid}>
          {data.brands.map(b => (
            <Pressable key={b._id || b.slug} style={styles.brand} onPress={() => router.push(`/brand/${b.slug}`)}>
              <BrandLogo brand={b} size={52} />
              <Text style={styles.brandName} numberOfLines={1}>{b.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaTitle}>Need your car checked?</Text>
          <Text style={styles.ctaText}>Book a slot in under a minute. We’ll confirm by email.</Text>
          <Pressable style={styles.ctaButton} onPress={() => router.navigate("/book")}>
            <Text style={styles.ctaButtonText}>Book appointment</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.ink} />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: COLORS.ink, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  logo: { width: 150, height: 60, marginBottom: 12 },
  heroTitle: { color: "#fff", fontSize: 30, fontWeight: "800", lineHeight: 36 },
  heroText: { color: "#d1d5db", marginTop: 8, fontSize: 14 },
  quickRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 22 },
  quick: { alignItems: "center", width: "24%" },
  quickIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: COLORS.amber, alignItems: "center", justifyContent: "center" },
  quickLabel: { color: "#fff", fontSize: 12, marginTop: 6, textAlign: "center" },
  body: { paddingHorizontal: 16 },
  link: { color: COLORS.amber, fontWeight: "700" },
  serviceCard: { width: 200, height: 140, borderRadius: 18, overflow: "hidden", backgroundColor: COLORS.ink2 },
  serviceImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  serviceShade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" },
  serviceTag: { position: "absolute", top: 10, left: 12, color: COLORS.amber, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  serviceName: { position: "absolute", bottom: 12, left: 12, right: 12, color: "#fff", fontSize: 16, fontWeight: "700" },
  brandGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  brand: { width: "31%", flexGrow: 1, maxWidth: "32%", backgroundColor: "#fff", borderRadius: 16, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: COLORS.line },
  brandName: { fontSize: 13, fontWeight: "600", marginTop: 6, color: COLORS.text },
  cta: { marginTop: 28, backgroundColor: COLORS.ink, borderRadius: 20, padding: 20 },
  ctaTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  ctaText: { color: "#d1d5db", marginTop: 6 },
  ctaButton: { marginTop: 16, backgroundColor: COLORS.amber, borderRadius: 14, paddingVertical: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  ctaButtonText: { fontWeight: "800", color: COLORS.ink, fontSize: 15 },
});
