/* ==========================================================================
   Crisp DSH - DeepSeek Harness Right Sidebar Workspace
   Crafted by letschips (Xiaohongshu)
   Matching Crisp Suite Design Language (Crisp ASR / Crisp Base / Crisp Style)
   ========================================================================== */

var obsidian = require("obsidian");
const { Plugin, ItemView, PluginSettingTab, FuzzySuggestModal, Menu, Setting, Notice, requestUrl, normalizePath } = obsidian;

const VIEW_TYPE_CRISP_DSH = "crisp-dsh-view";
const TRANSCRIPT_START = "<!-- CRISP-DSH:TRANSCRIPT:START -->";
const TRANSCRIPT_END = "<!-- CRISP-DSH:TRANSCRIPT:END -->";
const DEEP_SUSPEND_DELAY_MS = 5 * 60 * 1000;

const LEGACY_EXPORT_FOLDER = "Topics/self-media/research/content-projects";
const DEFAULT_EXPORT_FOLDER = "Topics/self-media/research/content-projects/dsh-explorations";

const DEFAULT_SETTINGS = {
  serverUrl: "http://127.0.0.1:3080",
  allowRemoteServer: false,
  sidebarMode: "auto-hover",  // 'auto-hover' (自动隐藏·悬停滑出) | 'manual' (手动点击切换) | 'always' (始终显示)
  sidebarOffset: 52,          // px
  zoomLevel: 100,             // 85, 90, 95, 100, 105 (%)
  autoCheck: true,
  checkInterval: 15,
  smartSuspension: true,      // 智能后台休眠，Tab隐藏时停止轮询保护续航
  exportFolder: DEFAULT_EXPORT_FOLDER,
  launchCommand: "npx @deepseek-ai/dsh web",
  autoOpenOnStart: false,
  subtitleText: "让智能体在笔记中协同探索"
};

// DeepSeek Official Color SVG & Crisp Icons
const ICONS = {
  deepseek: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" fill="#4D6BFE"/></svg>`,
  terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>`,
  sidebar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" x2="9" y1="3" y2="21"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>`,
  external: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  context: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>`,
  more: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></svg>`
};

function dshRpcId() {
  return `crisp-dsh-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeServerUrl(rawUrl) {
  const value = (rawUrl || "").trim();
  if (!value) return "";
  return value.startsWith("http://") || value.startsWith("https://") ? value : `http://${value}`;
}

function isLoopbackHostname(hostname) {
  const value = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  return value === "localhost"
    || value.endsWith(".localhost")
    || value === "::1"
    || /^127(?:\.\d{1,3}){3}$/.test(value);
}

function normalizeAllowedServerUrl(rawUrl, allowRemoteServer = false) {
  const normalized = normalizeServerUrl(rawUrl);
  if (!normalized) throw new Error("未配置 DSH 服务地址");

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch (error) {
    throw new Error("DSH 服务地址格式无效");
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error("DSH 服务地址仅支持 HTTP 或 HTTPS");
  }
  if (!allowRemoteServer && !isLoopbackHostname(parsed.hostname)) {
    throw new Error("默认仅允许本机 DSH 服务；如需远程连接，请先启用远程地址选项");
  }
  return parsed.href;
}

function sessionTitle(session) {
  return session.title
    || session.projections?.values?.title
    || "未命名 DSH 会话";
}

function normalizedWorkingDirectory(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
}

function listExportableSessions(sessions, vaultPath) {
  const completed = (sessions || []).filter((session) => !session.blank);
  const normalizedVaultPath = normalizedWorkingDirectory(vaultPath);
  const candidates = vaultPath
    ? completed.filter(
      (session) => normalizedWorkingDirectory(session.cwd) === normalizedVaultPath
    )
    : completed;
  return candidates.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function selectExportableSession(sessions, vaultPath) {
  return listExportableSessions(sessions, vaultPath)[0] || null;
}

function textFromBlocks(blocks) {
  return (blocks || [])
    .filter((block) => block && block.type === "text" && typeof block.text === "string")
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

function formatSessionTranscript(entries) {
  const messages = [];
  for (const entry of entries || []) {
    const event = entry?.event || entry;
    if (!event?.data) continue;

    if (event.type === "user/message" && event.data.source?.kind === "user") {
      const text = textFromBlocks(event.data.content);
      if (text) messages.push(`## 用户\n\n${text}`);
    }

    if (event.type === "assistant/message") {
      const text = textFromBlocks(event.data.message?.content || event.data.content);
      if (text) messages.push(`## Agent\n\n${text}`);
    }
  }
  return messages.join("\n\n---\n\n");
}

function utcTimestamp(date) {
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;
}

function yamlString(value) {
  return JSON.stringify(String(value || ""));
}

function buildResearchNote({ session, transcript, serverUrl, createdAt }) {
  const title = sessionTitle(session);
  const stableId = `RES-dsh-${session.sessionId}`;
  return `---
id: ${yamlString(stableId)}
type: research
topic: self-media
owner: topic:self-media
status: active
research_type: content-project
project: dsh-explorations
source: deepseek-harness
source_url: ${yamlString(serverUrl)}
session_id: ${yamlString(session.sessionId)}
session_title: ${yamlString(title)}
created_at: ${yamlString(createdAt.toISOString())}
exported_at: ${yamlString(createdAt.toISOString())}
routing_confidence: 1.0
routing_reason: "Crisp DSH 导出的真实会话"
tags:
  - deepseek
  - research
  - ai-harness
---

# ${title}

> DSH 会话 ID：\`${session.sessionId}\`<br>
> 导出时间：${createdAt.toLocaleString()}<br>
> 来源：${serverUrl}

${TRANSCRIPT_START}
## 会话实录

${transcript}
${TRANSCRIPT_END}

## 沉淀总结与后续动作

- [ ] 提炼核心观点融入知识库
- [ ] 转化为正式输出内容
`;
}

function updateManagedResearchNote(existingContent, transcript, exportedAt) {
  const startIndex = existingContent.indexOf(TRANSCRIPT_START);
  const endIndex = existingContent.indexOf(TRANSCRIPT_END);
  if (startIndex < 0 || endIndex < startIndex) {
    throw new Error("现有导出笔记没有可安全更新的会话区块");
  }

  const managedBlock = `${TRANSCRIPT_START}\n## 会话实录\n\n${transcript}\n${TRANSCRIPT_END}`;
  const before = existingContent.slice(0, startIndex);
  const after = existingContent.slice(endIndex + TRANSCRIPT_END.length);
  let updated = `${before}${managedBlock}${after}`;
  const exportedAtLine = `exported_at: ${yamlString(exportedAt.toISOString())}`;
  if (/^exported_at:.*$/m.test(updated)) {
    updated = updated.replace(/^exported_at:.*$/m, exportedAtLine);
  } else {
    updated = updated.replace(/^created_at:.*$/m, (line) => `${line}\n${exportedAtLine}`);
  }
  return updated;
}

function extractExportedSessionId(content) {
  const frontmatter = String(content || "").match(/^---\s*\n([\s\S]*?)\n---(?:\n|$)/);
  if (!frontmatter) return "";
  const sessionLine = frontmatter[1].match(/^session_id:\s*(.+?)\s*$/m);
  if (!sessionLine) return "";
  const rawValue = sessionLine[1];
  try {
    return String(JSON.parse(rawValue));
  } catch (error) {
    return rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function suspendIframeElement(iframeEl) {
  const currentSrc = iframeEl?.getAttribute("src") || "";
  if (!currentSrc || currentSrc === "about:blank") return null;
  iframeEl.src = "about:blank";
  return currentSrc;
}

function resumeIframeElement(iframeEl, src) {
  if (!iframeEl || !src) return;
  iframeEl.src = src;
}

class DelayedIframeSuspension {
  constructor({ delayMs, setTimer, clearTimer, onSuspend }) {
    this.delayMs = delayMs;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.onSuspend = onSuspend;
    this.timerId = null;
    this.generation = 0;
  }

  schedule() {
    this.cancel();
    const generation = this.generation;
    this.timerId = this.setTimer(() => {
      if (generation !== this.generation) return;
      this.timerId = null;
      this.onSuspend();
    }, this.delayMs);
  }

  cancel() {
    this.generation += 1;
    if (this.timerId !== null) {
      this.clearTimer(this.timerId);
      this.timerId = null;
    }
  }
}

class DshSessionSuggestModal extends FuzzySuggestModal {
  constructor(app, sessions) {
    super(app);
    this.sessions = sessions;
    this.setPlaceholder("选择要导出的 DSH 会话");
    this.setInstructions([
      { command: "↑↓", purpose: "选择" },
      { command: "↵", purpose: "确认导出" },
      { command: "esc", purpose: "取消" }
    ]);
    this.settled = false;
    this.selection = new Promise((resolve) => {
      this.resolveSelection = resolve;
    });
  }

  getItems() {
    return this.sessions;
  }

  getItemText(session) {
    const updatedAt = session.updatedAt
      ? new Date(session.updatedAt).toLocaleString()
      : "时间未知";
    return `${sessionTitle(session)} · ${updatedAt}`;
  }

  onChooseItem(session) {
    this.settled = true;
    this.resolveSelection(session);
  }

  onClose() {
    super.onClose();
    if (!this.settled) {
      this.settled = true;
      this.resolveSelection(null);
    }
  }

  async choose() {
    this.open();
    return this.selection;
  }
}

/* ==========================================================================
   Crisp DSH View (Right Sidebar Leaf)
   ========================================================================== */
class CrispDshView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.status = "connecting"; // 'online' | 'offline' | 'connecting'
    this.latency = null;
    this.checkTimer = null;
    this.rootEl = null;
    this.markEl = null;
    this.statusEl = null;
    this.statusTextEl = null;
    this.viewportEl = null;
    this.frameWrapperEl = null;
    this.iframeEl = null;
    this.fallbackEl = null;
    this.sidebarToggleBtn = null;
    this.overflowBtn = null;
    this.isManualOpen = false;
    this.isHoverExpanded = false;
    this.isSuspended = false;
    this.isBackgroundPaused = false;
    this.isViewVisible = true;
    this.suspendedIframeSrc = null;
    this.intersectionObserver = null;
    this.visibilityHandlerRegistered = false;
    this.deepSuspension = new DelayedIframeSuspension({
      delayMs: DEEP_SUSPEND_DELAY_MS,
      setTimer: (callback, delay) => window.setTimeout(callback, delay),
      clearTimer: (timerId) => window.clearTimeout(timerId),
      onSuspend: () => {
        if (!this.isBackgroundPaused || !this.plugin.settings.smartSuspension) return;
        this.isSuspended = true;
        this.suspendIframe();
      }
    });
  }

  getViewType() {
    return VIEW_TYPE_CRISP_DSH;
  }

  getDisplayText() {
    return "DeepSeek Harness";
  }

  getIcon() {
    return "bot";
  }

  async onOpen() {
    this.setupNativeHeaderActions();

    const container = this.contentEl;
    container.empty();
    
    this.rootEl = container.createDiv({ cls: "crisp-dsh-view" });
    this.rootEl.style.setProperty("--crisp-dsh-offset", `${this.plugin.settings.sidebarOffset || 52}px`);

    const shellEl = this.rootEl.createDiv({ cls: "crisp-dsh-shell" });

    // 1. Build Header with DeepSeek Logo Mark & Action Toolbar
    this.buildHeader(shellEl);

    // 2. Build Seamless Rounded Glass Card with Sliding Viewport
    this.buildMainCard(shellEl);

    // 3. Setup Smart Battery Saver (IntersectionObserver for Background Idle)
    this.setupSmartSuspension();

    // 4. Initial connection check and start polling
    await this.checkConnection(false);
    this.startAutoCheck();
  }

  async onClose() {
    this.stopAutoCheck();
    this.deepSuspension.cancel();
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
  }

  setupSmartSuspension() {
    if (!this.visibilityHandlerRegistered) {
      this.visibilityHandlerRegistered = true;
      this.registerDomEvent(document, "visibilitychange", () => {
        if (!this.plugin.settings.smartSuspension) return;
        if (document.hidden) {
          this.suspendBackgroundWork();
        } else if (this.isViewVisible) {
          this.resumeBackgroundWork();
        }
      });
    }
    this.updateSmartSuspension();
  }

  updateSmartSuspension() {
    if (!this.plugin.settings.smartSuspension) {
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect();
        this.intersectionObserver = null;
      }
      this.isViewVisible = true;
      this.resumeBackgroundWork();
      return;
    }
    if (this.intersectionObserver) return;

    try {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          this.isViewVisible = entry.isIntersecting;
          if (!entry.isIntersecting) {
            this.suspendBackgroundWork();
          } else {
            this.resumeBackgroundWork();
          }
        }
      }, { threshold: 0.05 });

      this.intersectionObserver.observe(this.contentEl);
      if (document.hidden) this.suspendBackgroundWork();
    } catch (e) {
      // Fallback
    }
  }

  suspendBackgroundWork() {
    if (!this.plugin.settings.smartSuspension || this.isBackgroundPaused) return;
    this.isBackgroundPaused = true;
    this.stopAutoCheck();
    this.deepSuspension.schedule();
  }

  resumeBackgroundWork() {
    const wasPaused = this.isBackgroundPaused;
    const wasSuspended = this.isSuspended;
    this.isBackgroundPaused = false;
    this.deepSuspension.cancel();
    this.isSuspended = false;
    if (wasSuspended) this.resumeIframe();
    if (wasPaused || wasSuspended) this.checkConnection(true);
    this.startAutoCheck();
  }

  suspendIframe() {
    if (!this.iframeEl || this.suspendedIframeSrc) return;
    this.suspendedIframeSrc = suspendIframeElement(this.iframeEl);
  }

  resumeIframe() {
    if (!this.iframeEl || !this.suspendedIframeSrc) return;
    const src = this.suspendedIframeSrc;
    this.suspendedIframeSrc = null;
    resumeIframeElement(this.iframeEl, src);
  }

  setupNativeHeaderActions() {
    this.addAction("panel-left", "折叠/展开 DSH 内部侧边栏", () => this.toggleSidebar());
    this.addAction("save", "导出最近的 DSH 会话为 Markdown 笔记", () => this.plugin.saveChatToVault());
    this.addAction("refresh-cw", "刷新 DeepSeek Harness", () => this.reload());
    this.addAction("file-text", "复制当前笔记上下文供 Agent 使用", () => this.plugin.copyActiveNoteContext());
    this.addAction("external-link", "在外部浏览器中打开", () => this.plugin.openInBrowser());
    this.addAction("settings", "Crisp DSH 设置", () => this.plugin.openSettingsTab());
  }

  buildHeader(container) {
    const header = container.createDiv({ cls: "crisp-dsh-header" });

    // Left: Identity (DeepSeek Color Logo + Title + Subtitle)
    const identity = header.createDiv({ cls: "crisp-dsh-identity" });
    
    this.markEl = identity.createDiv({ cls: "crisp-dsh-mark is-connecting" });
    this.markEl.innerHTML = ICONS.deepseek;

    const titleGroup = identity.createDiv({ cls: "crisp-dsh-identity-text" });
    titleGroup.createEl("h2", { text: "Crisp DSH" });
    titleGroup.createEl("p", { text: this.plugin.settings.subtitleText || "让智能体在笔记中协同探索" });

    // Right: Actions + Status Pill
    const headerRight = header.createDiv({ cls: "crisp-dsh-header-right" });

    const actions = headerRight.createDiv({ cls: "crisp-dsh-header-actions" });

    // Helper to create accessible action buttons
    const createBtn = (iconSvg, label, onClick, className, isActive = false) => {
      const btn = actions.createEl("button", {
        cls: `crisp-dsh-action-btn ${className}${isActive ? " is-active" : ""}`,
        attr: {
          type: "button",
          "aria-label": label,
          title: label,
          "data-tooltip-position": "bottom"
        }
      });
      btn.innerHTML = iconSvg;
      btn.addEventListener("click", onClick);
      return btn;
    };

    // Action 1: Toggle Sidebar Button
    this.sidebarToggleBtn = createBtn(
      ICONS.sidebar,
      "切换 DSH 内部侧边栏 (满宽/展开)",
      () => this.toggleSidebar(),
      "is-sidebar",
      this.isManualOpen
    );
    this.sidebarToggleBtn.setAttribute("aria-pressed", String(this.isManualOpen));

    // Action 2: Copy Context
    createBtn(ICONS.context, "复制当前笔记上下文", () => this.plugin.copyActiveNoteContext(), "is-context");

    // Action 3: Save Chat to Vault
    createBtn(ICONS.save, "导出最近的 DSH 会话为 Markdown 笔记", () => this.plugin.saveChatToVault(), "is-save");

    // Action 4: Refresh
    createBtn(ICONS.refresh, "刷新 DeepSeek Harness", () => this.reload(), "is-refresh");

    // Action 5: External Browser
    createBtn(ICONS.external, "在默认浏览器中打开", () => this.plugin.openInBrowser(), "is-external");

    // Action 6: Settings
    createBtn(ICONS.settings, "Crisp DSH 设置", () => this.plugin.openSettingsTab(), "is-settings");

    // Narrow sidebars retain the primary action and collapse secondary actions into a native menu.
    this.overflowBtn = createBtn(
      ICONS.more,
      "更多 DSH 操作",
      (event) => this.openOverflowMenu(event),
      "is-overflow"
    );

    // Status Pill
    this.statusEl = headerRight.createEl("button", {
      cls: "crisp-dsh-status is-connecting",
      attr: {
        type: "button",
        "aria-live": "polite",
        "aria-label": "DSH 正在连接，按下可重试"
      }
    });
    this.statusEl.createDiv({ cls: "crisp-dsh-status-dot" });
    this.statusTextEl = this.statusEl.createSpan({ text: "连接中..." });
    this.statusEl.addEventListener("click", () => this.checkConnection(false));
  }

  openOverflowMenu(event) {
    const menu = new Menu();
    const addItem = (icon, title, onClick) => {
      menu.addItem((item) => item.setIcon(icon).setTitle(title).onClick(onClick));
    };
    addItem("file-text", "复制当前笔记上下文", () => this.plugin.copyActiveNoteContext());
    addItem("save", "导出 DSH 会话", () => this.plugin.saveChatToVault());
    addItem("refresh-cw", "刷新 DeepSeek Harness", () => this.reload());
    addItem("external-link", "在默认浏览器中打开", () => this.plugin.openInBrowser());
    menu.addSeparator();
    addItem("settings", "Crisp DSH 设置", () => this.plugin.openSettingsTab());

    const target = event?.currentTarget || this.overflowBtn;
    const rect = target?.getBoundingClientRect?.();
    if (rect) {
      menu.showAtPosition({ x: rect.right, y: rect.bottom });
    } else {
      menu.showAtMouseEvent(event);
    }
  }

  buildMainCard(container) {
    const card = container.createDiv({ cls: "crisp-dsh-card" });

    this.viewportEl = card.createDiv({ cls: "crisp-dsh-iframe-viewport" });
    this.applySidebarMode();

    // Hover trigger strip with glowing handle
    const hoverZone = this.viewportEl.createDiv({
      cls: "crisp-dsh-hover-zone",
      attr: { "aria-hidden": "true" }
    });
    hoverZone.createDiv({ cls: "crisp-dsh-hover-handle" });

    // 1. Enter from left edge: Expand
    hoverZone.addEventListener("mouseenter", () => {
      if (this.plugin.settings.sidebarMode === "auto-hover" && !this.isManualOpen) {
        this.isHoverExpanded = true;
        this.viewportEl.classList.add("is-hover-expanded");
      }
    });

    // 2. Mouse move inside viewport: Only keep open while mouse is in the left sidebar area (< offsetLimit)
    this.viewportEl.addEventListener("mousemove", (e) => {
      if (this.isHoverExpanded && this.plugin.settings.sidebarMode === "auto-hover" && !this.isManualOpen) {
        const rect = this.viewportEl.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        const offsetLimit = (this.plugin.settings.sidebarOffset || 52) + 16;
        if (relativeX > offsetLimit) {
          this.isHoverExpanded = false;
          this.viewportEl.classList.remove("is-hover-expanded");
        }
      }
    });

    // 3. Mouse leaves the entire card: Collapse
    this.viewportEl.addEventListener("mouseleave", () => {
      if (this.isHoverExpanded && this.plugin.settings.sidebarMode === "auto-hover" && !this.isManualOpen) {
        this.isHoverExpanded = false;
        this.viewportEl.classList.remove("is-hover-expanded");
      }
    });

    // Sliding wrapper containing the solid 100% full height iframe
    this.frameWrapperEl = this.viewportEl.createDiv({ cls: "crisp-dsh-frame-wrapper" });

    this.iframeEl = this.frameWrapperEl.createEl("iframe", {
      cls: "crisp-dsh-iframe",
      attr: {
        src: "about:blank",
        title: "DeepSeek Harness",
        allow: "clipboard-read; clipboard-write",
        sandbox: "allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
      }
    });

    this.applyZoom();

    // Fallback Overlay inside card
    this.fallbackEl = this.viewportEl.createDiv({ cls: "crisp-dsh-fallback-overlay" });
    this.buildOfflineFallback(this.fallbackEl);
    this.fallbackEl.style.display = "none";
  }

  applySidebarMode() {
    if (!this.viewportEl) return;
    const mode = this.plugin.settings.sidebarMode || "auto-hover";
    
    this.viewportEl.classList.remove("is-mode-hover", "is-manual-hidden", "is-mode-always", "is-hover-expanded");
    this.isHoverExpanded = false;

    if (mode === "auto-hover") {
      this.viewportEl.classList.add("is-mode-hover");
      if (this.isManualOpen) {
        this.viewportEl.classList.add("is-mode-always");
      }
    } else if (mode === "manual") {
      if (this.isManualOpen) {
        this.viewportEl.classList.add("is-mode-always");
      } else {
        this.viewportEl.classList.add("is-manual-hidden");
      }
    } else {
      this.viewportEl.classList.add("is-mode-always");
    }

    if (this.sidebarToggleBtn) {
      this.sidebarToggleBtn.toggleClass("is-active", this.isManualOpen);
      this.sidebarToggleBtn.setAttribute("aria-pressed", String(this.isManualOpen));
      this.sidebarToggleBtn.setAttribute(
        "aria-label",
        this.isManualOpen ? "收起 DSH 内部侧边栏" : "展开 DSH 内部侧边栏"
      );
    }
  }

  toggleSidebar() {
    this.isManualOpen = !this.isManualOpen;
    this.applySidebarMode();
    new Notice(this.isManualOpen ? "已展开 DSH 内部侧边栏" : "已收起 DSH 内部侧边栏 (满宽模式)");
  }

  buildOfflineFallback(container) {
    const inner = container.createDiv({ cls: "crisp-dsh-fallback-inner" });

    const hero = inner.createDiv({ cls: "crisp-dsh-fallback-hero" });
    hero.innerHTML = ICONS.deepseek;

    inner.createDiv({ cls: "crisp-dsh-fallback-title", text: "DeepSeek Harness 未运行" });
    inner.createDiv({
      cls: "crisp-dsh-fallback-desc",
      text: "请在终端中启动本地服务，或检查服务端口设置。"
    });

    // Command Box
    const codeBox = inner.createDiv({ cls: "crisp-dsh-code-box" });
    const codeText = codeBox.createSpan({
      cls: "crisp-dsh-code-text",
      text: this.plugin.settings.launchCommand || "npx @deepseek-ai/dsh web"
    });

    const copyBtn = codeBox.createEl("button", { cls: "crisp-dsh-copy-btn" });
    copyBtn.innerHTML = `${ICONS.copy} <span>复制</span>`;
    copyBtn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(codeText.innerText);
      copyBtn.innerHTML = `${ICONS.copy} <span>已复制!</span>`;
      setTimeout(() => {
        copyBtn.innerHTML = `${ICONS.copy} <span>复制</span>`;
      }, 2000);
      new Notice("启动命令已复制到剪贴板");
    });

    // Action Buttons
    const actions = inner.createDiv({ cls: "crisp-dsh-fallback-actions" });

    const retryBtn = actions.createEl("button", { cls: "crisp-dsh-btn-primary" });
    retryBtn.innerHTML = `${ICONS.refresh} <span>重试连接</span>`;
    retryBtn.addEventListener("click", async () => {
      retryBtn.innerHTML = `<div class="crisp-dsh-loading-spinner"></div> <span>检测中...</span>`;
      await this.checkConnection(false);
      retryBtn.innerHTML = `${ICONS.refresh} <span>重试连接</span>`;
    });

    const configBtn = actions.createEl("button", { cls: "crisp-dsh-btn-secondary" });
    configBtn.innerHTML = `${ICONS.settings} <span>配置服务地址</span>`;
    configBtn.addEventListener("click", () => this.plugin.openSettingsTab());
  }

  applyZoom() {
    if (!this.iframeEl) return;
    const zoom = (this.plugin.settings.zoomLevel || 100) / 100;
    if (zoom !== 1) {
      this.iframeEl.style.zoom = `${zoom}`;
    } else {
      this.iframeEl.style.zoom = "";
    }
  }

  startAutoCheck() {
    this.stopAutoCheck();
    if (!this.plugin.settings.autoCheck || this.isSuspended || this.isBackgroundPaused) return;
    const intervalMs = Math.max(5, this.plugin.settings.checkInterval) * 1000;
    this.checkTimer = window.setInterval(() => {
      this.checkConnection(true);
    }, intervalMs);
  }

  stopAutoCheck() {
    if (this.checkTimer) {
      window.clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  async checkConnection(silent = false) {
    const rawUrl = (this.plugin.settings.serverUrl || "").trim();
    if (!rawUrl) {
      this.updateStatus("offline");
      return false;
    }

    let url;
    try {
      url = normalizeAllowedServerUrl(rawUrl, this.plugin.settings.allowRemoteServer);
    } catch (error) {
      this.suspendedIframeSrc = null;
      if (this.iframeEl) this.iframeEl.src = "about:blank";
      this.updateStatus("offline");
      if (!silent) new Notice(error.message);
      return false;
    }

    if (!silent) {
      this.updateStatus("connecting");
    }

    const startTime = Date.now();
    try {
      const response = await requestUrl({
        url: url,
        method: "GET",
        throw: false
      });

      this.latency = Date.now() - startTime;

      if (response && response.status >= 200 && response.status < 500) {
        this.updateStatus("online");
        this.ensureLoaded(url);
        return true;
      } else {
        this.updateStatus("offline");
        return false;
      }
    } catch (err) {
      this.updateStatus("offline");
      return false;
    }
  }

  updateStatus(status) {
    this.status = status;
    if (this.statusEl && this.statusTextEl) {
      this.statusEl.className = `crisp-dsh-status is-${status}`;
      if (status === "online") {
        const port = this.extractPort(this.plugin.settings.serverUrl) || "3080";
        this.statusTextEl.setText(`${port} · 就绪`);
        this.statusEl.setAttribute("aria-label", `DSH 服务已就绪，端口 ${port}，按下可重新检查连接`);
        this.statusEl.setAttribute(
          "title",
          `DeepSeek Harness 服务正常 · 延迟: ${this.latency !== null ? this.latency : 1}ms`
        );
      } else if (status === "offline") {
        this.statusTextEl.setText("服务离线");
        this.statusEl.setAttribute("aria-label", "DSH 服务离线，按下可重试连接");
        this.statusEl.setAttribute("title", "未检测到本地 DSH 服务，点击重试连接");
      } else {
        this.statusTextEl.setText("连接中...");
        this.statusEl.setAttribute("aria-label", "DSH 正在连接，按下可重试");
        this.statusEl.setAttribute("title", "正在连接 DeepSeek Harness 服务...");
      }
    }

    if (this.markEl) {
      this.markEl.className = `crisp-dsh-mark is-${status}`;
    }

    if (status === "online") {
      if (this.fallbackEl) this.fallbackEl.style.display = "none";
      if (this.frameWrapperEl) this.frameWrapperEl.style.display = "block";
    } else if (status === "offline") {
      if (this.frameWrapperEl) this.frameWrapperEl.style.display = "none";
      if (this.fallbackEl) this.fallbackEl.style.display = "flex";
    }
  }

  ensureLoaded(url) {
    if (!this.iframeEl) return;
    if (this.isSuspended) {
      this.suspendedIframeSrc = url;
      return;
    }
    try {
      const currentSrc = this.iframeEl.getAttribute("src") || "";
      if (!currentSrc || currentSrc === "about:blank" || !currentSrc.startsWith(url)) {
        this.iframeEl.setAttribute("src", url);
      }
    } catch (e) {
      this.iframeEl.src = url;
    }
  }

  reload() {
    const rawUrl = (this.plugin.settings.serverUrl || "http://127.0.0.1:3080").trim();
    let url;
    try {
      url = normalizeAllowedServerUrl(rawUrl, this.plugin.settings.allowRemoteServer);
    } catch (error) {
      new Notice(error.message);
      return;
    }

    if (this.iframeEl) {
      const cacheBustUrl = url.includes("?") 
        ? `${url}&_t=${Date.now()}` 
        : `${url}?_t=${Date.now()}`;
      if (this.isSuspended) {
        this.suspendedIframeSrc = cacheBustUrl;
      } else {
        this.iframeEl.src = cacheBustUrl;
      }
    }
    this.checkConnection(false);
    new Notice("已刷新 DeepSeek Harness");
  }

  extractPort(urlString) {
    try {
      const parsed = new URL(urlString.startsWith("http") ? urlString : `http://${urlString}`);
      return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
    } catch (e) {
      return "";
    }
  }
}

/* ==========================================================================
   Crisp DSH Setting Tab
   ========================================================================== */
class CrispDshSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Crisp DSH")
      .setDesc("DeepSeek Harness 悬浮卡片工作台视觉与服务配置")
      .setHeading();

    // 1. Visual & Layout
    const visualCard = containerEl.createEl("details", { cls: "crisp-dsh-setting-card" });
    visualCard.open = true;
    const visualSummary = visualCard.createEl("summary", { cls: "crisp-dsh-setting-card__header" });
    const visualTitleGroup = visualSummary.createDiv();
    visualTitleGroup.createDiv({ cls: "crisp-dsh-setting-card__title", text: "视觉与布局 (Appearance & Layout)" });
    visualTitleGroup.createDiv({ cls: "crisp-dsh-setting-card__desc", text: "DSH 内部侧栏自动隐藏/滑出、文案与缩放微调" });

    const visualContent = visualCard.createDiv({ cls: "crisp-dsh-setting-card__content" });

    new Setting(visualContent)
      .setName("DSH 内部侧边栏展示模式")
      .setDesc("自动隐藏可将 100% 空间留给聊天输入框，鼠标悬停至左侧时顺滑滑出")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("auto-hover", "自动隐藏 (鼠标悬停滑出，推荐)")
          .addOption("manual", "手动折叠 (点击顶部按钮切换)")
          .addOption("always", "始终显示 (原始布局)")
          .setValue(this.plugin.settings.sidebarMode || "auto-hover")
          .onChange(async (value) => {
            this.plugin.settings.sidebarMode = value;
            await this.plugin.saveSettings();
            const view = this.plugin.getActiveDshView();
            if (view) view.applySidebarMode();
          })
      );

    new Setting(visualContent)
      .setName("侧边栏隐藏补偿偏移 (px)")
      .setDesc("DSH 原生左侧图标栏宽度（默认 52px）")
      .addSlider((slider) =>
        slider
          .setLimits(40, 80, 2)
          .setValue(this.plugin.settings.sidebarOffset || 52)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.sidebarOffset = value;
            await this.plugin.saveSettings();
            const view = this.plugin.getActiveDshView();
            if (view && view.contentEl) {
              const root = view.contentEl.querySelector(".crisp-dsh-view");
              if (root) root.style.setProperty("--crisp-dsh-offset", `${value}px`);
            }
          })
      );

    new Setting(visualContent)
      .setName("副标题描述文案")
      .setDesc("顶部标题下方展示的描述文本")
      .addText((text) =>
        text
          .setPlaceholder("让智能体在笔记中协同探索")
          .setValue(this.plugin.settings.subtitleText)
          .onChange(async (value) => {
            this.plugin.settings.subtitleText = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(visualContent)
      .setName("界面缩放 (Zoom)")
      .setDesc("微调 DSH 在卡片内的排版缩放比例（推荐 90% 或 95%）")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("85", "85% (超紧凑)")
          .addOption("90", "90% (推荐紧凑)")
          .addOption("95", "95% (微调)")
          .addOption("100", "100% (默认原始)")
          .addOption("105", "105% (放大)")
          .setValue(String(this.plugin.settings.zoomLevel || 100))
          .onChange(async (value) => {
            this.plugin.settings.zoomLevel = parseInt(value, 10);
            await this.plugin.saveSettings();
            const view = this.plugin.getActiveDshView();
            if (view) view.applyZoom();
          })
      );

    // 2. Knowledge & Export Group
    const expCard = containerEl.createEl("details", { cls: "crisp-dsh-setting-card" });
    expCard.open = true;
    const expSummary = expCard.createEl("summary", { cls: "crisp-dsh-setting-card__header" });
    const expTitleGroup = expSummary.createDiv();
    expTitleGroup.createDiv({ cls: "crisp-dsh-setting-card__title", text: "笔记导出与沉淀 (Notes Export)" });
    expTitleGroup.createDiv({ cls: "crisp-dsh-setting-card__desc", text: "将会话探索一键导出保存至指定知识库目录" });

    const expContent = expCard.createDiv({ cls: "crisp-dsh-setting-card__content" });

    new Setting(expContent)
      .setName("导出笔记保存目录")
      .setDesc("导出真实 DSH 会话时自动保存文件的 Vault 相对路径")
      .addText((text) =>
        text
          .setPlaceholder("Crisp DSH Outputs")
          .setValue(this.plugin.settings.exportFolder)
          .onChange(async (value) => {
            this.plugin.settings.exportFolder = value.trim();
            await this.plugin.saveSettings();
          })
      );

    // 3. Connection & Battery Group
    const connCard = containerEl.createEl("details", { cls: "crisp-dsh-setting-card" });
    connCard.open = true;
    const connSummary = connCard.createEl("summary", { cls: "crisp-dsh-setting-card__header" });
    const connTitleGroup = connSummary.createDiv();
    connTitleGroup.createDiv({ cls: "crisp-dsh-setting-card__title", text: "服务连接与节能 (Connection & Battery)" });
    connTitleGroup.createDiv({ cls: "crisp-dsh-setting-card__desc", text: "服务端口、智能后台休眠与轮询控制" });

    const connContent = connCard.createDiv({ cls: "crisp-dsh-setting-card__content" });

    new Setting(connContent)
      .setName("允许远程 DSH 服务")
      .setDesc("默认关闭，仅允许 localhost、127.0.0.1 与 ::1；开启前请确认远程服务可信")
      .addToggle((toggle) =>
        toggle
          .setValue(Boolean(this.plugin.settings.allowRemoteServer))
          .onChange(async (value) => {
            this.plugin.settings.allowRemoteServer = value;
            await this.plugin.saveSettings();
            this.plugin.refreshViewStatus();
          })
      );

    new Setting(connContent)
      .setName("服务地址 (Server URL)")
      .setDesc("DeepSeek Harness Web 运行地址，默认：http://127.0.0.1:3080")
      .addText((text) =>
        text
          .setPlaceholder("http://127.0.0.1:3080")
          .setValue(this.plugin.settings.serverUrl)
          .onChange(async (value) => {
            let sanitized;
            try {
              sanitized = normalizeAllowedServerUrl(value, this.plugin.settings.allowRemoteServer);
            } catch (error) {
              new Notice(error.message);
              return;
            }
            this.plugin.settings.serverUrl = sanitized;
            await this.plugin.saveSettings();
            this.plugin.refreshViewStatus();
          })
      );

    new Setting(connContent)
      .setName("智能后台休眠 (保护 MacBook 续航)")
      .setDesc("隐藏时立即停止探测，持续隐藏 5 分钟后再卸载页面，减少输入内容意外丢失")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.smartSuspension)
          .onChange(async (value) => {
            this.plugin.settings.smartSuspension = value;
            await this.plugin.saveSettings();
            const view = this.plugin.getActiveDshView();
            if (view) view.updateSmartSuspension();
          })
      );

    new Setting(connContent)
      .setName("启动命令预设")
      .setDesc("离线状态卡片展示的快捷启动命令")
      .addText((text) =>
        text
          .setPlaceholder("npx @deepseek-ai/dsh web")
          .setValue(this.plugin.settings.launchCommand)
          .onChange(async (value) => {
            this.plugin.settings.launchCommand = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(connContent)
      .setName("自动连通性检测")
      .setDesc("前台活跃状态下自动轮询检测服务状态")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoCheck)
          .onChange(async (value) => {
            this.plugin.settings.autoCheck = value;
            await this.plugin.saveSettings();
            this.plugin.refreshViewStatus();
          })
      );

    new Setting(connContent)
      .setName("检测轮询间隔 (秒)")
      .setDesc("检测服务存活的间隔时间 (5 - 60 秒)")
      .addSlider((slider) =>
        slider
          .setLimits(5, 60, 5)
          .setValue(this.plugin.settings.checkInterval)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.checkInterval = value;
            await this.plugin.saveSettings();
            this.plugin.refreshViewStatus();
          })
      );

    // 4. Preferences Group
    const behCard = containerEl.createEl("details", { cls: "crisp-dsh-setting-card" });
    behCard.open = true;
    const behSummary = behCard.createEl("summary", { cls: "crisp-dsh-setting-card__header" });
    const behTitleGroup = behSummary.createDiv();
    behTitleGroup.createDiv({ cls: "crisp-dsh-setting-card__title", text: "启动偏好 (Preferences)" });
    behTitleGroup.createDiv({ cls: "crisp-dsh-setting-card__desc", text: "自定义启动行为" });

    const behContent = behCard.createDiv({ cls: "crisp-dsh-setting-card__content" });

    new Setting(behContent)
      .setName("启动 Obsidian 时自动打开侧边栏")
      .setDesc("每次打开仓库时自动唤起 Crisp DSH 面板")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoOpenOnStart)
          .onChange(async (value) => {
            this.plugin.settings.autoOpenOnStart = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

/* ==========================================================================
   Main Plugin Class
   ========================================================================== */
module.exports = class CrispDshPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    // Register View
    this.registerView(VIEW_TYPE_CRISP_DSH, (leaf) => new CrispDshView(leaf, this));

    // Ribbon Icon
    this.addRibbonIcon("bot", "打开 DeepSeek Harness (Crisp DSH)", () => {
      this.activateView();
    });

    // 1. Right-Click Context Menu Integration in Editor
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        const selection = editor.getSelection().trim();
        if (selection) {
          menu.addItem((item) => {
            item
              .setTitle("在 Crisp DSH 中向 Agent 提问")
              .setIcon("bot")
              .onClick(async () => {
                const file = view.file;
                const filename = file ? file.basename : "未命名笔记";
                const filepath = file ? file.path : "";
                const context = `【Obsidian 上下文】\n📄 笔记: ${filename}\n📁 路径: ${filepath}\n\n📌 选中文本:\n${selection}\n\n💬 提问: 请基于以上内容进行分析/解答。`;
                await navigator.clipboard.writeText(context);
                await this.activateView();
                new Notice("已复制选中文本上下文并唤起 Crisp DSH，直接粘贴即可提问！");
              });
          });
        }
      })
    );

    // Commands
    this.addCommand({
      id: "open-crisp-dsh",
      name: "在右侧栏打开 DeepSeek Harness",
      callback: () => this.activateView()
    });

    this.addCommand({
      id: "toggle-dsh-sidebar",
      name: "切换 DSH 内部侧边栏 (满宽/展开)",
      callback: () => {
        const view = this.getActiveDshView();
        if (view) view.toggleSidebar();
      }
    });

    this.addCommand({
      id: "save-dsh-chat-to-note",
      name: "导出最近的 DSH 会话为 Markdown 笔记",
      callback: () => this.saveChatToVault()
    });

    this.addCommand({
      id: "reload-crisp-dsh",
      name: "刷新 DeepSeek Harness 页面",
      callback: () => {
        const view = this.getActiveDshView();
        if (view) view.reload();
      }
    });

    this.addCommand({
      id: "open-dsh-external",
      name: "在外部浏览器中打开 DeepSeek Harness",
      callback: () => this.openInBrowser()
    });

    this.addCommand({
      id: "copy-note-context-to-dsh",
      name: "复制当前笔记上下文供 DSH 使用",
      callback: () => this.copyActiveNoteContext()
    });

    // Setting Tab
    this.addSettingTab(new CrispDshSettingTab(this.app, this));

    // Auto-open if configured
    this.app.workspace.onLayoutReady(() => {
      if (this.settings.autoOpenOnStart) {
        this.activateView();
      }
    });
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CRISP_DSH);
  }

  async loadSettings() {
    const savedSettings = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, savedSettings);
    if (savedSettings?.exportFolder === LEGACY_EXPORT_FOLDER) {
      this.settings.exportFolder = DEFAULT_EXPORT_FOLDER;
      await this.saveSettings();
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_CRISP_DSH);

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        leaf = rightLeaf;
        await leaf.setViewState({
          type: VIEW_TYPE_CRISP_DSH,
          active: true
        });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  getActiveDshView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CRISP_DSH);
    if (leaves.length > 0 && leaves[0].view instanceof CrispDshView) {
      return leaves[0].view;
    }
    return null;
  }

  refreshViewStatus() {
    const view = this.getActiveDshView();
    if (view) {
      view.startAutoCheck();
      view.checkConnection(false);
    }
  }

  openInBrowser() {
    const rawUrl = (this.settings.serverUrl || "http://127.0.0.1:3080").trim();
    let url;
    try {
      url = normalizeAllowedServerUrl(rawUrl, this.settings.allowRemoteServer);
    } catch (error) {
      new Notice(error.message);
      return;
    }
    window.open(url, "_blank");
  }

  openSettingsTab() {
    const setting = this.app.setting;
    if (setting) {
      setting.open();
      setting.openTabById(this.manifest.id);
    }
  }

  async copyActiveNoteContext() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice("当前没有处于活动状态的 Markdown 笔记");
      return;
    }

    let selectedText = "";
    const activeView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    if (activeView && activeView.editor) {
      selectedText = activeView.editor.getSelection().trim();
    }

    let payload = `【Obsidian 上下文】\n📄 笔记: ${activeFile.basename}\n📁 路径: ${activeFile.path}`;
    if (selectedText) {
      payload += `\n\n📌 选中文本:\n${selectedText}`;
    }

    await navigator.clipboard.writeText(payload);
    new Notice(`已复制笔记 [${activeFile.basename}] 上下文到剪贴板`);
  }

  async ensureFolderExists(folderPath) {
    const normalized = normalizePath(folderPath.trim());
    if (!normalized || normalized === "/" || normalized === ".") return;
    const parts = normalized.split("/");
    let currentPath = "";
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!(await this.app.vault.adapter.exists(currentPath))) {
        try {
          await this.app.vault.createFolder(currentPath);
        } catch (e) {
          // Ignore if created concurrently
        }
      }
    }
  }

  async chooseDshSession(sessions) {
    const modal = new DshSessionSuggestModal(this.app, sessions);
    return modal.choose();
  }

  async findExistingSessionExport(sessionId, folderPath) {
    const normalizedFolder = normalizePath(folderPath || "").replace(/\/$/, "");
    const folderPrefix = normalizedFolder ? `${normalizedFolder}/` : "";
    const files = this.app.vault.getMarkdownFiles()
      .filter((file) => !folderPrefix || file.path.startsWith(folderPrefix))
      .sort((a, b) => (b.stat?.mtime || 0) - (a.stat?.mtime || 0));

    for (const file of files) {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (String(frontmatter?.session_id || "") === String(sessionId)) {
        return file;
      }
      const content = await this.app.vault.cachedRead(file);
      if (extractExportedSessionId(content) === String(sessionId)) {
        return file;
      }
    }
    return null;
  }

  async openExportedFile(file) {
    const leaf = this.app.workspace.getLeaf(false);
    if (leaf) await leaf.openFile(file);
  }

  async saveChatToVault() {
    try {
      const sessions = await this.listDshSessions();
      const vaultPath = this.app.vault.adapter.getBasePath?.() || "";
      const candidates = listExportableSessions(sessions, vaultPath);
      if (candidates.length === 0) {
        new Notice("没有可导出的 DSH 会话；请先在 DSH 中完成一次对话");
        return;
      }
      const session = await this.chooseDshSession(candidates);
      if (!session) return;

      const transcript = await this.readDshSessionTranscript(session.sessionId);
      if (!transcript) {
        new Notice("该 DSH 会话没有可导出的用户或 Agent 文本");
        return;
      }

      const now = new Date();
      const folderPath = normalizePath((this.settings.exportFolder || DEFAULT_EXPORT_FOLDER).trim());
      await this.ensureFolderExists(folderPath);

      const existingFile = await this.findExistingSessionExport(session.sessionId, folderPath);
      if (existingFile) {
        const existingContent = await this.app.vault.cachedRead(existingFile);
        try {
          const updatedContent = updateManagedResearchNote(existingContent, transcript, now);
          await this.app.vault.modify(existingFile, updatedContent);
          new Notice(`已更新 DSH 会话「${sessionTitle(session)}」的现有笔记`);
        } catch (error) {
          new Notice("该会话已有旧版导出笔记；为保护人工内容，已打开原文件但未覆盖");
        }
        await this.openExportedFile(existingFile);
        return;
      }

      const safeTitle = sessionTitle(session)
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60) || "未命名会话";
      const timestampTag = utcTimestamp(now);
      let noteFileName = `DSH-${safeTitle}-${timestampTag}.md`;
      let fullPath = normalizePath(`${folderPath}/${noteFileName}`);
      let counter = 1;
      while (await this.app.vault.adapter.exists(fullPath)) {
        noteFileName = `DSH-${safeTitle}-${timestampTag}-${counter}.md`;
        fullPath = normalizePath(`${folderPath}/${noteFileName}`);
        counter++;
      }

      const noteContent = buildResearchNote({
        session,
        transcript,
        serverUrl: this.settings.serverUrl,
        createdAt: now
      });

      const newFile = await this.app.vault.create(fullPath, noteContent);
      new Notice(`已导出 DSH 会话「${sessionTitle(session)}」：${noteFileName}`);
      await this.openExportedFile(newFile);
    } catch (error) {
      console.error("[Crisp DSH] 保存笔记失败:", error);
      new Notice(`保存笔记失败: ${error.message}`);
    }
  }

  async dshRpc(method, payload) {
    const baseUrl = normalizeAllowedServerUrl(
      this.settings.serverUrl,
      this.settings.allowRemoteServer
    ).replace(/\/$/, "");

    const response = await requestUrl({
      url: `${baseUrl}/api/${method}`,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "client-request",
        rpcId: dshRpcId(),
        method,
        payload
      }),
      throw: false
    });
    const result = response?.json?.result;
    if (!result?.ok) {
      throw new Error(result?.error?.message || `DSH ${method} 请求失败`);
    }
    return result.value;
  }

  async listDshSessions() {
    const value = await this.dshRpc("session.list", {});
    return value.items || [];
  }

  async readDshSessionTranscript(sessionId) {
    const value = await this.dshRpc("session.history", { sessionId, maxMessages: 500 });
    return formatSessionTranscript(value.events || []);
  }
};

module.exports.__test = {
  CrispDshView,
  normalizeAllowedServerUrl,
  listExportableSessions,
  selectExportableSession,
  formatSessionTranscript,
  buildResearchNote,
  updateManagedResearchNote,
  extractExportedSessionId,
  suspendIframeElement,
  resumeIframeElement,
  DelayedIframeSuspension
};
