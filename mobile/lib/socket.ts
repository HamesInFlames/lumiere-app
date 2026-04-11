import { io, Socket } from "socket.io-client";
import * as SecureStore from "expo-secure-store";

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  // If socket exists but is still connecting, wait for it
  if (socket && !socket.connected) {
    return new Promise((resolve) => {
      socket!.once("connect", () => resolve(socket!));
      // Fallback if already connecting and fires before listener
      setTimeout(() => resolve(socket!), 2000);
    });
  }

  const token = await SecureStore.getItemAsync("auth_token");

  socket = io(process.env.EXPO_PUBLIC_SOCKET_URL!, {
    auth: { token },
    transports: ["websocket"],
  });

  return new Promise((resolve) => {
    socket!.once("connect", () => resolve(socket!));
    // Fallback timeout so we don't hang forever
    setTimeout(() => resolve(socket!), 3000);
  });
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
