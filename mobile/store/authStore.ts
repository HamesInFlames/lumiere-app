import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import api from "../lib/api";
import { clearPushToken } from "../lib/notifications";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    try {
      await SecureStore.setItemAsync("auth_token", data.token);
    } catch {
      // SecureStore may not be available (e.g. web)
    }
    set({ token: data.token, user: data.user });
  },

  logout: async () => {
    await clearPushToken();
    try {
      await SecureStore.deleteItemAsync("auth_token");
    } catch {
      // SecureStore may not be available (e.g. web)
    }
    set({ user: null, token: null });
  },

  loadUser: async () => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      if (!token) {
        set({ isLoading: false });
        return;
      }
      set({ token });
      const { data } = await api.get("/api/auth/me");
      set({ user: data, isLoading: false });
    } catch {
      try {
        await SecureStore.deleteItemAsync("auth_token");
      } catch {
        // SecureStore may not be available (e.g. web)
      }
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
