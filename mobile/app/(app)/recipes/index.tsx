import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";

interface Recipe {
  id: string;
  name: string;
  kitchen: "lumiere" | "tova" | "both";
  category_id?: string;
  category_name?: string;
  creator_name?: string;
  ingredients?: string;
  created_at?: string;
}

interface Category {
  id: string;
  name: string;
}

type KitchenFilter = "all" | "lumiere" | "tova";

const KITCHEN_LABEL: Record<string, string> = {
  lumiere: "Lumière",
  tova: "Tova",
  both: "Both",
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

function RecipeRow({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  const kitchenColor = KITCHEN_COLOR[recipe.kitchen] ?? "#8B6914";
  const kitchenBg = KITCHEN_BG[recipe.kitchen] ?? "#FFF8E1";

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowTop}>
        <Text style={styles.rowName} numberOfLines={1}>
          {recipe.name}
        </Text>
        <View style={[styles.kitchenChip, { backgroundColor: kitchenBg }]}>
          <Text style={[styles.kitchenChipText, { color: kitchenColor }]}>
            {KITCHEN_LABEL[recipe.kitchen] ?? recipe.kitchen}
          </Text>
        </View>
      </View>
      <View style={styles.rowBottom}>
        {recipe.category_name ? (
          <View style={styles.categoryTag}>
            <Ionicons name="pricetag-outline" size={11} color="#aaa" />
            <Text style={styles.rowMeta}>{recipe.category_name}</Text>
          </View>
        ) : (
          <Text style={styles.rowMeta}>Uncategorized</Text>
        )}
        {recipe.creator_name && (
          <Text style={styles.rowMetaRight}>by {recipe.creator_name}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function RecipesScreen() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role ?? "");

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [kitchenFilter, setKitchenFilter] = useState<KitchenFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const canCreate = role === "owner" || role === "kitchen_staff";

  const fetchData = useCallback(async () => {
    const [recipesRes, catsRes] = await Promise.all([
      api.get("/api/recipes", {
        params: {
          kitchen: kitchenFilter !== "all" ? kitchenFilter : undefined,
          category: categoryFilter ?? undefined,
        },
      }),
      api.get("/api/recipes/categories"),
    ]);
    setRecipes(recipesRes.data);
    setCategories(catsRes.data);
  }, [kitchenFilter, categoryFilter]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchData()
      .catch((err: unknown) => {
        setError(
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Failed to load recipes"
        );
      })
      .finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData().catch(() => {});
    setRefreshing(false);
  }, [fetchData]);

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return recipes;
    const q = search.toLowerCase();
    return recipes.filter((r) => r.name.toLowerCase().includes(q));
  }, [recipes, search]);

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
        <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#aaa" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search recipes…"
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#ccc" />
          </TouchableOpacity>
        )}
      </View>

      {/* Kitchen filter */}
      <View style={styles.filterRow}>
        {(["all", "lumiere", "tova"] as KitchenFilter[]).map((k) => {
          const active = kitchenFilter === k;
          return (
            <TouchableOpacity
              key={k}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setKitchenFilter(k)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {k === "all" ? "All" : KITCHEN_LABEL[k]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Category filter */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              !categoryFilter && styles.categoryChipActive,
            ]}
            onPress={() => setCategoryFilter(null)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.categoryChipText,
                !categoryFilter && styles.categoryChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => {
            const active = categoryFilter === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setCategoryFilter(active ? null : cat.id)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    active && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Recipe list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RecipeRow
            recipe={item}
            onPress={() => router.push(`/recipes/${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B6914"
          />
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="book-outline" size={40} color="#ddd" />
            <Text style={styles.emptyText}>
              {search ? "No recipes match your search" : "No recipes yet"}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      {canCreate && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/recipes/create")}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorText: { fontSize: 15, color: "#E53935", textAlign: "center", marginBottom: 12 },
  retryBtn: { backgroundColor: "#8B6914", paddingHorizontal: 20, paddingVertical: 9, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1a1a1a",
    paddingVertical: 0,
  },

  // Kitchen filter
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  filterChipActive: {
    backgroundColor: "#8B6914",
    borderColor: "#8B6914",
  },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#999" },
  filterChipTextActive: { color: "#fff" },

  // Category filter
  categoryRow: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  categoryChipActive: {
    backgroundColor: "#FFF8E1",
    borderColor: "#8B6914",
  },
  categoryChipText: { fontSize: 12, fontWeight: "600", color: "#aaa" },
  categoryChipTextActive: { color: "#8B6914" },

  // List
  listContent: { paddingBottom: 90 },
  separator: { height: 1, backgroundColor: "#f0f0f0" },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: "#bbb" },

  // Row
  row: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
    marginRight: 10,
  },
  kitchenChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  kitchenChipText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowMeta: { fontSize: 12, color: "#888" },
  rowMetaRight: { fontSize: 12, color: "#aaa" },

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
});
