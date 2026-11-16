import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../lib/config";

const icon = name => {
  const TabIcon = ({ color, size }) => <Ionicons name={name} size={size} color={color} />;
  TabIcon.displayName = `TabIcon(${name})`;
  return TabIcon;
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.ink },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: COLORS.ink,
        tabBarInactiveTintColor: "#9ca3af",
        sceneStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", headerShown: false, tabBarIcon: icon("home") }} />
      <Tabs.Screen name="services" options={{ title: "Services", tabBarIcon: icon("construct") }} />
      <Tabs.Screen name="book" options={{ title: "Book", tabBarIcon: icon("calendar") }} />
      <Tabs.Screen name="contact" options={{ title: "Contact", tabBarIcon: icon("call") }} />
      <Tabs.Screen name="staff" options={{ title: "Staff", tabBarIcon: icon("briefcase") }} />
    </Tabs>
  );
}
