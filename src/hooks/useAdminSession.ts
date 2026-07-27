"use client";

import { useCallback, useEffect, useState } from "react";

type AdminSessionStatus = "checking" | "authenticated" | "unauthenticated";

export function useAdminSession() {
  const [status, setStatus] = useState<AdminSessionStatus>("checking");

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/session", {
        cache: "no-store",
      });
      if (response.ok) {
        setStatus("authenticated");
      } else {
        setStatus("unauthenticated");
        if (window.location.pathname !== "/admin") {
          window.location.assign("/admin");
        }
      }
      return response.ok;
    } catch {
      setStatus("unauthenticated");
      return false;
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(checkSession);
    const interval = window.setInterval(() => {
      void checkSession();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [checkSession]);

  const login = useCallback(async (password: string) => {
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          error: payload.error || "Connexion admin impossible.",
        };
      }

      setStatus("authenticated");
      return { ok: true, error: "" };
    } catch {
      return { ok: false, error: "Connexion admin impossible." };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/admin/session", { method: "DELETE" });
    } finally {
      setStatus("unauthenticated");
      window.location.assign("/admin");
    }
  }, []);

  return {
    authenticated: status === "authenticated",
    checking: status === "checking",
    login,
    logout,
  };
}
