"use client";

import { create } from "zustand";
import { api } from "@/lib/api-client";
import { DW_TOKEN_KEY, DW_TOKEN_TS_KEY } from "@/hooks/use-drivewealth";
import type { AuthUser, LoginResponse } from "@/lib/types";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastActivity: number;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  heartbeat: () => void;
  /** Keep this session on a fresh token (a password change ends the older ones, MU2). */
  setToken: (token: string) => void;
}

function storeToken(token: string) {
  localStorage.setItem("access_token", token);
  localStorage.setItem("refresh_token", token);
  // Set cookie so Next.js middleware can read the token server-side
  document.cookie = `access_token=${token}; path=/; max-age=${8 * 60 * 60}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity
const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours absolute

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  lastActivity: Date.now(),

  login: async (username: string, password: string) => {
    const data = await api.post<LoginResponse>("/api/v1/auth/login", {
      username,
      password,
    });
    storeToken(data.access_token);
    localStorage.setItem("login_time", String(Date.now()));
    set({
      user: data.user,
      isAuthenticated: true,
      isLoading: false,
      lastActivity: Date.now(),
    });
  },

  logout: async () => {
    try {
      await api.post("/api/v1/auth/logout");
    } catch {
      // ignore — token may already be invalid
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("login_time");
    localStorage.removeItem(DW_TOKEN_KEY);
    localStorage.removeItem(DW_TOKEN_TS_KEY);
    document.cookie = "access_token=; path=/; max-age=0";
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    // Already authenticated in this session — no need to re-verify
    if (get().isAuthenticated && get().user) {
      set({ isLoading: false });
      return;
    }

    set({ isLoading: true });

    const token = localStorage.getItem("access_token");
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    // Check absolute timeout
    const loginTime = Number(localStorage.getItem("login_time") || "0");
    if (Date.now() - loginTime > ABSOLUTE_TIMEOUT_MS) {
      await get().logout();
      return;
    }
    // Check inactivity timeout
    if (Date.now() - get().lastActivity > SESSION_TIMEOUT_MS) {
      await get().logout();
      return;
    }
    // Token exists and hasn't timed out — verify with backend
    try {
      const user = await api.get<AuthUser>("/api/v1/auth/me");
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      // Backend unreachable or token invalid — require fresh login
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("login_time");
      document.cookie = "access_token=; path=/; max-age=0";
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  heartbeat: () => {
    set({ lastActivity: Date.now() });
  },

  setToken: (token: string) => storeToken(token),
}));
