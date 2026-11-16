import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { Button, Chip, Loading } from "../../components/ui";
import { api } from "../../lib/api";
import { COLORS } from "../../lib/config";

const TOKEN_KEY = "staff_token";
const FILTERS = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "all", label: "All" },
];

export default function Staff() {
  const [token, setToken] = useState(undefined); // undefined = still reading storage

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY).then(t => setToken(t || null)).catch(() => setToken(null));
  }, []);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setToken(null);
  }, []);

  if (token === undefined) return <Loading />;
  if (!token) return <Login onToken={async t => { await SecureStore.setItemAsync(TOKEN_KEY, t); setToken(t); }} />;
  return <Bookings token={token} onSignOut={signOut} />;
}

function Login({ onToken }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const { token } = await api.staffLogin(username.trim(), password);
      await onToken(token);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <View style={styles.login}>
      <Ionicons name="lock-closed" size={36} color={COLORS.ink} />
      <Text style={styles.loginTitle}>Staff sign in</Text>
      <Text style={styles.loginText}>For Automotive Car Care staff to manage bookings.</Text>
      <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} textContentType="username" placeholderTextColor="#9ca3af" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" onSubmitEditing={submit} placeholderTextColor="#9ca3af" />
      {!!error && <Text style={styles.err}>{error}</Text>}
      <Button title="Sign in" variant="dark" onPress={submit} loading={busy} disabled={!username || !password} style={{ alignSelf: "stretch", marginTop: 6 }} />
    </View>
  );
}

function Bookings({ token, onSignOut }) {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const handle = useCallback(
    e => {
      if (e.status === 401) onSignOut();
      else setError(e.message);
    },
    [onSignOut]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setList(await api.staffBookings(token));
    } catch (e) {
      handle(e);
    } finally {
      setLoading(false);
    }
  }, [token, handle]);

  useEffect(() => {
    load();
  }, [load]);

  const confirm = b =>
    Alert.alert("Confirm booking?", `${b.name} · ${b.bookingDate} ${b.bookingTime}\nThe customer will get a confirmation email.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          setBusyId(b._id);
          try {
            const res = await api.setBookingStatus(token, b._id, "confirmed");
            setList(l => l.map(x => (x._id === b._id ? res.booking : x)));
            if (!res.emailSent) Alert.alert("Confirmed", "The booking is confirmed, but the email could not be sent.");
          } catch (e) {
            handle(e);
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);

  const remove = b =>
    Alert.alert("Delete booking?", `${b.name} · ${b.vehicleBrand} ${b.vehicleModel}\nThis cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusyId(b._id);
          try {
            await api.deleteBooking(token, b._id);
            setList(l => l.filter(x => x._id !== b._id));
          } catch (e) {
            handle(e);
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);

  if (!list && loading) return <Loading label="Loading bookings…" />;

  const shown = (list || []).filter(b => filter === "all" || (b.status || "pending") === filter);
  const counts = { pending: 0, confirmed: 0 };
  (list || []).forEach(b => (counts[b.status === "confirmed" ? "confirmed" : "pending"] += 1));

  return (
    <FlatList
      data={shown}
      keyExtractor={b => b._id}
      refreshing={loading}
      onRefresh={load}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <View style={styles.headerRow}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{counts.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{counts.confirmed}</Text>
              <Text style={styles.statLabel}>Confirmed</Text>
            </View>
            <Pressable onPress={onSignOut} style={styles.signOut} accessibilityRole="button">
              <Ionicons name="log-out-outline" size={20} color={COLORS.muted} />
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {FILTERS.map(f => (
              <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
            ))}
          </View>
          {!!error && <Text style={styles.err}>{error}</Text>}
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No {filter === "all" ? "" : filter} bookings.</Text>}
      renderItem={({ item: b }) => {
        const confirmed = b.status === "confirmed";
        const services = [b.serviceName || b.service, ...(b.additionalServices || []).map(s => s.name)].filter(Boolean);
        const phone = String(b.phone || "").replace(/[^\d+]/g, "");
        return (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.name}>{b.name}</Text>
              <Text style={[styles.badge, confirmed ? styles.badgeOk : styles.badgeWait]}>{confirmed ? "Confirmed" : "Pending"}</Text>
            </View>
            <Text style={styles.line}>
              <Ionicons name="calendar-outline" size={14} /> {b.bookingDate} · {b.bookingTime}
            </Text>
            <Text style={styles.line}>
              <Ionicons name="car-outline" size={14} /> {b.vehicleBrand} {b.vehicleModel}
            </Text>
            <Text style={styles.line} numberOfLines={3}>
              <Ionicons name="construct-outline" size={14} /> {services.join(", ")}
            </Text>
            {!!b.notes && <Text style={styles.notes}>“{b.notes}”</Text>}
            <Text style={styles.meta}>{b.phone} · {b.email}</Text>
            <View style={styles.actions}>
              <Button title="Call" icon="call" variant="outline" onPress={() => Linking.openURL(`tel:${phone}`)} style={styles.action} />
              <Button title="WhatsApp" icon="logo-whatsapp" variant="outline" onPress={() => Linking.openURL(`https://wa.me/${phone.replace("+", "")}`)} style={styles.action} />
            </View>
            <View style={styles.actions}>
              {!confirmed && <Button title="Confirm" icon="checkmark" variant="green" onPress={() => confirm(b)} loading={busyId === b._id} style={styles.action} />}
              <Button title="Delete" icon="trash-outline" variant="danger" onPress={() => remove(b)} disabled={busyId === b._id} style={styles.action} />
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  login: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 10, backgroundColor: COLORS.bg },
  loginTitle: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  loginText: { color: COLORS.muted, textAlign: "center", marginBottom: 10 },
  input: { alignSelf: "stretch", backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  err: { color: COLORS.red, fontWeight: "600" },
  headerRow: { flexDirection: "row", gap: 10, alignItems: "stretch" },
  stat: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: COLORS.line },
  statNum: { fontSize: 24, fontWeight: "800", color: COLORS.text },
  statLabel: { color: COLORS.muted, fontSize: 12 },
  signOut: { alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  signOutText: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  empty: { textAlign: "center", color: COLORS.muted, marginTop: 30 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.line, gap: 4 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  name: { fontSize: 17, fontWeight: "700", color: COLORS.text, flex: 1 },
  badge: { fontSize: 12, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  badgeOk: { backgroundColor: COLORS.greenSoft, color: COLORS.green },
  badgeWait: { backgroundColor: COLORS.amberSoft, color: "#92400e" },
  line: { color: "#374151", fontSize: 14 },
  notes: { color: COLORS.muted, fontStyle: "italic", marginTop: 2 },
  meta: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  action: { flex: 1, paddingVertical: 10 },
});
