"use client";

import { ConvexClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Workout } from "./tracker-api";

type Snapshot = { updatedAt: number; dashboard: Workout | null } | null;
type LiveState = { client: ConvexClient | null; token: string; active: Workout | null; loading: boolean; connected: boolean; error: string };
const LiveContext = createContext<LiveState>({ client: null, token: "", active: null, loading: false, connected: false, error: "" });
const liveQuery = makeFunctionReference<"query", { token: string }, Snapshot>("feedback:live");

export function LiveFeedbackProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ConvexClient | null>(null);
  const [token, setToken] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | undefined>(undefined);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  useEffect(() => {
    if (!url || !token) return;
    let client: ConvexClient;
    try { client = new ConvexClient(url); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid Convex URL"); return; }
    setClient(client);
    const unsubscribe = client.onUpdate(liveQuery, { token }, (value) => {
      setSnapshot(value);
      setError("");
      setNow(Date.now());
    }, (cause) => { setError(cause.message); setSnapshot(undefined); });
    // Local expiry only: this timer makes no network requests.
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => { clearInterval(timer); unsubscribe(); setClient(null); void client.close(); };
  }, [url, token]);
  const fresh = Boolean(snapshot && now - snapshot.updatedAt <= 5000);
  const message = !url ? "Live feedback requires NEXT_PUBLIC_CONVEX_URL and a rebuilt frontend."
    : !token ? "Enter the team's feedback read token to connect to live Convex feedback."
    : error || (snapshot === undefined ? "Connecting to Convex…" : !fresh ? "Waiting for the laptop feedback publisher." : "");
  return <LiveContext.Provider value={{
    client, token,
    active: fresh ? snapshot?.dashboard ?? null : null,
    loading: Boolean(url && token && snapshot === undefined && !error),
    connected: fresh, error: message,
  }}>
    {message && <div className="inline-notice" role="status">{message}
      {url && <form onSubmit={(event) => {
        event.preventDefault();
        const value = new FormData(event.currentTarget).get("token");
        setSnapshot(undefined); setError(""); setToken(String(value || ""));
      }}><label>Feedback read token <input name="token" type="password" required autoComplete="off" /></label> <button type="submit">Connect</button></form>}
    </div>}
    {children}
  </LiveContext.Provider>;
}

export function useLiveFeedback() { return useContext(LiveContext); }
