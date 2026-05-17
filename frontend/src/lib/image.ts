import { API_BASE_URL } from "./config";

export function getImageUrl(path?: string | null) {
  if (!path) return "";

  if (path.startsWith("blob:") || path.startsWith("http")) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}
