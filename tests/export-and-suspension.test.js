const assert = require("node:assert/strict");
const test = require("node:test");
const Module = require("node:module");

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === "obsidian") {
    class Empty {}
    return {
      Plugin: Empty,
      ItemView: Empty,
      PluginSettingTab: Empty,
      FuzzySuggestModal: Empty,
      Setting: Empty,
      Notice: Empty,
      requestUrl: async () => ({}),
      normalizePath: (value) => value
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const CrispDshPlugin = require("../main.js");
Module._load = originalLoad;

test("selectExportableSession prefers the latest nonblank session for this vault", () => {
  const { selectExportableSession } = CrispDshPlugin.__test;
  const session = selectExportableSession([
    { sessionId: "blank", blank: true, updatedAt: 30, cwd: "/vault" },
    { sessionId: "other", blank: false, updatedAt: 40, cwd: "/other" },
    { sessionId: "older", blank: false, updatedAt: 10, cwd: "/vault" },
    { sessionId: "latest", blank: false, updatedAt: 20, cwd: "/vault" }
  ], "/vault");

  assert.equal(session.sessionId, "latest");
});

test("selectExportableSession refuses a session from another vault", () => {
  const { selectExportableSession } = CrispDshPlugin.__test;
  const session = selectExportableSession([
    { sessionId: "other", blank: false, updatedAt: 40, cwd: "/other" }
  ], "/vault");

  assert.equal(session, null);
});

test("listExportableSessions returns relevant sessions newest first and normalizes trailing slashes", () => {
  const { listExportableSessions } = CrispDshPlugin.__test;
  const sessions = listExportableSessions([
    { sessionId: "blank", blank: true, updatedAt: 50, cwd: "/vault" },
    { sessionId: "other", blank: false, updatedAt: 40, cwd: "/other" },
    { sessionId: "older", blank: false, updatedAt: 10, cwd: "/vault/" },
    { sessionId: "latest", blank: false, updatedAt: 30, cwd: "/vault" }
  ], "/vault/");

  assert.deepEqual(sessions.map((session) => session.sessionId), ["latest", "older"]);
});

test("normalizeAllowedServerUrl accepts loopback hosts by default", () => {
  const { normalizeAllowedServerUrl } = CrispDshPlugin.__test;

  assert.equal(normalizeAllowedServerUrl("127.0.0.1:3080", false), "http://127.0.0.1:3080/");
  assert.equal(normalizeAllowedServerUrl("http://localhost:3080", false), "http://localhost:3080/");
  assert.equal(normalizeAllowedServerUrl("http://[::1]:3080", false), "http://[::1]:3080/");
});

test("normalizeAllowedServerUrl rejects remote hosts unless explicitly enabled", () => {
  const { normalizeAllowedServerUrl } = CrispDshPlugin.__test;

  assert.throws(
    () => normalizeAllowedServerUrl("https://dsh.example.com", false),
    /仅允许本机 DSH 服务/
  );
  assert.equal(
    normalizeAllowedServerUrl("https://dsh.example.com", true),
    "https://dsh.example.com/"
  );
});

test("formatSessionTranscript exports only real user and assistant messages", () => {
  const { formatSessionTranscript } = CrispDshPlugin.__test;
  const transcript = formatSessionTranscript([
    { event: { type: "user/message", data: { source: { kind: "agent-instructions" }, content: [{ type: "text", text: "private system prompt" }] } } },
    { event: { type: "user/message", data: { source: { kind: "user" }, content: [{ type: "text", text: "Explain this note" }] } } },
    { event: { type: "assistant/message", data: { content: [{ type: "text", text: "Here is the analysis." }] } } }
  ]);

  assert.match(transcript, /## 用户\n\nExplain this note/);
  assert.match(transcript, /## Agent\n\nHere is the analysis\./);
  assert.doesNotMatch(transcript, /private system prompt/);
});

test("buildResearchNote emits routable self-media research metadata", () => {
  const { buildResearchNote } = CrispDshPlugin.__test;
  const note = buildResearchNote({
    session: { sessionId: "session-123", title: "Plugin review" },
    transcript: "## 用户\n\nHello",
    serverUrl: "http://127.0.0.1:3080",
    createdAt: new Date("2026-08-17T01:00:00Z")
  });

  assert.match(note, /id: "RES-dsh-session-123"/);
  assert.match(note, /topic: self-media/);
  assert.match(note, /owner: topic:self-media/);
  assert.match(note, /research_type: content-project/);
  assert.match(note, /project: dsh-explorations/);
  assert.match(note, /session_id: "session-123"/);
  assert.match(note, /exported_at: "2026-08-17T01:00:00.000Z"/);
  assert.match(note, /<!-- CRISP-DSH:TRANSCRIPT:START -->/);
  assert.match(note, /## 会话实录/);
});

test("updateManagedResearchNote refreshes the transcript without overwriting human notes", () => {
  const { updateManagedResearchNote } = CrispDshPlugin.__test;
  const existing = `---
id: "RES-dsh-session-123"
exported_at: "2026-08-17T01:00:00.000Z"
---

# Session

<!-- CRISP-DSH:TRANSCRIPT:START -->
## 会话实录

old transcript
<!-- CRISP-DSH:TRANSCRIPT:END -->

## 沉淀总结与后续动作

人工总结必须保留
`;

  const updated = updateManagedResearchNote(
    existing,
    "## 用户\n\nnew transcript",
    new Date("2026-08-17T02:30:00Z")
  );

  assert.match(updated, /exported_at: "2026-08-17T02:30:00.000Z"/);
  assert.match(updated, /## 用户\n\nnew transcript/);
  assert.doesNotMatch(updated, /old transcript/);
  assert.match(updated, /人工总结必须保留/);
});

test("extractExportedSessionId reads only the frontmatter session identity", () => {
  const { extractExportedSessionId } = CrispDshPlugin.__test;
  const note = `---
type: research
session_id: "session-123"
---

Body mentions session_id: "wrong-session"
`;

  assert.equal(extractExportedSessionId(note), "session-123");
  assert.equal(extractExportedSessionId("# No frontmatter"), "");
});

test("suspending an iframe unloads it and retains the exact URL for resume", () => {
  const { suspendIframeElement, resumeIframeElement } = CrispDshPlugin.__test;
  const iframe = {
    src: "http://127.0.0.1:3080/?session=abc",
    getAttribute(name) {
      return name === "src" ? this.src : null;
    }
  };

  const suspendedSrc = suspendIframeElement(iframe);
  assert.equal(iframe.src, "about:blank");
  assert.equal(suspendedSrc, "http://127.0.0.1:3080/?session=abc");

  resumeIframeElement(iframe, suspendedSrc);
  assert.equal(iframe.src, "http://127.0.0.1:3080/?session=abc");
});

test("DelayedIframeSuspension waits for the idle delay before unloading", () => {
  const { DelayedIframeSuspension } = CrispDshPlugin.__test;
  let pendingCallback = null;
  let suspended = false;
  const delayed = new DelayedIframeSuspension({
    delayMs: 300000,
    setTimer(callback) {
      pendingCallback = callback;
      return 1;
    },
    clearTimer() {},
    onSuspend() {
      suspended = true;
    }
  });

  delayed.schedule();
  assert.equal(suspended, false);
  pendingCallback();
  assert.equal(suspended, true);
});

test("DelayedIframeSuspension cancel prevents a pending unload", () => {
  const { DelayedIframeSuspension } = CrispDshPlugin.__test;
  let pendingCallback = null;
  let suspended = false;
  const delayed = new DelayedIframeSuspension({
    delayMs: 300000,
    setTimer(callback) {
      pendingCallback = callback;
      return 1;
    },
    clearTimer() {},
    onSuspend() {
      suspended = true;
    }
  });

  delayed.schedule();
  delayed.cancel();
  pendingCallback();
  assert.equal(suspended, false);
});

test("background suspension pauses polling without unloading the iframe immediately", () => {
  const { CrispDshView } = CrispDshPlugin.__test;
  const view = Object.create(CrispDshView.prototype);
  let stopped = false;
  let scheduled = false;
  view.plugin = { settings: { smartSuspension: true } };
  view.isBackgroundPaused = false;
  view.isSuspended = false;
  view.stopAutoCheck = () => { stopped = true; };
  view.deepSuspension = { schedule: () => { scheduled = true; } };

  view.suspendBackgroundWork();

  assert.equal(view.isBackgroundPaused, true);
  assert.equal(view.isSuspended, false);
  assert.equal(stopped, true);
  assert.equal(scheduled, true);
});

test("disabling smart suspension resumes an already unloaded iframe immediately", () => {
  const { CrispDshView } = CrispDshPlugin.__test;
  const view = Object.create(CrispDshView.prototype);
  let disconnected = false;
  let cancelled = false;
  let checked = false;
  let pollingStarted = false;
  view.plugin = { settings: { smartSuspension: false } };
  view.intersectionObserver = {
    disconnect() { disconnected = true; }
  };
  view.deepSuspension = { cancel: () => { cancelled = true; } };
  view.isViewVisible = false;
  view.isBackgroundPaused = true;
  view.isSuspended = true;
  view.suspendedIframeSrc = "http://127.0.0.1:3080/session";
  view.iframeEl = { src: "about:blank" };
  view.checkConnection = () => { checked = true; };
  view.startAutoCheck = () => { pollingStarted = true; };

  view.updateSmartSuspension();

  assert.equal(disconnected, true);
  assert.equal(view.intersectionObserver, null);
  assert.equal(view.isViewVisible, true);
  assert.equal(view.isBackgroundPaused, false);
  assert.equal(view.isSuspended, false);
  assert.equal(view.iframeEl.src, "http://127.0.0.1:3080/session");
  assert.equal(cancelled, true);
  assert.equal(checked, true);
  assert.equal(pollingStarted, true);
});
