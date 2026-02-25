# VibeCoder — Code-Server Fork Plan

## Progress Log

### Phase 1 — DONE (2026-02-20)

**Environment setup:**
- code-server 4.109.2 (VS Code 1.109.2) running in Docker container `code-server`
- Docker image: `codercom/code-server:latest`
- Node.js 22.22.0 installed inside container (required for Claude Code extension)
- Container port: `127.0.0.1:8080` → accessible at http://localhost:8080
- Project mount: `C:\Users\PC\Desktop\Claude_Coder\coder_ui_modif` → `/home/coder/project`
- Password: `18aca8401454781634c3478e` (from `/home/coder/.config/code-server/config.yaml`)

**Config files created (local):**
- `config/settings.json` — deployed to `/home/coder/.local/share/code-server/User/settings.json`
- `config/keybindings.json` — deployed to `/home/coder/.local/share/code-server/User/keybindings.json`
- `config/vibecoder.css` — deployed to `/home/coder/.local/share/code-server/User/vibecoder.css`

**11 extensions installed:**
- `anthropic.claude-code` (was pre-installed)
- `ms-vscode.live-server` (v0.4.16)
- `drcika.apc-extension` (v0.4.1) — replaces `be5invis.vscode-custom-css` (see deviation below)
- `mtxr.sqltools` (v0.28.5)
- `rangav.vscode-thunder-client` (v2.39.8)
- `github.vscode-pull-request-github` (v0.126.0)
- `shd101wyy.markdown-preview-enhanced` (v0.8.20)
- `dbaeumer.vscode-eslint` (v3.0.20)
- `esbenp.prettier-vscode` (v12.3.0)
- `eamodio.gitlens` (v17.10.1)
- `usernamehw.errorlens` (v3.28.0)

**Deviations from original plan:**

| Original Plan | Actual | Reason |
|---|---|---|
| `be5invis.vscode-custom-css` for CSS injection | Direct `workbench.html` patching | The original extension wasn't in open-vsx. `drcika.apc-extension` was installed as replacement but its patch never applied in code-server v4.109.2 — `apc.stylesheet` has zero effect. CSS is now injected directly into `workbench.html` via a Python script run as root. |
| `workbench.secondarySideBar.defaultVisibility: "hidden"` | Removed (not a real setting) | This setting does not exist in VS Code. Secondary sidebar state is per-workspace, not a global setting. Needs the Phase 2 extension to collapse programmatically on startup. |
| `workbench.statusBar.visible: true` (minimal status bar) | `workbench.statusBar.visible: false` (hidden entirely) | After screenshot review, the status bar was too cluttered for non-coders. Hiding entirely is cleaner for Phase 1. Can revisit in Phase 2 with selective items. |
| `claudeCode.preferredLocation: "panel"` | `claudeCode.preferredLocation: "sidebar"` | Original plan said chat should be in the left sidebar, but the setting was wrong. Changed to `"sidebar"` so Claude occupies the primary sidebar (left), matching the target layout. |
| `explorer.openEditors.visible: 1` | `explorer.openEditors.visible: 0` | Hide the "Open Editors" section entirely — no value for non-coders. |

**Additional settings added after screenshot review (not in original plan):**
```jsonc
{
  // Hide dotfiles & dev clutter from Explorer
  "files.exclude": {
    "**/.cache": true, "**/.claude": true, "**/.claude.json": true,
    "**/.config": true, "**/.local": true, "**/.npm": true,
    "**/.th-client": true, "**/.bash_logout": true, "**/.bashrc": true,
    "**/.profile": true, "**/.git": true, "**/node_modules": true,
    "**/.vscode": true, "**/.DS_Store": true
  },
  // Disable outline & timeline sidebar panels
  "outline.showVariables": false,
  "outline.showFunctions": false,
  "outline.showClasses": false,
  "timeline.excludeSources": ["*"],
  // Remove more visual noise
  "workbench.layoutControl.enabled": false,
  "editor.glyphMargin": false,
  "editor.folding": false,
  "editor.renderLineHighlight": "none",
  "editor.overviewRulerBorder": false,
  "editor.hideCursorInOverviewRuler": true,
  "window.commandCenter": false
}
```

**CSS overrides:** Originally attempted via `apc.stylesheet` in settings.json, but discovered `apc-extension` patch was never applied in code-server v4.109.2 — zero CSS injection. Now injected directly into `workbench.html` (see Phase 2 progress log). Source of truth: `config/vibecoder.css`.

**Screenshot reviewed:** `phase1_ui.png` — identified remaining issues:
- Still too many activity bar icons (~10) — need to reduce to 3-4 (Chat, Files, Search, Settings)
- Explorer was showing as primary sidebar instead of Claude Chat
- Dotfiles visible (fixed with files.exclude)
- Status bar, OUTLINE, TIMELINE clutter (fixed)
- Editor title-bar icon overload (fixed with CSS)

**V2 screenshot verified (2026-02-21):** `phase1_ui.png` confirmed post-v2 state.

Settings.json fixes confirmed working:
- ✅ Activity bar at top (horizontal)
- ✅ Status bar hidden
- ✅ No minimap, no breadcrumbs
- ✅ No startup editor (empty center area)
- ✅ Editor title-bar action icons hidden (CSS rule working)
- ✅ Command center hidden, layout control hidden

Remaining issues — **cannot be fixed via settings.json** (see research below):
- ❌ Claude Code is on the RIGHT (secondary sidebar) — should be primary (left)
- ❌ Thunder Client is active in the LEFT (primary sidebar) — wrong view
- ❌ ~10 activity bar icons — need 3-4

### Key Research Finding: Browser IndexedDB State (2026-02-21)

**code-server stores VS Code workbench UI state in the browser's IndexedDB** (`vscode-web-state-db-global`), NOT server-side. There is no `state.vscdb` or any server-side file to pre-seed. This is confirmed by:
- [coder/code-server#7011](https://github.com/coder/code-server/issues/7011) — "Ability to load global-state from a file" (closed, not planned)
- [coder/code-server#4212](https://github.com/coder/code-server/issues/4212) — "Store state on remote instead of browser" (open)
- [microsoft/vscode#201616](https://github.com/microsoft/vscode/issues/201616) — confirmed as by-design

**Relevant IndexedDB storage keys:**

| Key | Controls | Value |
|-----|----------|-------|
| `workbench.sidebar.activeviewletid` | Active primary sidebar view | String, e.g. `"workbench.view.explorer"` |
| `workbench.activity.pinnedViewlets2` | Activity bar icon order & visibility | JSON array of `{id, pinned, order, visible}` |

**Consequence:** There is NO `settings.json` key to set the default active sidebar view or hide specific activity bar icons. These are per-browser state. A manual fix only applies to one browser — teammates get the default layout.

**Solution:** The Phase 2 `vibecoder-layout` extension must call VS Code commands on activation:
```typescript
// Set Claude Code as active primary sidebar view
vscode.commands.executeCommand('workbench.view.extension.claudeCode');
// Collapse secondary sidebar
vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
// Hide bottom panel
vscode.commands.executeCommand('workbench.action.closePanel');
```
Activity bar icon visibility can be controlled via `workbench.activity.pinnedViewlets2` in the extension's storage API, or by using `vscode.commands.executeCommand('workbench.action.toggleViewVisibility', viewId)` for each unwanted icon.

### Phase 2 — DONE (2026-02-22 – 2026-02-23)

**Sidebar swap + vibecoder-layout extension:**
- `workbench.sideBar.location: "right"` → primary sidebar (Explorer) on RIGHT, secondary sidebar (Claude) on LEFT
- `workbench.activityBar.location: "hidden"` — no activity bar (Replit-style)
- `window.menuBarVisibility: "toggle"` — menu bar hidden, Alt to reveal
- `vibecoder-layout` extension v0.1.0 installed (12 extensions total)

**vibecoder-layout extension features:**
- Auto-arranges layout on startup (3s delay): closes primary sidebar, opens Claude, closes panel
- Welcome webview when no editors open (auto-reappears when all tabs closed)
- Port detection (polls 3000/5173/8080/19006/4200/8000 every 5s)
- Commands: `vibecoder.arrangeLayout`, `vibecoder.openPreview`, `vibecoder.openShell`, `vibecoder.showWelcome`, `vibecoder.newTab`
- Keybindings: Ctrl+B (toggle Claude), Ctrl+E (toggle files), Ctrl+L (focus Claude), Ctrl+Shift+P (preview), Ctrl+Shift+T (shell)

**"+" New Tab button with tool picker (2026-02-23):**
- `vibecoder.newTab` command registered via `editor/title` menu with `$(add)` icon
- Quick pick with 6 options: Terminal, App Preview, Console, Database, Git, Markdown Preview
- Terminal and App Preview use existing `layoutManager` functions
- Console, Database, Git, Markdown Preview show styled "Coming Soon" placeholder webviews (`placeholderView.ts`)
- New files: `src/tabPicker.ts`, `src/placeholderView.ts`

**Critical CSS discovery (2026-02-23):**
- `apc.stylesheet` in `drcika.apc-extension` is **completely non-functional** in code-server v4.109.2. The extension's patch was never applied to the workbench files. Zero CSS rules were being injected — verified via browser DevTools (no `<style>` tag from apc, `getComputedStyle` showed no effect).
- **Solution:** Inject CSS directly into `/usr/lib/code-server/lib/vscode/out/vs/code/browser/workbench/workbench.html` as a `<style id="vibecoder-custom-css">` block before `</head>`. Must run as root via Python script.
- Removed `apc.stylesheet` and `apc.sidebar.titlebar` from `settings.json` (dead code).
- Source of truth for CSS: `config/vibecoder.css`

**CSS positioning of "+" button next to tabs:**
- Tab bar DOM: `.tabs-and-actions-container > .monaco-scrollable-element > .tabs-container`
- The `.monaco-scrollable-element` has `flex:1` + inline `overflow:hidden` → fills remaining space, pushing `.editor-actions` (where "+" lives) to far right
- Fix: Override BOTH `flex: 0 1 auto !important` AND `overflow: visible !important` on `.monaco-scrollable-element`, plus `width: fit-content !important; overflow: visible !important` on `.tabs-container`
- Without the `overflow: visible` override, the element collapses to 0 width (tabs disappear)
- Also: `.editor-actions .action-item { display: none }` hides Claude icon, split, three-dots; `.action-item:has(.codicon-add) { display: flex }` shows only the "+" button

**Other findings:**
- Inline `<script>` injection into `workbench.html` does NOT execute (likely CSP or code-server processing). Only `<style>` injection works.
- All editor title action icons (extension-contributed AND built-in) live in `.editor-actions`, NOT `.title-actions`. The `.title-actions` container is empty.

### To resume next session:
1. `docker start code-server` (if stopped)
2. Remaining Phase 2 items: persistent/pinned tabs, project template system
3. Phase 3: Light fork (branding, menu simplification)
4. Phase 1 leftover: Dockerfile bake

---

## Project Vision

Transform code-server (VS Code in the browser) into a **vibe-coding platform** for non-programmers. The AI chat panel is the primary interface; the center stage is a **multi-tab viewer** (app preview, file viewer, shell, database, GitHub, etc.); developer tools remain fully accessible but are secondary to the conversational workflow.

> **Design Principle:** "Chat first, view second, code when needed."

---

## 1. Target Layout Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  [≡ Menu]  [💬 Chat] [📁 Files] [🔍 Search] [⚙ Settings]   │  ← Activity Bar (TOP, horizontal)
├──────────────┬───────────────────────────────┬───────────────┤
│              │  Tab Bar (center)             │               │
│              │ ┌──────┬────────┬─────┬─────┐ │               │
│              │ │🌐 App│📄 Files│>_ Sh│🗄 DB│ │               │
│              │ │Viewer│ Viewer │ell  │View │ │               │
│   AI CHAT    │ └──────┴────────┴─────┴─────┘ │  SECONDARY    │
│   PANEL      │                               │  SIDEBAR      │
│              │ ┌───────────────────────────┐  │  (collapsed   │
│  (Primary    │ │                           │  │   by default) │
│   Sidebar)   │ │   Active Tab Content      │  │               │
│              │ │                           │  │  - Explorer   │
│  - Claude    │ │   e.g. Live App Preview   │  │  - Source Ctrl│
│    Code      │ │   or Terminal session     │  │  - Extensions │
│  - Chat      │ │   or DB table browser     │  │  - Debug      │
│    History   │ │   or File editor          │  │               │
│  - Prompt    │ │                           │  │               │
│    Templates │ │                           │  │               │
│              │ └───────────────────────────┘  │               │
├──────────────┴───────────────────────────────┴───────────────┤
│  [Status Bar - minimal: connection status, branch, errors]   │
└──────────────────────────────────────────────────────────────┘
```

### Zone Summary

| Zone | Role | Default State | Contains |
|------|------|---------------|----------|
| **Activity Bar** | Horizontal tab navigation | Visible, top position | Icons for Chat, Files, Search, Settings, Git |
| **Primary Sidebar (Left)** | AI Chat — the main interaction surface | **Open, ~35% width** | Claude Code chat, prompt templates, chat history |
| **Center / Editor Area** | Multi-tab viewer — the "stage" | **Open, ~55% width** | App Preview, file editor, terminal, DB viewer, GitHub |
| **Secondary Sidebar (Right)** | Developer tools (on-demand) | **Collapsed by default** | File explorer, source control, extensions, debug |
| **Bottom Panel** | Terminal / Output (on-demand) | **Hidden by default** | Integrated terminal, problems, output, debug console |
| **Status Bar** | Minimal info strip | Visible | Branch name, errors count, connection status |

---

## 2. Settings.json Modifications

These settings can be pre-deployed to every code-server instance without forking. They reshape the default VS Code layout.

### 2.1 Core Layout Settings

```jsonc
{
  // ── Activity Bar ──────────────────────────────────
  // Move to top → becomes horizontal icon strip like Replit tabs
  "workbench.activityBar.location": "top",

  // ── Sidebars ──────────────────────────────────────
  // Primary sidebar (left) = AI Chat — always visible, wider
  "workbench.sideBar.location": "left",

  // Secondary sidebar (right) = dev tools — hidden by default
  "workbench.secondarySideBar.defaultVisibility": "hidden",

  // ── Bottom Panel ──────────────────────────────────
  // Terminal/output panel — hidden until user needs it
  "workbench.panel.defaultLocation": "bottom",

  // ── Editor Area ───────────────────────────────────
  // Disable minimap (visual noise for non-coders)
  "editor.minimap.enabled": false,

  // Disable breadcrumbs (file path trail above editor)
  "breadcrumbs.enabled": false,

  // Hide the editor tab "Open Editors" section
  "explorer.openEditors.visible": 1,

  // Tabs: show full file name, wrap if many tabs
  "workbench.editor.tabSizing": "fit",
  "workbench.editor.wrapTabs": true,

  // ── Status Bar ────────────────────────────────────
  "workbench.statusBar.visible": true,

  // ── Startup Behavior ──────────────────────────────
  // Open nothing on startup (user starts with chat)
  "workbench.startupEditor": "none",

  // Restore previous session's layout
  "window.restoreWindows": "all",
}
```

### 2.2 Editor & Experience Settings

```jsonc
{
  // ── Font & Readability ────────────────────────────
  // Larger defaults for non-programmers
  "editor.fontSize": 15,
  "editor.lineHeight": 1.6,
  "chat.editor.fontSize": 15,
  "terminal.integrated.fontSize": 14,

  // ── Auto-Save ─────────────────────────────────────
  // Non-coders shouldn't have to think about saving
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,

  // ── Git ───────────────────────────────────────────
  // Auto-fetch so they see latest without commands
  "git.autofetch": true,
  "git.confirmSync": false,

  // ── Terminal ──────────────────────────────────────
  // Friendly default shell
  "terminal.integrated.defaultProfile.linux": "bash",

  // ── Search ────────────────────────────────────────
  // Exclude noise from search results
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true,
    "**/build": true
  },

  // ── Zen/Focus Helpers ─────────────────────────────
  // Reduce pop-ups and notifications
  "workbench.tips.enabled": false,
  "extensions.ignoreRecommendations": true,
  "update.showReleaseNotes": false,
}
```

### 2.3 Custom CSS Overrides (via workbench.html patching)

**NOTE:** The original plan used `vscode_custom_css.imports` / `apc.stylesheet` for CSS injection. Both are non-functional in code-server v4.109.2. CSS is now injected directly into `workbench.html` via a Python script. Source of truth: `config/vibecoder.css`.

```css
/* Injected into workbench.html as <style id="vibecoder-custom-css"> */

/* Position + button next to last tab (not far right) */
.tabs-and-actions-container > .monaco-scrollable-element { flex: 0 1 auto !important; overflow: visible !important; }
.tabs-and-actions-container > .monaco-scrollable-element > .tabs-container { overflow: visible !important; width: fit-content !important; }

/* Hide all editor action items except the + button */
.editor-actions .action-item { display: none !important; }
.editor-actions .action-item:has(.codicon-add) { display: flex !important; }

/* Visual polish */
.sidebar .composite.title { font-size: 16px !important; font-weight: 600 !important; }
.editor .line-numbers { opacity: 0.3; }
.tabs-container .tab .label-name { font-size: 13px !important; }
.monaco-scrollable-element > .scrollbar > .slider { border-radius: 4px; }
.title-actions .actions-container { display: none !important; }
.auxiliarybar .composite.title { display: none !important; }
.tabs-container .tab .tab-close { opacity: 0; transition: opacity 0.15s; }
.tabs-container .tab:hover .tab-close { opacity: 1; }
.editor .title { border-bottom: none !important; }
.split-view-view { border: none !important; }
```

---

## 3. The Multi-Tab Center Panel — Detailed Design

This is the core UX innovation. The center editor area is repurposed as a **tabbed viewer**, where each tab hosts a different tool. VS Code already supports this — the key is *pre-opening the right tabs on startup* and making them feel native.

### 3.1 Tab Types & Implementation

| Tab | Label | Icon | Implementation | How It Works |
|-----|-------|------|----------------|--------------|
| **App Viewer** | 🌐 Preview | globe | **Simple Browser** (built-in) or **Live Preview** extension | Opens `localhost:3000` (or whatever port the dev server runs). Auto-refreshes on file save. |
| **File Viewer** | 📄 Code | file | **Native editor tab** | Opens when user clicks a file or AI references a file. Standard VS Code editing. |
| **Shell** | >_ Terminal | terminal | **Terminal in Editor Area** | `terminal.integrated.defaultLocation: "editor"` moves terminal into a tab instead of bottom panel. |
| **Database** | 🗄 Database | database | **SQLTools** or **Database Client** extension | Connects to Supabase/Postgres. Browse tables, run queries in a tab. |
| **GitHub** | 🔗 GitHub | git-merge | **GitHub Pull Requests** extension webview | View PRs, commits, issues inside a tab. |
| **API Tester** | 🧪 API | beaker | **Thunder Client** extension | Postman-like REST client in a tab. |
| **Mobile Preview** | 📱 Mobile | smartphone | **Expo Go tunnel** or custom webview | For React Native: preview via Expo tunnel URL in Simple Browser. |
| **Docs / Notes** | 📝 Notes | notebook | **Markdown preview** or custom webview | Project notes, README preview, onboarding guide. |

### 3.2 Opening Tabs on Startup

VS Code doesn't have a native "open these tabs on startup" setting, but there are multiple approaches:

**Approach A — Startup Task (simplest, no fork)**

`.vscode/tasks.json`:
```jsonc
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Open App Preview",
      "command": "${input:openPreview}",
      "runOn": "folderOpen",       // ← Auto-runs when workspace opens
      "problemMatcher": []
    }
  ],
  "inputs": [
    {
      "id": "openPreview",
      "type": "command",
      "command": "simpleBrowser.show",
      "args": ["http://localhost:3000"]
    }
  ]
}
```

**Approach B — Custom Extension (recommended for full control)**

A lightweight "VibeCoder Layout" extension that on activation:
1. Opens Simple Browser to `localhost:PORT` in editor group 1
2. Sets the terminal to render as an editor tab
3. Opens the AI Chat view in the primary sidebar
4. Registers custom tab-like commands in the Activity Bar

**Approach C — Fork-Level Modification (maximum control)**

Modify code-server's startup sequence to inject the desired layout. See Section 4.

### 3.3 Terminal as a Tab (not bottom panel)

This is a key setting that transforms the UX:

```jsonc
{
  // Move terminal INTO the editor area as a tab
  "terminal.integrated.defaultLocation": "editor"
}
```

Now opening a terminal creates a tab alongside the app preview tab, not a bottom panel. The user sees:

```
[🌐 App Viewer] [>_ Shell] [📄 index.tsx]
```

All in the same tabbed area. This alone makes code-server feel much more like Replit.

---

## 4. Forking Code-Server — What & Why

### 4.1 What You DON'T Need to Fork For

These are achievable with settings + extensions only:

| Feature | Method |
|---------|--------|
| Rearrange sidebar/panel layout | settings.json |
| Move activity bar to top | settings.json |
| Hide minimap, breadcrumbs, etc. | settings.json |
| Terminal as editor tab | settings.json |
| App preview in editor | Simple Browser / Live Preview extension |
| Database viewer tab | SQLTools extension |
| Custom theme/colors | Theme extension + Custom CSS |
| Pre-installed extensions | Docker init script / code-server CLI |
| Auto-open tabs on startup | Startup task or custom extension |

### 4.2 What REQUIRES a Fork

| Feature | Why Fork Is Needed | Complexity |
|---------|-------------------|------------|
| **Custom Welcome/Home screen** | Replace VS Code's default Welcome tab with a branded "VibeCoder" landing page with quick actions (New App, Open Recent, Templates) | Medium |
| **Simplified menu bar** | Remove/rename developer-centric menu items (Debug → Test, Terminal → Shell). Hide items like "Run Without Debugging" | Medium |
| **Custom Activity Bar icons/labels** | Replace default icons with friendlier ones. Add text labels under icons (like Replit's sidebar) | Medium |
| **Tab pinning & ordering** | Force certain tabs (Preview, Shell) to always be present and pinned left. Prevent accidental closure | Low-Medium |
| **Right-click context menu cleanup** | Remove intimidating options like "Go to Definition", "Peek References", "Refactor" from default context menus | Medium |
| **Custom branding** | Replace VS Code logo, window title, favicon, product name with "VibeCoder" | Low |
| **Onboarding flow** | First-time wizard: "What do you want to build?" → sets up project template, opens relevant tabs | Medium-High |
| **Simplified command palette** | Filter command palette to show only relevant commands, or replace with a simplified "action search" | High |
| **Tab bar redesign** | Replace the file-tab metaphor with a more app-like tab bar (icons + labels, fixed tabs for core tools, closable tabs for files) | High |

### 4.3 Fork Strategy

```
coder/code-server (upstream)
  │
  ├── Track upstream releases (merge quarterly)
  │
  └── vibecoder/code-server (fork)
       │
       ├── /patches/                  ← Isolated patch files
       │   ├── 01-branding.patch      ← Logo, title, favicon
       │   ├── 02-menu-simplify.patch ← Menu bar modifications
       │   ├── 03-welcome-page.patch  ← Custom welcome screen
       │   └── 04-tab-bar.patch       ← Tab bar redesign
       │
       ├── /extensions/
       │   └── vibecoder-layout/      ← Custom extension (bundled)
       │       ├── package.json
       │       ├── src/
       │       │   ├── extension.ts    ← Layout orchestrator
       │       │   ├── welcomeView.ts  ← Custom welcome webview
       │       │   ├── tabManager.ts   ← Persistent tab management
       │       │   └── previewBridge.ts← Auto-detect & preview running apps
       │       └── media/
       │           └── welcome.html    ← Welcome page template
       │
       ├── /config/
       │   ├── settings.json           ← Pre-configured user settings
       │   ├── keybindings.json        ← Simplified keybindings
       │   ├── vibecoder.css           ← Custom CSS overrides
       │   └── extensions-list.txt     ← Extensions to pre-install
       │
       └── Dockerfile                  ← Production image
```

### 4.4 The vibecoder-layout Extension (Core Piece)

This bundled extension is the **brain** of the customization. It runs inside code-server and orchestrates the vibe-coding experience without deep forking of VS Code internals.

**Key responsibilities:**

```typescript
// extension.ts — simplified pseudocode

export function activate(context: vscode.ExtensionContext) {

  // 1. LAYOUT ORCHESTRATION
  //    On workspace open, arrange the panels
  arrangeDefaultLayout({
    primarySidebar: "chat",        // Open AI chat
    secondarySidebar: "collapsed", // Hide file explorer
    bottomPanel: "hidden",         // Hide terminal panel
    editorTabs: ["preview"]        // Open app preview tab
  });

  // 2. PERSISTENT TABS
  //    Register "pinned" viewer tabs that can't be accidentally closed
  registerPersistentTab("vibecoder.preview", {
    label: "🌐 App Preview",
    type: "simpleBrowser",
    url: "auto-detect",  // Scans for running dev server
    pinned: true
  });

  registerPersistentTab("vibecoder.shell", {
    label: ">_ Shell",
    type: "terminal",
    pinned: true
  });

  // 3. APP DETECTION
  //    Watch for dev servers starting, auto-open preview
  const portWatcher = new DevServerWatcher([3000, 5173, 8080, 19006]);
  portWatcher.onServerDetected((port) => {
    openPreviewTab(`http://localhost:${port}`);
  });

  // 4. WELCOME PAGE
  //    Show custom welcome on first open (no open files)
  if (noEditorsOpen()) {
    showWelcomePage({
      actions: [
        { label: "💬 Start Chatting", command: "workbench.action.chat.open" },
        { label: "📁 Open Project",   command: "workbench.action.files.openFolder" },
        { label: "📋 Templates",      command: "vibecoder.showTemplates" },
      ]
    });
  }

  // 5. QUICK ACTIONS
  //    Register simplified commands in command palette
  registerCommand("vibecoder.newApp", () => { /* scaffold wizard */ });
  registerCommand("vibecoder.deploy", () => { /* deployment flow */ });
  registerCommand("vibecoder.sharePreview", () => { /* generate share link */ });
}
```

---

## 5. Pre-Installed Extensions

### 5.1 Core (Required)

| Extension | Purpose | Tab It Powers |
|-----------|---------|---------------|
| **Claude Code** (or Cline/Roo Code) | AI chat panel in sidebar | Chat Panel |
| **Live Preview** (ms-vscode.live-server) | In-editor browser for web apps | 🌐 App Viewer tab |
| **Custom CSS** (workbench.html patch) | CSS overrides for UI polish | — |
| **vibecoder-layout** (custom, bundled) | Layout orchestrator, welcome page, tab mgmt | All tabs |

### 5.2 Viewer Tabs (Recommended)

| Extension | Purpose | Tab It Powers |
|-----------|---------|---------------|
| **SQLTools** + relevant driver | Database browser & query runner | 🗄 Database tab |
| **Thunder Client** | REST API testing (Postman-like) | 🧪 API tab |
| **GitHub Pull Requests & Issues** | GitHub integration | 🔗 GitHub tab |
| **Markdown Preview Enhanced** | Rich doc/notes viewer | 📝 Notes tab |

### 5.3 Developer Support (Hidden but Available)

| Extension | Purpose |
|-----------|---------|
| **ESLint** | Code linting (runs silently) |
| **Prettier** | Code formatting (runs on save) |
| **GitLens** | Git history (in secondary sidebar) |
| **Error Lens** | Inline error display |

### 5.4 Install Script

```bash
#!/bin/bash
# install-vibecoder-extensions.sh

EXTENSIONS=(
  # Core
  "ms-vscode.live-server"
  # Note: drcika.apc-extension is installed but non-functional in code-server v4.109.2
  # CSS is instead injected directly into workbench.html

  # Viewer tabs
  "mtxr.sqltools"
  "rangav.vscode-thunder-client"
  "GitHub.vscode-pull-request-github"
  "shd101wyy.markdown-preview-enhanced"

  # Developer support
  "dbaeumer.vscode-eslint"
  "esbenp.prettier-vscode"
  "eamodio.gitlens"
  "usernamehw.errorlens"
)

for ext in "${EXTENSIONS[@]}"; do
  code-server --install-extension "$ext" --force
done

# Install bundled custom extension
code-server --install-extension /opt/vibecoder/vibecoder-layout.vsix --force
```

---

## 6. Keybindings — Simplified

Override default keybindings to be more intuitive for non-programmers:

```jsonc
// keybindings.json
[
  // ── Tab Navigation ────────────────────────────────
  // Ctrl+1/2/3 to switch between pinned tabs
  { "key": "ctrl+1", "command": "vibecoder.openPreview" },
  { "key": "ctrl+2", "command": "vibecoder.openShell" },
  { "key": "ctrl+3", "command": "vibecoder.openDatabase" },

  // ── Panel Toggles ────────────────────────────────
  // Ctrl+B = toggle AI chat sidebar (was: toggle sidebar)
  { "key": "ctrl+b", "command": "workbench.action.toggleSidebarVisibility" },

  // Ctrl+E = toggle file explorer (secondary sidebar)
  { "key": "ctrl+e", "command": "workbench.action.toggleAuxiliaryBar" },

  // Ctrl+` = toggle terminal (as tab, not panel)
  { "key": "ctrl+`", "command": "workbench.action.terminal.toggleTerminal" },

  // ── Chat Shortcuts ────────────────────────────────
  // Ctrl+L = focus chat input (quick access)
  { "key": "ctrl+l", "command": "workbench.action.chat.open" },

  // ── File Operations ───────────────────────────────
  // Ctrl+S = save (already default, but ensure it works)
  { "key": "ctrl+s", "command": "workbench.action.files.save" },

  // Ctrl+Shift+N = new file from chat/template
  { "key": "ctrl+shift+n", "command": "vibecoder.newFile" }
]
```

---

## 7. Implementation Phases

### Phase 1 — Settings-Only MVP (1–2 days)

**Goal:** Reshape existing code-server with zero code changes.

- [x] Create `settings.json` with layout configs (Section 2) — DONE, v2 deployed with extra cleanup
- [x] Create `vibecoder.css` for visual polish — DONE (also using `apc.stylesheet` inline)
- [x] Create `keybindings.json` with simplified shortcuts — DONE
- [x] Write extension install script (Section 5.4) — DONE (installed manually, script in plan)
- [ ] Write Docker entrypoint / Dockerfile that pre-seeds all config files — TODO
- [x] Test: deploy to one code-server instance, validate layout — DONE, screenshot reviewed, v2 fixes deployed
- [x] Verify v2 fixes with fresh screenshot — DONE (`phase2_ui_update.png`)
- [x] Reduce activity bar icons to 3-4 — DONE (activity bar hidden entirely via `workbench.activityBar.location: "hidden"`)

**Deliverable:** A Docker image or provisioning script that turns any code-server into the VibeCoder layout. No fork needed.

### Phase 2 — Custom Extension (1–2 weeks)

**Goal:** Build the `vibecoder-layout` extension for smart tab management and welcome page.

- [x] Scaffold VS Code extension project — DONE (`extensions/vibecoder-layout/`)
- [x] Implement layout orchestrator (auto-arrange panels on startup) — DONE
- [x] ~~Implement persistent/pinned tabs~~ — POSTPONED (closing all tabs auto-shows Welcome page, which is sufficient)
- [x] Implement dev server auto-detection (watch ports, auto-open preview) — DONE
- [x] Build custom Welcome webview (quick actions, templates) — DONE
- [x] "+" New Tab button with tool picker — DONE (Terminal, App Preview + 4 placeholder tools)
- [ ] Build project template system (React, Next.js, React Native starters) — TODO
- [x] Package as `.vsix` and add to install script — DONE

**Deliverable:** A `.vsix` extension that provides the "smart" behaviors. Still no fork needed.

### Phase 3 — Light Fork (2–4 weeks)

**Goal:** Fork code-server for branding and menu/UI modifications that extensions can't reach.

- [ ] Fork `coder/code-server` repository
- [ ] Apply branding patch (logo, title, favicon → "VibeCoder")
- [ ] Simplify menu bar (rename/hide developer-heavy items)
- [ ] Customize right-click context menus
- [ ] Modify the default Activity Bar icon set
- [ ] Set up CI/CD for building forked Docker images
- [ ] Set up upstream merge strategy (quarterly sync)

**Deliverable:** A `vibecoder/code-server` Docker image with full branding.

### Phase 4 — Tab Bar Redesign (4–6 weeks)

**Goal:** Replace the file-tab metaphor with an app-like tab bar in the editor area.

- [ ] Design the new tab bar UX (Figma/mockup)
  - Fixed tabs on the left (Preview, Shell, DB) with icons + labels
  - Dynamic tabs on the right (open files) — closable
  - [x] "+" button to add new tool tabs — DONE (implemented via `editor/title` menu + CSS positioning)
- [ ] Implement as a VS Code webview-based custom editor tab bar
- [ ] OR implement as a code-server fork patch to the workbench
- [ ] Handle drag-reorder, tab overflow, tab groups

**Deliverable:** The full VibeCoder experience with a custom tab bar.

### Phase 5 — Ecosystem (Ongoing)

- [ ] Onboarding wizard ("What do you want to build?")
- [ ] One-click deploy integration (Railway, Vercel, Netlify)
- [ ] Mobile preview via Expo tunnel
- [ ] Collaboration features (share preview URL)
- [ ] Template marketplace (React, PERN, Next.js for Indonesian retail, etc.)
- [ ] Custom prompt templates for Claude Code (tailored to your domain)
- [ ] Role-based profiles: "Vibe Coder" vs "Developer" vs "Designer"

---

## 8. Docker Image Blueprint

```dockerfile
FROM codercom/code-server:latest
# OR: FROM vibecoder/code-server:latest  (after Phase 3 fork)

# ── System dependencies ──
USER root
RUN apt-get update && apt-get install -y \
    nodejs npm git postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# ── Pre-install extensions ──
USER coder
COPY config/extensions-list.txt /tmp/
RUN while read ext; do \
      code-server --install-extension "$ext" --force; \
    done < /tmp/extensions-list.txt

# ── Custom extension ──
COPY extensions/vibecoder-layout/vibecoder-layout.vsix /tmp/
RUN code-server --install-extension /tmp/vibecoder-layout.vsix --force

# ── Pre-seed user settings ──
COPY config/settings.json     /home/coder/.local/share/code-server/User/settings.json
COPY config/keybindings.json  /home/coder/.local/share/code-server/User/keybindings.json
COPY config/vibecoder.css     /home/coder/.local/share/code-server/User/vibecoder.css

# ── Project templates ──
COPY templates/ /home/coder/templates/

EXPOSE 8080
```

---

## 9. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Upstream code-server updates break fork patches** | High | Keep patches minimal and isolated. Use rebase strategy. Phase 1-2 need no fork. |
| **VS Code API doesn't support deep tab customization** | Medium | Use webview-based workaround for custom tab bar. Custom CSS as fallback. |
| **Extensions conflict with layout settings** | Low | Test extension combos. Lock extension versions in install script. |
| **Non-programmers still find it confusing** | Medium | User testing with actual non-coders. Iterative UX refinement. Onboarding wizard. |
| **Performance overhead from many extensions** | Low | Lazy-load extensions. Only activate viewer tabs when user opens them. |
| **Claude Code extension updates break integration** | Medium | Pin extension version. Test updates in staging before rolling out. |

---

## 10. Decision Matrix — Fork vs No-Fork

| Approach | Effort | Maintenance | UX Quality | Recommended Phase |
|----------|--------|-------------|------------|-------------------|
| **Settings + CSS only** | 1–2 days | Almost zero | ⭐⭐⭐ Good | Phase 1 (start here) |
| **Settings + Custom extension** | 1–2 weeks | Low | ⭐⭐⭐⭐ Great | Phase 2 (sweet spot) |
| **Light fork (branding + menus)** | 2–4 weeks | Medium | ⭐⭐⭐⭐ Great+ | Phase 3 (if needed) |
| **Deep fork (custom tab bar, UI)** | 4–8 weeks | High | ⭐⭐⭐⭐⭐ Excellent | Phase 4 (premium) |

> **Recommendation:** Start with Phase 1, validate with real users, then proceed to Phase 2. Most of the UX transformation happens in these two phases without any fork at all. Only fork when you hit a wall that settings and extensions truly cannot solve.
