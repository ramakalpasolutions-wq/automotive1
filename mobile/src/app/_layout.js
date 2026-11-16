import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../lib/config";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.ink },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: COLORS.bg },
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="service/[slug]" options={{ title: "Service" }} />
        <Stack.Screen name="brand/[slug]" options={{ title: "Models" }} />
      </Stack>
    </>
  );
}
