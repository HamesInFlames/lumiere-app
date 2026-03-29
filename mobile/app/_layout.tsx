import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuthStore } from "../store/authStore";

export default function RootLayout() {
  const { user, isLoading, loadUser } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#8B6914" />
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
