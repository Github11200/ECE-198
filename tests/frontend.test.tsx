// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "../frontend/node_modules/@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import { LiveFeedbackProvider, useLiveFeedback } from "../frontend/src/lib/live-feedback";
import { useCloudHistory } from "../frontend/src/lib/use-cloud-history";
import { useTracker } from "../frontend/src/lib/use-tracker";
import sample from "./workout.json";
import ParticipantPortal from "../frontend/src/components/participant-portal";

const fake = vi.hoisted(() => ({ clients: [] as any[], subscriptions: [] as any[], request: vi.fn() }));
vi.mock("convex/browser", () => ({ ConvexClient: class {
  close = vi.fn();
  constructor(public url: string) { if (url === "invalid") throw new Error("Invalid URL"); fake.clients.push(this); }
  onUpdate(query: any, args: any, update: any, error: any) {
    const subscription = { query, args, update, error, stopped: false };
    fake.subscriptions.push(subscription);
    return vi.fn(() => subscription.stopped = true);
  }
} }));
vi.mock("../frontend/src/lib/tracker-api", async importOriginal => ({ ...await importOriginal(), trackerRequest: fake.request }));
vi.mock("../frontend/src/components/portal-shell", () => ({default: ({children}: any) => <main>{children}</main>}));
function latest(name: string, index?: number) {
  return fake.subscriptions.filter(s => !s.stopped && getFunctionName(s.query) === name &&
    (index === undefined || s.args.paginationOpts?.cursor === (index ? `cursor-${index}` : null))).at(-1);
}
function liveUpdate(value: any) { act(() => latest("feedback:live").update(value)); }
function connect(token = "read") {
  fireEvent.change(screen.getByLabelText("Feedback read token"), { target: { value: token } });
  fireEvent.click(screen.getByRole("button", {name: "Connect"}));
}
function LiveProbe() {
  const live = useLiveFeedback();
  return <output data-testid="live">{JSON.stringify({active: live.active?.id ?? null, connected: live.connected, loading: live.loading, error: live.error})}</output>;
}
function HistoryProbe({ participantId }: { participantId?: string }) {
  const history = useCloudHistory(participantId);
  return <><output data-testid="history">{JSON.stringify({ids: history.records.map(s => s.id), loading: history.loading, error: history.error})}</output>
    {history.hasMore && <button onClick={history.loadMore}>More</button>}</>;
}
const value = (id: string) => JSON.parse(screen.getByTestId(id).textContent!);
beforeEach(() => {
  fake.clients.length = 0; fake.subscriptions.length = 0; fake.request.mockReset();
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
  vi.useFakeTimers(); vi.setSystemTime(10_000);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("live subscription lifecycle", () => {
  it("does not construct a client or fetch without configuration and credentials", () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
    render(<LiveFeedbackProvider><LiveProbe /></LiveFeedbackProvider>);
    expect(fake.clients).toHaveLength(0); expect(value("live").connected).toBe(false);
    expect(value("live").error).toContain("NEXT_PUBLIC_CONVEX_URL");
  });
  it("subscribes with the entered token, applies pushed updates, and expires locally", () => {
    render(<LiveFeedbackProvider><LiveProbe /></LiveFeedbackProvider>); connect();
    expect(latest("feedback:live").args).toEqual({token: "read"});
    expect(value("live").loading).toBe(true);
    liveUpdate({updatedAt: Date.now(), dashboard: sample});
    expect(value("live").active).toBe(sample.id); expect(value("live").connected).toBe(true);
    act(() => vi.advanceTimersByTime(5500));
    expect(value("live").active).toBeNull(); expect(value("live").connected).toBe(false);
    expect(fake.clients).toHaveLength(1); expect(fake.subscriptions).toHaveLength(1);
    liveUpdate({updatedAt: Date.now(), dashboard: sample}); expect(value("live").active).toBe(sample.id);
    liveUpdate({updatedAt: Date.now(), dashboard: null}); expect(value("live").active).toBeNull();
  });
  it("reports query errors, accepts replacement credentials, and cleans subscriptions/timers", () => {
    const rendered = render(<LiveFeedbackProvider><LiveProbe /></LiveFeedbackProvider>); connect("bad");
    act(() => latest("feedback:live").error(new Error("Invalid feedback read token")));
    expect(value("live").loading).toBe(false); expect(value("live").error).toContain("Invalid");
    const old = latest("feedback:live"); connect("good");
    expect(old.stopped).toBe(true); expect(fake.clients[0].close).toHaveBeenCalledOnce();
    expect(latest("feedback:live").args.token).toBe("good");
    rendered.unmount(); expect(fake.subscriptions.every(s => s.stopped)).toBe(true);
    expect(fake.clients[1].close).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
  it("handles a malformed client URL without crashing the application", () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "invalid");
    render(<LiveFeedbackProvider><LiveProbe /></LiveFeedbackProvider>); connect();
    expect(value("live").error).toBe("Invalid URL");
  });
});

describe("reactive archive history", () => {
  it("loads paginated records, handles pushes, and removes duplicate page boundaries", () => {
    render(<LiveFeedbackProvider><HistoryProbe /></LiveFeedbackProvider>); connect();
    act(() => latest("archive:history").update({page: [sample], isDone: false, continueCursor: "cursor-1"}));
    fireEvent.click(screen.getByRole("button", {name: "More"}));
    const other = {...sample, id: "other"};
    act(() => latest("archive:history", 1).update({page: [sample, other], isDone: true, continueCursor: "end"}));
    expect(value("history").ids).toEqual([sample.id, "other"]);
    expect(screen.queryByRole("button", {name: "More"})).toBeNull();
    act(() => latest("archive:history", 0).update({page: [{...sample, id: "new"}, sample], isDone: false, continueCursor: "cursor-1"}));
    expect(value("history").ids).toEqual(["new", sample.id, "other"]);
  });
  it("switches participant scope and clears the previous person's results", () => {
    const rendered = render(<LiveFeedbackProvider><HistoryProbe participantId="P01" /></LiveFeedbackProvider>); connect();
    expect(latest("archive:personHistory").args.participantId).toBe("P01");
    act(() => latest("archive:personHistory").update({page: [sample], isDone: true, continueCursor: ""}));
    const old = latest("archive:personHistory");
    rendered.rerender(<LiveFeedbackProvider><HistoryProbe participantId="P27" /></LiveFeedbackProvider>);
    expect(old.stopped).toBe(true); expect(value("history").ids).toEqual([]);
    expect(latest("archive:personHistory").args.participantId).toBe("P27");
    act(() => latest("archive:personHistory").error(new Error("Offline")));
    expect(value("history").error).toBe("Offline");
  });
});

function TrackerProbe() {
  const tracker = useTracker();
  return <><output data-testid="tracker">{JSON.stringify({active: tracker.active?.id ?? null, ids: tracker.history.map(s=>s.id), busy: tracker.busy})}</output>
    <button onClick={() => void tracker.start({source:"camera", exercise:"squat", station:"Station 1", participant_ids:["P01"], targets:[8]})}>Start</button>
    <button onClick={() => void tracker.finish(sample.id)}>Finish</button></>;
}
it("keeps local commands but reads live state and history exclusively from Convex", async () => {
  fake.request.mockResolvedValue({exercises: []});
  render(<LiveFeedbackProvider><TrackerProbe /></LiveFeedbackProvider>); connect();
  await act(async () => { await Promise.resolve(); });
  liveUpdate({updatedAt: Date.now(), dashboard: sample});
  act(() => latest("archive:history").update({page: [sample], isDone: true, continueCursor: ""}));
  expect(value("tracker").active).toBe(sample.id); expect(value("tracker").ids).toEqual([sample.id]);
  fake.request.mockResolvedValue(sample);
  await act(async () => fireEvent.click(screen.getByRole("button", {name: "Start"})));
  await act(async () => fireEvent.click(screen.getByRole("button", {name: "Finish"})));
  await act(async () => { vi.advanceTimersByTime(6000); await Promise.resolve(); });
  const paths = fake.request.mock.calls.map(call => call[0]);
  expect(paths).toContain("/api/session/start"); expect(paths).toContain("/api/session/finish");
  expect(paths).not.toContain("/api/session"); expect(paths).not.toContain("/api/history");
  expect(value("tracker").busy).toBe(false);
});

it("renders real individual metrics and rep details instead of illustrative participant records", () => {
  render(<LiveFeedbackProvider><ParticipantPortal view="progress" /></LiveFeedbackProvider>); connect();
  const snapshot = structuredClone(sample);
  snapshot.participants = [{...snapshot.participants[0], reps:7, target:10, full:6, short:1,
    range_score:86, tracking_coverage:93, tracking_losses:2, discarded_attempts:1,
    issues:["Tracking was briefly lost"], rep_details:[{number:1,peak_angle:65,reached_range:true}]}];
  act(() => latest("archive:personHistory").update({page:[snapshot],isDone:true,continueCursor:""}));
  expect(screen.getByText("7 / 10")).toBeTruthy(); expect(screen.getByText("86%")).toBeTruthy();
  expect(screen.getByText("93%")).toBeTruthy(); expect(screen.getByText("65.00°")).toBeTruthy();
  expect(screen.getByText("Tracking was briefly lost")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Participant"), {target:{value:"P27"}});
  expect(latest("archive:personHistory").args.participantId).toBe("P27");
  expect(screen.queryByText("7 / 10")).toBeNull();
});
