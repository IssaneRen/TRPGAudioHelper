import { useEffect, useState } from "react";
import { fetchWikiEntry, getCachedWikiEntry } from "@/features/wiki/wiki-entry-cache";
import type { WikiEntryRecord } from "@/types/wiki";

export function useWikiEntry(entryId: string | null) {
  const [entry, setEntry] = useState<WikiEntryRecord | null>(() =>
    entryId ? getCachedWikiEntry(entryId) ?? null : null
  );
  const [loading, setLoading] = useState(() => Boolean(entryId && !getCachedWikiEntry(entryId)));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!entryId) {
      setEntry(null);
      setLoading(false);
      setError(false);
      return;
    }

    const cached = getCachedWikiEntry(entryId);
    if (cached) {
      setEntry(cached);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchWikiEntry(entryId)
      .then((data) => {
        if (!cancelled) setEntry(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entryId]);

  return { entry, loading, error };
}
