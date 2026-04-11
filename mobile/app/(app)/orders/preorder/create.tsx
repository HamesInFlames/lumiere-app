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

interface Product {
  id: string;
  name: string;
  price?: number;
  category?: string;
}

interface LineItem {
  product_id: string;
  product_name: string;
  quantity: string;
  notes: string;
}

const EMPTY_ITEM: LineItem = {
  product_id: "",
  product_name: "",
  quantity: "1",
  notes: "",
};

function LabeledInput({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

function Toast({ visible, message }: { visible: boolean; message: string }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(1400),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
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

export default function CreatePreorderScreen() {
  const router = useRouter();

  const [paymentStatus, setPaymentStatus] = useState<"paid" | "not_paid">(
    "not_paid"
  );
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [pickupTime, setPickupTime] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }]);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [pickerTargetIndex, setPickerTargetIndex] = useState(0);
  const [productSearch, setProductSearch] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    api
      .get<Product[]>("/api/products")
      .then(({ data }) => setProducts(data))
      .catch(() => {
        // continue with empty product list
      })
      .finally(() => setProductsLoading(false));
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const openProductPicker = useCallback((index: number) => {
    setPickerTargetIndex(index);
    setProductSearch("");
    setProductPickerOpen(true);
  }, []);

  const selectProduct = useCallback(
    (product: Product) => {
      setItems((prev) =>
        prev.map((item, i) =>
          i === pickerTargetIndex
            ? { ...item, product_id: product.id, product_name: product.name }
            : item
        )
      );
      setProductPickerOpen(false);
    },
    [pickerTargetIndex]
  );

  const updateItemField = useCallback(
    (index: number, field: keyof LineItem, value: string) => {
      setItems((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      );
    },
    []
  );

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const formatDateDisplay = (d: Date | null): string => {
    if (!d) return "";
    return d.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimeDisplay = (d: Date | null): string => {
    if (!d) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const toDateString = (d: Date): string => d.toISOString().split("T")[0];

  const toTimeString = (d: Date): string => {
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const validate = useCallback((): string | null => {
    if (!customerName.trim()) return "Customer name is required";
    if (!pickupDate) return "Pickup date is required";
    if (items.length === 0) return "Add at least one item";
    for (let i = 0; i < items.length; i++) {
      if (!items[i].product_id) return `Select a product for item ${i + 1}`;
      const qty = parseInt(items[i].quantity, 10);
      if (isNaN(qty) || qty < 1)
        return `Item ${i + 1} quantity must be at least 1`;
    }
    return null;
  }, [customerName, pickupDate, items]);

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) {
      Alert.alert("Validation", err);
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/orders/preorder", {
        customer_name: customerName.trim(),
        phone_number: phoneNumber.trim() || undefined,
        pickup_date: toDateString(pickupDate!),
        pickup_time: pickupTime ? toTimeString(pickupTime) : undefined,
        payment_status: paymentStatus,
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: parseInt(item.quantity, 10),
          notes: item.notes.trim() || undefined,
        })),
      });
      setToastVisible(true);
      setTimeout(() => router.back(), 1800);
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create order"
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    validate,
    customerName,
    phoneNumber,
    pickupDate,
    pickupTime,
    paymentStatus,
    notes,
    items,
    router,
  ]);

  return (
    <>
      <Stack.Screen options={{ title: "New Pre-order" }} />
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
          {/* 1. Payment status toggle */}
          <LabeledInput label="Payment Status" required>
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  paymentStatus === "paid" && styles.togglePaid,
                ]}
                onPress={() => setPaymentStatus("paid")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.toggleText,
                    paymentStatus === "paid" && styles.toggleTextActive,
                  ]}
                >
                  PAID
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  paymentStatus === "not_paid" && styles.toggleNotPaid,
                ]}
                onPress={() => setPaymentStatus("not_paid")}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.toggleText,
                    paymentStatus === "not_paid" && styles.toggleTextActive,
                  ]}
                >
                  NOT PAID
                </Text>
              </TouchableOpacity>
            </View>
          </LabeledInput>

          {/* 2 & 3. Pickup date + time */}
          <View style={styles.row2}>
            <View style={styles.flex1}>
              <LabeledInput label="Pickup Date" required>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    !pickupDate && styles.dateButtonEmpty,
                  ]}
                  onPress={() => setDatePickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={pickupDate ? "#1a1a1a" : "#bbb"}
                  />
                  <Text
                    style={[
                      styles.dateButtonText,
                      !pickupDate && styles.dateButtonPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {pickupDate ? formatDateDisplay(pickupDate) : "Select date"}
                  </Text>
                </TouchableOpacity>
              </LabeledInput>
            </View>
            <View style={styles.flex1}>
              <LabeledInput label="Pickup Time">
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    !pickupTime && styles.dateButtonEmpty,
                  ]}
                  onPress={() => setTimePickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={pickupTime ? "#1a1a1a" : "#bbb"}
                  />
                  <Text
                    style={[
                      styles.dateButtonText,
                      !pickupTime && styles.dateButtonPlaceholder,
                    ]}
                  >
                    {pickupTime ? formatTimeDisplay(pickupTime) : "Any time"}
                  </Text>
                </TouchableOpacity>
              </LabeledInput>
            </View>
          </View>

          {/* 4. Customer name */}
          <LabeledInput label="Customer Name" required>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Full name"
              placeholderTextColor="#bbb"
              autoCapitalize="words"
              autoCorrect={false}
            />
          </LabeledInput>

          {/* 5. Phone */}
          <LabeledInput label="Phone Number">
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor="#bbb"
              keyboardType="phone-pad"
              autoCorrect={false}
            />
          </LabeledInput>

          {/* 6. Line items */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Items <Text style={styles.required}>*</Text>
            </Text>
            {items.map((item, index) => (
              <View key={index} style={styles.lineItemBlock}>
                <View style={styles.lineItemRow}>
                  <TextInput
                    style={styles.qtyInput}
                    value={item.quantity}
                    onChangeText={(v) => updateItemField(index, "quantity", v)}
                    keyboardType="number-pad"
                    maxLength={3}
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    style={styles.productSelector}
                    onPress={() => openProductPicker(index)}
                    activeOpacity={0.7}
                  >
                    {productsLoading ? (
                      <ActivityIndicator size="small" color="#8B6914" />
                    ) : (
                      <Text
                        style={[
                          styles.productSelectorText,
                          !item.product_name &&
                            styles.productSelectorPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {item.product_name || "Select product…"}
                      </Text>
                    )}
                    <Ionicons name="chevron-down" size={15} color="#8B6914" />
                  </TouchableOpacity>
                  {items.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeItem(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="remove-circle"
                        size={22}
                        color="#E53935"
                      />
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={styles.itemNotesInput}
                  value={item.notes}
                  onChangeText={(v) => updateItemField(index, "notes", v)}
                  placeholder="Item notes (optional)"
                  placeholderTextColor="#bbb"
                  autoCorrect={false}
                />
              </View>
            ))}
            <TouchableOpacity
              style={styles.addItemButton}
              onPress={addItem}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color="#8B6914" />
              <Text style={styles.addItemText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {/* 7. Order notes */}
          <LabeledInput label="Order Notes">
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Special requests or notes…"
              placeholderTextColor="#bbb"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </LabeledInput>

          {/* 8. Submit */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitText}>Create Pre-order</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date picker */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        date={pickupDate ?? new Date()}
        minimumDate={new Date()}
        onConfirm={(date) => {
          setPickupDate(date);
          setDatePickerVisible(false);
        }}
        onCancel={() => setDatePickerVisible(false)}
      />

      {/* Time picker */}
      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        date={pickupTime ?? new Date()}
        onConfirm={(time) => {
          setPickupTime(time);
          setTimePickerVisible(false);
        }}
        onCancel={() => setTimePickerVisible(false)}
      />

      {/* Product picker modal */}
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
            <Ionicons
              name="search"
              size={16}
              color="#bbb"
              style={styles.searchIcon}
            />
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
                {productSearch
                  ? "No products match your search"
                  : "No products available"}
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
                  <View style={styles.productItemMain}>
                    <Text style={styles.productName}>{item.name}</Text>
                    {item.category ? (
                      <Text style={styles.productCategory}>
                        {item.category}
                      </Text>
                    ) : null}
                  </View>
                  {item.price != null ? (
                    <Text style={styles.productPrice}>
                      ${item.price.toFixed(2)}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
      </Modal>

      {/* Success toast */}
      <Toast visible={toastVisible} message="Pre-order created!" />
    </>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  required: {
    color: "#E53935",
  },
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
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  row2: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  toggle: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  togglePaid: {
    backgroundColor: "#43A047",
  },
  toggleNotPaid: {
    backgroundColor: "#E53935",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#aaa",
    letterSpacing: 0.5,
  },
  toggleTextActive: {
    color: "#fff",
  },
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
  dateButtonEmpty: {
    borderColor: "#e0e0e0",
  },
  dateButtonText: {
    fontSize: 14,
    color: "#1a1a1a",
    flex: 1,
  },
  dateButtonPlaceholder: {
    color: "#bbb",
  },
  lineItemBlock: {
    gap: 6,
    marginBottom: 8,
  },
  lineItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  productSelector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  productSelectorText: {
    fontSize: 14,
    color: "#1a1a1a",
    flex: 1,
  },
  productSelectorPlaceholder: {
    color: "#bbb",
  },
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
  itemNotesInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#555",
    marginLeft: 60,
  },
  addItemButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  addItemText: {
    fontSize: 14,
    color: "#8B6914",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#8B6914",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  modal: {
    flex: 1,
    backgroundColor: "#fff",
  },
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
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1a1a1a",
  },
  modalCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noProductsText: {
    fontSize: 15,
    color: "#bbb",
  },
  productItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  productItemMain: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontSize: 15,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  productCategory: {
    fontSize: 12,
    color: "#999",
  },
  productPrice: {
    fontSize: 14,
    color: "#8B6914",
    fontWeight: "600",
    marginLeft: 12,
  },
  separator: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 16,
  },
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
  toastText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
