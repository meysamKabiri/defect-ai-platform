export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.VITE_API_ORIGIN as string | undefined) ??
  "http://127.0.0.1:8000";

export const API_V1_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  `${API_BASE_URL}/api/v1`;
