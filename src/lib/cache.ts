/**
 * In-Memory TanStack Query Caching
 * Automatically purges and keeps localStorage completely clean (0 bytes).
 */

if (typeof window !== "undefined") {
  try {
    // Purge any legacy stalk_cache_ entries to keep localStorage 100% clean
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("stalk_cache_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    const sessionKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("stalk_cache_")) {
        sessionKeys.push(key);
      }
    }
    sessionKeys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // Storage access restricted
  }
}

// Retained as clean no-ops so no external imports break
export const getCachedData = <T>(_key: string): T | undefined => {
  return undefined;
};

export const setCachedData = (_key: string, _data: any): void => {
  // Keeping localStorage 100% clean as requested
};



