import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import api from "../../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarOrder {
  id: string;
  type: "preorder" | "wholesale";
  status: string;
  customer_name?: string;
  wholesale_code?: string;
  pickup_date?: string;
  pickup_time?: string;
  due_date?: string;
  due_time_context?: string;
}

type ViewMode = "day" | "week" | "month";

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const H_PAD = 16;
const COL_WIDTH = (SCREEN_WIDTH - H_PAD * 2) / 7;
const DAY_HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7am–10pm

// Type-based colors for calendar (easier to scan visually)
const TYPE_COLOR: Record<string, string> = {
  preorder: "#5E35B1",
  wholesale: "#1565C0",
};

const STATUS_COLOR: Record<string, string> = {
  new: "#FF7043",
  confirmed: "#1976D2",
  in_preparation: "#7B1FA2",
  prepared: "#2E7D32",
  picked_up: "#43A047",
  no_show: "#F57C00",
  cancelled: "#9E9E9E",
};
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function orderDate(o: CalendarOrder): string | undefined {
  return o.type === "preorder" ? o.pickup_date : o.due_date;
}

function orderTime(o: CalendarOrder): string | undefined {
  return o.type === "preorder" ? o.pickup_time : undefined;
}

function orderLabel(o: CalendarOrder): string {
  return o.type === "preorder"
    ? (o.customer_name ?? "Pre-order")
    : (o.wholesale_code ?? "Wholesale");
}

function orderColor(o: CalendarOrder): string {
  // Use type color in calendar for easy visual scanning
  return TYPE_COLOR[o.type] ?? STATUS_COLOR[o.status] ?? "#9E9E9E";
}

function timeHour(t?: string): number | null {
  if (!t) return null;
  const h = parseInt(t.split(":")[0], 10);
  return isNaN(h) ? null : h;
}

function formatHour(h: number): string {
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

/** Monday of the week containing `d` */
function weekStart(d: Date): Date {
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + offset);
  m.setHours(0, 0, 0, 0);
  return m;
}

/** Array of 7 dates Mon–Sun for the week containing `d` */
function weekDays(d: Date): Date[] {
  const mon = weekStart(d);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(mon);
    day.setDate(mon.getDate() + i);
    return day;
  });
}

/** Cells for month grid: null = empty leading cell */
function monthCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const dow = first.getDay(); // 0=Sun
  const leading = dow === 0 ? 6 : dow - 1; // Monday-based offset
  const cells: (Date | null)[] = Array(leading).fill(null);
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

function navLabel(mode: ViewMode, date: Date): string {
  if (mode === "day") {
    return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  }
  if (mode === "week") {
    const days = weekDays(date);
    const from = days[0].toLocaleDateString([], { month: "short", day: "numeric" });
    const to = days[6].toLocaleDateString([], { month: "short", day: "numeric" });
    return `${from} – ${to}`;
  }
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function navigate(mode: ViewMode, date: Date, dir: -1 | 1): Date {
  const d = new Date(date);
  if (mode === "day") d.setDate(d.getDate() + dir);
  else if (mode === "week") d.setDate(d.getDate() + dir * 7);
  else d.setMonth(d.getMonth() + dir);
  return d;
}

function apiDate(mode: ViewMode, date: Date): string {
  if (mode === "week") return toKey(weekStart(date));
  if (mode === "month") return toKey(new Date(date.getFullYear(), date.getMonth(), 1));
  return toKey(date);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OrderPill({
  order,
  onPress,
  compact = false,
}: {
  order: CalendarOrder;
  onPress: () => void;
  compact?: boolean;
}) {
  const color = orderColor(order);
  return (
    <TouchableOpacity
      style={[styles.pill, { backgroundColor: color }, compact && styles.pillCompact]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.pillText, compact && styles.pillTextCompact]} numberOfLines={1}>
        {orderLabel(order)}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("month");
  const [date, setDate] = useState(new Date());
  const [showPreorders, setShowPreorders] = useState(true);
  const [showWholesale, setShowWholesale] = useState(true);
  const [ordersByDate, setOrdersByDate] = useState<Record<string, CalendarOrder[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeParam =
    showPreorders && showWholesale
      ? "all"
      : showPreorders
      ? "preorder"
      : showWholesale
      ? "wholesale"
      : null;

  const fetchOrders = useCallback(
    async (currentView: ViewMode, currentDate: Date) => {
      if (!typeParam) {
        setOrdersByDate({});
        return;
      }
      const { data } = await api.get("/api/orders/calendar", {
        params: {
          view: currentView,
          date: apiDate(currentView, currentDate),
          type: typeParam,
        },
      });

      const map: Record<string, CalendarOrder[]> = {};
      if (Array.isArray(data)) {
        (data as CalendarOrder[]).forEach((o) => {
          const key = orderDate(o);
          if (key) {
            if (!map[key]) map[key] = [];
            map[key].push(o);
          }
        });
      } else if (data && typeof data === "object") {
        Object.entries(data as Record<string, CalendarOrder[]>).forEach(([k, v]) => {
          map[k] = v;
        });
      }
      setOrdersByDate(map);
    },
    [typeParam]
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchOrders(view, date)
      .catch((err: unknown) => {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            ?? "Failed to load orders"
        );
      })
      .finally(() => setLoading(false));
  }, [view, date, fetchOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders(view, date).catch(() => {});
    setRefreshing(false);
  }, [view, date, fetchOrders]);

  const goToOrder = useCallback(
    (id: string) => router.push(`/orders/${id}`),
    [router]
  );

  const goToDay = useCallback((d: Date) => {
    setDate(d);
    setView("day");
  }, []);

  // ── Day View ──────────────────────────────────────────────────────────────

  const renderDayView = () => {
    const key = toKey(date);
    const dayOrders = ordersByDate[key] ?? [];
    const allDay = dayOrders.filter((o) => !orderTime(o));
    const timed = dayOrders.filter((o) => orderTime(o) !== undefined);

    const byHour: Record<number, CalendarOrder[]> = {};
    timed.forEach((o) => {
      const h = timeHour(orderTime(o));
      if (h !== null) {
        if (!byHour[h]) byHour[h] = [];
        byHour[h].push(o);
      }
    });

    return (
      <ScrollView
        style={styles.dayScroll}
        contentContainerStyle={styles.dayContent}
        showsVerticalScrollIndicator={false}
      >
        {/* All-day / Time TBD */}
        {allDay.length > 0 && (
          <View style={styles.allDaySection}>
            <Text style={styles.allDayLabel}>All Day / Time TBD</Text>
            {allDay.map((o) => (
              <OrderPill key={o.id} order={o} onPress={() => goToOrder(o.id)} />
            ))}
          </View>
        )}

        {/* Time slots */}
        {DAY_HOURS.map((h) => (
          <View key={h} style={styles.timeRow}>
            <Text style={styles.timeLabel}>{formatHour(h)}</Text>
            <View style={styles.timeOrders}>
              {(byHour[h] ?? []).map((o) => (
                <OrderPill key={o.id} order={o} onPress={() => goToOrder(o.id)} />
              ))}
            </View>
          </View>
        ))}

        {dayOrders.length === 0 && (
          <View style={styles.emptyDay}>
            <Text style={styles.emptyText}>No orders on this day</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  // ── Week View ─────────────────────────────────────────────────────────────

  const renderWeekView = () => {
    const days = weekDays(date);
    const today = toKey(new Date());

    return (
      <ScrollView
        style={styles.weekScroll}
        contentContainerStyle={styles.weekContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.weekHeader}>
          {days.map((d, i) => {
            const isToday = toKey(d) === today;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.weekHeaderCell, { width: COL_WIDTH }]}
                onPress={() => goToDay(d)}
                activeOpacity={0.7}
              >
                <Text style={styles.weekDayLetter}>{DAY_LETTERS[i]}</Text>
                <View style={[styles.weekDateCircle, isToday && styles.weekDateCircleToday]}>
                  <Text style={[styles.weekDateNum, isToday && styles.weekDateNumToday]}>
                    {d.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Order columns */}
        <View style={styles.weekBody}>
          {days.map((d, i) => {
            const orders = ordersByDate[toKey(d)] ?? [];
            return (
              <View key={i} style={[styles.weekCol, { width: COL_WIDTH }]}>
                {orders.map((o) => (
                  <TouchableOpacity
                    key={o.id}
                    style={[styles.weekBlock, { backgroundColor: orderColor(o) }]}
                    onPress={() => goToOrder(o.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.weekBlockText} numberOfLines={2}>
                      {orderLabel(o)}
                    </Text>
                  </TouchableOpacity>
                ))}
                {orders.length === 0 && <View style={styles.weekEmpty} />}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // ── Month View ────────────────────────────────────────────────────────────

  const renderMonthView = () => {
    const cells = monthCells(date.getFullYear(), date.getMonth());
    const today = toKey(new Date());
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }

    return (
      <ScrollView
        style={styles.monthScroll}
        contentContainerStyle={styles.monthContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Day-of-week header */}
        <View style={styles.monthDowRow}>
          {DAY_LETTERS.map((l, i) => (
            <Text key={i} style={[styles.monthDowLabel, { width: COL_WIDTH }]}>
              {l}
            </Text>
          ))}
        </View>

        {/* Weeks */}
        {rows.map((row, ri) => (
          <View key={ri} style={styles.monthRow}>
            {row.map((cell, ci) => {
              if (!cell) {
                return <View key={ci} style={[styles.monthCell, { width: COL_WIDTH }]} />;
              }
              const key = toKey(cell);
              const orders = ordersByDate[key] ?? [];
              const isToday = key === today;
              const isCurrentMonth = cell.getMonth() === date.getMonth();

              return (
                <TouchableOpacity
                  key={ci}
                  style={[styles.monthCell, { width: COL_WIDTH }]}
                  onPress={() => goToDay(cell)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.monthDateCircle, isToday && styles.monthDateCircleToday]}>
                    <Text
                      style={[
                        styles.monthDateNum,
                        !isCurrentMonth && styles.monthDateNumFaded,
                        isToday && styles.monthDateNumToday,
                      ]}
                    >
                      {cell.getDate()}
                    </Text>
                  </View>
                  {/* Order dots */}
                  {orders.length > 0 && (
                    <View style={styles.dotsRow}>
                      {orders.slice(0, 3).map((o, oi) => (
                        <View
                          key={oi}
                          style={[styles.dot, { backgroundColor: orderColor(o) }]}
                        />
                      ))}
                      {orders.length > 3 && (
                        <Text style={styles.dotMore}>+{orders.length - 3}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* View toggle */}
      <View style={styles.viewToggle}>
        {(["day", "week", "month"] as ViewMode[]).map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.viewOption, view === v && styles.viewOptionActive]}
            onPress={() => setView(v)}
            activeOpacity={0.75}
          >
            <Text style={[styles.viewOptionText, view === v && styles.viewOptionTextActive]}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter toggles */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, showPreorders && styles.filterChipPre]}
          onPress={() => setShowPreorders((v) => !v)}
          activeOpacity={0.75}
        >
          <Text style={[styles.filterChipText, showPreorders && styles.filterChipTextActive]}>
            Pre-orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, showWholesale && styles.filterChipWhole]}
          onPress={() => setShowWholesale((v) => !v)}
          activeOpacity={0.75}
        >
          <Text style={[styles.filterChipText, showWholesale && styles.filterChipTextActive]}>
            Wholesale
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity
          style={styles.navArrow}
          onPress={() => setDate((d) => navigate(view, d, -1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.navArrowText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDate(new Date())} activeOpacity={0.7}>
          <Text style={styles.dateNavLabel}>{navLabel(view, date)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navArrow}
          onPress={() => setDate((d) => navigate(view, d, 1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.navArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B6914" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !typeParam ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Enable at least one filter to see orders</Text>
        </View>
      ) : (
        <View style={styles.viewContainer}>
          {view === "day" && renderDayView()}
          {view === "week" && renderWeekView()}
          {view === "month" && renderMonthView()}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorText: { fontSize: 15, color: "#E53935", textAlign: "center", marginBottom: 12 },
  retryBtn: { backgroundColor: "#8B6914", paddingHorizontal: 20, paddingVertical: 9, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  // View toggle
  viewToggle: {
    flexDirection: "row",
    margin: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  viewOption: { flex: 1, paddingVertical: 10, alignItems: "center" },
  viewOptionActive: { backgroundColor: "#8B6914" },
  viewOptionText: { fontSize: 14, fontWeight: "600", color: "#999" },
  viewOptionTextActive: { color: "#fff" },

  // Filter
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  filterChipPre: { backgroundColor: "#EDE7F6", borderColor: "#5E35B1" },
  filterChipWhole: { backgroundColor: "#E3F2FD", borderColor: "#1565C0" },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#999" },
  filterChipTextActive: { color: "#1a1a1a" },

  // Date nav
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  navArrow: { padding: 4 },
  navArrowText: { fontSize: 28, color: "#8B6914", lineHeight: 32 },
  dateNavLabel: { fontSize: 15, fontWeight: "700", color: "#1a1a1a", textAlign: "center", flex: 1 },

  viewContainer: { flex: 1 },

  // ── Day view ──
  dayScroll: { flex: 1 },
  dayContent: { paddingBottom: 32 },
  allDaySection: {
    backgroundColor: "#fff",
    marginHorizontal: H_PAD,
    marginTop: 12,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    gap: 6,
  },
  allDayLabel: { fontSize: 11, fontWeight: "700", color: "#8B6914", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  timeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 44,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: H_PAD,
  },
  timeLabel: { width: 52, fontSize: 12, color: "#aaa", paddingTop: 2 },
  timeOrders: { flex: 1, gap: 4 },
  emptyDay: { paddingTop: 60, alignItems: "center" },

  // ── Week view ──
  weekScroll: { flex: 1 },
  weekContent: { paddingBottom: 32 },
  weekHeader: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 8,
    paddingHorizontal: H_PAD,
  },
  weekHeaderCell: { alignItems: "center", gap: 4 },
  weekDayLetter: { fontSize: 10, fontWeight: "700", color: "#999", textTransform: "uppercase", textAlign: "center" },
  weekDateCircle: { width: 26, height: 26, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  weekDateCircleToday: { backgroundColor: "#8B6914" },
  weekDateNum: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  weekDateNumToday: { color: "#fff" },
  weekBody: {
    flexDirection: "row",
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    alignItems: "flex-start",
  },
  weekCol: { gap: 3, paddingHorizontal: 1 },
  weekBlock: {
    borderRadius: 5,
    paddingHorizontal: 3,
    paddingVertical: 5,
    marginBottom: 2,
  },
  weekBlockText: { fontSize: 10, color: "#fff", fontWeight: "700", lineHeight: 13 },
  weekEmpty: { height: 8 },

  // ── Month view ──
  monthScroll: { flex: 1 },
  monthContent: { paddingHorizontal: H_PAD, paddingBottom: 32 },
  monthDowRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  monthDowLabel: { textAlign: "center", fontSize: 12, fontWeight: "700", color: "#999" },
  monthRow: { flexDirection: "row" },
  monthCell: {
    height: 68,
    paddingTop: 6,
    paddingBottom: 4,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  monthDateCircle: { width: 26, height: 26, borderRadius: 13, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  monthDateCircleToday: { backgroundColor: "#8B6914" },
  monthDateNum: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  monthDateNumFaded: { color: "#ccc" },
  monthDateNumToday: { color: "#fff" },
  dotsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotMore: { fontSize: 9, color: "#999", fontWeight: "700" },

  // ── Order pill ──
  pill: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 2,
  },
  pillCompact: { paddingHorizontal: 6, paddingVertical: 3 },
  pillText: { fontSize: 13, color: "#fff", fontWeight: "600" },
  pillTextCompact: { fontSize: 10 },

  emptyText: { fontSize: 14, color: "#bbb", textAlign: "center" },
});
