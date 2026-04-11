import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";

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
  item_count: number;
}

const STATUS_COLORS: Record<string, string> = {
  new: "#FF7043",
  confirmed: "#1976D2",
  in_preparation: "#7B1FA2",
  prepared: "#2E7D32",
  picked_up: "#43A047",
  no_show: "#F57C00",
  cancelled: "#9E9E9E",
};

const STATUS_LABELS: Record<string, string> = {
  new: "NEW",
  confirmed: "CONFIRMED",
  in_preparation: "IN PREP",
  prepared: "READY",
  picked_up: "PICKED UP",
  no_show: "NO SHOW",
  cancelled: "CANCELLED",
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatTime(time?: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#9E9E9E";
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, " ").toUpperCase();
  return (
    <View style={[styles.statusBadge, { backgroundColor: color }]}>
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

function OrderRow({ order, onPress }: { order: Order; onPress: () => void }) {
  const isPreorder = order.type === "preorder";
  const name = isPreorder ? order.customer_name : order.wholesale_code;
  const date = isPreorder
    ? formatDate(order.pickup_date)
    : formatDate(order.due_date);
  const time = isPreorder ? formatTime(order.pickup_time) : order.due_time_context;
  const dateLabel = isPreorder ? "Pickup" : "Due";
  const count = order.item_count ?? 0;
  const accentColor = isPreorder ? "#5E35B1" : "#1565C0";

  return (
    <TouchableOpacity
      style={[styles.row, { borderLeftColor: accentColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowTop}>
        <View style={styles.rowNameWrap}>
          <Text style={styles.rowName} numberOfLines={1}>
            {name ?? "—"}
          </Text>
          <View style={[styles.typeChip, isPreorder ? styles.typeChipPre : styles.typeChipWholesale]}>
            <Text style={[styles.typeChipText, isPreorder ? styles.typeChipTextPre : styles.typeChipTextWholesale]}>
              {isPreorder ? "PRE" : "WHL"}
            </Text>
          </View>
        </View>
        <StatusBadge status={order.status} />
      </View>
      <View style={styles.rowBottom}>
        <View style={styles.rowMetaLeft}>
          <Ionicons name="calendar-outline" size={12} color="#aaa" />
          <Text style={styles.rowMeta}>
            {dateLabel}: {date}{time ? ` · ${time}` : ""}
          </Text>
        </View>
        <Text style={styles.rowMeta}>
          {count} item{count !== 1 ? "s" : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);

  const [preorders, setPreorders] = useState<Order[]>([]);
  const [wholesale, setWholesale] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await api.get("/api/orders/calendar", {
      params: { view: "month", date: today, type: "all" },
    });

    let orders: Order[] = [];
    if (Array.isArray(data)) {
      orders = data;
    } else if (data && typeof data === "object") {
      orders = (Object.values(data) as Order[][]).flat();
    }

    setPreorders(orders.filter((o) => o.type === "preorder"));
    setWholesale(orders.filter((o) => o.type === "wholesale"));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await fetchOrders();
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load orders";
        setError(
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? msg
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchOrders();
      setError(null);
    } catch {
      // silently ignore refresh errors
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrders]);

  const handleFabPress = useCallback(() => {
    if (role === "owner") {
      setFabMenuOpen(true);
    } else if (role === "bar_staff") {
      router.push("/orders/preorder/create");
    }
  }, [role, router]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B6914" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sections = [
    { title: "Pre-orders", data: preorders },
    { title: "Wholesale", data: wholesale },
  ];

  const showFab = role === "owner" || role === "bar_staff";

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCount}>
              <Text style={styles.sectionCountText}>{section.data.length}</Text>
            </View>
          </View>
        )}
        renderSectionFooter={({ section }) =>
          section.data.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>
                No {section.title.toLowerCase()} this month
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <OrderRow
            order={item}
            onPress={() => router.push(`/orders/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B6914"
          />
        }
      />

      {showFab && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleFabPress}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Owner create menu */}
      <Modal
        visible={fabMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFabMenuOpen(false)}
      >
        <Pressable
          style={styles.fabMenuOverlay}
          onPress={() => setFabMenuOpen(false)}
        >
          <View style={styles.fabMenu}>
            <Text style={styles.fabMenuTitle}>New Order</Text>

            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                setFabMenuOpen(false);
                router.push("/orders/preorder/create");
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.fabMenuIcon, { backgroundColor: "#EDE7F6" }]}>
                <Ionicons name="person-outline" size={20} color="#5E35B1" />
              </View>
              <View style={styles.fabMenuText}>
                <Text style={styles.fabMenuLabel}>Pre-order</Text>
                <Text style={styles.fabMenuSub}>Customer pickup order</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>

            <View style={styles.fabMenuDivider} />

            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                setFabMenuOpen(false);
                router.push("/orders/wholesale/create");
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.fabMenuIcon, { backgroundColor: "#E3F2FD" }]}>
                <Ionicons name="business-outline" size={20} color="#1565C0" />
              </View>
              <View style={styles.fabMenuText}>
                <Text style={styles.fabMenuLabel}>Wholesale</Text>
                <Text style={styles.fabMenuSub}>Kitchen bulk order</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fabMenuCancel}
              onPress={() => setFabMenuOpen(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.fabMenuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
  },
  errorText: {
    fontSize: 15,
    color: "#E53935",
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#8B6914",
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f8f8",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8B6914",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCount: {
    backgroundColor: "#8B6914",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  sectionCountText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  emptySection: {
    paddingVertical: 20,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  emptyText: {
    fontSize: 14,
    color: "#bbb",
  },
  listContent: {
    paddingBottom: 90,
  },
  row: {
    backgroundColor: "#fff",
    paddingLeft: 14,
    paddingRight: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    borderLeftWidth: 3,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  rowNameWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
    gap: 7,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    flexShrink: 1,
  },
  typeChip: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  typeChipPre: {
    backgroundColor: "#EDE7F6",
  },
  typeChipWholesale: {
    backgroundColor: "#E3F2FD",
  },
  typeChipText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  typeChipTextPre: {
    color: "#5E35B1",
  },
  typeChipTextWholesale: {
    color: "#1565C0",
  },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowMetaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowMeta: {
    fontSize: 12,
    color: "#888",
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
    letterSpacing: 0.4,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#8B6914",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  fabMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  fabMenu: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 36,
    paddingHorizontal: 16,
  },
  fabMenuTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  fabMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  fabMenuText: {
    flex: 1,
    gap: 2,
  },
  fabMenuLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  fabMenuSub: {
    fontSize: 13,
    color: "#999",
  },
  fabMenuDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
  },
  fabMenuCancel: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
  },
  fabMenuCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
});
