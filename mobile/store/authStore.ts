import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { api } from "@/services/api";
import type { User, TokenResponse } from "@/types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isHydrated: boolean;
  setHydrated: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  setTokens: (tokens: TokenResponse) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isHydrated: false,
      setHydrated: () => set({ isHydrated: true }),

      login: async (email, password) => {
        const tokens = await api.login(email, password);
        api.setToken(tokens.access_token);
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        });
        await get().loadUser();
      },

      register: async (firstName, lastName, email, password) => {
        await api.register({
          first_name: firstName,
          last_name: lastName,
          email,
          password,
        });
        await get().login(email, password);
      },

      logout: () => {
        api.setToken(null);
        set({ accessToken: null, refreshToken: null, user: null });
      },

      loadUser: async () => {
        const token = get().accessToken;
        if (!token) return;
        api.setToken(token);
        const user = await api.getMe();
        set({ user });
      },

      setUser: (user) => set({ user }),

      setTokens: (tokens) => {
        api.setToken(tokens.access_token);
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        });
      },
    }),
    {
      name: "smartguard-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
        if (state?.accessToken) {
          api.setToken(state.accessToken);
          state.loadUser().catch(() => state.logout());
        }
      },
    },
  ),
);
