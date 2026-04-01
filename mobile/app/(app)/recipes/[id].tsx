import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";

interface RecipeDetail {
  id: string;
  name: string;
  kitchen: "lumiere" | "tova" | "both";
  category_name?: string;
  ingredients?: string;
  instructions?: string;
  created_by?: string;
  creator_name?: string;
  created_at?: string;
  last_edited_by?: string;
  editor_name?: string;
  last_edited_at?: string;
}

const KITCHEN_LABEL: Record<string, string> = {
  lumiere: "Lumière Kitchen",
  tova: "Tova Kitchen",
  both: "Both Kitchens",
};

const KITCHEN_COLOR: Record<string, string> = {
  lumiere: "#5E35B1",
  tova: "#1565C0",
  both: "#8B6914",
};

const KITCHEN_BG: Record<string, string> = {
  lumiere: "#EDE7F6",
  tova: "#E3F2FD",
  both: "#FFF8E1",
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function recipeToText(r: RecipeDetail): string {
  let text = `📋 ${r.name}\n`;
  text += `🏠 ${KITCHEN_LABEL[r.kitchen] ?? r.kitchen}\n`;
  if (r.category_name) text += `🏷️ ${r.category_name}\n`;
  text += "\n";
  if (r.ingredients) {
    text += `--- Ingredients ---\n${r.ingredients}\n\n`;
  }
  if (r.instructions) {
    text += `--- Instructions ---\n${r.instructions}\n`;
  }
  return text;
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "";

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchRecipe = useCallback(async () => {
    const { data } = await api.get<RecipeDetail>(`/api/recipes/${id}`);
    setRecipe(data);
  }, [id]);

  useEffect(() => {
    fetchRecipe()
      .catch((err: unknown) => {
        setError(
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Failed to load recipe"
        );
      })
      .finally(() => setLoading(false));
  }, [fetchRecipe]);

  const canEdit =
    role === "owner" ||
    (recipe && String(recipe.created_by) === String(user?.id));
  const canDelete = canEdit;

  const handleCopy = useCallback(async () => {
    if (!recipe) return;
    await Clipboard.setStringAsync(recipeToText(recipe));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [recipe]);

  const handleShare = useCallback(async () => {
    if (!recipe) return;
    await Share.share({
      message: recipeToText(recipe),
      title: recipe.name,
    });
  }, [recipe]);

  const handleDelete = useCallback(() => {
    Alert.alert("Delete Recipe", "Are you sure you want to delete this recipe?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Confirm Delete",
            "This will permanently delete the recipe. This cannot be undone.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete Permanently",
                style: "destructive",
                onPress: async () => {
                  setDeleteLoading(true);
                  try {
                    await api.delete(`/api/recipes/${id}`);
                    router.back();
                  } catch (err: unknown) {
                    Alert.alert(
                      "Error",
                      (err as { response?: { data?: { error?: string } } })
                        ?.response?.data?.error ?? "Failed to delete recipe"
                    );
                  } finally {
                    setDeleteLoading(false);
                  }
                },
              },
            ]
          );
        },
      },
    ]);
  }, [id, router]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Recipe Details" }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B6914" />
        </View>
      </>
    );
  }

  if (error || !recipe) {
    return (
      <>
        <Stack.Screen options={{ title: "Recipe Details" }} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? "Recipe not found"}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setError(null);
              setLoading(true);
              fetchRecipe()
                .catch((e: unknown) =>
                  setError(
                    (e as { response?: { data?: { error?: string } } })
                      ?.response?.data?.error ?? "Failed to load recipe"
                  )
                )
                .finally(() => setLoading(false));
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const kitchenColor = KITCHEN_COLOR[recipe.kitchen] ?? "#8B6914";
  const kitchenBg = KITCHEN_BG[recipe.kitchen] ?? "#FFF8E1";

  return (
    <>
      <Stack.Screen
        options={{
          title: recipe.name,
          headerRight: () => (
            <View style={styles.headerRight}>
              {canEdit && (
                <TouchableOpacity
                  onPress={() => router.push(`/recipes/create?id=${id}`)}
                  style={styles.headerBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="pencil-outline" size={20} color="#8B6914" />
                </TouchableOpacity>
              )}
              {canDelete && (
                <TouchableOpacity
                  onPress={handleDelete}
                  style={styles.headerBtn}
                  disabled={deleteLoading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {deleteLoading ? (
                    <ActivityIndicator size="small" color="#E53935" />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color="#E53935" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Kitchen + Category badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: kitchenBg }]}>
            <Text style={[styles.badgeText, { color: kitchenColor }]}>
              {KITCHEN_LABEL[recipe.kitchen] ?? recipe.kitchen}
            </Text>
          </View>
          {recipe.category_name && (
            <View style={[styles.badge, { backgroundColor: "#f5f5f5" }]}>
              <Ionicons name="pricetag-outline" size={12} color="#888" />
              <Text style={[styles.badgeText, { color: "#666" }]}>
                {recipe.category_name}
              </Text>
            </View>
          )}
        </View>

        {/* Ingredients */}
        {recipe.ingredients && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ingredients</Text>
            <Text style={styles.cardBody}>{recipe.ingredients}</Text>
          </View>
        )}

        {/* Instructions */}
        {recipe.instructions && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Instructions</Text>
            <Text style={styles.cardBody}>{recipe.instructions}</Text>
          </View>
        )}

        {/* No content */}
        {!recipe.ingredients && !recipe.instructions && (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No content yet — tap the edit icon to add ingredients and instructions.</Text>
          </View>
        )}

        {/* Share actions */}
        <View style={styles.shareRow}>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleCopy}
            activeOpacity={0.75}
          >
            <Ionicons
              name={copied ? "checkmark-circle" : "clipboard-outline"}
              size={18}
              color={copied ? "#43A047" : "#8B6914"}
            />
            <Text style={[styles.shareBtnText, copied && { color: "#43A047" }]}>
              {copied ? "Copied!" : "Copy"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.75}
          >
            <Ionicons name="share-outline" size={18} color="#8B6914" />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Meta info */}
        <View style={styles.metaCard}>
          <Text style={styles.metaLine}>
            Created by {recipe.creator_name ?? "—"} · {formatDate(recipe.created_at)}
          </Text>
          {recipe.editor_name && (
            <Text style={styles.metaLine}>
              Last edited by {recipe.editor_name} · {formatDate(recipe.last_edited_at)}
            </Text>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f8f8f8" },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#f8f8f8" },
  errorText: { fontSize: 15, color: "#E53935", textAlign: "center", marginBottom: 12 },
  retryBtn: { backgroundColor: "#8B6914", paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  headerRight: { flexDirection: "row", gap: 4, alignItems: "center" },
  headerBtn: { padding: 6 },

  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  badgeText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
    gap: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8B6914",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardBody: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
  },
  emptyText: { fontSize: 14, color: "#bbb", textAlign: "center", paddingVertical: 8 },

  shareRow: {
    flexDirection: "row",
    gap: 10,
  },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8B6914",
  },

  metaCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
    gap: 4,
  },
  metaLine: { fontSize: 12, color: "#aaa" },
});
