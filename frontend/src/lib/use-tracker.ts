"use client";

import { useEffect, useRef, useState } from "react";
import { trackerRequest, type Exercise, type SessionSetup, type Workout } from "./tracker-api";

export function useTracker() {
  const [active, setActive] = useState<Workout | null>(null);
  const [history, setHistory] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const changing = useRef(false);
  const revision = useRef(0);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    let metadataDue = 0;
    let interval = 700;
    async function poll() {
      if (!changing.current) {
        const observedRevision = revision.current;
        try {
          const [current, metadata] = await Promise.all([
            trackerRequest<{ session: Workout | null }>("/api/session"),
            Date.now() >= metadataDue ? Promise.all([
              trackerRequest<{ exercises: Exercise[] }>("/api/exercises"),
              trackerRequest<{ sessions: Workout[] }>("/api/history"),
            ]) : Promise.resolve(null),
          ]);
          if (!disposed && !changing.current && revision.current === observedRevision) {
            setActive(current.session);
            interval = current.session ? 120 : 700;
            if (metadata) {
              setExercises(metadata[0].exercises);
              setHistory(metadata[1].sessions);
              metadataDue = Date.now() + 5000;
            }
            setConnected(true);
            setError("");
          }
        } catch (cause) {
          if (!disposed && revision.current === observedRevision && !changing.current) {
            setConnected(false);
            setError(cause instanceof Error ? cause.message : "Waiting for the tracker server.");
            interval = 1000;
          }
        } finally {
          if (!disposed) setLoading(false);
        }
      }
      if (!disposed) timer = setTimeout(poll, interval);
    }
    void poll();
    return () => { disposed = true; clearTimeout(timer); };
  }, []);

  async function change(path: string, body: unknown, finished: boolean) {
    if (changing.current) throw new Error("A session request is already in progress.");
    changing.current = true;
    revision.current += 1;
    setBusy(true);
    try {
      const result = await trackerRequest<Workout>(path, body);
      setActive(finished ? null : result);
      if (finished) setHistory((current) => [result, ...current.filter(s => s.id !== result.id)].slice(0, 30));
      setConnected(true);
      return result;
    } finally {
      changing.current = false;
      setBusy(false);
    }
  }

  return {
    active, history, exercises, loading, connected, error, busy,
    start: (setup: SessionSetup) => change("/api/session/start", setup, false),
    finish: (sessionId: string) => change("/api/session/finish", { session_id: sessionId }, true),
  };
}
