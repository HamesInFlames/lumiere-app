import { Stack } from "expo-router";

export default function RecipesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: "Recipe Details" }} />
      <Stack.Screen name="create" options={{ title: "New Recipe" }} />
    </Stack>
  );
}
