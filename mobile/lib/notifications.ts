import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useRouter } from "expo-router";
import api from "./api";

// Configure how notifications are shown when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Register for push notifications and save the token to the backend.
 * Returns the Expo push token string or null.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted");
    return null;
  }

  // Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8B6914",
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({});
  const token = tokenData.data;

  // Save token to backend
  try {
    await api.put("/api/auth/push-token", { push_token: token });
  } catch (err) {
    console.error("Failed to save push token:", err);
  }

  return token;
}

/**
 * Clear push token from backend (call on logout).
 */
export async function clearPushToken(): Promise<void> {
  try {
    await api.delete("/api/auth/push-token");
  } catch {
    // Ignore — user is logging out anyway
  }
}

/**
 * Hook to set up notification listeners and handle taps.
 * Call this once in the root layout when the user is authenticated.
 */
export function useNotificationListeners() {
  const router = useRouter();
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null);

  useEffect(() => {
    // When user taps a notification, navigate to the relevant screen
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as {
          type?: string;
          order_id?: string;
          channel_id?: string;
        };

        if (data.type === "order" && data.order_id) {
          router.push(`/orders/${data.order_id}`);
        } else if (data.type === "chat" && data.channel_id) {
          router.push(`/channels/${data.channel_id}`);
        }
      });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);
}
