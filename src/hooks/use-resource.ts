"use client";
import { useCallback, useEffect, useState } from "react";
export async function request<T = Record<string, unknown>>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : "Une erreur est survenue. Réessayez.",
    );
  return data;
}
export function useResource<T>(url: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      setData(await request<T>(url));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [url]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);
  // Optimistic edits: change the local copy now, the next refresh brings the server's back.
  const mutate = useCallback(
    (fn: (current: T) => T) => setData((d) => (d === undefined ? d : fn(d))),
    [],
  );
  return { data, error, refresh, mutate };
}
