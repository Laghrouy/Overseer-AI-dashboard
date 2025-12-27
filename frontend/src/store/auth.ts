"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token?: string;
  email?: string;
  setToken: (value?: string) => void;
  setEmail: (value?: string) => void;
  clear: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: undefined,
      email: undefined,
      setToken: (value) => set({ token: value }),
      setEmail: (value) => set({ email: value }),
      clear: () => set({ token: undefined, email: undefined }),
      clearAuth: () => set({ token: undefined, email: undefined }),
    }),
    { name: "overseer-auth" }
  )
);
