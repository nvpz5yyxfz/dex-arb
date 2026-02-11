import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'funding-arbitrage-starred';

export function useStarred() {
  const [starred, setStarred] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    return new Set();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...starred]));
    } catch {
      // ignore
    }
  }, [starred]);

  const toggleStar = useCallback((asset: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(asset)) {
        next.delete(asset);
      } else {
        next.add(asset);
      }
      return next;
    });
  }, []);

  const isStarred = useCallback(
    (asset: string) => starred.has(asset),
    [starred]
  );

  return { starred, toggleStar, isStarred };
}
