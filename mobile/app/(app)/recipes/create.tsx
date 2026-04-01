import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Animated,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";

interface Category {
  id: string;
  name: string;
}

type Kitchen = "lumiere" | "tova" | "both";

const KITCHEN_OPTIONS: { value: Kitchen; label: string }[] = [
  { value: "lumiere", label: "Lumière" },
  { value: "tova", label: "Tova" },
  { value: "both", label: "Both" },
];

// Toast
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

export default function RecipeCreateScreen() {
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!editId;
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role ?? "");

  const [name, setName] = useState("");
  const [kitchen, setKitchen] = useState<Kitchen>("both");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [toastVisible, setToastVisible] = useState(false);

  // New category modal
  const [newCatModal, setNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSubmitting, setNewCatSubmitting] = useState(false);

  // Category picker modal
  const [catPickerOpen, setCatPickerOpen] = useState(false);

  // Redirect if not allowed
  useEffect(() => {
    if (role !== "owner" && role !== "kitchen_staff") {
      Alert.alert("Access Denied", "You don't have permission to create recipes.");
      router.back();
    }
  }, [role, router]);

  // Load categories + existing recipe (if editing)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<Category[]>("/api/recipes/categories");
        setCategories(data);
      } catch { /* ignore */ }

      if (isEditing) {
        try {
          const { data } = await api.get(`/api/recipes/${editId}`);
          setName(data.name ?? "");
          setKitchen(data.kitchen ?? "both");
          setCategoryId(data.category_id ?? null);
          setCategoryName(data.category_name ?? "");
          setIngredients(data.ingredients ?? "");
          setInstructions(data.instructions ?? "");
        } catch {
          Alert.alert("Error", "Failed to load recipe for editing");
          router.back();
        } finally {
          setLoadingExisting(false);
        }
      }
    })();
  }, [isEditing, editId, router]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Recipe name is required");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        kitchen,
        category_id: categoryId,
        ingredients: ingredients.trim() || null,
        instructions: instructions.trim() || null,
      };

      if (isEditing) {
        await api.patch(`/api/recipes/${editId}`, payload);
      } else {
        await api.post("/api/recipes", payload);
      }

      setToastVisible(true);
      setTimeout(() => {
        setToastVisible(false);
        router.back();
      }, 1800);
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to save recipe"
      );
    } finally {
      setSubmitting(false);
    }
  }, [name, kitchen, categoryId, ingredients, instructions, isEditing, editId, router]);

  const handleCreateCategory = useCallback(async () => {
    if (!newCatName.trim()) {
      Alert.alert("Required", "Category name is required");
      return;
    }
    setNewCatSubmitting(true);
    try {
      const { data } = await api.post("/api/recipes/categories", {
        name: newCatName.trim(),
      });
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryId(data.id);
      setCategoryName(data.name);
      setNewCatModal(false);
      setNewCatName("");
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Failed to create category"
      );
    } finally {
      setNewCatSubmitting(false);
    }
  }, [newCatName]);

  if (loadingExisting) {
    return (
      <>
        <Stack.Screen options={{ title: isEditing ? "Edit Recipe" : "New Recipe" }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B6914" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: isEditing ? "Edit Recipe" : "New Recipe" }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Recipe Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Chocolate Croissant"
              placeholderTextColor="#bbb"
              autoCapitalize="words"
            />
          </View>

          {/* Kitchen */}
          <View style={styles.field}>
            <Text style={styles.label}>Kitchen</Text>
            <View style={styles.kitchenToggle}>
              {KITCHEN_OPTIONS.map((opt) => {
                const active = kitchen === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.kitchenOption, active && styles.kitchenOptionActive]}
                    onPress={() => setKitchen(opt.value)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.kitchenOptionText,
                        active && styles.kitchenOptionTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.catRow}>
              <TouchableOpacity
                style={styles.catPicker}
                onPress={() => setCatPickerOpen(true)}
                activeOpacity={0.75}
              >
                <Text style={categoryId ? styles.catPickerText : styles.catPickerPlaceholder}>
                  {categoryId ? categoryName : "Select category…"}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#aaa" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.catAddBtn}
                onPress={() => setNewCatModal(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="add" size={20} color="#8B6914" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Ingredients */}
          <View style={styles.field}>
            <Text style={styles.label}>Ingredients</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={ingredients}
              onChangeText={setIngredients}
              placeholder="List ingredients, one per line…"
              placeholderTextColor="#bbb"
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Instructions */}
          <View style={styles.field}>
            <Text style={styles.label}>Instructions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Step-by-step instructions…"
              placeholderTextColor="#bbb"
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {isEditing ? "Save Changes" : "Create Recipe"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Category Picker Modal */}
        <Modal
          visible={catPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setCatPickerOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setCatPickerOpen(false)}
          >
            <View style={styles.pickerModal}>
              <Text style={styles.pickerTitle}>Select Category</Text>
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  setCategoryId(null);
                  setCategoryName("");
                  setCatPickerOpen(false);
                }}
              >
                <Text style={[styles.pickerItemText, !categoryId && styles.pickerItemActive]}>
                  None
                </Text>
              </TouchableOpacity>
              <FlatList
                data={categories}
                keyExtractor={(c) => c.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => {
                      setCategoryId(item.id);
                      setCategoryName(item.name);
                      setCatPickerOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        categoryId === item.id && styles.pickerItemActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {categoryId === item.id && (
                      <Ionicons name="checkmark" size={18} color="#8B6914" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.pickerEmpty}>No categories — create one first</Text>
                }
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* New Category Modal */}
        <Modal
          visible={newCatModal}
          transparent
          animationType="fade"
          onRequestClose={() => !newCatSubmitting && setNewCatModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.newCatModal}>
              <Text style={styles.pickerTitle}>New Category</Text>
              <TextInput
                style={styles.input}
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder='e.g. "Puff Pastry", "Cakes"'
                placeholderTextColor="#bbb"
                autoFocus
                autoCapitalize="words"
                onSubmitEditing={handleCreateCategory}
              />
              <View style={styles.newCatActions}>
                <TouchableOpacity
                  style={styles.newCatCancel}
                  onPress={() => setNewCatModal(false)}
                  disabled={newCatSubmitting}
                >
                  <Text style={styles.newCatCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.newCatSave, newCatSubmitting && { opacity: 0.6 }]}
                  onPress={handleCreateCategory}
                  disabled={newCatSubmitting}
                >
                  {newCatSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.newCatSaveText}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Toast
          visible={toastVisible}
          message={isEditing ? "Recipe updated" : "Recipe created"}
        />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1, backgroundColor: "#f8f8f8" },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8f8f8" },

  field: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
    minHeight: 120,
    paddingTop: 12,
  },

  // Kitchen toggle
  kitchenToggle: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  kitchenOption: { flex: 1, paddingVertical: 12, alignItems: "center" },
  kitchenOptionActive: { backgroundColor: "#8B6914" },
  kitchenOptionText: { fontSize: 14, fontWeight: "600", color: "#aaa" },
  kitchenOptionTextActive: { color: "#fff" },

  // Category
  catRow: { flexDirection: "row", gap: 8 },
  catPicker: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  catPickerText: { fontSize: 15, color: "#1a1a1a" },
  catPickerPlaceholder: { fontSize: 15, color: "#bbb" },
  catAddBtn: {
    width: 46,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#8B6914",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  // Submit
  submitBtn: {
    backgroundColor: "#8B6914",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#8B6914",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6, shadowOpacity: 0, elevation: 0 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  pickerModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    maxHeight: 400,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  pickerItemText: { fontSize: 15, color: "#1a1a1a" },
  pickerItemActive: { color: "#8B6914", fontWeight: "600" },
  pickerEmpty: { fontSize: 14, color: "#bbb", textAlign: "center", paddingVertical: 20 },

  newCatModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  newCatActions: { flexDirection: "row", gap: 10 },
  newCatCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  newCatCancelText: { fontSize: 15, fontWeight: "600", color: "#666" },
  newCatSave: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#8B6914",
    borderRadius: 10,
  },
  newCatSaveText: { color: "#fff", fontSize: 15, fontWeight: "600" },

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
