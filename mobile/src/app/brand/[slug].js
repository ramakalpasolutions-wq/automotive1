import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { BrandLogo, CarPhoto, ErrorView, Loading } from "../../components/ui";
import { modelPhoto, useCatalog } from "../../lib/catalog";
import { COLORS } from "../../lib/config";

export default function BrandModels() {
  const { slug } = useLocalSearchParams();
  const { data, error, loading, refresh } = useCatalog();

  if (!data && loading) return <Loading />;
  if (!data) return <ErrorView error={error} onRetry={refresh} />;
  const brand = data.brands.find(b => b.slug === slug);
  if (!brand) return <ErrorView error={{ message: "Brand not found." }} />;

  // Group trims under their model ("Creta E", "Creta SX" → Creta), like the website.
  const groups = [];
  for (const trim of brand.models) {
    const photo = modelPhoto(data.carModels, brand, trim);
    const name = photo?.name || trim;
    const g = groups.find(x => x.name === name);
    if (g) g.trims.push(trim);
    else groups.push({ name, photo, trims: [trim] });
  }

  return (
    <>
      <Stack.Screen options={{ title: brand.label }} />
      <FlatList
        data={groups}
        keyExtractor={m => m.name}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <BrandLogo brand={brand} size={64} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{brand.label} service</Text>
              <Text style={styles.sub}>{groups.length} models · tap one to book</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            accessibilityRole="button"
            accessibilityLabel={`Book ${brand.label} ${item.name}`}
            onPress={() =>
              router.navigate({ pathname: "/book", params: { brand: brand.slug, model: item.trims.length === 1 ? item.trims[0] : "", group: item.name } })
            }
          >
            <CarPhoto uri={item.photo?.image} style={styles.photo} label={`${brand.label} ${item.name}`} />
            <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
            {item.trims.length > 1 && <Text style={styles.trims}>{item.trims.length} variants</Text>}
          </Pressable>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  sub: { color: COLORS.muted, marginTop: 2 },
  card: { flex: 1, maxWidth: "48.5%", backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: COLORS.line },
  photo: { width: "100%", aspectRatio: 4 / 3 },
  name: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 2, fontSize: 14, fontWeight: "600", color: COLORS.text },
  trims: { paddingHorizontal: 10, paddingBottom: 10, fontSize: 12, color: COLORS.muted },
});
