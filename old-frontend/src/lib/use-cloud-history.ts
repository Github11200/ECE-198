"use client";

import { useEffect, useState } from "react";
import { makeFunctionReference } from "convex/server";
import { useLiveFeedback } from "./live-feedback";
import type { Workout } from "./tracker-api";

type Page = { page: Workout[]; isDone: boolean; continueCursor: string };
const historyQuery = makeFunctionReference<"query", { token: string; paginationOpts: { numItems: number; cursor: string | null } }, Page>("archive:history");
const personQuery = makeFunctionReference<"query", { token: string; participantId: string; paginationOpts: { numItems: number; cursor: string | null } }, Page>("archive:personHistory");

export function useCloudHistory(participantId?: string) {
  const { client, token } = useLiveFeedback();
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [pages, setPages] = useState<Record<number, Page>>({});
  const [error, setError] = useState("");
  useEffect(() => { setCursors([null]); setPages({}); setError(""); }, [client, participantId]);
  useEffect(() => {
    if (!client) return;
    let disposed = false;
    const stops = cursors.map((cursor, index) => {
      const update = (page: Page) => { if (!disposed) { setPages(old => ({ ...old, [index]: page })); setError(""); } };
      const fail = (cause: Error) => { if (!disposed) setError(cause.message); };
      const paginationOpts = { numItems: 20, cursor };
      return participantId
        ? client.onUpdate(personQuery, { token, participantId, paginationOpts }, update, fail)
        : client.onUpdate(historyQuery, { token, paginationOpts }, update, fail);
    });
    return () => { disposed = true; stops.forEach(stop => stop()); };
  }, [client, token, participantId, cursors]);
  const records = [...new Map(Object.keys(pages).sort((a,b) => Number(a)-Number(b))
    .flatMap(key => pages[Number(key)].page).map(session => [session.id, session])).values()];
  const last = pages[cursors.length - 1];
  return {
    records: client ? records : [], error,
    loading: Boolean(client && !last && !error),
    hasMore: Boolean(last && !last.isDone),
    loadMore: () => { if (last && !last.isDone) setCursors(old => [...old, last.continueCursor]); },
  };
}
