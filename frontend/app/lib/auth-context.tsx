"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getToken, setToken } from "./session";
import { login, me, signup, type User } from "./api";

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  signupWithPassword: (
    email: string,
    name: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  async function refreshMe(activeToken: string) {
    const res = await me(activeToken);
    setUser(res.user);
  }

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    refreshMe(token)
      .catch(() => {
        clearToken();
        setTokenState(null);
        setUser(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      loading,
      loginWithPassword: async (email: string, password: string) => {
        const res = await login({ email, password });
        setToken(res.token);
        setTokenState(res.token);
        setUser(res.user);
      },
      signupWithPassword: async (
        email: string,
        name: string,
        password: string
      ) => {
        const res = await signup({ email, name, password });
        setToken(res.token);
        setTokenState(res.token);
        setUser(res.user);
      },
      logout: () => {
        clearToken();
        setTokenState(null);
        setUser(null);
      },
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
