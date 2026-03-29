import { Stack } from "expo-router";

export default function ChannelsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#1a1a1a",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Channels" }} />
      <Stack.Screen name="[id]" options={{ title: "Chat" }} />
    </Stack>
  );
}
