/* ==========================================================================
   Crisp DSH - DeepSeek Harness Right Sidebar Workspace
   Crafted by letschips (Xiaohongshu)
   Matching Crisp Suite Design Language (Crisp ASR / Crisp Base / Crisp Style)
   ========================================================================== */

var obsidian = require("obsidian");
const { Plugin, ItemView, PluginSettingTab, FuzzySuggestModal, Menu, Setting, Notice, requestUrl, normalizePath } = obsidian;
const { spawn } = require("child_process");
const addIcon = obsidian.addIcon || (() => {});
const CRISP_DSH_ICON_ID = "crisp-dsh";
const CRISP_DSH_FLIP_ICON_ID = "crisp-dsh-flip";

const VIEW_TYPE_CRISP_DSH = "crisp-dsh-view";
const TRANSCRIPT_START = "<!-- CRISP-DSH:TRANSCRIPT:START -->";
const TRANSCRIPT_END = "<!-- CRISP-DSH:TRANSCRIPT:END -->";
const EVIDENCE_START = "<!-- CRISP-DSH:EVIDENCE:START -->";
const EVIDENCE_END = "<!-- CRISP-DSH:EVIDENCE:END -->";
const DEEP_SUSPEND_DELAY_MS = 5 * 60 * 1000;
const DEFAULT_RESEARCH_CARD_MESSAGE_LIMIT = 24;
const MAX_RESEARCH_CARD_MESSAGE_LIMIT = 100;
const MAX_DSH_PAGE_MESSAGE_LIMIT = 500;
const EXPORT_MODES = Object.freeze({
  RESEARCH_CARD: "research-card",
  FULL_EVIDENCE: "full-evidence"
});

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
  exportMode: EXPORT_MODES.RESEARCH_CARD,
  researchCardMessageLimit: DEFAULT_RESEARCH_CARD_MESSAGE_LIMIT,
  launchCommand: "npx @deepseek-ai/dsh --profile web",
  autoStartService: false,
  autoOpenOnStart: false,
  subtitleText: "让智能体在笔记中协同探索"
};

// DeepSeek Official Color SVG & Crisp Icons
const ICONS = {
  dsh: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 10.5C16 11.3284 15.5523 12 15 12C14.4477 12 14 11.3284 14 10.5C14 9.67157 14.4477 9 15 9C15.5523 9 16 9.67157 16 10.5Z" fill="currentColor"></path><path d="M10 10.5C10 11.3284 9.55229 12 9 12C8.44772 12 8 11.3284 8 10.5C8 9.67157 8.44772 9 9 9C9.55229 9 10 9.67157 10 10.5Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9426 1.25H12.0574C14.3658 1.24999 16.1748 1.24998 17.5863 1.43975C19.031 1.63399 20.1711 2.03933 21.0659 2.93414C21.9607 3.82895 22.366 4.96897 22.5603 6.41371C22.75 7.82519 22.75 9.63423 22.75 11.9426V12.0574C22.75 14.3658 22.75 16.1748 22.5603 17.5863C22.366 19.031 21.9607 20.1711 21.0659 21.0659C20.1711 21.9607 19.031 22.366 17.5863 22.5603C16.1748 22.75 14.3658 22.75 12.0574 22.75H11.9426C9.63423 22.75 7.82519 22.75 6.41371 22.5603C4.96897 22.366 3.82895 21.9607 2.93414 21.0659C2.03933 20.1711 1.63399 19.031 1.43975 17.5863C1.24998 16.1748 1.24999 14.3658 1.25 12.0574V11.9426C1.24999 9.63423 1.24998 7.82519 1.43975 6.41371C1.63399 4.96897 2.03933 3.82895 2.93414 2.93414C3.82895 2.03933 4.96897 1.63399 6.41371 1.43975C7.82519 1.24998 9.63423 1.24999 11.9426 1.25ZM6.61358 2.92637C5.33517 3.09825 4.56445 3.42514 3.9948 3.9948C3.42514 4.56445 3.09825 5.33517 2.92637 6.61358C2.75159 7.91356 2.75 9.62177 2.75 12C2.75 14.3782 2.75159 16.0864 2.92637 17.3864C3.09825 18.6648 3.42514 19.4355 3.9948 20.0052C4.56445 20.5749 5.33517 20.9018 6.61358 21.0736C7.91356 21.2484 9.62177 21.25 12 21.25C14.3782 21.25 16.0864 21.2484 17.3864 21.0736C18.6648 20.9018 19.4355 20.5749 20.0052 20.0052C20.5749 19.4355 20.9018 18.6648 21.0736 17.3864C21.2484 16.0864 21.25 14.3782 21.25 12C21.25 9.62177 21.2484 7.91356 21.0736 6.61358C20.9018 5.33517 20.5749 4.56445 20.0052 3.9948C19.4355 3.42514 18.6648 3.09825 17.3864 2.92637C16.0864 2.75159 14.3782 2.75 12 2.75C9.62177 2.75 7.91356 2.75159 6.61358 2.92637ZM8.25 16C8.25 15.5858 8.58579 15.25 9 15.25H15C15.4142 15.25 15.75 15.5858 15.75 16C15.75 16.4142 15.4142 16.75 15 16.75H9C8.58579 16.75 8.25 16.4142 8.25 16Z" fill="currentColor"></path></svg>`,
  deepseek: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" fill="#4D6BFE"/></svg>`,
  terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>`,
  sidebar: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 1.25C12.4142 1.25 12.75 1.58579 12.75 2V6C12.75 6.41421 12.4142 6.75 12 6.75C11.5858 6.75 11.25 6.41421 11.25 6V2C11.25 1.58579 11.5858 1.25 12 1.25ZM5.54956 3.61372C5.56578 3.62531 5.58207 3.63694 5.59841 3.64861L7.20388 4.79538C7.4911 5.00051 7.74578 5.18241 7.94651 5.35512C8.16426 5.54247 8.35817 5.75126 8.50063 6.02808C8.64309 6.30491 8.70028 6.58406 8.72617 6.87014C8.75004 7.13387 8.75002 7.44684 8.75001 7.7998V16.2002C8.75002 16.5532 8.75004 16.8661 8.72617 17.1299C8.70027 17.4159 8.64309 17.6951 8.50063 17.9719C8.35817 18.2487 8.16426 18.4575 7.94651 18.6449C7.74579 18.8176 7.49113 18.9995 7.20392 19.2046L5.54956 20.3863C4.89882 20.8512 4.3423 21.2487 3.87881 21.4865C3.40614 21.729 2.80484 21.9245 2.19924 21.6129C1.59364 21.3012 1.40321 20.6983 1.32581 20.1727C1.24992 19.6573 1.24996 18.9734 1.25 18.1736L1.25 5.88638C1.25 5.8663 1.25 5.84629 1.25 5.82635C1.24996 5.02661 1.24992 4.34268 1.32581 3.82731C1.40321 3.30172 1.59364 2.6988 2.19924 2.38715C2.80484 2.07549 3.40614 2.27097 3.87881 2.51348C4.3423 2.75128 4.89882 3.14884 5.54956 3.61372ZM2.85693 3.72867C2.85649 3.72801 2.86043 3.72687 2.87005 3.72722C2.86218 3.7295 2.85737 3.72933 2.85693 3.72867ZM2.88991 3.72926C2.93375 3.73599 3.02598 3.76183 3.19408 3.84808C3.54719 4.02924 4.01324 4.3597 4.72655 4.86921L6.30779 5.99867C6.62652 6.22633 6.82504 6.369 6.96817 6.49215C7.09992 6.60551 7.14309 6.66823 7.16688 6.71446C7.19067 6.76068 7.21661 6.83227 7.23228 7.00536C7.2493 7.19342 7.25 7.43789 7.25 7.82957V16.1704C7.25 16.5621 7.2493 16.8066 7.23228 16.9946C7.21661 17.1677 7.19067 17.2393 7.16688 17.2855C7.14309 17.3318 7.09992 17.3945 6.96817 17.5078C6.82504 17.631 6.62652 17.7737 6.30779 18.0013L4.72655 19.1308C4.01324 19.6403 3.54719 19.9708 3.19408 20.1519C3.02598 20.2382 2.93375 20.264 2.88991 20.2707C2.8699 20.2312 2.83733 20.1411 2.8098 19.9542C2.75199 19.5615 2.75 18.9902 2.75 18.1136V5.88638C2.75 5.00979 2.75199 4.43847 2.8098 4.04584C2.83733 3.85891 2.8699 3.76884 2.88991 3.72926ZM2.85693 20.2713C2.85737 20.2707 2.86218 20.2705 2.87005 20.2728C2.86043 20.2731 2.85649 20.272 2.85693 20.2713ZM2.8998 20.2881C2.90623 20.2932 2.90888 20.2972 2.9086 20.2979C2.90832 20.2987 2.90511 20.2961 2.8998 20.2881ZM2.8998 3.71191C2.90511 3.70388 2.90832 3.70134 2.9086 3.70208C2.90888 3.70281 2.90623 3.70683 2.8998 3.71191ZM20.8059 3.84808C20.4528 4.02924 19.9868 4.3597 19.2735 4.86921L17.6922 5.99867C17.3735 6.22633 17.175 6.369 17.0318 6.49215C16.9001 6.60551 16.8569 6.66823 16.8331 6.71446C16.8093 6.76068 16.7834 6.83227 16.7677 7.00536C16.7507 7.19342 16.75 7.43789 16.75 7.82957V16.1704C16.75 16.5621 16.7507 16.8066 16.7677 16.9946C16.7834 17.1677 16.8093 17.2393 16.8331 17.2855C16.8569 17.3318 16.9001 17.3945 17.0318 17.5078C17.175 17.631 17.3735 17.7737 17.6922 18.0013L19.2735 19.1308C19.9868 19.6403 20.4528 19.9708 20.8059 20.1519C20.974 20.2382 21.0663 20.264 21.1101 20.2707C21.1301 20.2312 21.1627 20.1411 21.1902 19.9542C21.248 19.5615 21.25 18.9902 21.25 18.1136V5.88638C21.25 5.00979 21.248 4.43847 21.1902 4.04584C21.1627 3.85892 21.1301 3.76885 21.1101 3.72926C21.0663 3.73599 20.974 3.76183 20.8059 3.84808ZM21.1431 3.72867C21.1426 3.72933 21.1378 3.7295 21.13 3.72722C21.1396 3.72687 21.1435 3.72801 21.1431 3.72867ZM21.1002 3.71191C21.0938 3.70683 21.0911 3.70281 21.0914 3.70208C21.0917 3.70134 21.0949 3.70388 21.1002 3.71191ZM21.0914 20.2979C21.0911 20.2972 21.0938 20.2932 21.1002 20.2881C21.0949 20.2961 21.0917 20.2987 21.0914 20.2979ZM21.13 20.2728C21.1378 20.2705 21.1426 20.2707 21.1431 20.2713C21.1435 20.272 21.1396 20.2731 21.13 20.2728ZM20.1212 2.51348C20.5939 2.27097 21.1952 2.07549 21.8008 2.38715C22.4064 2.6988 22.5968 3.30172 22.6742 3.82731C22.7501 4.34268 22.7501 5.02661 22.75 5.82634V18.1737C22.7501 18.9734 22.7501 19.6573 22.6742 20.1727C22.5968 20.6983 22.4064 21.3012 21.8008 21.6129C21.1952 21.9245 20.5939 21.729 20.1212 21.4865C19.6577 21.2487 19.1012 20.8512 18.4505 20.3863L16.7961 19.2046C16.5089 18.9995 16.2542 18.8176 16.0535 18.6449C15.8358 18.4575 15.6418 18.2487 15.4994 17.9719C15.3569 17.6951 15.2997 17.4159 15.2738 17.1299C15.25 16.8661 15.25 16.5532 15.25 16.2002V7.79978C15.25 7.44683 15.25 7.13387 15.2738 6.87014C15.2997 6.58406 15.3569 6.30491 15.4994 6.02808C15.6418 5.75126 15.8358 5.54247 16.0535 5.35512C16.2542 5.18241 16.5089 5.00051 16.7961 4.79538L18.4504 3.61373C19.1012 3.14885 19.6577 2.75128 20.1212 2.51348ZM12 9.25C12.4142 9.25 12.75 9.58579 12.75 10V14C12.75 14.4142 12.4142 14.75 12 14.75C11.5858 14.75 11.25 14.4142 11.25 14V10C11.25 9.58579 11.5858 9.25 12 9.25ZM12 17.25C12.4142 17.25 12.75 17.5858 12.75 18V22C12.75 22.4142 12.4142 22.75 12 22.75C11.5858 22.75 11.25 22.4142 11.25 22V18C11.25 17.5858 11.5858 17.25 12 17.25Z" fill="currentColor"></path></svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>`,
  external: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  context: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>`,
  key: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>`,
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

function buildDshRpcUrl(rawUrl, allowRemoteServer, method) {
  const normalized = normalizeAllowedServerUrl(rawUrl, allowRemoteServer);
  const parsed = new URL(normalized);
  const basePath = parsed.pathname.replace(/\/+$/, "");
  parsed.pathname = `${basePath}/api/${String(method).replace(/^\/+/, "")}`;
  parsed.hash = "";
  return parsed.href;
}

function buildDshSessionExportUrl(rawUrl, allowRemoteServer, sessionId) {
  const normalized = normalizeAllowedServerUrl(rawUrl, allowRemoteServer);
  const parsed = new URL(normalized);
  const basePath = parsed.pathname.replace(/\/+$/, "");
  parsed.pathname = `${basePath}/api/session.export`;
  parsed.searchParams.set("sessionId", String(sessionId || ""));
  parsed.searchParams.set("includeDescendants", "true");
  parsed.hash = "";
  return parsed.href;
}

async function getElectronCookieHeader(targetUrl) {
  try {
    const electron = typeof window !== "undefined" && window.require
      ? (window.require("@electron/remote") || window.require("electron"))
      : null;
    const session = electron?.session || electron?.remote?.session;
    if (session?.defaultSession?.cookies) {
      const cookies = await session.defaultSession.cookies.get({ url: targetUrl });
      if (cookies && cookies.length > 0) {
        return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
      }
    }
  } catch (error) {
    // Cookie access is optional; query-token authentication can still work.
  }
  return "";
}

async function syncElectronCookies(targetUrl, setCookieHeaders) {
  if (!setCookieHeaders) return;
  const rawList = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  try {
    const electron = typeof window !== "undefined" && window.require
      ? (window.require("@electron/remote") || window.require("electron"))
      : null;
    const session = electron?.session || electron?.remote?.session;
    if (!session?.defaultSession?.cookies) return;
    const secure = new URL(targetUrl).protocol === "https:";
    for (const raw of rawList) {
      const [pair] = String(raw).split(";");
      const idx = pair.indexOf("=");
      if (idx === -1) continue;
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      await session.defaultSession.cookies.set({
        url: targetUrl,
        name,
        value,
        path: "/",
        httpOnly: true,
        secure,
        sameSite: "strict"
      });
    }
  } catch (error) {
    // Cookie persistence is best-effort and must not hide the API response.
  }
}

function normalizeExportMode(value) {
  return value === EXPORT_MODES.FULL_EVIDENCE
    ? EXPORT_MODES.FULL_EVIDENCE
    : EXPORT_MODES.RESEARCH_CARD;
}

function normalizeBoundedMessageLimit(value, fallback = DEFAULT_RESEARCH_CARD_MESSAGE_LIMIT) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) return fallback;
  return Math.min(MAX_RESEARCH_CARD_MESSAGE_LIMIT, Math.max(1, number));
}

function exportMetadataForMode(mode, messageLimit = DEFAULT_RESEARCH_CARD_MESSAGE_LIMIT) {
  const exportMode = normalizeExportMode(mode);
  const boundedLimit = normalizeBoundedMessageLimit(messageLimit);
  return {
    exportMode,
    evidenceScope: exportMode === EXPORT_MODES.FULL_EVIDENCE
      ? "complete-session-log"
      : "bounded-message-page",
    messageLimit: exportMode === EXPORT_MODES.FULL_EVIDENCE ? null : boundedLimit
  };
}

function compareSessions(a, b) {
  const updatedDifference = Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0);
  if (updatedDifference !== 0) return updatedDifference;
  return String(a?.sessionId || "").localeCompare(String(b?.sessionId || ""));
}

function sessionMatchesQuery(session, query) {
  const normalizedQuery = String(query || "").trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  return [sessionTitle(session), session?.sessionId, session?.cwd]
    .filter(Boolean)
    .some((value) => String(value).toLocaleLowerCase().includes(normalizedQuery));
}

function paginateSessions(sessions, { page = 1, pageSize = 20 } = {}) {
  const normalizedPageSize = normalizeBoundedMessageLimit(pageSize, 20);
  const total = Array.isArray(sessions) ? sessions.length : 0;
  const pageCount = Math.ceil(total / normalizedPageSize);
  const normalizedPage = pageCount > 0
    ? Math.min(pageCount, Math.max(1, Number.isSafeInteger(page) ? page : 1))
    : 1;
  const start = (normalizedPage - 1) * normalizedPageSize;
  return {
    items: (sessions || []).slice(start, start + normalizedPageSize),
    page: normalizedPage,
    pageSize: normalizedPageSize,
    pageCount,
    total,
    hasMore: normalizedPage < pageCount
  };
}

class DshSessionIndex {
  constructor({ pageSize = 20 } = {}) {
    this.pageSize = normalizeBoundedMessageLimit(pageSize, 20);
    this.items = [];
    this.query = "";
    this.updatedAt = 0;
  }

  replace(sessions) {
    const seen = new Set();
    this.items = (sessions || [])
      .filter((session) => session?.sessionId && !seen.has(session.sessionId) && seen.add(session.sessionId))
      .slice()
      .sort(compareSessions);
    this.updatedAt = Date.now();
    return this;
  }

  setQuery(query) {
    this.query = String(query || "");
    return this;
  }

  getFilteredItems() {
    return this.items.filter((session) => sessionMatchesQuery(session, this.query));
  }

  getPage(page = 1) {
    return paginateSessions(this.getFilteredItems(), { page, pageSize: this.pageSize });
  }
}

function parseDshLaunchCommand(rawCommand) {
  const command = String(rawCommand || "").trim();
  if (!command || /[;&|><`$(){}]/u.test(command)) {
    throw new Error("仅支持官方 DSH Web 启动命令，且不允许 shell 拼接符");
  }

  const tokens = [];
  const tokenPattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^']*)'|([^\s]+)/gu;
  let match;
  while ((match = tokenPattern.exec(command))) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  if (!tokens.length) {
    throw new Error("仅支持官方 DSH Web 启动命令");
  }

  const executable = String(tokens[0]).split(/[\\/]/u).pop();
  const isNpx = executable === "npx"
    && tokens[1] === "@deepseek-ai/dsh"
    && (tokens[2] === "web" || (tokens[2] === "--profile" && tokens[3] === "web"));
  const isDsh = executable === "dsh"
    && (tokens[1] === "web" || (tokens[1] === "--profile" && tokens[2] === "web"));
  if (!isNpx && !isDsh) {
    throw new Error("仅支持官方 DSH Web 启动命令");
  }

  const args = tokens.slice(1);
  if (!args.includes("--no-open")) args.push("--no-open");
  return { command: tokens[0], args };
}

function extractDshStartupUrl(output) {
  const match = String(output || "").match(/\bdsh web:\s+(https?:\/\/[^\s)\]}]+)/iu);
  return match ? match[1] : "";
}

function buildDshSessionPageRequest(session, maxMessages) {
  const sessionId = String(session?.sessionId || "");
  const throughSeq = Number(session?.projections?.asOfSeq);
  if (!sessionId || !Number.isSafeInteger(throughSeq) || throughSeq < 0) {
    throw new Error("DSH 会话缺少可读取的历史游标");
  }
  const boundedLimit = Number(maxMessages);
  if (!Number.isSafeInteger(boundedLimit) || boundedLimit <= 0) {
    throw new Error("DSH 会话分页条数无效");
  }
  return {
    request: {
      address: { kind: "session", sessionId },
      throughSeq,
      maxMessages: Math.min(MAX_DSH_PAGE_MESSAGE_LIMIT, boundedLimit)
    }
  };
}

function persistedServerUrl(rawUrl) {
  try {
    const parsed = new URL(normalizeServerUrl(rawUrl));
    parsed.searchParams.delete("token");
    return parsed.href;
  } catch (error) {
    return String(rawUrl || "");
  }
}

function parseSessionLogArchive(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer || []);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const readU16 = (offset) => view.getUint16(offset, true);
  const readU32 = (offset) => view.getUint32(offset, true);
  const eocdSignature = 0x06054b50;
  const centralSignature = 0x02014b50;
  const localSignature = 0x04034b50;
  const minimumEocdSize = 22;
  const searchStart = Math.max(0, bytes.length - minimumEocdSize - 0xffff);
  let eocdOffset = -1;
  for (let offset = bytes.length - minimumEocdSize; offset >= searchStart; offset--) {
    if (offset >= 0 && readU32(offset) === eocdSignature) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("DSH 会话导出不是有效的 ZIP 文件");

  const entryCount = readU16(eocdOffset + 10);
  const centralDirectoryOffset = readU32(eocdOffset + 16);
  const decoder = new TextDecoder();
  const entries = [];
  let offset = centralDirectoryOffset;
  for (let index = 0; index < entryCount; index++) {
    if (readU32(offset) !== centralSignature) throw new Error("DSH 会话导出 ZIP 目录损坏");
    const compression = readU16(offset + 10);
    const compressedSize = readU32(offset + 20);
    const fileNameLength = readU16(offset + 28);
    const extraLength = readU16(offset + 30);
    const commentLength = readU16(offset + 32);
    const localOffset = readU32(offset + 42);
    const fileName = decoder.decode(bytes.slice(offset + 46, offset + 46 + fileNameLength));
    offset += 46 + fileNameLength + extraLength + commentLength;

    if (!/(?:^|\/)session(?:\.v\d+)?\.jsonl$/u.test(fileName)) continue;
    if (readU32(localOffset) !== localSignature) throw new Error("DSH 会话导出 ZIP 文件头损坏");
    const localNameLength = readU16(localOffset + 26);
    const localExtraLength = readU16(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    let content;
    if (compression === 0) {
      content = compressed;
    } else if (compression === 8) {
      content = new Uint8Array(require("zlib").inflateRawSync(Buffer.from(compressed)));
    } else {
      throw new Error(`DSH 会话导出使用了不支持的 ZIP 压缩方式: ${compression}`);
    }
    entries.push({ fileName, content: decoder.decode(content) });
  }
  if (!entries.length) throw new Error("DSH 会话导出 ZIP 中没有找到根会话日志");
  return entries;
}

function sessionLogEntryTextFromZip(arrayBuffer) {
  const entries = parseSessionLogArchive(arrayBuffer);
  return entries[0].content;
}

function parseSessionLogText(content) {
  const entries = [];
  for (const line of String(content || "").split(/\r?\n/u)) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line);
      if (value?.type !== "session") entries.push(value);
    } catch (error) {
      throw new Error("DSH 会话日志包含无效 JSON");
    }
  }
  return entries;
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

function createObsidianContextItem({ kind = "note", path = "", title = "", selection = "" } = {}) {
  const normalizedPath = String(path || "").trim();
  const normalizedTitle = String(title || normalizedPath.split("/").pop() || "未命名笔记").trim();
  const normalizedSelection = String(selection || "").trim();
  const identity = [kind, normalizedPath, normalizedSelection].join("\u0000");
  return {
    id: `obsidian-context-${identity}`,
    kind,
    path: normalizedPath,
    title: normalizedTitle,
    selection: normalizedSelection
  };
}

function formatObsidianContext(items) {
  const contexts = (items || []).filter((item) => item && (item.path || item.selection));
  if (!contexts.length) return "";

  const sections = contexts.map((item) => {
    const lines = [];
    if (item.kind === "folder") {
      lines.push(`📁 参考文件夹: ${item.path}`);
    } else {
      lines.push(`📄 笔记: ${item.title || "未命名笔记"}`);
      if (item.path) lines.push(`📁 路径: ${item.path}`);
    }
    if (item.selection) {
      lines.push("", "📌 选中文本:", item.selection);
    }
    return lines.join("\n");
  });

  return [
    "【Obsidian 上下文 · Crisp DSH】",
    "以下内容由 Obsidian 明确选择，仅作为本次 DSH 对话的参考上下文。",
    "",
    sections.join("\n\n---\n\n"),
    "",
    "💬 请基于以上上下文进行分析或解答；如需修改文件，请先说明拟修改内容。"
  ].join("\n");
}

function contextItemLabel(item) {
  if (item.kind === "folder") return `文件夹 · ${item.path}`;
  if (item.kind === "selection") return `选区 · ${item.title || item.path}`;
  return `笔记 · ${item.title || item.path}`;
}

function formatSessionTranscript(entries, { maxMessages } = {}) {
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
  const boundedMessages = maxMessages === undefined
    ? messages
    : messages.slice(-normalizeBoundedMessageLimit(maxMessages));
  return boundedMessages.join("\n\n---\n\n");
}

function utcTimestamp(date) {
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;
}

function yamlString(value) {
  return JSON.stringify(String(value || ""));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatManagedEvidenceBlock({ exportMode, messageLimit, evidenceEntries } = {}) {
  const metadata = exportMetadataForMode(exportMode, messageLimit);
  let body;
  if (metadata.exportMode === EXPORT_MODES.FULL_EVIDENCE) {
    const entries = (evidenceEntries || []).filter((entry) => entry?.fileName);
    const evidence = entries.length
      ? entries.map((entry) => [
        `### ${entry.fileName}`,
        "",
        `<pre class="crisp-dsh-evidence">${escapeHtml(entry.content)}</pre>`
      ].join("\n")).join("\n\n")
      : "（本次 DSH 导出没有可读取的 JSONL 证据文件。）";
    body = `## DSH 原始证据\n\n${evidence}`;
  } else {
    body = [
      "## 证据范围",
      "",
      `研究卡片模式：使用 DSH 官方 "session/page" 读取最近 ${metadata.messageLimit} 条逻辑消息，仅保留用户与 Agent 文本。`,
      "完整会话日志仍保留在 DSH 中，需要时可切换为“完整证据”模式重新导出。"
    ].join("\n");
  }
  return `${EVIDENCE_START}\n${body}\n${EVIDENCE_END}`;
}

function upsertFrontmatterField(content, key, value) {
  const source = String(content || "");
  const match = source.match(/^---\s*\n([\s\S]*?)\n---(?:\n|$)/u);
  if (!match) return source;
  const block = match[0];
  const field = `${key}: ${value}`;
  const fieldPattern = new RegExp(`^${key}:.*$`, "mu");
  const replacement = fieldPattern.test(block)
    ? block.replace(fieldPattern, field)
    : `${block.slice(0, block.lastIndexOf("\n---"))}\n${field}${block.slice(block.lastIndexOf("\n---"))}`;
  return `${source.slice(0, match.index)}${replacement}${source.slice(match.index + block.length)}`;
}

function buildResearchNote({
  session,
  transcript,
  serverUrl,
  createdAt,
  exportMode = EXPORT_MODES.RESEARCH_CARD,
  messageLimit = DEFAULT_RESEARCH_CARD_MESSAGE_LIMIT,
  evidenceEntries = []
}) {
  const title = sessionTitle(session);
  const stableId = `RES-dsh-${session.sessionId}`;
  const metadata = exportMetadataForMode(exportMode, messageLimit);
  const safeServerUrl = persistedServerUrl(serverUrl);
  const evidenceBlock = formatManagedEvidenceBlock({
    exportMode: metadata.exportMode,
    messageLimit: metadata.messageLimit,
    evidenceEntries
  });
  return `---
id: ${yamlString(stableId)}
type: research
topic: self-media
owner: topic:self-media
status: active
profile: research
research_type: content-project
project: dsh-explorations
source: deepseek-harness
source_url: ${yamlString(safeServerUrl)}
session_id: ${yamlString(session.sessionId)}
session_title: ${yamlString(title)}
created_at: ${yamlString(createdAt.toISOString())}
exported_at: ${yamlString(createdAt.toISOString())}
export_mode: ${metadata.exportMode}
evidence_scope: ${metadata.evidenceScope}
export_message_limit: ${metadata.messageLimit === null ? "null" : metadata.messageLimit}
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
> 来源：${safeServerUrl}

${TRANSCRIPT_START}
## 会话实录

${transcript}
${TRANSCRIPT_END}

${evidenceBlock}

## 沉淀总结与后续动作

- [ ] 提炼核心观点融入知识库
- [ ] 转化为正式输出内容
`;
}

function updateManagedResearchNote(existingContent, transcript, exportedAt, {
  exportMode = EXPORT_MODES.RESEARCH_CARD,
  messageLimit = DEFAULT_RESEARCH_CARD_MESSAGE_LIMIT,
  evidenceEntries = []
} = {}) {
  const startIndex = existingContent.indexOf(TRANSCRIPT_START);
  const endIndex = existingContent.indexOf(TRANSCRIPT_END);
  if (startIndex < 0 || endIndex < startIndex) {
    throw new Error("现有导出笔记没有可安全更新的会话区块");
  }

  const managedBlock = `${TRANSCRIPT_START}\n## 会话实录\n\n${transcript}\n${TRANSCRIPT_END}`;
  const before = existingContent.slice(0, startIndex);
  const after = existingContent.slice(endIndex + TRANSCRIPT_END.length);
  let updated = `${before}${managedBlock}${after}`;
  const evidenceBlock = formatManagedEvidenceBlock({ exportMode, messageLimit, evidenceEntries });
  const evidenceStartIndex = updated.indexOf(EVIDENCE_START);
  const evidenceEndIndex = updated.indexOf(EVIDENCE_END);
  if (evidenceStartIndex >= 0 && evidenceEndIndex >= evidenceStartIndex) {
    updated = `${updated.slice(0, evidenceStartIndex)}${evidenceBlock}${updated.slice(evidenceEndIndex + EVIDENCE_END.length)}`;
  } else {
    const transcriptEndIndex = updated.indexOf(TRANSCRIPT_END);
    updated = `${updated.slice(0, transcriptEndIndex + TRANSCRIPT_END.length)}\n\n${evidenceBlock}${updated.slice(transcriptEndIndex + TRANSCRIPT_END.length)}`;
  }

  const metadata = exportMetadataForMode(exportMode, messageLimit);
  updated = upsertFrontmatterField(updated, "profile", "research");
  updated = upsertFrontmatterField(updated, "export_mode", metadata.exportMode);
  updated = upsertFrontmatterField(updated, "evidence_scope", metadata.evidenceScope);
  updated = upsertFrontmatterField(
    updated,
    "export_message_limit",
    metadata.messageLimit === null ? "null" : metadata.messageLimit
  );
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
    this.index = sessions instanceof DshSessionIndex
      ? sessions
      : new DshSessionIndex().replace(sessions);
    this.sessions = this.index.items;
    this.setPlaceholder(`选择要导出的 DSH 会话（索引 ${this.sessions.length} 条）`);
    this.setInstructions([
      { command: "↑↓", purpose: "选择" },
      { command: "↵", purpose: "确认导出" },
      { command: "esc", purpose: "取消" }
    ]);
    this.settled = false;
    this.choicePromise = new Promise((resolve) => {
      this.resolveSelection = resolve;
    });
  }

  getItems() {
    return this.index.items;
  }

  getItemText(session) {
    const updatedAt = session.updatedAt
      ? new Date(session.updatedAt).toLocaleString()
      : "时间未知";
    return `${sessionTitle(session)} · ${updatedAt}`;
  }

  onChooseItem(session) {
    if (this.settled) return;
    this.settled = true;
    this.resolveSelection(session);
  }

  selectSuggestion(suggestion, event) {
    this.onChooseItem(suggestion.item);
    super.selectSuggestion(suggestion, event);
  }

  onClose() {
    super.onClose();
    // Obsidian closes the modal before calling onChooseItem.
    queueMicrotask(() => {
      if (!this.settled) {
        this.settled = true;
        this.resolveSelection(null);
      }
    });
  }

  async choose() {
    this.open();
    return this.choicePromise;
  }
}

class DshContextSuggestModal extends FuzzySuggestModal {
  constructor(app, items) {
    super(app);
    this.items = items;
    this.setPlaceholder("选择要加入 DSH 上下文的文件或文件夹");
    this.setInstructions([
      { command: "↑↓", purpose: "选择" },
      { command: "↵", purpose: "加入上下文" },
      { command: "esc", purpose: "取消" }
    ]);
    this.settled = false;
    this.choicePromise = new Promise((resolve) => {
      this.resolveSelection = resolve;
    });
  }

  getItems() {
    return this.items;
  }

  getItemText(item) {
    return `${item.kind === "folder" ? "📁" : "📄"} ${item.path}`;
  }

  onChooseItem(item) {
    if (this.settled) return;
    this.settled = true;
    this.resolveSelection(item);
  }

  selectSuggestion(suggestion, event) {
    this.onChooseItem(suggestion.item);
    super.selectSuggestion(suggestion, event);
  }

  onClose() {
    super.onClose();
    // Obsidian closes the modal before calling onChooseItem.
    queueMicrotask(() => {
      if (!this.settled) {
        this.settled = true;
        this.resolveSelection(null);
      }
    });
  }

  async choose() {
    this.open();
    return this.choicePromise;
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
    this.contextTrayEl = null;
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
    return CRISP_DSH_ICON_ID;
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

    // 1.5 Keep explicitly selected Obsidian context visible outside DSH's iframe.
    this.buildContextTray(shellEl);

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
    this.addAction(CRISP_DSH_FLIP_ICON_ID, "折叠/展开 DSH 内部侧边栏", () => this.toggleSidebar());
    this.addAction("save", "导出最近的 DSH 会话为 Markdown 笔记", () => this.plugin.saveChatToVault());
    this.addAction("terminal", "启动 DSH Web 服务", () => this.plugin.startDshService());
    this.addAction("refresh-cw", "刷新 DeepSeek Harness", () => this.reload());
    this.addAction("file-text", "复制当前笔记上下文供 Agent 使用", () => this.plugin.copyActiveNoteContext());
    this.addAction("file-plus", "选择文件或文件夹加入 DSH 上下文", () => this.plugin.addFileContext());
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
    createBtn(ICONS.context, "加入并复制当前笔记上下文", () => this.plugin.copyActiveNoteContext(), "is-context");

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

  buildContextTray(container) {
    this.contextTrayEl = container.createDiv({
      cls: "crisp-dsh-context-tray",
      attr: {
        "aria-label": "待发送的 Obsidian 上下文",
        "aria-live": "polite"
      }
    });
    this.renderContextTray();
  }

  renderContextTray() {
    if (!this.contextTrayEl) return;
    this.contextTrayEl.empty();

    const contexts = this.plugin.getPendingContexts();
    if (!contexts.length) {
      this.contextTrayEl.style.display = "none";
      return;
    }
    this.contextTrayEl.style.display = "";

    const top = this.contextTrayEl.createDiv({ cls: "crisp-dsh-context-tray__top" });
    top.createSpan({
      cls: "crisp-dsh-context-tray__label",
      text: `待发送上下文 · ${contexts.length}`
    });

    const actions = top.createDiv({ cls: "crisp-dsh-context-tray__actions" });
    const copyBtn = actions.createEl("button", {
      cls: "crisp-dsh-context-tray__copy",
      text: "复制"
    });
    copyBtn.setAttribute("type", "button");
    copyBtn.setAttribute("aria-label", "复制待发送的 Obsidian 上下文");
    copyBtn.addEventListener("click", async () => {
      const copied = await this.plugin.copyPendingContexts();
      new Notice(copied ? "上下文已复制，请在 DSH 输入框中粘贴" : "无法写入剪贴板，请检查系统权限");
    });

    const clearBtn = actions.createEl("button", {
      cls: "crisp-dsh-context-tray__clear",
      text: "清空"
    });
    clearBtn.setAttribute("type", "button");
    clearBtn.setAttribute("aria-label", "清空待发送的 Obsidian 上下文");
    clearBtn.addEventListener("click", () => this.plugin.clearPendingContexts());

    const list = this.contextTrayEl.createDiv({ cls: "crisp-dsh-context-tray__list" });
    for (const context of contexts) {
      const chip = list.createDiv({ cls: "crisp-dsh-context-chip" });
      chip.setAttribute("title", context.path || context.title || "Obsidian 上下文");
      chip.createSpan({
        cls: "crisp-dsh-context-chip__text",
        text: contextItemLabel(context)
      });
      if (context.selection) {
        chip.createSpan({
          cls: "crisp-dsh-context-chip__meta",
          text: `${context.selection.length} 字`
        });
      }
      const removeBtn = chip.createEl("button", {
        cls: "crisp-dsh-context-chip__remove",
        text: "×"
      });
      removeBtn.setAttribute("type", "button");
      removeBtn.setAttribute("aria-label", `移除${contextItemLabel(context)}`);
      removeBtn.addEventListener("click", () => this.plugin.removePendingContext(context.id));
    }
  }

  openOverflowMenu(event) {
    const menu = new Menu();
    const addItem = (icon, title, onClick) => {
      menu.addItem((item) => item.setIcon(icon).setTitle(title).onClick(onClick));
    };
    addItem("file-text", "复制当前笔记上下文", () => this.plugin.copyActiveNoteContext());
    addItem("file-plus", "选择文件或文件夹加入上下文", () => this.plugin.addFileContext());
    addItem("save", "导出 DSH 会话", () => this.plugin.saveChatToVault());
    addItem("terminal", "启动 DSH Web 服务", () => this.plugin.startDshService());
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
        allow: "clipboard-read; clipboard-write"
      }
    });

    this.applyZoom();

    // Fallback Overlay inside card
    this.fallbackEl = this.viewportEl.createDiv({ cls: "crisp-dsh-fallback-overlay" });
    this.renderFallbackContent();
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
    this.renderFallbackContent(container);
  }

  renderFallbackContent(targetContainer) {
    const container = targetContainer || this.fallbackEl;
    if (!container) return;
    container.empty();

    const isAuth = this.status === "auth-required";
    const inner = container.createDiv({ cls: "crisp-dsh-fallback-inner" });

    const hero = inner.createDiv({
      cls: `crisp-dsh-fallback-hero ${isAuth ? "is-auth-required" : ""}`
    });
    hero.innerHTML = isAuth ? ICONS.key : ICONS.deepseek;

    const port = this.extractPort(this.plugin.settings.serverUrl) || "3080";

    if (isAuth) {
      inner.createDiv({ cls: "crisp-dsh-fallback-title", text: "DSH 服务需要启动 Token (401)" });
      inner.createDiv({
        cls: "crisp-dsh-fallback-desc",
        text: `本地服务已在端口 ${port} 启动，但启用了安全鉴权。请从终端输出中复制包含 ?token=... 的完整链接并粘贴至下方。`
      });

      // Quick Token / URL Form
      const formBox = inner.createDiv({ cls: "crisp-dsh-quick-url-box" });
      const input = formBox.createEl("input", {
        cls: "crisp-dsh-quick-url-input",
        type: "text",
        placeholder: "http://127.0.0.1:3080/?token=..."
      });
      input.value = this.plugin.settings.serverUrl || "";

      const btnRow = formBox.createDiv({ cls: "crisp-dsh-quick-url-actions" });
      const pasteBtn = btnRow.createEl("button", {
        cls: "crisp-dsh-btn-secondary",
        text: "粘贴剪贴板"
      });
      pasteBtn.addEventListener("click", async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            input.value = text.trim();
            input.focus();
          }
        } catch (e) {
          new Notice("无法读取剪贴板，请手动粘贴");
        }
      });

      const applyBtn = btnRow.createEl("button", {
        cls: "crisp-dsh-btn-primary",
        text: "保存并连接"
      });
      applyBtn.addEventListener("click", async () => {
        const val = input.value.trim();
        if (!val) {
          new Notice("请输入有效的 DSH 服务地址");
          return;
        }
        let sanitized;
        try {
          sanitized = normalizeAllowedServerUrl(val, this.plugin.settings.allowRemoteServer);
        } catch (err) {
          new Notice(err.message);
          return;
        }
        this.plugin.settings.serverUrl = sanitized;
        await this.plugin.saveSettings();
        applyBtn.setText("连接中...");
        await this.checkConnection(false);
      });
    } else {
      inner.createDiv({ cls: "crisp-dsh-fallback-title", text: "DeepSeek Harness 未运行" });
      inner.createDiv({
        cls: "crisp-dsh-fallback-desc",
        text: "请在终端中启动本地服务，或检查服务端口设置。"
      });

      // Command Box
      const codeBox = inner.createDiv({ cls: "crisp-dsh-code-box" });
      const codeText = codeBox.createSpan({
        cls: "crisp-dsh-code-text",
        text: this.plugin.settings.launchCommand || "npx @deepseek-ai/dsh --profile web"
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
    }

    // Action Buttons
    const actions = inner.createDiv({ cls: "crisp-dsh-fallback-actions" });

    if (!isAuth) {
      const startBtn = actions.createEl("button", { cls: "crisp-dsh-btn-primary" });
      startBtn.innerHTML = `${ICONS.terminal} <span>启动 DSH 服务</span>`;
      startBtn.addEventListener("click", async () => {
        startBtn.innerHTML = `<div class="crisp-dsh-loading-spinner"></div> <span>启动中...</span>`;
        await this.plugin.startDshService();
        startBtn.innerHTML = `${ICONS.terminal} <span>启动 DSH 服务</span>`;
      });
    }

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

  async getSessionCookieHeader(targetUrl) {
    return getElectronCookieHeader(targetUrl);
  }

  async syncResponseCookies(targetUrl, setCookieHeaders) {
    return syncElectronCookies(targetUrl, setCookieHeaders);
  }

  async probeServerStatus(targetUrl) {
    const cookieHeader = await this.getSessionCookieHeader(targetUrl);
    return new Promise((resolve) => {
      try {
        const parsed = new URL(targetUrl);
        const isHttps = parsed.protocol === "https:";
        const lib = isHttps ? require("https") : require("http");
        const headers = {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 Obsidian-Crisp-DSH"
        };
        if (cookieHeader) {
          headers["Cookie"] = cookieHeader;
        }

        const req = lib.request(
          targetUrl,
          {
            method: "GET",
            headers,
            timeout: 4000
          },
          async (res) => {
            const headers = res.headers || {};
            if (headers["set-cookie"]) {
              await this.syncResponseCookies(targetUrl, headers["set-cookie"]);
            }
            res.resume();
            resolve({
              status: res.statusCode || 0,
              headers
            });
          }
        );
        req.on("error", (err) => resolve({ status: 0, error: err }));
        req.on("timeout", () => {
          req.destroy();
          resolve({ status: 0, error: new Error("timeout") });
        });
        req.end();
      } catch (err) {
        try {
          const options = { url: targetUrl, method: "GET", throw: false };
          if (cookieHeader) {
            options.headers = { Cookie: cookieHeader };
          }
          requestUrl(options)
            .then(async (res) => {
              const headers = res.headers || {};
              if (headers["set-cookie"]) {
                await this.syncResponseCookies(targetUrl, headers["set-cookie"]);
              }
              resolve({ status: res.status || 0, headers });
            })
            .catch((e) => resolve({ status: 0, error: e }));
        } catch (e) {
          resolve({ status: 0, error: e });
        }
      }
    });
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
      const response = await this.probeServerStatus(url);

      this.latency = Date.now() - startTime;

      const isOnline = response && (
        (response.status >= 200 && response.status < 400)
        || response.status === 303
        || response.status === 302
      );

      if (isOnline) {
        this.updateStatus("online");
        this.ensureLoaded(url);
        return true;
      } else if (response && (response.status === 401 || response.status === 403)) {
        this.suspendedIframeSrc = null;
        if (this.iframeEl) this.iframeEl.src = "about:blank";
        this.updateStatus("auth-required");
        if (!silent) {
          new Notice("DSH 服务需要启动 Token (401)，请在卡片中填入终端输出的完整链接");
        }
        return false;
      } else {
        this.suspendedIframeSrc = null;
        if (this.iframeEl) this.iframeEl.src = "about:blank";
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
      } else if (status === "auth-required") {
        const port = this.extractPort(this.plugin.settings.serverUrl) || "3080";
        this.statusTextEl.setText(`${port} · 需鉴权`);
        this.statusEl.setAttribute("aria-label", `DSH 服务需要启动 Token (401)，按下可重新检查连接`);
        this.statusEl.setAttribute(
          "title",
          "DeepSeek Harness 需要鉴权 Token · 请将终端输出的带 ?token=... 完整链接填入设置"
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
    } else {
      if (this.frameWrapperEl) this.frameWrapperEl.style.display = "none";
      if (this.fallbackEl) {
        this.renderFallbackContent();
        this.fallbackEl.style.display = "flex";
      }
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

    new Setting(expContent)
      .setName("默认导出模式")
      .setDesc("研究卡片只读取最近的有限消息；完整证据保留 DSH 导出的全部 JSONL 会话日志")
      .addDropdown((dropdown) =>
        dropdown
          .addOption(EXPORT_MODES.RESEARCH_CARD, "研究卡片（推荐）")
          .addOption(EXPORT_MODES.FULL_EVIDENCE, "完整证据")
          .setValue(normalizeExportMode(this.plugin.settings.exportMode))
          .onChange(async (value) => {
            this.plugin.settings.exportMode = normalizeExportMode(value);
            await this.plugin.saveSettings();
          })
      );

    new Setting(expContent)
      .setName("研究卡片消息上限")
      .setDesc("通过 DSH 官方 session/page 读取的最近逻辑消息数量（1 - 100）")
      .addSlider((slider) =>
        slider
          .setLimits(1, MAX_RESEARCH_CARD_MESSAGE_LIMIT, 1)
          .setValue(normalizeBoundedMessageLimit(this.plugin.settings.researchCardMessageLimit))
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.researchCardMessageLimit = normalizeBoundedMessageLimit(value);
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
      .setDesc("DeepSeek Harness Web 运行地址（默认：http://127.0.0.1:3080）。若终端启用了安全鉴权（提示 401），可直接在此粘贴含 ?token=... 的完整链接")
      .addText((text) =>
        text
          .setPlaceholder("http://127.0.0.1:3080/?token=...")
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
      .setDesc("仅支持官方 DSH Web 命令；插件启动时会以 --no-open 运行，避免额外打开浏览器")
      .addText((text) =>
        text
          .setPlaceholder("npx @deepseek-ai/dsh --profile web")
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
      .setName("启动 Obsidian 时自动启动 DSH 服务")
      .setDesc("仅在当前 DSH 地址不可达时启动；已有服务不会重复启动")
      .addToggle((toggle) =>
        toggle
          .setValue(Boolean(this.plugin.settings.autoStartService))
          .onChange(async (value) => {
            this.plugin.settings.autoStartService = value;
            await this.plugin.saveSettings();
          })
      );

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
    this.pendingContexts = [];
    this.sessionIndex = new DshSessionIndex();
    this.dshProcess = null;
    this.dshProcessOwned = false;

    try {
      addIcon(CRISP_DSH_ICON_ID, ICONS.dsh);
      addIcon(CRISP_DSH_FLIP_ICON_ID, ICONS.sidebar);
    } catch (e) {
      console.warn("[Crisp DSH] 无法注册自定义图标:", e);
    }

    // Register View
    this.registerView(VIEW_TYPE_CRISP_DSH, (leaf) => new CrispDshView(leaf, this));

    // Ribbon Icon
    this.addRibbonIcon(CRISP_DSH_ICON_ID, "打开 DeepSeek Harness (Crisp DSH)", () => {
      this.activateView();
    });

    // 1. Right-Click Context Menu Integration in Editor
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        const selection = editor.getSelection().trim();
        if (selection) {
          menu.addItem((item) => {
            item
              .setTitle("在 Crisp DSH 中引用选中文本")
              .setIcon(CRISP_DSH_ICON_ID)
              .onClick(async () => {
                const file = view.file;
                const context = createObsidianContextItem({
                  kind: "selection",
                  title: file?.basename || "未命名笔记",
                  path: file?.path || "",
                  selection
                });
                this.addPendingContext(context);
                const copied = await this.copyPendingContexts();
                await this.activateView();
                new Notice(copied
                  ? "已加入 DSH 上下文并复制，请在 DSH 输入框中粘贴"
                  : "已加入 DSH 上下文，但无法写入剪贴板，请在上方上下文条中复制");
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
      id: "save-dsh-research-card",
      name: "导出 DSH 研究卡片",
      callback: () => this.saveChatToVault({ mode: EXPORT_MODES.RESEARCH_CARD })
    });

    this.addCommand({
      id: "save-dsh-full-evidence",
      name: "导出 DSH 完整证据",
      callback: () => this.saveChatToVault({ mode: EXPORT_MODES.FULL_EVIDENCE })
    });

    this.addCommand({
      id: "start-dsh-service",
      name: "启动 DSH Web 服务",
      callback: () => this.startDshService()
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
      name: "加入当前笔记上下文供 DSH 使用",
      callback: () => this.copyActiveNoteContext()
    });

    this.addCommand({
      id: "add-file-context-to-dsh",
      name: "选择文件或文件夹加入 DSH 上下文",
      callback: () => this.addFileContext()
    });

    this.addCommand({
      id: "clear-dsh-context",
      name: "清空待发送的 DSH 上下文",
      callback: () => this.clearPendingContexts()
    });

    // Setting Tab
    this.addSettingTab(new CrispDshSettingTab(this.app, this));

    // Auto-open if configured
    this.app.workspace.onLayoutReady(() => {
      if (this.settings.autoStartService) {
        this.startDshService({ silent: true });
      }
      if (this.settings.autoOpenOnStart) {
        this.activateView();
      }
    });
  }

  async onunload() {
    this.stopDshService();
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

  getPendingContexts() {
    return [...(this.pendingContexts || [])];
  }

  updateContextTray() {
    const view = this.getActiveDshView();
    if (view) view.renderContextTray();
  }

  addPendingContext(context) {
    if (!context) return null;
    if (!this.pendingContexts) this.pendingContexts = [];
    const existingIndex = this.pendingContexts.findIndex((item) => item.id === context.id);
    if (existingIndex >= 0) this.pendingContexts.splice(existingIndex, 1);
    this.pendingContexts.push(context);
    this.updateContextTray();
    return context;
  }

  removePendingContext(id) {
    this.pendingContexts = (this.pendingContexts || []).filter((context) => context.id !== id);
    this.updateContextTray();
  }

  clearPendingContexts() {
    this.pendingContexts = [];
    this.updateContextTray();
    new Notice("已清空待发送的 DSH 上下文");
  }

  async copyPendingContexts() {
    const payload = formatObsidianContext(this.pendingContexts);
    if (!payload) return false;
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("系统剪贴板不可用");
      }
      await navigator.clipboard.writeText(payload);
      return true;
    } catch (error) {
      console.warn("[Crisp DSH] 无法复制 Obsidian 上下文:", error);
      return false;
    }
  }

  getCurrentObsidianContext() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return null;

    const activeView = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    let selection = "";
    if (activeView?.editor) {
      selection = activeView.editor.getSelection().trim();
    }

    // Reading View has no editor selection. Only accept a DOM selection inside
    // the active Markdown view, never text selected inside the DSH iframe.
    if (!selection && typeof window !== "undefined" && window.getSelection) {
      const domSelection = window.getSelection();
      const anchorNode = domSelection?.anchorNode;
      const belongsToActiveView = Boolean(
        activeView?.contentEl
        && anchorNode
        && activeView.contentEl.contains(anchorNode)
      );
      if (belongsToActiveView) selection = String(domSelection?.toString() || "").trim();
    }

    return createObsidianContextItem({
      kind: selection ? "selection" : "note",
      title: activeFile.basename,
      path: activeFile.path,
      selection
    });
  }

  async addFileContext() {
    const files = this.app.vault?.getAllLoadedFiles?.() || [];
    const items = files
      .filter((file) => file?.path)
      .map((file) => createObsidianContextItem({
        kind: Array.isArray(file.children) ? "folder" : "file",
        title: file.basename || file.name || file.path,
        path: file.path
      }))
      .sort((a, b) => a.path.localeCompare(b.path));

    if (!items.length) {
      new Notice("当前 vault 没有可加入 DSH 的文件或文件夹");
      return null;
    }

    const selected = await new DshContextSuggestModal(this.app, items).choose();
    if (!selected) return null;
    this.addPendingContext(selected);
    const copied = await this.copyPendingContexts();
    await this.activateView();
    new Notice(copied
      ? `已加入「${selected.path}」并复制上下文，请在 DSH 输入框中粘贴`
      : `已加入「${selected.path}」；请在上方上下文条中复制`);
    return selected;
  }

  refreshViewStatus() {
    const view = this.getActiveDshView();
    if (view) {
      view.startAutoCheck();
      view.checkConnection(false);
    }
  }

  async probeConfiguredServer() {
    let targetUrl;
    try {
      targetUrl = normalizeAllowedServerUrl(
        this.settings.serverUrl,
        this.settings.allowRemoteServer
      );
    } catch (error) {
      return 0;
    }

    try {
      const cookieHeader = await getElectronCookieHeader(targetUrl);
      const options = {
        url: targetUrl,
        method: "GET",
        throw: false
      };
      if (cookieHeader) options.headers = { Cookie: cookieHeader };
      const response = await requestUrl(options);
      if (response?.headers?.["set-cookie"]) {
        await syncElectronCookies(targetUrl, response.headers["set-cookie"]);
      }
      return Number(response?.status || 0);
    } catch (error) {
      return 0;
    }
  }

  async adoptDshStartupUrl(startupUrl) {
    try {
      const normalized = normalizeAllowedServerUrl(
        startupUrl,
        this.settings.allowRemoteServer
      );
      this.settings.serverUrl = normalized;
      await this.saveSettings();
      const view = this.getActiveDshView();
      if (view) await view.checkConnection(false);
    } catch (error) {
      // A startup line from an unexpected host must never change the saved endpoint.
      console.warn("[Crisp DSH] 忽略了不受信任的 DSH 启动地址");
    }
  }

  async startDshService({ silent = false } = {}) {
    if (this.dshStartPromise) return this.dshStartPromise;
    this.dshStartPromise = this.launchDshService({ silent });
    try {
      return await this.dshStartPromise;
    } finally {
      this.dshStartPromise = null;
    }
  }

  async launchDshService({ silent = false } = {}) {
    if (this.dshProcess && !this.dshProcess.killed && this.dshProcess.exitCode === null) {
      if (!silent) new Notice("Crisp DSH 已经在启动服务");
      return true;
    }

    const configuredServerStatus = await this.probeConfiguredServer();
    if (configuredServerStatus) {
      const view = this.getActiveDshView();
      if (view) await view.checkConnection(true);
      if (!silent) {
        new Notice(configuredServerStatus === 401 || configuredServerStatus === 403
          ? "DSH 服务已在运行，但当前需要鉴权；未重复启动"
          : "DSH 服务已在运行，未重复启动");
      }
      return true;
    }

    let launch;
    try {
      launch = parseDshLaunchCommand(this.settings.launchCommand);
    } catch (error) {
      if (!silent) new Notice(error.message);
      return false;
    }

    const cwd = this.app.vault.adapter.getBasePath?.() || process.cwd();
    let child;
    try {
      child = spawn(launch.command, launch.args, {
        cwd,
        env: { ...process.env },
        detached: false,
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (error) {
      if (!silent) new Notice(`无法启动 DSH 服务: ${error.message}`);
      return false;
    }

    this.dshProcess = child;
    this.dshProcessOwned = true;
    let startupBuffer = "";
    let adoptedStartupUrl = "";
    const consumeOutput = (chunk) => {
      startupBuffer = `${startupBuffer}${String(chunk || "")}`.slice(-8192);
      const startupUrl = extractDshStartupUrl(startupBuffer);
      if (startupUrl && startupUrl !== adoptedStartupUrl) {
        adoptedStartupUrl = startupUrl;
        this.adoptDshStartupUrl(startupUrl).catch(() => {});
      }
    };
    child.stdout?.on("data", consumeOutput);
    child.stderr?.on("data", consumeOutput);
    child.once("error", (error) => {
      if (this.dshProcess !== child) return;
      this.dshProcess = null;
      this.dshProcessOwned = false;
      if (!silent) new Notice(`DSH 服务启动失败: ${error.message}`);
      this.getActiveDshView()?.updateStatus("offline");
    });
    child.once("close", (code) => {
      if (this.dshProcess !== child) return;
      this.dshProcess = null;
      this.dshProcessOwned = false;
      if (code && !silent) new Notice(`DSH 服务已退出（代码 ${code}）`);
      this.getActiveDshView()?.updateStatus("offline");
    });

    if (!silent) new Notice("正在启动 DSH Web 服务…");
    return true;
  }

  stopDshService() {
    const child = this.dshProcess;
    this.dshProcess = null;
    const owned = this.dshProcessOwned;
    this.dshProcessOwned = false;
    if (owned && child && !child.killed && child.exitCode === null) {
      child.kill();
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
    const context = this.getCurrentObsidianContext();
    if (!context) {
      new Notice("当前没有处于活动状态的 Markdown 笔记");
      return false;
    }
    this.addPendingContext(context);
    const copied = await this.copyPendingContexts();
    new Notice(copied
      ? `已加入笔记 [${context.title}] 上下文并复制，请在 DSH 输入框中粘贴`
      : `已加入笔记 [${context.title}] 上下文；请在上方上下文条中复制`);
    return copied;
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
    if (!this.sessionIndex) this.sessionIndex = new DshSessionIndex();
    this.sessionIndex.replace(sessions);
    const modal = new DshSessionSuggestModal(this.app, this.sessionIndex);
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

  async saveChatToVault({ mode } = {}) {
    try {
      const exportMode = normalizeExportMode(mode || this.settings.exportMode);
      const messageLimit = normalizeBoundedMessageLimit(this.settings.researchCardMessageLimit);
      const sessions = await this.listDshSessions();
      const vaultPath = this.app.vault.adapter.getBasePath?.() || "";
      const candidates = listExportableSessions(sessions, vaultPath);
      if (candidates.length === 0) {
        new Notice("没有可导出的 DSH 会话；请先在 DSH 中完成一次对话");
        return;
      }
      const session = await this.chooseDshSession(candidates);
      if (!session) return;

      const exportData = await this.readDshSessionForExport(session, exportMode, messageLimit);
      const transcript = exportData.transcript;
      if (!transcript) {
        new Notice("该 DSH 会话没有可导出的用户或 Agent 文本");
        return;
      }

      const now = new Date();
      const folderPath = normalizePath((this.settings.exportFolder || DEFAULT_EXPORT_FOLDER).trim());
      await this.ensureFolderExists(folderPath);

      const existingFile = await this.findExistingSessionExport(session.sessionId, folderPath);
      if (existingFile) {
        try {
          await this.app.vault.process(existingFile, (existingContent) => updateManagedResearchNote(existingContent, transcript, now, {
            exportMode,
            messageLimit,
            evidenceEntries: exportData.evidenceEntries
          }));
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
        createdAt: now,
        exportMode,
        messageLimit,
        evidenceEntries: exportData.evidenceEntries
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
    const rpcUrl = buildDshRpcUrl(
      this.settings.serverUrl,
      this.settings.allowRemoteServer,
      method
    );
    const cookieHeader = await getElectronCookieHeader(this.settings.serverUrl);
    const headers = { "content-type": "application/json" };
    if (cookieHeader) headers.Cookie = cookieHeader;

    const response = await requestUrl({
      url: rpcUrl,
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "client-request",
        rpcId: dshRpcId(),
        method,
        // DeepSeek Harness Remote endpoints use the typed API Gateway
        // contract: the endpoint arguments are carried in one plain-object
        // `args` field. Keep this wrapper DSH-native instead of inventing a
        // second Obsidian-side protocol.
        payload: { args: payload || {} }
      }),
      throw: false
    });
    if (response?.headers?.["set-cookie"]) {
      await syncElectronCookies(this.settings.serverUrl, response.headers["set-cookie"]);
    }
    if (response?.status && response.status >= 400) {
      throw new Error(`DSH ${method} HTTP ${response.status}`);
    }
    const result = response?.json?.result;
    if (!result?.ok) {
      throw new Error(result?.error?.message || `DSH ${method} 请求失败`);
    }
    return result.value;
  }

  async listDshSessions() {
    // `session/list` currently names its single request parameter `_request`
    // in the generated DSH Remote descriptor, so the wire args must retain
    // that field rather than flattening the request object.
    const value = await this.dshRpc("session/list", { _request: {} });
    const sessions = value.items || [];
    if (this.sessionIndex) this.sessionIndex.replace(sessions);
    return sessions;
  }

  async readDshSessionPage(session, maxMessages) {
    const payload = buildDshSessionPageRequest(session, maxMessages);
    const value = await this.dshRpc("session/page", payload);
    return value.records || [];
  }

  async fetchDshSessionArchive(sessionId) {
    const exportUrl = buildDshSessionExportUrl(
      this.settings.serverUrl,
      this.settings.allowRemoteServer,
      sessionId
    );
    const cookieHeader = await getElectronCookieHeader(this.settings.serverUrl);
    const headers = cookieHeader ? { Cookie: cookieHeader } : undefined;
    const response = await requestUrl({
      url: exportUrl,
      method: "GET",
      ...(headers ? { headers } : {}),
      throw: false
    });
    if (response?.status && response.status >= 400) {
      throw new Error(`DSH 会话导出 HTTP ${response.status}`);
    }
    if (!response?.arrayBuffer) {
      throw new Error("DSH 会话导出没有返回 ZIP 数据");
    }
    return parseSessionLogArchive(response.arrayBuffer);
  }

  async readDshSessionEvidence(sessionId) {
    return this.fetchDshSessionArchive(sessionId);
  }

  async readDshSessionTranscript(sessionId, { maxMessages } = {}) {
    const entries = await this.fetchDshSessionArchive(sessionId);
    return formatSessionTranscript(parseSessionLogText(entries[0].content), { maxMessages });
  }

  async readDshSessionForExport(session, exportMode, messageLimit) {
    const metadata = exportMetadataForMode(exportMode, messageLimit);
    if (metadata.exportMode === EXPORT_MODES.FULL_EVIDENCE) {
      const evidenceEntries = await this.readDshSessionEvidence(session.sessionId);
      const transcript = formatSessionTranscript(
        parseSessionLogText(evidenceEntries[0].content)
      );
      return { transcript, evidenceEntries };
    }

    let records = [];
    try {
      // DSH's page limit counts all message events, including injected
      // system snapshots. Read a small bounded multiple, then filter to the
      // user/assistant transcript below without changing DSH's wire contract.
      records = await this.readDshSessionPage(
        session,
        Math.min(MAX_DSH_PAGE_MESSAGE_LIMIT, metadata.messageLimit * 4)
      );
    } catch (error) {
      // Older DSH builds may not expose session/page. Keep export usable by
      // falling back to the official ZIP route and applying the same limit.
    }

    let transcript = formatSessionTranscript(records, { maxMessages: metadata.messageLimit });
    if (!transcript) {
      transcript = await this.readDshSessionTranscript(session.sessionId, {
        maxMessages: metadata.messageLimit
      });
    }
    return { transcript, evidenceEntries: [] };
  }
};

module.exports.__test = {
  DshSessionSuggestModal,
  DshContextSuggestModal,
  sidebarIconSvg: ICONS.sidebar,
  CrispDshView,
  normalizeAllowedServerUrl,
  buildDshRpcUrl,
  buildDshSessionExportUrl,
  buildDshSessionPageRequest,
  parseDshLaunchCommand,
  extractDshStartupUrl,
  sessionLogEntryTextFromZip,
  parseSessionLogArchive,
  parseSessionLogText,
  listExportableSessions,
  selectExportableSession,
  paginateSessions,
  DshSessionIndex,
  formatSessionTranscript,
  normalizeExportMode,
  buildResearchNote,
  updateManagedResearchNote,
  extractExportedSessionId,
  createObsidianContextItem,
  formatObsidianContext,
  contextItemLabel,
  suspendIframeElement,
  resumeIframeElement,
  DelayedIframeSuspension
};
