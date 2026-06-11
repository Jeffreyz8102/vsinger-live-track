import { useEffect, useState, useCallback } from "react";

const KEY = "vsinger-memory.attended.v1";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent("attended-changed"));
}

export function useAttended() {
  // Start empty to match SSR; hydrate from localStorage after mount.
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIds(read());
    setHydrated(true);
    const sync = () => setIds(read());
    window.addEventListener("attended-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("attended-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      write(next);
      return next;
    });
  }, []);

  const setMany = useCallback((updates: Record<string, boolean>) => {
    setIds((prev) => {
      const set = new Set(prev);
      for (const [id, v] of Object.entries(updates)) {
        if (v) set.add(id);
        else set.delete(id);
      }
      const next = Array.from(set);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    write([]);
    setIds([]);
  }, []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify({ attended: ids }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vsinger-memory.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [ids]);

  const importJson = useCallback(async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text);
    if (Array.isArray(data?.attended)) {
      write(data.attended);
      setIds(data.attended);
    }
  }, []);

  return { ids, hydrated, toggle, setMany, clear, exportJson, importJson };
}
