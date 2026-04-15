import { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

interface Props {
  onSend: (text: string) => Promise<void>;
  onSendImage: (uri: string) => Promise<void>;
}

export default function ChatInput({ onSend, onSendImage }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText("");
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = () => {
    if (sending) return;
    Alert.alert("Send Image", undefined, [
      {
        text: "Take Photo",
        onPress: async () => {
          setSending(true);
          try {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: "images",
              quality: 0.7,
              allowsEditing: true,
            });
            if (!result.canceled) {
              await onSendImage(result.assets[0].uri);
            }
          } finally {
            setSending(false);
          }
        },
      },
      {
        text: "Choose from Library",
        onPress: async () => {
          setSending(true);
          try {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: "images",
              quality: 0.7,
              allowsEditing: true,
            });
            if (!result.canceled) {
              await onSendImage(result.assets[0].uri);
            }
          } finally {
            setSending(false);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.imageBtn}
        onPress={handlePickImage}
        disabled={sending}
        activeOpacity={0.7}
      >
        <Ionicons name="image-outline" size={24} color="#8B6914" />
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="Type a message..."
        placeholderTextColor="#999"
        value={text}
        onChangeText={setText}
        multiline
        maxLength={2000}
        editable={!sending}
      />
      <TouchableOpacity
        style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={!text.trim() || sending}
        activeOpacity={0.7}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="send" size={20} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1a1a1a",
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#8B6914",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  imageBtn: {
    justifyContent: "center",
    alignItems: "center",
    paddingRight: 8,
    height: 40,
  },
});
