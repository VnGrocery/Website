import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

// 5050 is the host port docker-compose publishes the API on. 8080 on the same
// host is the IPFS gateway, which answers requests but not these ones -- and
// 5000 is taken by macOS AirPlay Receiver.
export const DEFAULT_API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  `${window.location.protocol}//${window.location.hostname}:5050/v1`;

const SESSION_KEY = "vngrocery-admin-session";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSessionState] = useState(loadSession);

  useEffect(() => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, [session]);

  const value = useMemo(
    () => ({
      session,
      setSession(nextSession) {
        setSessionState({
          ...emptySession(),
          ...nextSession,
          apiBaseUrl: normalizeApiBase(nextSession?.apiBaseUrl || DEFAULT_API_BASE),
        });
      },
      clearSession() {
        setSessionState(emptySession());
      },
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return context;
}

export function RequireSession({ children }) {
  const { session } = useSession();
  if (!session.accessToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function normalizeApiBase(value) {
  return String(value || DEFAULT_API_BASE).replace(/\/$/, "");
}

export function emptySession() {
  return {
    apiBaseUrl: normalizeApiBase(DEFAULT_API_BASE),
    accessToken: "",
    refreshToken: "",
    userId: "",
    email: "",
    role: "",
  };
}

function loadSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return emptySession();
    }
    const parsed = JSON.parse(raw);
    return {
      ...emptySession(),
      ...parsed,
      apiBaseUrl: normalizeApiBase(parsed.apiBaseUrl || DEFAULT_API_BASE),
    };
  } catch {
    return emptySession();
  }
}
