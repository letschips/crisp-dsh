# Crisp DSH

> **DeepSeek Harness (dsh)** integration for Obsidian with frosted glass UI, hover navigation, and native note workflows.

Part of the **Crisp Series** for Obsidian by [letschips](https://github.com/letschips).

---

## ✨ Features

- **🐳 Native Right Sidebar Workspace**: Seamlessly embeds DeepSeek Harness Web interface (`http://127.0.0.1:3080`) directly into Obsidian's right sidebar.
- **⚡ Smart Hover Navigation Rail**: Automatically tucks away the internal left icon rail to give 100% full width to your chat and input box. Hovering near the left edge smoothly reveals the navigation drawer.
- **✍️ Editor Context Menu Prompt**: Select any text in your markdown note, right-click `在 Crisp DSH 中向 Agent 提问` to package the note title, path, and selection into your clipboard and open DSH instantly.
- **📥 One-Click Markdown Export**: Click `📥` in the top capsule toolbar to snapshot your agent research session directly into your Obsidian vault as a structured Markdown note with frontmatter metadata.
- **🔋 Smart Background Battery Saver**: Automatically suspends background health probes when the sidebar is folded or switched to other tabs, preserving MacBook battery life with zero CPU overhead.
- **🟢 Live Status & Latency Pill**: Real-time status badge monitoring `http://127.0.0.1:3080` with response latency and offline recovery card.
- **🎨 Crisp Frosted Glass Card**: Crafted with 14px smooth squircle corners, ambient light gradient, capsule action buttons, and full dark/light theme adaptability.
- **🛡️ 100% Free & Local-First**: Completely free to use with no license activation required. All communication runs strictly on your local device (`127.0.0.1`).

---

## 🚀 Quick Start

### 1. Start DeepSeek Harness Web Service

Run the official DeepSeek Harness web command in your terminal:

```bash
npx @deepseek-ai/dsh web
```

By default, the web interface will be accessible at `http://127.0.0.1:3080`.

### 2. Open Crisp DSH in Obsidian

- Click the **Bot (🤖) ribbon icon** in the left ribbon bar, or
- Run `Crisp DSH: 在右侧栏打开 DeepSeek Harness` from the Command Palette (`Cmd + P`).

---

## 📦 Installation

### Method 1: Via BRAT (Recommended)

1. Install and enable the **[Obsidian42 - BRAT](https://github.com/TfTHacker/obsidian42-brat)** community plugin.
2. Open Obsidian Settings → **BRAT** → **Add Beta plugin**.
3. Enter `letschips/crisp-dsh` and click **Add Plugin**.
4. Enable **Crisp DSH** under **Community plugins**.

### Method 2: Manual Installation

1. Download the latest release (`main.js`, `manifest.json`, `styles.css`) from [Releases](https://github.com/letschips/crisp-dsh/releases).
2. Create a folder named `crisp-dsh` in your Obsidian vault plugins directory:
   `<VaultFolder>/.obsidian/plugins/crisp-dsh/`
3. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.
4. Reload Obsidian (`Cmd + R`) and enable **Crisp DSH** in Settings → Community Plugins.

---

## ⚙️ Settings

| Setting | Description | Default |
| :--- | :--- | :--- |
| **Server URL** | DeepSeek Harness Web address | `http://127.0.0.1:3080` |
| **Sidebar Mode** | `Auto-Hide (Hover)` / `Manual Toggle` / `Always Show` | `Auto-Hide` |
| **Sidebar Offset** | Internal icon sidebar width compensation | `52px` |
| **Zoom Level** | Interface scaling (85% ~ 105%) | `100%` |
| **Export Folder** | Vault folder path for one-click note export | `Crisp DSH Outputs` |
| **Smart Battery Saver** | Suspend health probes when tab is hidden | `Enabled` |
| **Auto Check Interval** | Background heartbeat probe frequency | `15s` |
| **Auto Open on Start** | Automatically open DSH sidebar on vault load | `Disabled` |

---

## 🔒 Privacy & Security

- **Zero Cloud Relay**: This plugin connects exclusively to your local loopback address (`127.0.0.1`). No telemetry, analytics, or third-party servers are involved.
- **No License / No Activation**: Crisp DSH is 100% free and open-source under the MIT License.
- **Data Isolation**: Your vault notes, conversations, and prompts remain completely local on your machine.

---

## 📄 License

[MIT License](LICENSE) © 2026 [letschips](https://github.com/letschips)
