import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InventoryItem {
  id: string;
  name: string;
  module: "bar" | "kitchen";
  unit: string;
  quantity: number;
  low_threshold: number;
  updated_by?: string;
  updated_at?: string;
}

interface HistoryEntry {
  id: string;
  previous_qty: number;
  new_qty: number;
  changed_by?: string;
  changed_at?: string;
}

type TabModule = "bar" | "kitchen";

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ visible, message }: { visible: boolean; message: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1400),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity]);
  if (!visible) return null;
  return (
    <Animated.View style={[styles.toast, { opacity }]}>
      <Ionicons name="checkmark-circle" size={18} color="#fff" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  isOwner,
  onSave,
  onHistoryPress,
}: {
  item: InventoryItem;
  isOwner: boolean;
  onSave: (id: string, qty: number) => Promise<void>;
  onHistoryPress: (item: InventoryItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.quantity));
  const [saving, setSaving] = useState(false);
  const isLow = item.quantity <= item.low_threshold;

  const handleSave = async () => {
    const qty = parseFloat(value);
    if (isNaN(qty) || qty < 0) {
      Alert.alert("Invalid", "Enter a valid quantity");
      return;
    }
    setSaving(true);
    await onSave(item.id, qty);
    setSaving(false);
    setEditing(false);
  };

  const handlePress = () => {
    setValue(String(item.quantity));
    setEditing(true);
  };

  return (
    <TouchableOpacity
      style={[styles.itemRow, isLow && styles.itemRowLow]}
      onPress={handlePress}
      activeOpacity={0.75}
      disabled={editing}
    >
      <View style={styles.itemInfo}>
        <View style={styles.itemNameRow}>
          <Text style={[styles.itemName, isLow && styles.itemNameLow]} numberOfLines={1}>
            {item.name}
          </Text>
          {isLow && (
            <View style={styles.lowBadge}>
              <Ionicons name="warning-outline" size={11} color="#E53935" />
              <Text style={styles.lowBadgeText}>LOW</Text>
            </View>
          )}
        </View>
        {!editing && (
          <Text style={[styles.itemQtyDisplay, isLow && styles.itemQtyLow]}>
            <Text style={styles.itemQtyNum}>{item.quantity}</Text>
            {"  "}{item.unit}
          </Text>
        )}
        {editing && (
          <View style={styles.editRow}>
            <TextInput
              style={styles.editInput}
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
              onSubmitEditing={handleSave}
            />
            <Text style={styles.editUnit}>{item.unit}</Text>
            {saving ? (
              <ActivityIndicator size="small" color="#8B6914" style={{ marginLeft: 8 }} />
            ) : (
              <>
                <TouchableOpacity style={styles.editSave} onPress={handleSave}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editCancel}
                  onPress={() => setEditing(false)}
                >
                  <Ionicons name="close" size={18} color="#666" />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>

      {isOwner && !editing && (
        <TouchableOpacity
          onPress={() => onHistoryPress(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.historyBtn}
        >
          <Ionicons name="time-outline" size={20} color="#ccc" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const role = useAuthStore((s) => s.user?.role ?? "");
  const isOwner = role === "owner";
  const isBar = role === "bar_staff";
  const isKitchen = role === "kitchen_staff";

  // Tab: owner sees both, others see only their module
  const availableTabs: TabModule[] = isOwner
    ? ["bar", "kitchen"]
    : isBar
    ? ["bar"]
    : ["kitchen"];

  const [activeTab, setActiveTab] = useState<TabModule>(availableTabs[0]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  // Add item modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addUnit, setAddUnit] = useState("");
  const [addQty, setAddQty] = useState("0");
  const [addThreshold, setAddThreshold] = useState("5");
  const [addSubmitting, setAddSubmitting] = useState(false);

  // History modal
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchItems = useCallback(async (module: TabModule) => {
    const { data } = await api.get<InventoryItem[]>("/api/inventory", {
      params: { module },
    });
    setItems(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchItems(activeTab)
      .catch((err: unknown) => {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            ?? "Failed to load inventory"
        );
      })
      .finally(() => setLoading(false));
  }, [activeTab, fetchItems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchItems(activeTab).catch(() => {});
    setRefreshing(false);
  }, [activeTab, fetchItems]);

  const showToast = useCallback(() => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }, []);

  // ── Update quantity (optimistic) ──────────────────────────────────────────

  const handleSave = useCallback(
    async (id: string, qty: number) => {
      const prev = items.find((i) => i.id === id)?.quantity;
      // Optimistic update
      setItems((prev_items) =>
        prev_items.map((i) => (i.id === id ? { ...i, quantity: qty } : i))
      );
      try {
        await api.patch(`/api/inventory/${id}`, { quantity: qty });
        showToast();
      } catch (err: unknown) {
        // Revert on failure
        setItems((prev_items) =>
          prev_items.map((i) => (i.id === id ? { ...i, quantity: prev ?? i.quantity } : i))
        );
        Alert.alert(
          "Error",
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            ?? "Failed to update"
        );
      }
    },
    [items, showToast]
  );

  // ── History ───────────────────────────────────────────────────────────────

  const openHistory = useCallback(async (item: InventoryItem) => {
    setHistoryItem(item);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const { data } = await api.get<HistoryEntry[]>(`/api/inventory/${item.id}/history`);
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // ── Add item ──────────────────────────────────────────────────────────────

  const resetAddForm = () => {
    setAddName(""); setAddUnit(""); setAddQty("0"); setAddThreshold("5");
  };

  const handleAddItem = useCallback(async () => {
    if (!addName.trim()) { Alert.alert("Validation", "Item name is required"); return; }
    if (!addUnit.trim()) { Alert.alert("Validation", "Unit is required"); return; }
    const qty = parseFloat(addQty);
    const threshold = parseFloat(addThreshold);
    if (isNaN(qty)) { Alert.alert("Validation", "Enter a valid quantity"); return; }
    if (isNaN(threshold)) { Alert.alert("Validation", "Enter a valid threshold"); return; }

    setAddSubmitting(true);
    try {
      await api.post("/api/inventory", {
        name: addName.trim(),
        unit: addUnit.trim(),
        quantity: qty,
        low_threshold: threshold,
        module: activeTab,
      });
      setAddModalOpen(false);
      resetAddForm();
      await fetchItems(activeTab);
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? "Failed to add item"
      );
    } finally {
      setAddSubmitting(false);
    }
  }, [addName, addUnit, addQty, addThreshold, activeTab, fetchItems]);

  // ── Render ────────────────────────────────────────────────────────────────

  const formatDateTime = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <View style={styles.container}>
      {/* Tab bar (only shown for owner) */}
      {availableTabs.length > 1 && (
        <View style={styles.tabs}>
          {availableTabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === "bar" ? "Bar" : "Kitchen"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              isOwner={isOwner}
              onSave={handleSave}
              onHistoryPress={openHistory}
            />
          )}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No items in {activeTab} inventory</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => { resetAddForm(); setAddModalOpen(true); }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Add Item Modal */}
      <Modal
        visible={addModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => !addSubmitting && setAddModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Inventory Item</Text>
            {!addSubmitting && (
              <TouchableOpacity onPress={() => setAddModalOpen(false)}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Item Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={addName}
                onChangeText={setAddName}
                placeholder="e.g. Oat Milk"
                placeholderTextColor="#bbb"
                autoCapitalize="words"
                autoFocus
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Unit *</Text>
              <TextInput
                style={styles.modalInput}
                value={addUnit}
                onChangeText={setAddUnit}
                placeholder='e.g. "bags", "L", "pcs"'
                placeholderTextColor="#bbb"
                autoCorrect={false}
              />
            </View>
            <View style={styles.modalRow}>
              <View style={[styles.modalField, styles.flex1]}>
                <Text style={styles.modalLabel}>Quantity *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={addQty}
                  onChangeText={setAddQty}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
              </View>
              <View style={[styles.modalField, styles.flex1]}>
                <Text style={styles.modalLabel}>Low Alert At</Text>
                <TextInput
                  style={styles.modalInput}
                  value={addThreshold}
                  onChangeText={setAddThreshold}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
              </View>
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Module</Text>
              <View style={styles.moduleToggle}>
                {(["bar", "kitchen"] as TabModule[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.moduleOption, activeTab === m && styles.moduleOptionActive]}
                    onPress={() => setActiveTab(m)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.moduleOptionText, activeTab === m && styles.moduleOptionTextActive]}>
                      {m === "bar" ? "Bar" : "Kitchen"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.submitBtn, addSubmitting && styles.submitBtnDisabled]}
              onPress={handleAddItem}
              disabled={addSubmitting}
              activeOpacity={0.85}
            >
              {addSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Add Item</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* History Modal (owner only) */}
      <Modal
        visible={!!historyItem}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setHistoryItem(null)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{historyItem?.name} — History</Text>
            <TouchableOpacity onPress={() => setHistoryItem(null)}>
              <Ionicons name="close" size={24} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
          {historyLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#8B6914" />
            </View>
          ) : history.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>No history yet</Text>
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(h) => h.id}
              contentContainerStyle={styles.historyList}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item: h }) => (
                <View style={styles.historyRow}>
                  <View style={styles.historyChange}>
                    <Text style={styles.historyQty}>
                      {h.previous_qty} → {h.new_qty}
                    </Text>
                    {h.changed_by && (
                      <Text style={styles.historyBy}>by {h.changed_by}</Text>
                    )}
                  </View>
                  <Text style={styles.historyDate}>{formatDateTime(h.changed_at)}</Text>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      <Toast visible={toastVisible} message="Inventory updated" />
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
  emptyText: { fontSize: 14, color: "#bbb", textAlign: "center" },

  // Tabs
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#8B6914" },
  tabText: { fontSize: 15, fontWeight: "600", color: "#aaa" },
  tabTextActive: { color: "#8B6914" },

  // List
  listContent: { paddingBottom: 90 },
  separator: { height: 1, backgroundColor: "#f0f0f0" },

  // Item row
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingLeft: 16,
    paddingRight: 14,
    paddingVertical: 14,
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  itemRowLow: {
    borderLeftColor: "#E53935",
    backgroundColor: "#FFFBFB",
  },
  itemInfo: { flex: 1 },
  itemNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  itemName: { fontSize: 15, fontWeight: "600", color: "#1a1a1a", flexShrink: 1 },
  itemNameLow: { color: "#C62828" },
  itemQtyDisplay: { fontSize: 14, color: "#888" },
  itemQtyNum: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  itemQtyLow: { color: "#E53935" },
  lowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFEBEE",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lowBadgeText: { fontSize: 10, fontWeight: "700", color: "#E53935", letterSpacing: 0.3 },
  historyBtn: { padding: 4 },

  // Inline edit
  editRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  editInput: {
    width: 70,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#8B6914",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    color: "#1a1a1a",
    textAlign: "center",
  },
  editUnit: { fontSize: 14, color: "#666" },
  editSave: { backgroundColor: "#8B6914", borderRadius: 8, padding: 6 },
  editCancel: { backgroundColor: "#f0f0f0", borderRadius: 8, padding: 6 },

  // FAB
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

  // Modal shared
  modal: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  modalBody: { flex: 1, padding: 16 },
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: "#eee" },
  modalField: { marginBottom: 16, gap: 6 },
  modalRow: { flexDirection: "row", gap: 12 },
  flex1: { flex: 1 },
  modalLabel: { fontSize: 13, fontWeight: "600", color: "#555", textTransform: "uppercase", letterSpacing: 0.4 },
  modalInput: {
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1a1a1a",
  },
  moduleToggle: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  moduleOption: { flex: 1, paddingVertical: 12, alignItems: "center" },
  moduleOptionActive: { backgroundColor: "#8B6914" },
  moduleOptionText: { fontSize: 14, fontWeight: "600", color: "#aaa" },
  moduleOptionTextActive: { color: "#fff" },

  // Submit
  submitBtn: { backgroundColor: "#8B6914", borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // History
  historyList: { padding: 16, paddingBottom: 32 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  historyChange: { gap: 2 },
  historyQty: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  historyBy: { fontSize: 13, color: "#888" },
  historyDate: { fontSize: 13, color: "#aaa" },

  // Toast
  toast: {
    position: "absolute",
    bottom: 90,
    left: 24,
    right: 24,
    backgroundColor: "#43A047",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
