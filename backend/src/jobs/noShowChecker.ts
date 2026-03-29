import cron from "node-cron";
import pool from "../db";
import { sendPushNotification } from "../services/notifications";

export function startNoShowChecker() {
  cron.schedule("*/15 * * * *", async () => {
    console.log("[NoShowChecker] Running check...");

    try {
      const { rows: overdueOrders } = await pool.query(
        `SELECT id, customer_name, phone_number, pickup_date, pickup_time, status
         FROM orders
         WHERE type = 'preorder'
           AND pickup_date <= CURRENT_DATE
           AND status NOT IN ('picked_up', 'cancelled', 'no_show')
           AND no_show_notified = false`
      );

      if (overdueOrders.length === 0) {
        console.log("[NoShowChecker] No overdue orders found.");
        return;
      }

      const { rows: recipients } = await pool.query(
        "SELECT push_token FROM users WHERE role IN ('owner', 'bar_staff') AND push_token IS NOT NULL"
      );

      for (const order of overdueOrders) {
        const timeStr = order.pickup_time || "N/A";
        const title = "Pickup Overdue";
        const body = `Order not picked up: ${order.customer_name} — ${timeStr}. Follow up needed.`;

        for (const user of recipients) {
          await sendPushNotification(user.push_token, title, body);
        }

        await pool.query(
          "UPDATE orders SET no_show_notified = true WHERE id = $1",
          [order.id]
        );
      }

      console.log(`[NoShowChecker] Notified for ${overdueOrders.length} order(s).`);
    } catch (err) {
      console.error("[NoShowChecker] Error:", err);
    }
  });

  console.log("[NoShowChecker] Scheduled every 15 minutes.");
}
