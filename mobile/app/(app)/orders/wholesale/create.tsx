import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import api from "../../../../lib/api";
import { useAuthStore } from "../../../../store/authStore";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  category?: string;
}

interface LineItem {
  product_name: string;
  quantity: string;
}

interface KitchenSection {
  kitchen: "lumiere" | "tova";
  items: LineItem[];
}

type DueTimeContext = "EOD" | "Morning" | "Afternoon" | "Custom";

const DUE_TIME_OPTIONS: DueTimeContext[] = ["EOD", "Morning", "Afternoon", "Custom"];

const EMPTY_ITEM: LineItem = { product_name: "", quantity: "1" };

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

// ─── Label wrapper ────────────────────────────────────────────────────────────

function LabeledInput({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>
        {label}{required && <Text style={styles.required}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CreateWholesaleScreen() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);

  // Redirect non-owners immediately
  useEffect(() => {
    if (role && role !== "owner") {
      Alert.alert("Access Denied", "Only the owner can create wholesale orders.");
      router.back();
    }
  }, [role, router]);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [wholesaleCode, setWholesaleCode] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [dueTimeContext, setDueTimeContext] = useState<DueTimeContext>("EOD");
  const [customDueTime, setCustomDueTime] = useState("");
  const [kitchens, setKitchens] = useState<KitchenSection[]>([
    { kitchen: "lumiere", items: [{ ...EMPTY_ITEM }] },
  ]);
  const [notes, setNotes] = useState("");

  // ── Products ────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [pickerKitchenIdx, setPickerKitchenIdx] = useState(0);
  const [pickerItemIdx, setPickerItemIdx] = useState(0);
  const [productSearch, setProductSearch] = useState("");

  // ── AI paste ────────────────────────────────────────────────────────────────
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  // ── Load products ───────────────────────────────────────────────────────────
  useEffect(() => {
    api.get<Product[]>("/api/products")
      .then(({ data }) => setProducts(data))
      .catch(() => {})
      .finally(() => setProductsLoading(false));
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  // ── Product picker helpers ──────────────────────────────────────────────────
  const openProductPicker = useCallback((kIdx: number, iIdx: number) => {
    setPickerKitchenIdx(kIdx);
    setPickerItemIdx(iIdx);
    setProductSearch("");
    setProductPickerOpen(true);
  }, []);

  const selectProduct = useCallback((product: Product) => {
    setKitchens((prev) =>
      prev.map((k, ki) =>
        ki !== pickerKitchenIdx ? k : {
          ...k,
          items: k.items.map((item, ii) =>
            ii !== pickerItemIdx ? item : { ...item, product_name: product.name }
          ),
        }
      )
    );
    setProductPickerOpen(false);
  }, [pickerKitchenIdx, pickerItemIdx]);

  // ── Kitchen / item helpers ──────────────────────────────────────────────────
  const updateItem = useCallback((kIdx: number, iIdx: number, field: keyof LineItem, value: string) => {
    setKitchens((prev) =>
      prev.map((k, ki) =>
        ki !== kIdx ? k : {
          ...k,
          items: k.items.map((item, ii) =>
            ii !== iIdx ? item : { ...item, [field]: value }
          ),
        }
      )
    );
  }, []);

  const addItem = useCallback((kIdx: number) => {
    setKitchens((prev) =>
      prev.map((k, ki) =>
        ki !== kIdx ? k : { ...k, items: [...k.items, { ...EMPTY_ITEM }] }
      )
    );
  }, []);

  const removeItem = useCallback((kIdx: number, iIdx: number) => {
    setKitchens((prev) =>
      prev.map((k, ki) =>
        ki !== kIdx ? k : { ...k, items: k.items.filter((_, ii) => ii !== iIdx) }
      )
    );
  }, []);

  const toggleKitchen = useCallback((kIdx: number, kitchen: "lumiere" | "tova") => {
    setKitchens((prev) =>
      prev.map((k, ki) => ki !== kIdx ? k : { ...k, kitchen })
    );
  }, []);

  const addKitchen = useCallback(() => {
    setKitchens((prev) => {
      const used = prev.map((k) => k.kitchen);
      const next: "lumiere" | "tova" = used.includes("lumiere") ? "tova" : "lumiere";
      return [...prev, { kitchen: next, items: [{ ...EMPTY_ITEM }] }];
    });
  }, []);

  const removeKitchen = useCallback((kIdx: number) => {
    setKitchens((prev) => prev.filter((_, ki) => ki !== kIdx));
  }, []);

  // ── Date helpers ────────────────────────────────────────────────────────────
  const toDateString = (d: Date) => d.toISOString().split("T")[0];
  const formatDateDisplay = (d: Date) =>
    d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = useCallback((): string | null => {
    if (!wholesaleCode.trim()) return "Wholesale code is required";
    if (!dueDate) return "Due date is required";
    if (dueTimeContext === "Custom" && !customDueTime.trim()) return "Custom due time is required";
    if (kitchens.length === 0) return "Add at least one kitchen";
    for (let ki = 0; ki < kitchens.length; ki++) {
      const k = kitchens[ki];
      if (k.items.length === 0) return `Add at least one item for ${k.kitchen}`;
      for (let ii = 0; ii < k.items.length; ii++) {
        if (!k.items[ii].product_name.trim())
          return `Select a product for item ${ii + 1} in ${k.kitchen}`;
        const qty = parseInt(k.items[ii].quantity, 10);
        if (isNaN(qty) || qty < 1)
          return `Item ${ii + 1} in ${k.kitchen} needs a valid quantity`;
      }
    }
    return null;
  }, [wholesaleCode, dueDate, dueTimeContext, customDueTime, kitchens]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) { Alert.alert("Validation", err); return; }

    setSubmitting(true);
    try {
      await api.post("/api/orders/wholesale", {
        wholesale_code: wholesaleCode.trim(),
        due_date: toDateString(dueDate!),
        due_time_context: dueTimeContext === "Custom" ? customDueTime.trim() : dueTimeContext,
        notes: notes.trim() || undefined,
        kitchens: kitchens.map((k) => ({
          kitchen: k.kitchen,
          items: k.items.map((item) => ({
            product_name: item.product_name.trim(),
            quantity: parseInt(item.quantity, 10),
          })),
        })),
      });
      setToastVisible(true);
      setTimeout(() => router.back(), 1800);
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to create wholesale order"
      );
    } finally {
      setSubmitting(false);
    }
  }, [validate, wholesaleCode, dueDate, dueTimeContext, customDueTime, notes, kitchens, router]);

  // ── AI Parse ────────────────────────────────────────────────────────────────
  const handleParse = useCallback(async () => {
    if (!rawText.trim()) { setParseError("Paste a WhatsApp message first"); return; }
    setParsing(true);
    setParseError(null);

    const productList = products.map((p) => p.name).join(", ");
    const today = new Date().toISOString().split("T")[0];
    const systemPrompt = `You are an order parser for Lumière Pâtisserie. Parse raw WhatsApp wholesale order messages into JSON.

Today's date is ${today}. If a due date is a day name (e.g. "Friday"), resolve it to the next upcoming occurrence of that day as YYYY-MM-DD.

Available products: ${productList || "unknown"}.
If a product name doesn't exactly match, pick the closest match from the list.

Return ONLY valid JSON with this exact shape (no markdown, no explanation):
{
  "wholesale_code": "string",
  "due_date": "YYYY-MM-DD",
  "due_time_context": "EOD" | "Morning" | "Afternoon" | "Custom",
  "kitchens": [
    {
      "kitchen": "lumiere" | "tova",
      "items": [{ "product_name": "string", "quantity": number }]
    }
  ]
}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: rawText.trim() }],
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error((errBody as { error?: { message?: string } })?.error?.message ?? `HTTP ${response.status}`);
      }

      const body = await response.json() as {
        content: Array<{ type: string; text: string }>;
      };
      const text = body.content.find((c) => c.type === "text")?.text ?? "";
      const parsed = JSON.parse(text) as {
        wholesale_code?: string;
        due_date?: string;
        due_time_context?: DueTimeContext;
        kitchens?: Array<{ kitchen: "lumiere" | "tova"; items: LineItem[] }>;
      };

      // Auto-fill the form
      if (parsed.wholesale_code) setWholesaleCode(parsed.wholesale_code);
      if (parsed.due_date) {
        const d = new Date(parsed.due_date + "T12:00:00");
        if (!isNaN(d.getTime())) setDueDate(d);
      }
      if (parsed.due_time_context && DUE_TIME_OPTIONS.includes(parsed.due_time_context)) {
        setDueTimeContext(parsed.due_time_context);
      }
      if (parsed.kitchens && parsed.kitchens.length > 0) {
        setKitchens(
          parsed.kitchens.map((k) => ({
            kitchen: k.kitchen,
            items: k.items.map((item) => ({
              product_name: item.product_name ?? "",
              quantity: String(item.quantity ?? 1),
            })),
          }))
        );
      }

      setPasteModalOpen(false);
      setRawText("");
    } catch (err: unknown) {
      setParseError(
        err instanceof Error ? err.message : "Failed to parse order. Check your API key or try again."
      );
    } finally {
      setParsing(false);
    }
  }, [rawText, products]);

  if (role && role !== "owner") return null;

  const canAddKitchen = kitchens.length < 2;
  const usedKitchens = kitchens.map((k) => k.kitchen);

  return (
    <>
      <Stack.Screen options={{ title: "New Wholesale Order" }} />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── AI Paste Button ── */}
          <TouchableOpacity
            style={styles.pasteButton}
            onPress={() => { setRawText(""); setParseError(null); setPasteModalOpen(true); }}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={styles.pasteButtonText}>Paste from WhatsApp</Text>
            <Ionicons name="chevron-down" size={16} color="#8B6914" />
          </TouchableOpacity>

          {/* ── 1. Wholesale code ── */}
          <LabeledInput label="Wholesale Code / Nickname" required>
            <TextInput
              style={styles.input}
              value={wholesaleCode}
              onChangeText={setWholesaleCode}
              placeholder='e.g. "H", "C-C", "Bloom"'
              placeholderTextColor="#bbb"
              autoCorrect={false}
              autoCapitalize="characters"
            />
          </LabeledInput>

          {/* ── 2. Due date ── */}
          <LabeledInput label="Due Date" required>
            <TouchableOpacity
              style={[styles.dateButton, !dueDate && styles.dateButtonEmpty]}
              onPress={() => setDatePickerVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={16} color={dueDate ? "#1a1a1a" : "#bbb"} />
              <Text style={[styles.dateButtonText, !dueDate && styles.dateButtonPlaceholder]} numberOfLines={1}>
                {dueDate ? formatDateDisplay(dueDate) : "Select due date"}
              </Text>
            </TouchableOpacity>
          </LabeledInput>

          {/* ── 3. Due time context ── */}
          <LabeledInput label="Due Time" required>
            <View style={styles.segmented}>
              {DUE_TIME_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.segmentOption, dueTimeContext === opt && styles.segmentActive]}
                  onPress={() => setDueTimeContext(opt)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.segmentText, dueTimeContext === opt && styles.segmentTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {dueTimeContext === "Custom" && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={customDueTime}
                onChangeText={setCustomDueTime}
                placeholder='e.g. "By 11am", "Before noon"'
                placeholderTextColor="#bbb"
                autoCorrect={false}
              />
            )}
          </LabeledInput>

          {/* ── 4. Kitchen sections ── */}
          {kitchens.map((kitchen, kIdx) => (
            <View key={kIdx} style={styles.kitchenCard}>
              {/* Kitchen toggle */}
              <View style={styles.kitchenHeader}>
                <View style={styles.kitchenToggle}>
                  {(["lumiere", "tova"] as const).map((k) => {
                    const takenByOther = usedKitchens.includes(k) && kitchen.kitchen !== k;
                    return (
                      <TouchableOpacity
                        key={k}
                        style={[
                          styles.kitchenOption,
                          kitchen.kitchen === k && styles.kitchenOptionActive,
                          takenByOther && styles.kitchenOptionDisabled,
                        ]}
                        onPress={() => !takenByOther && toggleKitchen(kIdx, k)}
                        disabled={takenByOther}
                        activeOpacity={0.75}
                      >
                        <Text style={[
                          styles.kitchenOptionText,
                          kitchen.kitchen === k && styles.kitchenOptionTextActive,
                          takenByOther && styles.kitchenOptionTextDisabled,
                        ]}>
                          {k.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {kitchens.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeKitchen(kIdx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={22} color="#E53935" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Items */}
              {kitchen.items.map((item, iIdx) => (
                <View key={iIdx} style={styles.lineItemRow}>
                  <TextInput
                    style={styles.qtyInput}
                    value={item.quantity}
                    onChangeText={(v) => updateItem(kIdx, iIdx, "quantity", v)}
                    keyboardType="number-pad"
                    maxLength={3}
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    style={styles.productSelector}
                    onPress={() => openProductPicker(kIdx, iIdx)}
                    activeOpacity={0.7}
                  >
                    {productsLoading ? (
                      <ActivityIndicator size="small" color="#8B6914" />
                    ) : (
                      <Text
                        style={[
                          styles.productSelectorText,
                          !item.product_name && styles.productSelectorPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {item.product_name || "Select product…"}
                      </Text>
                    )}
                    <Ionicons name="chevron-down" size={15} color="#8B6914" />
                  </TouchableOpacity>
                  {kitchen.items.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeItem(kIdx, iIdx)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="remove-circle" size={22} color="#E53935" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity style={styles.addItemButton} onPress={() => addItem(kIdx)} activeOpacity={0.7}>
                <Ionicons name="add" size={16} color="#8B6914" />
                <Text style={styles.addItemText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* ── 5. Add another kitchen ── */}
          {canAddKitchen && (
            <TouchableOpacity style={styles.addKitchenButton} onPress={addKitchen} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={20} color="#8B6914" />
              <Text style={styles.addKitchenText}>Add Another Kitchen</Text>
            </TouchableOpacity>
          )}

          {/* ── 6. Notes ── */}
          <LabeledInput label="Notes">
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Special instructions…"
              placeholderTextColor="#bbb"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </LabeledInput>

          {/* ── 7. Submit ── */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitText}>Create Wholesale Order</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Date picker ── */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        date={dueDate ?? new Date()}
        minimumDate={new Date()}
        onConfirm={(date) => { setDueDate(date); setDatePickerVisible(false); }}
        onCancel={() => setDatePickerVisible(false)}
      />

      {/* ── Product picker modal ── */}
      <Modal
        visible={productPickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setProductPickerOpen(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Product</Text>
            <TouchableOpacity onPress={() => setProductPickerOpen(false)}>
              <Ionicons name="close" size={24} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color="#bbb" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={productSearch}
              onChangeText={setProductSearch}
              placeholder="Search products…"
              placeholderTextColor="#bbb"
              autoFocus
              autoCorrect={false}
            />
          </View>
          {productsLoading ? (
            <View style={styles.modalCenter}>
              <ActivityIndicator size="large" color="#8B6914" />
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.modalCenter}>
              <Text style={styles.noProductsText}>
                {productSearch ? "No products match your search" : "No products available"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(p) => p.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.productItem}
                  onPress={() => selectProduct(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.productName}>{item.name}</Text>
                  {item.category ? (
                    <Text style={styles.productCategory}>{item.category}</Text>
                  ) : null}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
      </Modal>

      {/* ── WhatsApp paste modal ── */}
      <Modal
        visible={pasteModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => !parsing && setPasteModalOpen(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <View style={styles.pasteModalTitleRow}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={styles.modalTitle}>Paste from WhatsApp</Text>
            </View>
            {!parsing && (
              <TouchableOpacity onPress={() => setPasteModalOpen(false)}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.pasteScrollView} keyboardShouldPersistTaps="handled">
            <Text style={styles.pasteHint}>
              Paste Eliran's WhatsApp order message below. AI will parse it into the form automatically.
            </Text>
            <TextInput
              style={styles.pasteInput}
              value={rawText}
              onChangeText={setRawText}
              placeholder={"e.g.\nH order for Friday\nLumiere side:\nRed velvet x5\nDaisy x8\nTova:\nTiramisu x5"}
              placeholderTextColor="#bbb"
              multiline
              textAlignVertical="top"
              autoFocus
              editable={!parsing}
            />
            {parseError && (
              <View style={styles.parseErrorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#E53935" />
                <Text style={styles.parseErrorText}>{parseError}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.pasteFooter}>
            <TouchableOpacity
              style={[styles.parseButton, (!rawText.trim() || parsing) && styles.submitDisabled]}
              onPress={handleParse}
              disabled={!rawText.trim() || parsing}
              activeOpacity={0.85}
            >
              {parsing ? (
                <View style={styles.parseButtonInner}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.parseButtonText}>Parsing…</Text>
                </View>
              ) : (
                <Text style={styles.parseButtonText}>Parse Order</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast visible={toastVisible} message="Wholesale order created!" />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: "#f8f8f8" },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, gap: 16 },

  // Paste button
  pasteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pasteButtonText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1a1a1a" },

  // Fields
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#555", textTransform: "uppercase", letterSpacing: 0.4 },
  required: { color: "#E53935" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1a1a1a",
  },
  textArea: { minHeight: 80, paddingTop: 12 },

  // Date
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  dateButtonEmpty: { borderColor: "#e0e0e0" },
  dateButtonText: { fontSize: 14, color: "#1a1a1a", flex: 1 },
  dateButtonPlaceholder: { color: "#bbb" },

  // Segmented
  segmented: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  segmentOption: { flex: 1, paddingVertical: 12, alignItems: "center" },
  segmentActive: { backgroundColor: "#8B6914" },
  segmentText: { fontSize: 13, fontWeight: "600", color: "#999" },
  segmentTextActive: { color: "#fff" },

  // Kitchen card
  kitchenCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 14,
    gap: 10,
  },
  kitchenHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kitchenToggle: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
    flex: 1,
    marginRight: 10,
  },
  kitchenOption: { flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: "#f5f5f5" },
  kitchenOptionActive: { backgroundColor: "#8B6914" },
  kitchenOptionDisabled: { backgroundColor: "#f0f0f0" },
  kitchenOptionText: { fontSize: 13, fontWeight: "700", color: "#999" },
  kitchenOptionTextActive: { color: "#fff" },
  kitchenOptionTextDisabled: { color: "#ccc" },

  // Line items
  lineItemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyInput: {
    width: 52,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1a1a1a",
    textAlign: "center",
  },
  productSelector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  productSelectorText: { fontSize: 14, color: "#1a1a1a", flex: 1 },
  productSelectorPlaceholder: { color: "#bbb" },
  addItemButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 2 },
  addItemText: { fontSize: 13, color: "#8B6914", fontWeight: "600" },

  // Add kitchen
  addKitchenButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#8B6914",
    paddingVertical: 14,
  },
  addKitchenText: { fontSize: 14, color: "#8B6914", fontWeight: "600" },

  // Submit
  submitButton: { backgroundColor: "#8B6914", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Modal shared
  modal: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a", marginLeft: 8 },
  modalCenter: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Product picker
  searchContainer: { flexDirection: "row", alignItems: "center", margin: 12, backgroundColor: "#f5f5f5", borderRadius: 10, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: "#1a1a1a" },
  noProductsText: { fontSize: 15, color: "#bbb" },
  productItem: { paddingHorizontal: 16, paddingVertical: 14, gap: 2 },
  productName: { fontSize: 15, color: "#1a1a1a", fontWeight: "500" },
  productCategory: { fontSize: 12, color: "#999" },
  separator: { height: 1, backgroundColor: "#f0f0f0", marginLeft: 16 },

  // WhatsApp paste modal
  pasteModalTitleRow: { flexDirection: "row", alignItems: "center" },
  pasteScrollView: { flex: 1, padding: 16 },
  pasteHint: { fontSize: 14, color: "#666", marginBottom: 12, lineHeight: 20 },
  pasteInput: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1a1a1a",
    minHeight: 220,
    textAlignVertical: "top",
  },
  parseErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: "#FFF0F0",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  parseErrorText: { fontSize: 13, color: "#E53935", flex: 1 },
  pasteFooter: { padding: 16, borderTopWidth: 1, borderTopColor: "#eee" },
  parseButton: { backgroundColor: "#8B6914", borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  parseButtonInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  parseButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Toast
  toast: {
    position: "absolute",
    bottom: 40,
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
