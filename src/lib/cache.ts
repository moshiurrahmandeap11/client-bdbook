if (typeof window !== "undefined") {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("stalk_cache_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

/**
 * Fast client-side persistent cache utility for instant page hydration
 * Uses localStorage so data persists across browser restarts and page reloads.
 */

export const getCachedData = <T>(key: string): T | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    const item =
      localStorage.getItem(`stalk_cache_${key}`) ||
      sessionStorage.getItem(`stalk_cache_${key}`);
    return item ? (JSON.parse(item) as T) : undefined;
  } catch {
    return undefined;
  }
};

export const setCachedData = (key: string, data: any): void => {
  if (typeof window === "undefined" || data === undefined || data === null) return;
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(`stalk_cache_${key}`, serialized);
    sessionStorage.setItem(`stalk_cache_${key}`, serialized);
  } catch {
    try {
      sessionStorage.setItem(`stalk_cache_${key}`, JSON.stringify(data));
    } catch {
      // Storage full or private mode
    }
  }
};

