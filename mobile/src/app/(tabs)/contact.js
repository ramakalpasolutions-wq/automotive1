import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, SectionTitle } from "../../components/ui";
import { api } from "../../lib/api";
import { BUSINESS, COLORS } from "../../lib/config";

const ROWS = [
  { icon: "call", label: "Call", value: BUSINESS.phoneLabel, url: `tel:${BUSINESS.phone}` },
  { icon: "logo-whatsapp", label: "WhatsApp", value: BUSINESS.phoneLabel, url: `https://wa.me/${BUSINESS.whatsapp}` },
  { icon: "mail", label: "Email", value: BUSINESS.email, url: `mailto:${BUSINESS.email}` },
  { icon: "location", label: "Workshop", value: BUSINESS.city, url: BUSINESS.maps },
  { icon: "globe", label: "Website", value: "automotivecarcare.in", url: BUSINESS.website },
  { icon: "logo-instagram", label: "Instagram", value: "@guntur_automotive_cars", url: BUSINESS.instagram },
  { icon: "logo-youtube", label: "YouTube", value: "@automotivecarcareguntur", url: BUSINESS.youtube },
];

export default function Contact() {
  const [msg, setMsg] = useState({ name: "", email: "", phone: "", message: "" });
  const [state, setState] = useState({ sending: false, sent: false, error: "" });

  const send = async () => {
    if (!msg.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.email.trim()) || !msg.message.trim()) {
      return setState({ sending: false, sent: false, error: "Please add your name, a valid email and a message." });
    }
    setState({ sending: true, sent: false, error: "" });
    try {
      await api.sendMessage({ ...msg, name: msg.name.trim(), email: msg.email.trim() });
      setState({ sending: false, sent: true, error: "" });
      setMsg({ name: "", email: "", phone: "", message: "" });
    } catch (e) {
      setState({ sending: false, sent: false, error: e.message });
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {ROWS.map((r, i) => (
            <Pressable key={r.label} onPress={() => Linking.openURL(r.url)} style={[styles.row, i > 0 && styles.rowLine]} accessibilityRole="link">
              <View style={styles.icon}>
                <Ionicons name={r.icon} size={20} color={COLORS.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{r.label}</Text>
                <Text style={styles.value}>{r.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </Pressable>
          ))}
        </View>

        <SectionTitle>Send us a message</SectionTitle>
        {state.sent && <Text style={styles.ok}>Thanks! We’ll get back to you soon.</Text>}
        <TextInput style={styles.input} placeholder="Name" value={msg.name} onChangeText={name => setMsg({ ...msg, name })} placeholderTextColor="#9ca3af" />
        <TextInput style={styles.input} placeholder="Email" value={msg.email} onChangeText={email => setMsg({ ...msg, email })} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9ca3af" />
        <TextInput style={styles.input} placeholder="Phone (optional)" value={msg.phone} onChangeText={phone => setMsg({ ...msg, phone })} keyboardType="phone-pad" placeholderTextColor="#9ca3af" />
        <TextInput style={[styles.input, { minHeight: 110, textAlignVertical: "top" }]} placeholder="Your message" value={msg.message} onChangeText={message => setMsg({ ...msg, message })} multiline placeholderTextColor="#9ca3af" />
        {!!state.error && <Text style={styles.err}>{state.error}</Text>}
        <Button title="Send message" icon="send" variant="dark" onPress={send} loading={state.sending} style={{ marginTop: 6 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: COLORS.line },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  rowLine: { borderTopWidth: 1, borderTopColor: COLORS.line },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.amberSoft, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, color: COLORS.muted },
  value: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 10, color: COLORS.text },
  ok: { color: COLORS.green, fontWeight: "600", marginBottom: 10 },
  err: { color: COLORS.red, fontWeight: "600", marginBottom: 8 },
});
