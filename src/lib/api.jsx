import { createContext, useContext, useMemo } from "react";
import { normalizeApiBase, useSession } from "./session.jsx";

const ApiContext = createContext(null);

export function ApiProvider({ children }) {
  const { session, setSession, clearSession } = useSession();
  const api = useMemo(() => createApiClient(session, setSession, clearSession), [session, setSession, clearSession]);
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi() {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useApi must be used inside ApiProvider");
  }
  return context;
}

export function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    query.set(key, String(value));
  });
  return query.toString();
}

export async function requestJson(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData && options.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : isFormData ? options.body : JSON.stringify(options.body),
  });

  const text = await response.text();
  const payload = text ? safeJsonParse(text) : {};

  if (!response.ok) {
    const error = new Error(normalizeErrorMessage(payload, response.statusText));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function createApiClient(session, setSession, clearSession) {
  const requestWithSession = async (path, options = {}) => {
    const url = `${normalizeApiBase(session.apiBaseUrl)}${path}`;
    try {
      return await requestJson(url, {
        ...options,
        headers: {
          ...(session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
          ...(options.headers || {}),
        },
      });
    } catch (error) {
      if (
        error.status === 401 &&
        session.refreshToken &&
        !path.startsWith("/auth/login") &&
        !path.startsWith("/auth/refresh")
      ) {
        try {
          const refreshed = await requestJson(`${normalizeApiBase(session.apiBaseUrl)}/auth/refresh`, {
            method: "POST",
            body: { refreshToken: session.refreshToken },
          });
          const nextSession = {
            ...session,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken || session.refreshToken,
            userId: refreshed.userId || session.userId,
            email: refreshed.email || session.email,
          };
          setSession(nextSession);
          return requestJson(url, {
            ...options,
            headers: {
              Authorization: `Bearer ${nextSession.accessToken}`,
              ...(options.headers || {}),
            },
          });
        } catch (refreshError) {
          clearSession();
          throw refreshError;
        }
      }
      throw error;
    }
  };

  return {
    get(path, query) {
      const queryString = buildQuery(query);
      return requestWithSession(queryString ? `${path}?${queryString}` : path);
    },
    post(path, body, options = {}) {
      return requestWithSession(path, { ...options, method: "POST", body });
    },
    patch(path, body, options = {}) {
      return requestWithSession(path, { ...options, method: "PATCH", body });
    },
    put(path, body, options = {}) {
      return requestWithSession(path, { ...options, method: "PUT", body });
    },
    delete(path, options = {}) {
      return requestWithSession(path, { ...options, method: "DELETE" });
    },
    upload(path, formData, options = {}) {
      return requestWithSession(path, { ...options, method: "POST", body: formData });
    },
  };
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function normalizeErrorMessage(payload, fallback) {
  if (payload?.error) {
    return payload.error;
  }
  if (typeof payload?.raw === "string" && payload.raw.trim()) {
    return payload.raw.trim();
  }
  return fallback || "Request failed";
}
