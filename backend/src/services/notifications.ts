import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import pool from "../db";

const expo = new Expo();

/**
 * Send a push notification to a single token.
 */
export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.warn(`Invalid Expo push token: ${pushToken}`);
    return;
  }

  const message: ExpoPushMessage = {
    to: pushToken,
    sound: "default",
    title,
    body,
    data: data ?? {},
  };

  try {
    const [ticket]: ExpoPushTicket[] = await expo.sendPushNotificationsAsync([message]);
    if (ticket.status === "error") {
      console.error(`Push error for ${pushToken}:`, ticket.message);
    }
  } catch (err) {
    console.error("Push notification error:", err);
  }
}

/**
 * Send push notifications to multiple users by role.
 * Optionally exclude a specific user (e.g. the one who triggered the event).
 */
export async function notifyByRole(
  roles: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  excludeUserId?: number
): Promise<void> {
  try {
    const placeholders = roles.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await pool.query(
      `SELECT push_token FROM users
       WHERE role IN (${placeholders})
         AND push_token IS NOT NULL
         AND active = true`,
      roles
    );

    const tokens = rows
      .map((r) => r.push_token as string)
      .filter((t) => Expo.isExpoPushToken(t));

    if (tokens.length === 0) return;

    // If excluding a user, get their token to filter out
    let excludeToken: string | null = null;
    if (excludeUserId) {
      const { rows: userRows } = await pool.query(
        "SELECT push_token FROM users WHERE id = $1",
        [excludeUserId]
      );
      if (userRows.length > 0) excludeToken = userRows[0].push_token;
    }

    const messages: ExpoPushMessage[] = tokens
      .filter((t) => t !== excludeToken)
      .map((token) => ({
        to: token,
        sound: "default" as const,
        title,
        body,
        data: data ?? {},
      }));

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        console.error("Push chunk error:", err);
      }
    }
  } catch (err) {
    console.error("notifyByRole error:", err);
  }
}

/**
 * Send push notification to a specific user by ID.
 */
export async function notifyUser(
  userId: number,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const { rows } = await pool.query(
      "SELECT push_token FROM users WHERE id = $1 AND push_token IS NOT NULL AND active = true",
      [userId]
    );
    if (rows.length === 0) return;
    await sendPushNotification(rows[0].push_token, title, body, data);
  } catch (err) {
    console.error("notifyUser error:", err);
  }
}
