const byId = (id) => document.getElementById(id);
const sources = {
  replay: { label: "Synthetic replay", help: "Runs sample motions for five seconds. No camera or wearable required." },
  camera: { label: "Live AlphaPose camera", help: "Starting a session opens a separate camera window with pose overlays on this laptop." },
  recording: { label: "AlphaPose JSON replay", help: "Start this session, then run the bridge with your exported COCO JSON." },
};
const defaultTargets = [2, 4, 1, 3, 2];
const targets = [...defaultTargets];
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
    const label = document.createElement("label");
    label.textContent = `Participant ${String(index + 1).padStart(2, "0")} target`;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "99";
    input.required = true;
    input.value = targets[index];
    input.addEventListener("input", () => { targets[index] = input.value; });
    label.append(input);
    byId("targets").append(label);
  }
}

function setupSource() {
  const source = byId("source").value;
  byId("source-help").textContent = sources[source].help;
  byId("start").textContent = source === "replay" ? "Start demo replay" : "Start session";
}

function showParticipant(person) {
  const available = person.angle !== null;
  byId("preview-title").textContent = person.label;
  byId("preview-reps").textContent = person.reps;
  byId("preview-target").textContent = `/ ${person.target} reps`;
  byId("preview-cue").textContent = person.cue;
  byId("preview-angle").textContent = available ? `Elbow angle ${person.angle}°` : "Elbow angle unavailable";
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
  card.querySelector(".seat").textContent = person.id.slice(1);
  card.querySelector(".name").textContent = person.label;
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
    selected = "P01";
  }
  active = session;
  byId("setup").hidden = Boolean(session);
  byId("monitor").hidden = !session;
  byId("source-badge").textContent = session ? sources[session.source].label.toUpperCase() : "SETUP";
  byId("camera-controls").hidden = session?.source !== "camera";
  if (!session) return;

  if (session.source === "camera") {
    const cameraState = session.camera || "closed";
    const messages = {
      starting: "Starting the camera and loading pose models. The preview window will open shortly.",
      open: "Camera window is open on this laptop. Close it to pause the camera, or end the session to finish.",
      closed: "Camera window is closed. Open it to resume this session.",
      error: "The camera stopped unexpectedly. Close other apps using the webcam, then reopen the window.",
    };
    byId("camera-status").textContent = messages[cameraState] || messages.error;
    byId("open-camera").textContent = cameraState === "open" ? "Restart camera window" : "Open camera window";
    byId("open-camera").disabled = busy || cameraState === "starting";
  }

  const visible = session.participants.filter((person) => person.angle !== null).length;
  const status = session.source === "replay"
    ? (session.replay_done ? "Replay complete. Save the session to open its results." : "Running generated pose frames.")
    : `${visible} of ${session.participants.length} seats have a clear arm view.`;
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
      : person.reps > person.target ? ["Above target", "watch"]
      : person.reps === person.target ? ["Target met", "good"]
      : person.last_range === "Short range" ? ["Check range", "watch"]
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

    const wrapper = document.createElement("div");
    wrapper.className = "table-scroll";
    const table = document.createElement("table");
    const header = table.createTHead().insertRow();
    for (const label of ["Participant", "Target", "Reps", "Full range", "Short range"]) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      header.append(th);
    }
    const body = table.createTBody();
    for (const person of session.participants.filter((entry) => !filter || filter === entry.id)) {
      const row = body.insertRow();
      for (const value of [person.label, person.target, person.reps, person.full, person.short]) {
        row.insertCell().textContent = value;
      }
    }
    wrapper.append(table);
    details.append(summary, wrapper);
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
byId("setup").addEventListener("submit", (event) => {
  event.preventDefault();
  changeSession(byId("start"), async () => {
    const values = [...byId("targets").querySelectorAll("input")].map((input) => input.valueAsNumber);
    renderMonitor(await request("/api/session/start", { source: byId("source").value, targets: values }));
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
byId("open-camera").addEventListener("click", () => {
  if (active?.source !== "camera") return;
  changeSession(byId("open-camera"), async () => {
    renderMonitor(await request("/api/camera/start", { session_id: active.id }));
  });
});
byId("live-tab").addEventListener("click", () => { alertMessage(""); view(false); });
byId("history-tab").addEventListener("click", () => { alertMessage(""); showHistory(); });
byId("history-filter").addEventListener("change", () => renderHistory());
setupTargets();
setupSource();
poll();
