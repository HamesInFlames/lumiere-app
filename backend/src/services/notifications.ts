export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string
): Promise<void> {
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        sound: "default",
      }),
    });

    if (!response.ok) {
      console.error("Push notification failed:", response.status, await response.text());
    }
  } catch (err) {
    console.error("Push notification error:", err);
  }
}
