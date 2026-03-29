import { View, Text, Image, StyleSheet } from "react-native";

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  type: "text" | "image" | "order_ref";
  content: string;
  createdAt: string;
  orderId?: string;
}

interface Props {
  message: Message;
  isOwn: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message, isOwn }: Props) {
  return (
    <View
      style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}
    >
      <View
        style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
      >
        {!isOwn && <Text style={styles.sender}>{message.senderName}</Text>}

        {message.type === "image" ? (
          <Image
            source={{ uri: message.content }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <Text style={[styles.content, isOwn && styles.contentOwn]}>
            {message.content}
          </Text>
        )}

        <Text style={[styles.time, isOwn && styles.timeOwn]}>
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    marginVertical: 3,
  },
  rowOwn: {
    alignItems: "flex-end",
  },
  rowOther: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
  },
  bubbleOwn: {
    backgroundColor: "#8B6914",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#f0f0f0",
    borderBottomLeftRadius: 4,
  },
  sender: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8B6914",
    marginBottom: 2,
  },
  content: {
    fontSize: 15,
    lineHeight: 20,
    color: "#1a1a1a",
  },
  contentOwn: {
    color: "#fff",
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginVertical: 4,
  },
  time: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeOwn: {
    color: "rgba(255,255,255,0.7)",
  },
});
