import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Chip, ErrorView, Loading } from "../../components/ui";
import { cleanText, useCatalog } from "../../lib/catalog";
import { COLORS } from "../../lib/config";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "general", label: "General" },
  { key: "special", label: "Special" },
];

export default function Services() {
  const { data, error, loading, refresh } = useCatalog();
  const [filter, setFilter] = useState("all");

  if (!data && loading) return <Loading />;
  if (!data) return <ErrorView error={error} onRetry={refresh} />;

  const list = filter === "all" ? data.services : data.services.filter(s => s.type === filter);

  return (
    <FlatList
      data={list}
      keyExtractor={s => s.slug}
      refreshing={loading}
      onRefresh={refresh}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      ListHeaderComponent={
        <View style={styles.filters}>
          {FILTERS.map(f => (
            <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => router.push(`/service/${item.slug}`)} accessibilityRole="button">
          <Image source={item.hero} style={styles.img} contentFit="cover" alt="" />
          <View style={styles.cardBody}>
            <Text style={[styles.tag, { color: item.type === "special" ? COLORS.red : COLORS.green }]}>
              {item.type === "special" ? "SPECIAL SERVICE" : "GENERAL SERVICE"}
            </Text>
            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.desc} numberOfLines={2}>
              {cleanText(item.description).replace(/\s+/g, " ")}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", gap: 8, marginBottom: 4 },
  card: { backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: COLORS.line },
  img: { width: "100%", height: 150, backgroundColor: COLORS.ink2 },
  cardBody: { padding: 14 },
  tag: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  name: { fontSize: 17, fontWeight: "700", color: COLORS.text, marginTop: 4 },
  desc: { color: COLORS.muted, marginTop: 4, lineHeight: 20 },
});
