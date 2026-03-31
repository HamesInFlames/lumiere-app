import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import api from "../../lib/api";

interface Order {
  id: string;
  type: "preorder" | "wholesale";
  status: string;
  customer_name?: string;
  wholesale_code?: string;
  pickup_date?: string;
  pickup_time?: string;
  due_date?: string;
  due_time_context?: string;
  items: unknown[];
}

interface Props {
  orderId: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "#E53935",
  confirmed: "#E53935",
  in_preparation: "#E53935",
  prepared: "#E53935",
  picked_up: "#43A047",
  no_show: "#F9A825",
};

function formatDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export default function OrderCard({ orderId }: Props) {
  console.log('OrderCard rendered with orderId:', orderId);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    console.log('Fetching order:', orderId);
    api
      .get(`/api/orders/${orderId}`)
      .then(({ data }) => {
        if (!cancelled) setOrder(data);
      })
      .catch((error) => { console.log('Order fetch error:', JSON.stringify(error)); })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#8B6914" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>Order not found</Text>
      </View>
    );
  }

  const isPreorder = order.type === "preorder";
  const statusColor = STATUS_COLORS[order.status] ?? "#999";

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/orders/${order.id}`)}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: isPreorder ? "#EDE7F6" : "#E3F2FD" },
          ]}
        >
          <Text
            style={[
              styles.typeText,
              { color: isPreorder ? "#5E35B1" : "#1565C0" },
            ]}
          >
            {isPreorder ? "PRE-ORDER" : "WHOLESALE"}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>
            {order.status.replace(/_/g, " ").toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {isPreorder ? order.customer_name : order.wholesale_code}
      </Text>

      <View style={styles.meta}>
        <Text style={styles.metaText}>
          {isPreorder
            ? `Pickup: ${formatDate(order.pickup_date)}${order.pickup_time ? ` ${order.pickup_time}` : ""}`
            : `Due: ${formatDate(order.due_date)}`}
        </Text>
        <Text style={styles.metaText}>
          {order.items.length} item{order.items.length !== 1 ? "s" : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "#eee",
    minHeight: 60,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaText: {
    fontSize: 12,
    color: "#666",
  },
  errorText: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
  },
});
