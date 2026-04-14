import { createContext, useContext, useMemo } from "react";
import { normalizeApiBase, useSession } from "./session.jsx";

const ApiContext = createContext(null);
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_RETRY_DELAY_MS = 400;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 502, 503, 504]);

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
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const retryCount = Math.max(0, Number(options.retryCount || 0));
  const retryDelayMs = Math.max(0, Number(options.retryDelayMs || DEFAULT_RETRY_DELAY_MS));

  let lastError;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await requestJsonOnce(url, { ...options, timeoutMs });
    } catch (error) {
      lastError = error;
      if (attempt >= retryCount || !shouldRetryRequest(error, options.method, options.retryUnsafe)) {
        throw error;
      }
      await wait(retryDelayMs * (attempt + 1));
    }
  }

  throw lastError;
}

async function requestJsonOnce(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData && options.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? window.setTimeout(() => controller.abort(), Number(options.timeoutMs || DEFAULT_TIMEOUT_MS)) : null;

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : isFormData ? options.body : JSON.stringify(options.body),
      signal: controller?.signal,
    });

    const text = await response.text();
    const payload = text ? safeJsonParse(text) : {};

    if (!response.ok) {
      const error = new Error(normalizeErrorMessage(payload, response.statusText));
      error.name = "HttpError";
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error("Yeu cau qua thoi gian cho phep. Vui long thu lai sau it giay.");
      timeoutError.name = "TimeoutError";
      timeoutError.status = 408;
      throw timeoutError;
    }
    throw error;
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
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
            timeoutMs: options.timeoutMs,
          });
          const nextSession = {
            ...session,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken || session.refreshToken,
            userId: refreshed.userId || session.userId,
            email: refreshed.email || session.email,
            role: refreshed.role || session.role,
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
    get(path, query, options = {}) {
      const queryString = buildQuery(query);
      return requestWithSession(queryString ? `${path}?${queryString}` : path, { ...options, method: "GET", retryCount: options.retryCount ?? 1 });
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

function shouldRetryRequest(error, method, retryUnsafe = false) {
  const normalizedMethod = String(method || "GET").toUpperCase();
  const safeMethod = ["GET", "HEAD", "OPTIONS"].includes(normalizedMethod);
  if (!safeMethod && !retryUnsafe) {
    return false;
  }
  if (!error) {
    return false;
  }
  if (error.name === "TimeoutError") {
    return true;
  }
  if (typeof error.status === "number" && RETRYABLE_STATUSES.has(error.status)) {
    return true;
  }
  return false;
}

function wait(delayMs) {
  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}
