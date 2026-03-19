<p align="center">
  <img src="assets/icons/icon.png" width="128" height="128" alt="Task Grabber">
</p>

<h1 align="center">Task Grabber</h1>

<p align="center">
  <b>Grab anything. Track everything.</b><br>
  Cross-platform task manager with kanban boards, timeline, calendar, focus mode, and AI assistant.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/electron-33-47848F?logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/react-18-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/typescript-5-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/sqlite-better--sqlite3-003B57?logo=sqlite" alt="SQLite">
</p>

---

## What is this?

Task Grabber is a desktop app that lives in your system tray and lets you capture tasks from anywhere — selected text, files, Outlook emails (.msg) — with a single hotkey. All tasks land on a kanban board with drag-and-drop, multiple views, and zero mandatory fields.

Built for speed. No accounts, no cloud, no BS. Your data stays on your machine in a local SQLite database.

## Features

### Core
- **Kanban board** with custom columns, colors, WIP limits, drag-and-drop
- **Multiple boards** — separate boards for different projects
- **Timeline view** — Gantt-style horizontal timeline, drag to set deadlines
- **Calendar view** — monthly grid, drag tasks between dates
- **Task updates** — activity log per task, quick update via right-click
- **Status indicators** — visual badges showing task status across all views

### Capture
- **Global hotkeys** — grab selected text (`Ctrl+Shift+T`), files (`Ctrl+Shift+F`), screenshots (`Ctrl+Shift+S`)
- **Outlook integration** — drag .msg files to create tasks from emails
- **Quick capture** — double-tap hotkey for instant task creation
- **Drop zone** — drag files/emails onto the board

### Productivity
- **Focus Mode** — Pomodoro timer in a separate always-on-top window
- **Desktop Widget** — floating widget showing top priority tasks
- **Smart Rules** — automation engine (IF trigger THEN action)
- **AI Assistant** — OpenRouter / Ollama integration for task analysis
- **Task Doctor** — audit wizard that finds problems in your tasks

### Organization
- **Tags** with colors, right-click to change color
- **Priority levels** (customizable colors)
- **Deadlines & reminders** with notifications
- **Recurring tasks** — daily, weekly, monthly, weekdays, custom
- **Related tasks** — link tasks together
- **File attachments** with preview
- **Projects** — project cards with metadata (team lead, architect, links)
- **Markdown descriptions** with clickable checklists

### Search & Filter
- **Global Search** (`Ctrl+Space`) — search across tasks, notes, boards
- **Command Palette** (`Ctrl+K`) — quick actions, navigation
- **Sidebar filters** — by tags, priority, source, board (collapsible sections)
- **Batch operations** — select multiple tasks, move/archive/delete

### Notes
- **Quick notes** (`Ctrl+Shift+N`) — capture thoughts instantly
- **Notes canvas** — grid view for all notes
- **Markdown** support with preview

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Electron 33 |
| Frontend | React 18 + TypeScript 5 |
| State | Zustand |
| UI | Tailwind CSS 3 |
| Drag & Drop | @dnd-kit |
| Database | SQLite (better-sqlite3) |
| Icons | Lucide React |
| Build | Vite 5 + electron-builder |
| CI/CD | GitHub Actions |

## Installation

### Download

Go to [Releases](../../releases/latest) and download:

| Platform | File |
|----------|------|
| Windows | `Task.Grabber.Setup.x.x.x.exe` |
| macOS (Intel) | `Task.Grabber-x.x.x.dmg` |
| macOS (Apple Silicon) | `Task.Grabber-x.x.x-arm64.dmg` |
| Linux | `Task.Grabber-x.x.x.AppImage` |
| ALT Linux / Fedora | `task-grabber-x.x.x.x86_64.rpm` |

### Build from source

```bash
git clone https://github.com/neuromanser89/task_grabber.git
cd task_grabber
npm install
npx electron-rebuild -f -w better-sqlite3
npm run build
npx electron-builder          # your platform
```

## Development

```bash
npm run dev     # Electron + Vite dev server (port 6173)
npm run build   # tsc (main) + vite build (renderer)
npm run pack    # build + electron-builder → release/
```

Architecture: 3 Electron windows (main, widget, focus), each with its own HTML entry point. Main process handles SQLite, hotkeys, tray, automation. Renderer is React + Zustand + Tailwind.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | Grab selected text → new task |
| `Ctrl+Shift+T` x2 | Quick capture (no dialog) |
| `Ctrl+Shift+F` | Grab files → new task |
| `Ctrl+Shift+N` | Quick note |
| `Ctrl+Shift+W` | Toggle desktop widget |
| `Ctrl+Shift+F2` | Toggle focus mode |
| `Ctrl+Shift+S` | Screenshot → new task |
| `Ctrl+K` | Command palette |
| `Ctrl+Space` | Global search |

## License

MIT
