export const getCache = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

export const setCache = <T>(key: string, data: T) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {}
};

export const clearCache = (prefix?: string) => {
  if (typeof window === "undefined") return;
  if (!prefix) {
    sessionStorage.clear();
    return;
  }
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(prefix)) {
      sessionStorage.removeItem(key);
    }
  }
};
