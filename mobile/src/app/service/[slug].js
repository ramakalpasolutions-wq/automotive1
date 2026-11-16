import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, ErrorView, Loading } from "../../components/ui";
import { cleanText, useCatalog } from "../../lib/catalog";
import { BUSINESS, COLORS } from "../../lib/config";

// "✅ item" lines become a checklist; everything else is a paragraph.
function Body({ text }) {
  const blocks = String(text || "").split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  return blocks.map((b, i) => {
    if (/^[✅✔☑•\-*]/u.test(b)) {
      return (
        <View key={i} style={{ gap: 6, marginBottom: 12 }}>
          {b.split("\n").map(l => cleanText(l.replace(/^[✅✔☑•\-*]\s*/u, ""))).filter(Boolean).map((l, j) => (
            <View key={j} style={styles.li}>
              <Text style={styles.tick}>✓</Text>
              <Text style={styles.liText}>{l}</Text>
            </View>
          ))}
        </View>
      );
    }
    const t = cleanText(b);
    return t ? <Text key={i} style={styles.p}>{t}</Text> : null;
  });
}

export default function ServiceDetail() {
  const { slug } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { data, error, loading, refresh } = useCatalog();

  if (!data && loading) return <Loading />;
  if (!data) return <ErrorView error={error} onRetry={refresh} />;
  const s = data.services.find(x => x.slug === slug);
  if (!s) return <ErrorView error={{ message: "This service is no longer available." }} />;

  const tagline = cleanText(s.tagline).split("\n")[0].replace(/[“”"]/g, "");

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: s.title }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Image source={s.contentImage || s.hero} style={styles.img} contentFit="cover" alt={s.title} />
        <View style={styles.body}>
          <Text style={[styles.tag, { color: s.type === "special" ? COLORS.red : COLORS.green }]}>
            {s.type === "special" ? "SPECIAL SERVICE" : "GENERAL SERVICE"}
          </Text>
          <Text style={styles.title}>{s.title}</Text>
          {!!tagline && <Text style={styles.tagline}>{tagline}</Text>}
          <Body text={s.description} />
          <Body text={s.content} />
          {!!s.features && (
            <>
              <Text style={styles.h2}>Why choose us</Text>
              <Body text={s.features} />
            </>
          )}
        </View>
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <Button title="Call" icon="call" variant="outline" onPress={() => Linking.openURL(`tel:${BUSINESS.phone}`)} style={{ flex: 1 }} />
        <Button
          title="Book this service"
          icon="calendar"
          onPress={() => router.navigate({ pathname: "/book", params: { service: s.slug } })}
          style={{ flex: 2 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  img: { width: "100%", height: 220, backgroundColor: COLORS.ink2 },
  body: { padding: 18 },
  tag: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.text, marginTop: 4 },
  tagline: { fontSize: 15, color: COLORS.muted, marginTop: 6, marginBottom: 14, fontStyle: "italic" },
  h2: { fontSize: 18, fontWeight: "700", marginTop: 8, marginBottom: 10, color: COLORS.text },
  p: { fontSize: 15, lineHeight: 23, color: "#374151", marginBottom: 12 },
  li: { flexDirection: "row", gap: 8 },
  tick: { color: COLORS.green, fontWeight: "800" },
  liText: { flex: 1, fontSize: 15, color: "#374151", lineHeight: 21 },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
});
