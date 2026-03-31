import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import api from "../../../lib/api";
import { getSocket, joinChannel, leaveChannel } from "../../../lib/socket";
import { useAuthStore } from "../../../store/authStore";
import MessageBubble, {
  type Message,
} from "../../../components/chat/MessageBubble";
import ChatInput from "../../../components/chat/ChatInput";
import OrderCard from "../../../components/chat/OrderCard";

const PAGE_SIZE = 30;

export default function ChannelViewScreen() {
  const { id, label } = useLocalSearchParams<{ id: string; label: string }>();
  const userId = useAuthStore((s) => s.user?.id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketListenerSet = useRef(false);

  const fetchMessages = useCallback(
    async (before?: string) => {
      const params: Record<string, string> = {};
      if (before) params.before = before;
      const { data } = await api.get<Message[]>(
        `/api/channels/${id}/messages`,
        { params }
      );
      if (data.length < PAGE_SIZE) setHasMore(false);
      return data;
    },
    [id]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchMessages();
        if (!cancelled) setMessages(data);
      } catch (err: any) {
        if (!cancelled)
          setError(err.response?.data?.message ?? "Failed to load messages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    joinChannel(id!);

    (async () => {
      const socket = await getSocket();
      if (socketListenerSet.current) return;
      socketListenerSet.current = true;

      socket.on("new_message", (msg: Message) => {
        if (msg.channelId === id) {
          setMessages((prev) => [msg, ...prev]);
        }
      });
    })();

    return () => {
      cancelled = true;
      leaveChannel(id!);
      (async () => {
        const socket = await getSocket();
        socket.off("new_message");
        socketListenerSet.current = false;
      })();
    };
  }, [id, fetchMessages]);

  const loadOlder = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = messages[messages.length - 1].id;
      const older = await fetchMessages(oldest);
      setMessages((prev) => [...prev, ...older]);
    } catch {
      // silently ignore pagination errors
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, messages, fetchMessages]);

  const handleSend = useCallback(
    async (content: string) => {
      await api.post(`/api/channels/${id}/messages`, {
        type: "text",
        content,
      });
    },
    [id]
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      if (item.type === "order_ref" && item.order_id) {
        return (
          <View style={styles.orderRow}>
            {item.senderId !== userId && (
              <Text style={styles.orderSender}>{item.senderName}</Text>
            )}
            <OrderCard orderId={item.order_id} />
          </View>
        );
      }
      return <MessageBubble message={item} isOwn={item.senderId === userId} />;
    },
    [userId]
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: label ?? "Chat" }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B6914" />
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: label ?? "Chat" }} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: label ?? "Chat" }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.listContent}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color="#8B6914"
                style={styles.paginationLoader}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No messages yet. Say something!
              </Text>
            </View>
          }
        />
        <ChatInput onSend={handleSend} />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  listContent: {
    paddingVertical: 8,
  },
  orderRow: {
    paddingHorizontal: 12,
    marginVertical: 3,
  },
  orderSender: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8B6914",
    marginBottom: 2,
    marginLeft: 4,
  },
  paginationLoader: {
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: "#999",
  },
  errorText: {
    fontSize: 15,
    color: "#E53935",
    textAlign: "center",
    padding: 24,
  },
});
