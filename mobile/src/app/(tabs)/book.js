import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo, Button, CarPhoto, Chip, ErrorView, Loading, SectionTitle } from "../../components/ui";
import { api } from "../../lib/api";
import { modelPhoto, useCatalog } from "../../lib/catalog";
import { COLORS, TIME_SLOTS } from "../../lib/config";

const EMPTY = { brand: "", model: "", otherModel: false, services: [], date: "", time: "", name: "", code: "+91", phone: "", email: "", notes: "" };

const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const nextDays = n =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
// "02:00 PM" today is only bookable if it is at least an hour away.
const slotPassed = (date, slot) => {
  if (date !== ymd(new Date())) return false;
  const [, h, m, ap] = slot.match(/(\d+):(\d+) (AM|PM)/);
  const t = new Date();
  t.setHours((+h % 12) + (ap === "PM" ? 12 : 0), +m, 0, 0);
  return t.getTime() - Date.now() < 60 * 60 * 1000;
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Book() {
  const params = useLocalSearchParams();
  const { data, error, loading, refresh } = useCatalog();
  const [form, setForm] = useState(EMPTY);
  const [brandQuery, setBrandQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(null);
  const set = patch => {
    setSubmitError("");
    setForm(f => ({ ...f, ...patch }));
  };

  // Arriving from a brand, model or service screen pre-fills the form.
  useEffect(() => {
    if (!data) return;
    const patch = {};
    if (params.brand && data.brands.some(b => b.slug === params.brand)) {
      patch.brand = params.brand;
      patch.model = params.model || "";
      patch.otherModel = false;
    }
    if (params.service && data.services.some(s => s.slug === params.service)) {
      setForm(f => ({ ...f, ...patch, services: f.services.includes(params.service) ? f.services : [...f.services, params.service] }));
    } else if (Object.keys(patch).length) {
      set(patch);
    }
    if (Object.keys(patch).length || params.service) setDone(null);
  }, [data, params.brand, params.model, params.group, params.service]);

  const brand = data?.brands.find(b => b.slug === form.brand);
  const allModels = useMemo(
    () => (brand ? brand.models.map(name => ({ name, photo: modelPhoto(data.carModels, brand, name) })) : []),
    [brand, data]
  );
  // Arriving from a model card ("Creta") lists its variants first.
  const models = useMemo(() => {
    const g = params.brand === form.brand && params.group;
    if (!g) return allModels;
    const inGroup = m => (m.photo?.name || m.name) === g;
    return [...allModels.filter(inGroup), ...allModels.filter(m => !inGroup(m))];
  }, [allModels, params.brand, params.group, form.brand]);
  const days = useMemo(() => nextDays(21), []);

  if (!data && loading) return <Loading />;
  if (!data) return <ErrorView error={error} onRetry={refresh} />;

  if (done) {
    return (
      <View style={styles.done}>
        <View style={styles.doneIcon}>
          <Ionicons name="checkmark" size={44} color="#fff" />
        </View>
        <Text style={styles.doneTitle}>Booking received</Text>
        <Text style={styles.doneText}>
          {done.vehicleBrand} {done.vehicleModel} · {done.bookingDate} at {done.bookingTime}
          {"\n"}We’ll confirm your slot by email ({done.email}).
        </Text>
        <Button title="Book another service" variant="dark" onPress={() => { setDone(null); setForm(EMPTY); }} style={{ marginTop: 20, alignSelf: "stretch" }} />
        <Button title="Back to home" variant="outline" onPress={() => router.navigate("/")} style={{ marginTop: 10, alignSelf: "stretch" }} />
      </View>
    );
  }

  const chosen = data.services.filter(s => form.services.includes(s.slug));
  const missing = [
    !form.brand && "car brand",
    !form.model.trim() && "car model",
    !chosen.length && "a service",
    !form.date && "date",
    !form.time && "time",
    !form.name.trim() && "name",
    form.phone.replace(/\D/g, "").length < 7 && "phone number",
    !EMAIL_RE.test(form.email.trim()) && "valid email",
  ].filter(Boolean);

  const submit = async () => {
    setSubmitError("");
    if (missing.length) return setSubmitError(`Please add: ${missing.join(", ")}.`);
    const [first, ...rest] = chosen;
    const booking = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: `${form.code.trim() || "+91"} ${form.phone.replace(/\D/g, "")}`,
      vehicleBrand: brand.name,
      vehicleModel: form.model.trim(),
      service: first.slug,
      serviceName: first.name,
      serviceType: first.type,
      additionalServices: rest.map(s => ({ slug: s.slug, name: s.name, type: s.type })),
      bookingDate: form.date,
      bookingTime: form.time,
      notes: form.notes.trim(),
    };
    setSubmitting(true);
    try {
      await api.createBooking(booking);
      setDone(booking);
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const q = brandQuery.trim().toLowerCase();
  const shownBrands = q ? data.brands.filter(b => b.label.toLowerCase().includes(q)) : data.brands;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {/* 1. Car */}
        <SectionTitle>1. Your car</SectionTitle>
        {!brand ? (
          <>
            <TextInput style={styles.input} placeholder="Search brands…" value={brandQuery} onChangeText={setBrandQuery} placeholderTextColor="#9ca3af" />
            <View style={styles.grid}>
              {shownBrands.map(b => (
                <Pressable key={b.slug} style={styles.brandTile} onPress={() => set({ brand: b.slug, model: "", otherModel: false })} accessibilityRole="button">
                  <BrandLogo brand={b} size={44} />
                  <Text style={styles.tileText} numberOfLines={1}>{b.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.selected}>
              <BrandLogo brand={brand} size={44} />
              <Text style={styles.selectedText}>{brand.label}</Text>
              <Pressable onPress={() => set({ brand: "", model: "", otherModel: false })} hitSlop={10}>
                <Text style={styles.change}>Change</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
              {models.map(m => {
                const active = !form.otherModel && form.model === m.name;
                return (
                  <Pressable key={m.name} style={[styles.modelTile, active && styles.activeTile]} onPress={() => set({ model: m.name, otherModel: false })} accessibilityRole="radio" accessibilityState={{ checked: active }}>
                    <CarPhoto uri={m.photo?.image} style={styles.modelPhoto} label={`${brand.label} ${m.name}`} />
                    <Text style={styles.modelName} numberOfLines={2}>{m.name}</Text>
                  </Pressable>
                );
              })}
              <Pressable style={[styles.modelTile, form.otherModel && styles.activeTile]} onPress={() => set({ otherModel: true, model: "" })}>
                <View style={[styles.modelPhoto, styles.other]}>
                  <Ionicons name="add" size={30} color={COLORS.muted} />
                </View>
                <Text style={styles.modelName}>Other model</Text>
              </Pressable>
            </ScrollView>
            {form.otherModel && (
              <TextInput style={[styles.input, { marginTop: 10 }]} placeholder={`Type your ${brand.label} model`} value={form.model} onChangeText={model => set({ model })} autoFocus placeholderTextColor="#9ca3af" />
            )}
          </>
        )}

        {/* 2. Services */}
        <SectionTitle>2. Services</SectionTitle>
        <View style={styles.wrap}>
          {data.services.map(s => (
            <Chip
              key={s.slug}
              label={s.title}
              active={form.services.includes(s.slug)}
              onPress={() =>
                set({ services: form.services.includes(s.slug) ? form.services.filter(x => x !== s.slug) : [...form.services, s.slug] })
              }
            />
          ))}
        </View>

        {/* 3. Date & time */}
        <SectionTitle>3. Date & time</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {days.map(d => {
            const v = ymd(d);
            const active = form.date === v;
            return (
              <Pressable key={v} style={[styles.day, active && styles.dayActive]} onPress={() => set({ date: v, time: slotPassed(v, form.time) ? "" : form.time })}>
                <Text style={[styles.dayWeek, active && styles.dayTextActive]}>{d.toLocaleDateString("en-IN", { weekday: "short" })}</Text>
                <Text style={[styles.dayNum, active && styles.dayTextActive]}>{d.getDate()}</Text>
                <Text style={[styles.dayWeek, active && styles.dayTextActive]}>{d.toLocaleDateString("en-IN", { month: "short" })}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={[styles.wrap, { marginTop: 12 }]}>
          {TIME_SLOTS.map(t => {
            const disabled = !form.date || slotPassed(form.date, t);
            return (
              <Pressable
                key={t}
                disabled={disabled}
                onPress={() => set({ time: t })}
                style={[styles.slot, form.time === t && styles.slotActive, disabled && { opacity: 0.35 }]}
              >
                <Text style={[styles.slotText, form.time === t && { color: "#fff" }]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
        {!form.date && <Text style={styles.hint}>Pick a date to see time slots.</Text>}

        {/* 4. Contact */}
        <SectionTitle>4. Your details</SectionTitle>
        <TextInput style={styles.input} placeholder="Full name" value={form.name} onChangeText={name => set({ name })} autoComplete="name" textContentType="name" placeholderTextColor="#9ca3af" />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <TextInput style={[styles.input, { width: 72, textAlign: "center" }]} value={form.code} onChangeText={code => set({ code })} keyboardType="phone-pad" />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Phone number" value={form.phone} onChangeText={phone => set({ phone: phone.replace(/[^\d ]/g, "") })} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholderTextColor="#9ca3af" />
        </View>
        <TextInput style={[styles.input, { marginTop: 10 }]} placeholder="Email (for confirmation)" value={form.email} onChangeText={email => set({ email })} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" placeholderTextColor="#9ca3af" />
        <TextInput style={[styles.input, styles.notes]} placeholder="Describe the issue (optional)" value={form.notes} onChangeText={notes => set({ notes })} multiline placeholderTextColor="#9ca3af" />

        {!!submitError && <Text style={styles.error}>{submitError}</Text>}
        <Button title="Confirm booking" icon="checkmark-circle" onPress={submit} loading={submitting} style={{ marginTop: 16 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingBottom: 40 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  notes: { marginTop: 10, minHeight: 90, textAlignVertical: "top" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  brandTile: { width: "23%", flexGrow: 1, maxWidth: "24%", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.line },
  tileText: { fontSize: 11, fontWeight: "600", marginTop: 4, color: COLORS.text },
  selected: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 10, borderWidth: 1, borderColor: COLORS.line, marginBottom: 10 },
  selectedText: { flex: 1, fontSize: 16, fontWeight: "700", color: COLORS.text },
  change: { color: COLORS.amber, fontWeight: "700" },
  modelTile: { width: 130, backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: COLORS.line },
  activeTile: { borderColor: COLORS.amber },
  modelPhoto: { width: "100%", height: 86 },
  other: { backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  modelName: { padding: 8, fontSize: 13, fontWeight: "600", color: COLORS.text },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  day: { width: 58, paddingVertical: 10, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.line, alignItems: "center" },
  dayActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  dayWeek: { fontSize: 11, color: COLORS.muted },
  dayNum: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  dayTextActive: { color: "#fff" },
  slot: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.line },
  slotActive: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  slotText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  hint: { color: COLORS.muted, marginTop: 6, fontSize: 13 },
  error: { color: COLORS.red, marginTop: 14, fontWeight: "600" },
  done: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: COLORS.bg },
  doneIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.green, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 24, fontWeight: "800", marginTop: 16, color: COLORS.text },
  doneText: { color: COLORS.muted, textAlign: "center", marginTop: 8, lineHeight: 22 },
});
