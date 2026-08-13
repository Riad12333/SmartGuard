import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="vehicle/[id]"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="vehicle/[id]/map"
        options={{ animation: "fade_from_bottom", presentation: "fullScreenModal" }}
      />
      <Stack.Screen
        name="add-vehicle"
        options={{ animation: "slide_from_bottom", presentation: "modal" }}
      />
    </Stack>
  );
}
