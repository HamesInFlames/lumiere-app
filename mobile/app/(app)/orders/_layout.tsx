import { Stack } from "expo-router";

export default function OrdersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#1a1a1a",
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: "Order Details" }} />
      <Stack.Screen name="preorder/create" options={{ title: "New Pre-order" }} />
      <Stack.Screen name="wholesale/create" options={{ title: "New Wholesale Order" }} />
    </Stack>
  );
}
