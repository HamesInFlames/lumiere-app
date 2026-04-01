import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../lib/api";

interface Channel {
  id: string;
  label: string;
}

export default function ChannelListScreen() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    const { data } = await api.get<Channel[]>("/api/channels");
    setChannels(data);
  }, []);

  useEffect(() => {
    fetchChannels()
      .catch((err) => {
        setError(err.response?.data?.message ?? "Failed to load channels");
      })
      .finally(() => setLoading(false));
  }, [fetchChannels]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    await fetchChannels().catch((err) => {
      setError(err.response?.data?.message ?? "Failed to load channels");
    });
    setRefreshing(false);
  }, [fetchChannels]);

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
        <Ionicons name="alert-circle-outline" size={48} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={channels}
      keyExtractor={(c) => c.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#8B6914"
        />
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.6}
          onPress={() =>
            router.push({
              pathname: "/channels/[id]",
              params: { id: item.id, label: item.label },
            })
          }
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={24}
            color="#8B6914"
          />
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Ionicons name="chatbubbles-outline" size={40} color="#ddd" />
          <Text style={styles.emptyText}>No channels available</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  list: {
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#1a1a1a",
    marginLeft: 12,
  },
  separator: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 52,
  },
  errorText: {
    fontSize: 15,
    color: "#E53935",
    marginTop: 12,
    textAlign: "center",
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: "#8B6914",
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#bbb",
  },
});
