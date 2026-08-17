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

  assert.match(note, /id: "RES-dsh-session-123-20260817-0100"/);
  assert.match(note, /topic: self-media/);
  assert.match(note, /owner: topic:self-media/);
  assert.match(note, /research_type: content-project/);
  assert.match(note, /project: dsh-explorations/);
  assert.match(note, /session_id: "session-123"/);
  assert.match(note, /## 会话实录/);
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
