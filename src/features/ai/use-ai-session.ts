import { useCallback, useEffect, useState } from "react";
import {
  clearStoredAiToken,
  getStoredAiToken,
  storeAiToken,
  validateAiSession,
  type AiSession,
} from "./ai-gateway-client";

export interface AiSessionState {
  token: string;
  session: AiSession | null;
  loading: boolean;
  error: string;
  login: (token: string) => Promise<AiSession>;
  logout: () => void;
  refresh: () => Promise<AiSession | null>;
}

export function useAiSession(): AiSessionState {
  const [token, setToken] = useState(() => getStoredAiToken());
  const [session, setSession] = useState<AiSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const currentToken = getStoredAiToken();
    setToken(currentToken);
    setError("");
    if (!currentToken) {
      setSession(null);
      return null;
    }

    setLoading(true);
    try {
      const nextSession = await validateAiSession(currentToken);
      setSession(nextSession);
      return nextSession;
    } catch (err) {
      const message = err instanceof Error ? err.message : "登录状态校验失败";
      setSession(null);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "ai-session-token" || event.key === "blog-pl-name") void refresh();
    };
    const handleTokenChange = () => {
      void refresh();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("ai-session-token-change", handleTokenChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("ai-session-token-change", handleTokenChange);
    };
  }, [refresh]);

  const login = useCallback(async (rawToken: string) => {
    const trimmed = rawToken.trim();
    if (!trimmed) throw new Error("请输入pl的token码");
    const nextSession = await validateAiSession(trimmed);
    storeAiToken(trimmed);
    setToken(trimmed);
    setSession(nextSession);
    setError("");
    return nextSession;
  }, []);

  const logout = useCallback(() => {
    clearStoredAiToken();
    setToken("");
    setSession(null);
    setError("");
  }, []);

  return { token, session, loading, error, login, logout, refresh };
}
