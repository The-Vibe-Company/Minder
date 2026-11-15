"use client";
import { useRef, useState } from "react";
export function useTask() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function run(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      await task();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { busy, message, setMessage, run };
}
