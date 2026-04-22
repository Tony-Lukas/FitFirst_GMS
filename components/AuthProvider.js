"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "fitfirst_auth";

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ token: null, user: null, ready: false });

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      setAuth((current) => ({ ...current, ready: true }));
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setAuth({ ...parsed, ready: true });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      setAuth({ token: null, user: null, ready: true });
    }
  }, []);

  const value = useMemo(
    () => ({
      ...auth,
      setSession(session) {
        const next = { ...session, ready: true };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setAuth(next);
      },
      logout() {
        window.localStorage.removeItem(STORAGE_KEY);
        setAuth({ token: null, user: null, ready: true });
      },
    }),
    [auth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
