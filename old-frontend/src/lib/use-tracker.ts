"use client";

import { useEffect, useRef, useState } from "react";
import { useCloudHistory } from "./use-cloud-history";
import { useLiveFeedback } from "./live-feedback";
import { trackerRequest, type Exercise, type SessionSetup, type Workout } from "./tracker-api";

export function useTracker() {
  const live = useLiveFeedback();
  const cloudHistory = useCloudHistory();
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
          const metadata = Date.now() >= metadataDue
            ? await trackerRequest<{ exercises: Exercise[] }>("/api/exercises") : null;
          if (!disposed && !changing.current && revision.current === observedRevision) {
            interval = 5000;
            if (metadata) {
              setExercises(metadata.exercises);
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


      setConnected(true);
      return result;
    } finally {
      changing.current = false;
      setBusy(false);
    }
  }

  return {
    active: live.active, history: cloudHistory.records, exercises, loading: loading || live.loading,
    historyHasMore: cloudHistory.hasMore, loadMoreHistory: cloudHistory.loadMore,
    connected, error: error || cloudHistory.error || live.error, busy,
    start: (setup: SessionSetup) => change("/api/session/start", setup, false),
    finish: (sessionId: string) => change("/api/session/finish", { session_id: sessionId }, true),
  };
}
