// Website the app talks to. For local testing set EXPO_PUBLIC_API_URL in
// mobile/.env (e.g. http://localhost:3001 for the iOS simulator).
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://www.automotivecarcare.in").replace(/\/$/, "");

export const BUSINESS = {
  name: "Automotive Car Care",
  city: "Guntur, Andhra Pradesh",
  phone: "+919392792067",
  phoneLabel: "+91 93927 92067",
  whatsapp: "919392792067",
  email: "vwautomotiveservices@gmail.com",
  website: "https://www.automotivecarcare.in",
  maps: "https://www.google.com/maps/search/?api=1&query=Automotive+Car+Care+Guntur",
  instagram: "https://www.instagram.com/guntur_automotive_cars",
  youtube: "https://youtube.com/@automotivecarcareguntur",
};

export const COLORS = {
  ink: "#111827",
  ink2: "#1f2937",
  text: "#111827",
  muted: "#6b7280",
  line: "#e5e7eb",
  bg: "#f9fafb",
  card: "#ffffff",
  amber: "#f59e0b",
  amberSoft: "#fef3c7",
  green: "#16a34a",
  greenSoft: "#dcfce7",
  red: "#dc2626",
  redSoft: "#fee2e2",
};

export const TIME_SLOTS = [
  "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM",
  "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM",
];
