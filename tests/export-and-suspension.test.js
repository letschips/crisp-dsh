const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const Module = require("node:module");
const zlib = require("node:zlib");

const originalLoad = Module._load;
let requestUrlImpl = async () => ({});
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
      requestUrl: (...args) => requestUrlImpl(...args),
      normalizePath: (value) => value
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const CrispDshPlugin = require("../main.js");
Module._load = originalLoad;

test("sidebar toggle uses the supplied flip-h outline icon", () => {
  const { sidebarIconSvg } = CrispDshPlugin.__test;

  assert.match(sidebarIconSvg, /^<svg[^>]*width="64"[^>]*height="64"[^>]*viewBox="0 0 24 24"/);
  assert.match(sidebarIconSvg, /M12 1\.25C12\.4142 1\.25/);
  assert.doesNotMatch(sidebarIconSvg, /<rect width="18"/);
});

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

test("DshSessionIndex provides deterministic local pages and title search", () => {
  const { DshSessionIndex } = CrispDshPlugin.__test;
  const index = new DshSessionIndex({ pageSize: 2 });
  index.replace([
    { sessionId: "older", title: "Alpha", updatedAt: 10 },
    { sessionId: "latest", title: "Beta", updatedAt: 30 },
    { sessionId: "middle", title: "Gamma", updatedAt: 20 },
    { sessionId: "duplicate", title: "Beta copy", updatedAt: 30 },
    { sessionId: "duplicate", title: "ignored duplicate", updatedAt: 40 }
  ]);

  assert.deepEqual(index.getPage(1).items.map((session) => session.sessionId), ["duplicate", "latest"]);
  assert.equal(index.getPage(1).total, 4);
  assert.equal(index.getPage(1).hasMore, true);
  assert.deepEqual(index.getPage(2).items.map((session) => session.sessionId), ["middle", "older"]);

  index.setQuery("gamma");
  const filtered = index.getPage(1);
  assert.deepEqual(filtered.items.map((session) => session.sessionId), ["middle"]);
  assert.equal(filtered.total, 1);
});

test("paginateSessions clamps page and limit metadata without changing source order", () => {
  const { paginateSessions } = CrispDshPlugin.__test;
  const result = paginateSessions([
    { sessionId: "one" },
    { sessionId: "two" },
    { sessionId: "three" }
  ], { page: 99, pageSize: 2 });

  assert.deepEqual(result.items.map((session) => session.sessionId), ["three"]);
  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 2);
  assert.equal(result.pageCount, 2);
  assert.equal(result.hasMore, false);
});

test("normalizeAllowedServerUrl accepts loopback hosts by default", () => {
  const { normalizeAllowedServerUrl } = CrispDshPlugin.__test;

  assert.equal(normalizeAllowedServerUrl("127.0.0.1:3080", false), "http://127.0.0.1:3080/");
  assert.equal(normalizeAllowedServerUrl("http://localhost:3080", false), "http://localhost:3080/");
  assert.equal(normalizeAllowedServerUrl("http://[::1]:3080", false), "http://[::1]:3080/");
});

test("normalizeAllowedServerUrl preserves query tokens for authenticated sessions", () => {
  const { normalizeAllowedServerUrl } = CrispDshPlugin.__test;

  assert.equal(
    normalizeAllowedServerUrl("http://127.0.0.1:3080/?token=sec_abc123", false),
    "http://127.0.0.1:3080/?token=sec_abc123"
  );
  assert.equal(
    normalizeAllowedServerUrl("127.0.0.1:3080/?token=sec_xyz789&mode=full", false),
    "http://127.0.0.1:3080/?token=sec_xyz789&mode=full"
  );
});

test("buildDshRpcUrl appends the API path before an authentication query", () => {
  const { buildDshRpcUrl } = CrispDshPlugin.__test;

  assert.equal(
    buildDshRpcUrl("http://127.0.0.1:3080/?token=sec_abc123", false, "session/list"),
    "http://127.0.0.1:3080/api/session/list?token=sec_abc123"
  );
  assert.equal(
    buildDshRpcUrl("127.0.0.1:3080/dsh/?token=sec_xyz789&mode=full", false, "session/page"),
    "http://127.0.0.1:3080/dsh/api/session/page?token=sec_xyz789&mode=full"
  );
});

test("buildDshSessionExportUrl targets DeepSeek's authenticated ZIP export route", () => {
  const { buildDshSessionExportUrl } = CrispDshPlugin.__test;

  assert.equal(
    buildDshSessionExportUrl(
      "http://127.0.0.1:3080/?token=sec_abc123",
      false,
      "session/with spaces"
    ),
    "http://127.0.0.1:3080/api/session.export?token=sec_abc123&sessionId=session%2Fwith+spaces&includeDescendants=true"
  );
});

test("buildDshSessionPageRequest uses DSH's current typed history address and cursor", () => {
  const { buildDshSessionPageRequest } = CrispDshPlugin.__test;

  assert.deepEqual(
    buildDshSessionPageRequest({
      sessionId: "session-123",
      projections: { asOfSeq: 20 }
    }, 12),
    {
      request: {
        address: { kind: "session", sessionId: "session-123" },
        throughSeq: 20,
        maxMessages: 12
      }
    }
  );
  assert.throws(
    () => buildDshSessionPageRequest({ sessionId: "session-123" }, 12),
    /缺少可读取的历史游标/
  );
});

test("dshRpc reaches a local DSH-shaped API while preserving the auth query", async () => {
  const received = {};
  const server = http.createServer((req, res) => {
    received.method = req.method;
    received.url = req.url;
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      received.body = JSON.parse(body);
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ result: { ok: true, value: { items: [] } } }));
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  requestUrlImpl = async (options) => new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const request = http.request({
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      method: options.method,
      headers: options.headers
    }, (response) => {
      let responseBody = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { responseBody += chunk; });
      response.on("end", () => resolve({
        status: response.statusCode,
        json: JSON.parse(responseBody)
      }));
    });
    request.on("error", reject);
    request.end(options.body);
  });

  try {
    const plugin = Object.create(CrispDshPlugin.prototype);
    plugin.settings = {
      serverUrl: `http://127.0.0.1:${address.port}/?token=sec_local_test`,
      allowRemoteServer: false
    };

    const value = await plugin.dshRpc("session/list", { _request: {} });
    assert.deepEqual(value, { items: [] });
    assert.equal(received.method, "POST");
    assert.equal(received.url, "/api/session/list?token=sec_local_test");
    assert.equal(received.body.type, "client-request");
    assert.equal(received.body.method, "session/list");
    assert.deepEqual(received.body.payload, { args: { _request: {} } });
  } finally {
    requestUrlImpl = async () => ({});
    await new Promise((resolve) => server.close(resolve));
  }
});

test("session log ZIP parsing reads the root DSH JSONL and preserves current event shapes", () => {
  const { sessionLogEntryTextFromZip, parseSessionLogText, formatSessionTranscript } = CrispDshPlugin.__test;
  const logText = [
    JSON.stringify({ type: "session", version: 1, id: "session-123", createdAt: 1 }),
    JSON.stringify({
      type: "user/message",
      seq: 1,
      time: 2,
      data: { source: { kind: "user" }, content: [{ type: "text", text: "Export this" }] }
    }),
    JSON.stringify({
      type: "assistant/message",
      seq: 2,
      time: 3,
      data: { content: [{ type: "text", text: "Exported." }] }
    }),
    ""
  ].join("\n");
  const fileName = Buffer.from("session.v1.jsonl", "utf8");
  const content = Buffer.from(logText, "utf8");
  const compressed = zlib.deflateRawSync(content);
  const local = Buffer.alloc(30 + fileName.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(content.length, 22);
  local.writeUInt16LE(fileName.length, 26);
  fileName.copy(local, 30);
  const central = Buffer.alloc(46 + fileName.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(content.length, 24);
  central.writeUInt16LE(fileName.length, 28);
  central.writeUInt32LE(0, 42);
  fileName.copy(central, 46);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(local.length + compressed.length, 16);

  const archive = Buffer.concat([local, compressed, central, eocd]);
  const extracted = sessionLogEntryTextFromZip(new Uint8Array(archive));
  const transcript = formatSessionTranscript(parseSessionLogText(extracted));
  assert.match(transcript, /## 用户\n\nExport this/);
  assert.match(transcript, /## Agent\n\nExported\./);
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

test("formatSessionTranscript supports a bounded research-card message window", () => {
  const { formatSessionTranscript } = CrispDshPlugin.__test;
  const transcript = formatSessionTranscript([
    { event: { type: "user/message", data: { source: { kind: "user" }, content: [{ type: "text", text: "first" }] } } },
    { event: { type: "assistant/message", data: { content: [{ type: "text", text: "first answer" }] } } },
    { event: { type: "user/message", data: { source: { kind: "user" }, content: [{ type: "text", text: "latest" }] } } },
    { event: { type: "assistant/message", data: { content: [{ type: "text", text: "latest answer" }] } } }
  ], { maxMessages: 2 });

  assert.doesNotMatch(transcript, /first answer/);
  assert.match(transcript, /latest/);
  assert.match(transcript, /latest answer/);
});

test("normalizeExportMode keeps the two supported export profiles explicit", () => {
  const { normalizeExportMode } = CrispDshPlugin.__test;

  assert.equal(normalizeExportMode("research-card"), "research-card");
  assert.equal(normalizeExportMode("full-evidence"), "full-evidence");
  assert.equal(normalizeExportMode("unknown"), "research-card");
});

test("formatObsidianContext preserves explicit note, selection, and folder references", () => {
  const { createObsidianContextItem, formatObsidianContext } = CrispDshPlugin.__test;
  const payload = formatObsidianContext([
    createObsidianContextItem({
      kind: "selection",
      title: "研究笔记",
      path: "Topics/self-media/research/研究笔记.md",
      selection: "需要验证的原始观点"
    }),
    createObsidianContextItem({
      kind: "folder",
      path: "Topics/self-media/raw/articles"
    })
  ]);

  assert.match(payload, /【Obsidian 上下文 · Crisp DSH】/);
  assert.match(payload, /研究笔记/);
  assert.match(payload, /需要验证的原始观点/);
  assert.match(payload, /📁 参考文件夹: Topics\/self-media\/raw\/articles/);
  assert.match(payload, /请基于以上上下文进行分析或解答/);
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
  assert.match(note, /profile: research/);
  assert.match(note, /export_mode: research-card/);
  assert.match(note, /evidence_scope: bounded-message-page/);
  assert.match(note, /session_id: "session-123"/);
  assert.match(note, /exported_at: "2026-08-17T01:00:00.000Z"/);
  assert.match(note, /<!-- CRISP-DSH:TRANSCRIPT:START -->/);
  assert.match(note, /## 会话实录/);
});

test("buildResearchNote can persist complete DSH JSONL evidence without losing ANKS routing fields", () => {
  const { buildResearchNote } = CrispDshPlugin.__test;
  const note = buildResearchNote({
    session: { sessionId: "session-full", title: "Full evidence" },
    transcript: "## 用户\n\nQuestion",
    serverUrl: "http://127.0.0.1:3080/?token=secret",
    createdAt: new Date("2026-08-17T01:00:00Z"),
    exportMode: "full-evidence",
    evidenceEntries: [{
      fileName: "session.v1.jsonl",
      content: '{"type":"assistant/message","seq":2}'
    }]
  });

  assert.match(note, /profile: research/);
  assert.match(note, /research_type: content-project/);
  assert.match(note, /export_mode: full-evidence/);
  assert.match(note, /evidence_scope: complete-session-log/);
  assert.match(note, /session\.v1\.jsonl/);
  assert.match(note, /assistant\/message/);
  assert.doesNotMatch(note, /secret/);
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

test("updateManagedResearchNote refreshes managed evidence and export metadata only", () => {
  const { updateManagedResearchNote } = CrispDshPlugin.__test;
  const existing = `---
id: "RES-dsh-session-123"
exported_at: "2026-08-17T01:00:00.000Z"
---

<!-- CRISP-DSH:TRANSCRIPT:START -->
## 会话实录

old transcript
<!-- CRISP-DSH:TRANSCRIPT:END -->

<!-- CRISP-DSH:EVIDENCE:START -->
## DSH 原始证据

old evidence
<!-- CRISP-DSH:EVIDENCE:END -->

人工内容
`;

  const updated = updateManagedResearchNote(
    existing,
    "## 用户\n\nnew transcript",
    new Date("2026-08-17T02:30:00Z"),
    {
      exportMode: "full-evidence",
      evidenceScope: "complete-session-log",
      evidenceEntries: [{ fileName: "session.v1.jsonl", content: "new evidence" }]
    }
  );

  assert.match(updated, /export_mode: full-evidence/);
  assert.match(updated, /evidence_scope: complete-session-log/);
  assert.match(updated, /session\.v1\.jsonl/);
  assert.match(updated, /new evidence/);
  assert.doesNotMatch(updated, /old evidence/);
  assert.match(updated, /人工内容/);
});

test("parseDshLaunchCommand accepts official DSH web forms and blocks shell injection", () => {
  const { parseDshLaunchCommand } = CrispDshPlugin.__test;

  assert.deepEqual(parseDshLaunchCommand("npx @deepseek-ai/dsh web"), {
    command: "npx",
    args: ["@deepseek-ai/dsh", "web", "--no-open"]
  });
  assert.deepEqual(parseDshLaunchCommand("/opt/hermes/bin/dsh --profile web --no-open"), {
    command: "/opt/hermes/bin/dsh",
    args: ["--profile", "web", "--no-open"]
  });
  assert.throws(
    () => parseDshLaunchCommand("dsh web; touch /tmp/should-not-run"),
    /仅支持官方 DSH Web 启动命令/
  );
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
