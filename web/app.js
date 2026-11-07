const byId = (id) => document.getElementById(id);
const sources = {
  replay: { label: "Synthetic replay", help: "Runs sample motions for five seconds. No camera or wearable required." },
  camera: { label: "Live AlphaPose camera", help: "Start this session, then run the AlphaPose webcam bridge on this laptop." },
  recording: { label: "AlphaPose JSON replay", help: "Start this session, then run the bridge with your exported COCO JSON." },
};
const defaultTargets = [2, 4, 1, 3, 2];
const targets = [...defaultTargets];
const participantIds = Array.from({ length: 5 }, (_, index) => `P${String(index + 1).padStart(2, "0")}`);
let exercises = new Map();
const cards = new Map();
let active = null;
let selected = "P01";
let sessions = [];
let busy = false;
let revision = 0;
let connectionLost = false;

async function request(path, data) {
  const options = { signal: AbortSignal.timeout(3000) };
  if (data !== undefined) {
    options.method = "POST";
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(data);
  }
  const response = await fetch(path, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload;
}

function alertMessage(message) {
  byId("alert").textContent = message;
  byId("alert").hidden = !message;
}

function setupTargets() {
  byId("targets").replaceChildren();
  for (let index = 0; index < Number(byId("count").value); index += 1) {
    const group = document.createElement("div");
    group.className = "lane-setup";
    const title = document.createElement("strong");
    title.textContent = `Camera lane ${index + 1}`;
    const idLabel = document.createElement("label");
    idLabel.textContent = "Participant ID";
    const idInput = document.createElement("input");
    idInput.className = "participant-id";
    idInput.value = participantIds[index];
    idInput.pattern = "P(?:0[1-9]|[1-9][0-9])";
    idInput.maxLength = 3;
    idInput.required = true;
    idInput.setAttribute("aria-label", `Lane ${index + 1} participant ID`);
    idInput.addEventListener("input", () => { idInput.value = idInput.value.toUpperCase(); participantIds[index] = idInput.value; });
    idLabel.append(idInput);
    const label = document.createElement("label");
    label.textContent = "Rep target";
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "99";
    input.required = true;
    input.className = "rep-target";
    input.setAttribute("aria-label", `Lane ${index + 1} rep target`);
    input.value = targets[index];
    input.addEventListener("input", () => { targets[index] = input.value; });
    label.append(input);
    group.append(title, idLabel, label);
    byId("targets").append(group);
  }
}

function setupExercise() {
  const exercise = exercises.get(byId("exercise").value);
  if (!exercise) return;
  byId("exercise-help").textContent = exercise.help;
  byId("exercise-criteria").textContent = `Fixed demo angles: ${exercise.criteria}`;
  byId("exercise-category").textContent = exercise.category;
}

function setupSource() {
  const source = byId("source").value;
  byId("source-help").textContent = sources[source].help;
  byId("start").textContent = source === "replay" ? "Start demo replay" : "Start session";
}

function showParticipant(person) {
  const available = person.angle !== null;
  byId("preview-title").textContent = `${person.id} · ${person.label}`;
  byId("preview-reps").textContent = person.reps;
  byId("preview-target").textContent = `/ ${person.target} reps`;
  byId("preview-cue").textContent = person.cue;
  const angleLabel = active?.criteria?.angle_label || "Elbow angle";
  byId("preview-angle").textContent = available ? `${angleLabel}: ${person.angle}°` : `${angleLabel} unavailable`;
  byId("joint-diagram").setAttribute("aria-label", `Schematic of ${angleLabel.toLowerCase()}`);
  byId("preview-tracking").textContent = available
    ? `Last attempt: ${person.last_range || "none yet"}. Range score: ${person.range_score ?? "—"}${person.range_score === null ? "" : "%"}.`
    : (person.tracking_reason || "Waiting for a usable pose");
  byId("arm-segment").style.visibility = available ? "visible" : "hidden";
  byId("wrist").style.visibility = available ? "visible" : "hidden";
  if (available) {
    const radians = person.angle * Math.PI / 180;
    const x = 84 + 47 * Math.sin(radians);
    const y = 77 - 47 * Math.cos(radians);
    byId("arm-segment").setAttribute("x2", x);
    byId("arm-segment").setAttribute("y2", y);
    byId("wrist").setAttribute("cx", x);
    byId("wrist").setAttribute("cy", y);
  }
}

function buildCard(person) {
  const card = byId("participant-template").content.firstElementChild.cloneNode(true);
  card.querySelector(".seat").textContent = String(person.lane).padStart(2, "0");
  card.querySelector(".name").textContent = `${person.id} · ${person.label}`;
  card.querySelector("progress").setAttribute("aria-label", `${person.label} target progress`);
  card.addEventListener("click", () => {
    selected = person.id;
    renderMonitor(active);
  });
  byId("participants").append(card);
  cards.set(person.id, card);
  return card;
}

function renderMonitor(session) {
  if (active?.id !== session?.id) {
    cards.clear();
    byId("participants").replaceChildren();
    selected = session?.participants[0]?.id || "P01";
  }
  active = session;
  byId("setup").hidden = Boolean(session);
  byId("monitor").hidden = !session;
  byId("source-badge").textContent = session ? sources[session.source].label.toUpperCase() : "SETUP";
  if (!session) return;
  byId("monitor-title").textContent = session.exercise_label;
  byId("monitor-station").textContent = session.station;
  byId("monitor-criteria").textContent = session.criteria?.description || "";

  const visible = session.participants.filter((person) => person.angle !== null).length;
  const status = session.source === "replay"
    ? (session.replay_done ? "Replay complete. Save the session to open its results." : "Running generated pose frames.")
    : `${visible} of ${session.participants.length} lanes have a usable pose.`;
  if (byId("monitor-status").textContent !== status) byId("monitor-status").textContent = status;
  byId("roster-count").textContent = `${session.participants.length} seats`;
  for (const person of session.participants) {
    const card = cards.get(person.id) || buildCard(person);
    card.setAttribute("aria-pressed", String(person.id === selected));
    card.querySelector(".reps").textContent = `${person.reps} / ${person.target}`;
    card.querySelector(".cue").textContent = person.cue;
    const progress = card.querySelector("progress");
    progress.max = person.target;
    progress.value = person.reps;
    const state = card.querySelector(".state");
    const status = person.angle === null ? ["No clear view", "neutral"]
      : person.last_range === "Short range" ? ["Check range", "watch"]
      : person.reps > person.target ? ["Above target", "watch"]
      : person.reps === person.target ? ["Target met", "good"]
      : ["Tracking", "good"];
    state.textContent = status[0];
    state.className = `pill state ${status[1]}`;
    if (person.id === selected) showParticipant(person);
  }
}

function renderHistory(openId = null) {
  const filter = byId("history-filter").value;
  const visible = sessions.filter((session) =>
    !filter || session.participants.some((person) => person.id === filter));
  byId("history-count").textContent = `${visible.length} recent ${visible.length === 1 ? "session" : "sessions"}`;
  const history = byId("history");
  history.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement("p");
    empty.textContent = "No saved sessions for this view yet.";
    history.append(empty);
  }
  for (const [index, session] of visible.entries()) {
    const details = document.createElement("details");
    details.className = "history-item";
    details.open = openId ? session.id === openId : index === 0;
    const summary = document.createElement("summary");
    summary.textContent = new Date(session.finished_at).toLocaleString(undefined, {
      dateStyle: "medium", timeStyle: "short",
    });
    const source = document.createElement("span");
    source.className = "pill neutral";
    source.textContent = sources[session.source].label;
    summary.append(source);
    const exercise = document.createElement("span");
    exercise.className = "pill neutral";
    exercise.textContent = `${session.station} · ${session.exercise_label}`;
    summary.append(exercise);
    const rule = document.createElement("p");
    rule.className = "hint";
    rule.textContent = session.criteria?.description || "";
    const reportLink = document.createElement("a");
    reportLink.href = `/reports/${encodeURIComponent(session.id)}`;
    reportLink.target = "_blank";
    reportLink.rel = "noopener";
    reportLink.className = "report-link";
    reportLink.textContent = "Open workout report / print";

    const wrapper = document.createElement("div");
    wrapper.className = "table-scroll";
    const table = document.createElement("table");
    const header = table.createTHead().insertRow();
    for (const label of ["Participant", "Dose", "Full", "Short", "Range score", "Tracking", "Review"]) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      header.append(th);
    }
    const body = table.createTBody();
    for (const person of session.participants.filter((entry) => !filter || filter === entry.id)) {
      const row = body.insertRow();
      for (const value of [person.id, `${person.reps} / ${person.target}`, person.full, person.short,
        person.range_score == null ? "—" : `${person.range_score}%`,
        person.tracking_coverage == null ? "Not recorded" : `${person.tracking_coverage}%`]) {
        row.insertCell().textContent = value;
      }
      const review = document.createElement("details");
      const reviewTitle = document.createElement("summary");
      reviewTitle.textContent = person.issues?.length ? `${person.issues.length} review notes` : "Target and range met";
      const notes = document.createElement("ul");
      for (const issue of person.issues || []) {
        const item = document.createElement("li");
        item.textContent = issue;
        notes.append(item);
      }
      for (const rep of person.rep_details || []) {
        const item = document.createElement("li");
        item.textContent = `Rep ${rep.number}: peak ${rep.peak_angle.toFixed(2)}° — ${rep.reached_range ? "demo range reached" : "below demo range target"}`;
        notes.append(item);
      }
      review.append(reviewTitle, notes);
      row.insertCell().append(review);
    }
    wrapper.append(table);
    details.append(summary, rule, reportLink, wrapper);
    history.append(details);
  }
}

function view(history) {
  byId("live-view").hidden = history;
  byId("history-view").hidden = !history;
  byId(history ? "history-tab" : "live-tab").setAttribute("aria-current", "page");
  byId(history ? "live-tab" : "history-tab").removeAttribute("aria-current");
}

async function showHistory(openId) {
  view(true);
  try {
    ({ sessions } = await request("/api/history"));
    const currentFilter = byId("history-filter").value;
    const ids = [...new Set(sessions.flatMap((session) => session.participants.map((person) => person.id)))].sort();
    byId("history-filter").replaceChildren();
    for (const id of ["", ...ids]) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = id || "All participants";
      byId("history-filter").append(option);
    }
    byId("history-filter").value = ids.includes(currentFilter) ? currentFilter : "";
    renderHistory(openId);
  } catch (error) {
    alertMessage(error.message);
  }
}

async function changeSession(button, action) {
  if (busy) return;
  busy = true;
  revision += 1;
  button.disabled = true;
  alertMessage("");
  try {
    await action();
  } catch (error) {
    alertMessage(error.message);
  } finally {
    button.disabled = false;
    busy = false;
  }
}

async function poll() {
  const currentRevision = revision;
  if (!busy && !byId("live-view").hidden) {
    try {
      const { session } = await request("/api/session");
      if (!busy && revision === currentRevision) {
        if (connectionLost) alertMessage("");
        connectionLost = false;
        renderMonitor(session);
      }
    } catch {
      if (!busy && revision === currentRevision) {
        connectionLost = true;
        alertMessage("Waiting for the local server. Reconnecting automatically.");
      }
    }
  }
  setTimeout(poll, active ? 90 : 700);
}

byId("count").addEventListener("change", setupTargets);
byId("source").addEventListener("change", setupSource);
byId("exercise").addEventListener("change", setupExercise);
byId("setup").addEventListener("submit", (event) => {
  event.preventDefault();
  changeSession(byId("start"), async () => {
    const values = [...byId("targets").querySelectorAll(".rep-target")].map((input) => input.valueAsNumber);
    const ids = [...byId("targets").querySelectorAll(".participant-id")].map((input) => input.value.toUpperCase());
    renderMonitor(await request("/api/session/start", { source: byId("source").value,
      exercise: byId("exercise").value, station: byId("station").value,
      participant_ids: ids, targets: values }));
  });
});
byId("finish").addEventListener("click", () => {
  if (!active) return;
  changeSession(byId("finish"), async () => {
    const finished = await request("/api/session/finish", { session_id: active.id });
    renderMonitor(null);
    byId("history-filter").value = "";
    await showHistory(finished.id);
  });
});
byId("live-tab").addEventListener("click", () => { alertMessage(""); view(false); });
byId("history-tab").addEventListener("click", () => { alertMessage(""); showHistory(); });
byId("history-filter").addEventListener("change", () => renderHistory());
async function initialize() {
  setupTargets();
  setupSource();
  byId("start").disabled = true;
  try {
    const payload = await request("/api/exercises");
    exercises = new Map(payload.exercises.map((exercise) => [exercise.id, exercise]));
    byId("exercise").replaceChildren();
    for (const exercise of exercises.values()) {
      const option = document.createElement("option");
      option.value = exercise.id;
      option.textContent = exercise.label;
      byId("exercise").append(option);
    }
    setupExercise();
    byId("start").disabled = false;
  } catch (error) {
    alertMessage(`Could not load exercises: ${error.message}. Refresh after starting the server.`);
  }
  poll();
}
initialize();
