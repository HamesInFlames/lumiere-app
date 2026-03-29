import { io, Socket } from "socket.io-client";
import * as SecureStore from "expo-secure-store";

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await SecureStore.getItemAsync("auth_token");

  socket = io(process.env.EXPO_PUBLIC_SOCKET_URL!, {
    auth: { token },
    transports: ["websocket"],
  });

  return socket;
}

export async function joinChannel(channelId: string) {
  const s = await getSocket();
  s.emit("join_channel", channelId);
}

export async function leaveChannel(channelId: string) {
  const s = await getSocket();
  s.emit("leave_channel", channelId);
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export { socket };
