# Task Grabber — PROJECT MAP

> Актуально после Phase 1–7 (2026-03-19)

---

## 1. Обзор проекта

**Task Grabber** — Windows tray-приложение для мгновенного создания задач из любого места: выделенный текст, файлы, письма Outlook (.msg). Включает канбан-доску с несколькими досками, Focus Mode (Pomodoro), Desktop Widget, AI-ассистент, Smart Rules, глобальный поиск, Timeline/Calendar view.

### Стек

| Слой | Технология |
|------|-----------|
| Runtime | Electron 33 |
| Frontend | React 18 + TypeScript 5 |
| State | Zustand 4 |
| UI | Tailwind CSS 3 + Framer Motion 11 |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| БД | SQLite (better-sqlite3 11, синхронный) |
| Хоткеи | Electron globalShortcut |
| MSG-парсинг | msgreader |
| Иконки | Lucide React |
| Сборка | Vite 5 (renderer) + tsc (main) + electron-builder 26 |

### Как запустить

```bash
npm run dev     # Electron + Vite dev server (порт 6173)
npm run build   # tsc (main) + vite build (renderer)
npm run pack    # build + electron-builder → release/
```

---

## 2. Дерево файлов

```
task_grabber/
├── src/
│   ├── main/                         # Electron main process
│   │   ├── main.ts                   # Entry point: createWindow, tray, hotkeys, IPC, поллеры
│   │   ├── tray.ts                   # System tray + контекстное меню
│   │   ├── hotkeys.ts                # Глобальные хоткеи (кастомизируемые, reloadHotkeys)
│   │   ├── ipc-handlers.ts           # Все ipcMain.handle — полный API между main и renderer
│   │   ├── preload.ts                # contextBridge: window.electronAPI
│   │   ├── widget.ts                 # Desktop Widget окно (always-on-top, transparent)
│   │   ├── focus-window.ts           # Focus Mode окно (Pomodoro таймер, always-on-top)
│   │   ├── automation.ts             # Авто-архив, напоминания об overdue, stale-задачи
│   │   ├── smart-rules.ts            # Движок Smart Rules (триггеры → действия)
│   │   ├── backup.ts                 # Автобэкап + восстановление БД
│   │   ├── file-handler.ts           # Копирование файлов в userData/storage
│   │   ├── msg-parser.ts             # Парсинг .msg писем Outlook (msgreader)
│   │   └── db/
│   │       ├── database.ts           # Инициализация SQLite + путь к файлу БД
│   │       ├── migrations.ts         # DDL всех таблиц + сидирование дефолтных данных
│   │       └── queries.ts            # Все CRUD-запросы (синхронные)
│   ├── renderer/                     # React UI
│   │   ├── index.html                # Entry для главного окна
│   │   ├── widget.html               # Entry для Desktop Widget
│   │   ├── focus.html                # Entry для Focus Mode
│   │   ├── main.tsx                  # ReactDOM.render → App
│   │   ├── widget-entry.tsx          # ReactDOM.render → Widget
│   │   ├── focus-entry.tsx           # ReactDOM.render → FocusWindow
│   │   ├── env.d.ts                  # Типы для window.electronAPI
│   │   ├── App.tsx                   # Корневой компонент: layout, темы, IPC-подписки
│   │   ├── Widget.tsx                # Desktop Widget: топ-задачи, клик → открыть
│   │   ├── FocusWindow.tsx           # Focus Mode: Pomodoro таймер, задача, сессии
│   │   ├── stores/
│   │   │   ├── taskStore.ts          # Zustand: задачи + фильтры
│   │   │   ├── columnStore.ts        # Zustand: колонки
│   │   │   ├── boardStore.ts         # Zustand: доски + activeBoardId
│   │   │   ├── noteStore.ts          # Zustand: заметки
│   │   │   └── projectStore.ts       # Zustand: проекты (CRUD)
│   │   ├── utils/
│   │   │   └── checklist.ts          # toggleChecklistItem, countChecklist
│   │   ├── hooks/
│   │   │   └── useKeyboardNav.ts     # Навигация по доске стрелками
│   │   ├── styles/
│   │   │   └── globals.css           # CSS-переменные тем, theme-aware классы, анимации
│   │   └── components/
│   │       ├── Board/
│   │       │   ├── KanbanBoard.tsx   # Канбан: DnD-контекст, колонки, фильтрация по доске
│   │       │   ├── Column.tsx        # Колонка: WIP-лимит, заголовок, список карточек
│   │       │   ├── ColumnEditor.tsx  # Редактор колонок (добавление, удаление, ренейм, цвет)
│   │       │   ├── BoardSwitcher.tsx # Переключатель досок в TitleBar
│   │       │   ├── TimelineView.tsx  # Timeline/Gantt вид задач
│   │       │   ├── CalendarView.tsx  # Календарный вид задач по датам
│   │       │   └── BatchToolbar.tsx  # Тулбар массовых действий
│   │       ├── Task/
│   │       │   ├── TaskCard.tsx      # Карточка задачи: приоритет, теги, вложения, источник
│   │       │   ├── TaskDetail.tsx    # Детальный вид (модалка): редактирование, вложения, теги, recurring, time tracking
│   │       │   ├── TaskCreateDialog.tsx # Диалог создания задачи (предзаполнение из clipboard/файлов)
│   │       │   └── RelatedTasks.tsx  # Связанные задачи в TaskDetail
│   │       ├── AI/
│   │       │   └── AIAssistantDialog.tsx # AI-ассистент: OpenRouter / Ollama, контекст из задач
│   │       ├── CommandPalette/
│   │       │   └── CommandPalette.tsx    # Ctrl+K: поиск задач/команд, навигация, смена темы
│   │       ├── GlobalSearch/
│   │       │   └── GlobalSearch.tsx      # Ctrl+Space: поиск по задачам/заметкам/доскам с подсветкой
│   │       ├── TaskDoctor/
│   │       │   └── TaskDoctorDialog.tsx  # Визард аудита задач (8 диагнозов, quick-fix)
│   │       ├── Projects/
│   │       │   └── ProjectsCanvasView.tsx # Канвас проектов (карточки с метаданными)
│   │       ├── Rules/
│   │       │   └── RulesDialog.tsx       # Визуальный конструктор Smart Rules (ЕСЛИ → ТО)
│   │       ├── DropZone/
│   │       │   └── DropZone.tsx          # Drag&drop зона для файлов и .msg
│   │       ├── Layout/
│   │       │   ├── TitleBar.tsx          # Кастомный title bar: BoardSwitcher, поиск, кнопки вида
│   │       │   ├── Sidebar.tsx           # Боковая панель: фильтры, теги, заметки, статистика
│   │       │   └── StatusBar.tsx         # Статус-бар: счётчики задач, хоткеи-подсказки
│   │       ├── Notes/
│   │       │   ├── NotesPanel.tsx        # Список заметок в Sidebar
│   │       │   └── QuickNoteDialog.tsx   # Ctrl+Shift+N: быстрая заметка
│   │       ├── Settings/
│   │       │   └── SettingsDialog.tsx    # Настройки: тема, хоткеи, автозапуск, автоматизация, бэкап
│   │       ├── Stats/
│   │       │   └── StatsPanel.tsx        # Статистика задач + архив
│   │       └── common/
│   │           ├── Button.tsx
│   │           ├── Input.tsx
│   │           ├── Modal.tsx
│   │           ├── Badge.tsx
│   │           ├── TagInput.tsx          # Autocomplete для тегов
│   │           ├── MarkdownEditor.tsx    # Markdown редактор с preview
│   │           └── Toast.tsx             # Toast-уведомления (success/error/info)
│   └── shared/
│       ├── types.ts                  # Все интерфейсы: Task, Column, Board, Tag, Note, Project, ColumnType + IPC-константы
│       └── constants.ts              # DEFAULT_COLUMNS, HOTKEYS, PRIORITY_*, SOURCE_ICONS, COLUMN_TYPE_LABELS
├── assets/
│   └── icons/
│       └── icon.ico                  # Иконка приложения
├── package.json
├── vite.config.ts
├── tsconfig.json                     # Для renderer
├── tsconfig.main.json                # Для main process
├── tailwind.config.js
├── electron-builder.yml
└── PROJECT_MAP.md
```

---

## 3. Архитектура

### Процессы Electron

```
┌─────────────────────────────────────────────────────────────┐
│  Main Process (Node.js)                                      │
│  main.ts → tray, hotkeys, ipc-handlers, widget, focus,      │
│            automation, smart-rules, backup, reminder-poller  │
│                                                              │
│  IPC (ipcMain.handle / ipcMain.on)                          │
│         ↕                                                    │
│  preload.ts (contextBridge → window.electronAPI)            │
│                                                              │
│  Renderer Processes (Chromium)                              │
│  ┌──────────────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │  Main Window     │ │   Widget   │ │   Focus Window   │  │
│  │  App.tsx         │ │ Widget.tsx │ │ FocusWindow.tsx  │  │
│  │  index.html:6173 │ │widget.html │ │  focus.html      │  │
│  └──────────────────┘ └────────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Три окна

| Окно | Файл | Описание |
|------|------|----------|
| Main | `main.ts` → `index.html` | 1200×800, frameless, скрывается в трей |
| Widget | `widget.ts` → `widget.html` | Прозрачное, always-on-top, перетаскиваемое |
| Focus | `focus-window.ts` → `focus.html` | Pomodoro таймер, always-on-top |

### Поллеры в main.ts

- **Reminder poller** — каждые 30 сек проверяет `getDueReminders()`, показывает `Notification`
- **Recurring poller** — каждый час проверяет `getDueRecurringTasks()`, спавнит новые вхождения
- **Automation + Smart Rules** — при старте через 5 сек, затем каждые 5 мин

---

## 4. React-компоненты

### App.tsx
Корневой компонент. Управляет состоянием всех диалогов/оверлеев, темой, IPC-подписками.

Рендерит: TitleBar → (KanbanBoard | TimelineView | CalendarView | NotesCanvasView | BoardFilesView | ProjectsCanvasView) + Sidebar + StatusBar + все диалоги.

Диалоги: TaskCreateDialog, QuickNoteDialog, SettingsDialog, CommandPalette, AIAssistantDialog, RulesDialog, GlobalSearch, TaskDoctorDialog.

### Board/KanbanBoard.tsx
DnD-контекст (@dnd-kit). Фильтрует задачи по `activeBoardId`. Рендерит Column-ы.

Props: `onCreateTask: () => void`, `onFocusSearch: () => void`

### Board/Column.tsx
Заголовок с иконкой, цветом, WIP-лимитом (визуальное предупреждение при превышении). SortableContext для карточек.

Props: `column: Column`, `tasks: TaskWithAttachments[]`, `onCreateTask: () => void`

### Board/ColumnEditor.tsx
Модалка редактирования колонок: добавить, удалить, переименовать, изменить цвет, иконку, WIP-лимит, порядок.

### Board/BoardSwitcher.tsx
Дропдаун в TitleBar для выбора активной доски. Создание/удаление досок.

### Board/TimelineView.tsx
Горизонтальная временная шкала с задачами по `due_date`.

### Board/CalendarView.tsx
Сетка-календарь по месяцам, задачи в ячейках дат.

### Board/BatchToolbar.tsx
Тулбар для массовых действий над выбранными задачами.

### Task/TaskCard.tsx
Карточка задачи с цветной полосой приоритета, тегами, иконкой источника, счётчиком вложений, датой.

Props: `task: TaskWithAttachments`, `onClick: () => void`

### Task/TaskDetail.tsx
Полная модалка задачи: редактирование заголовка/описания (Markdown), теги, вложения, дедлайн, напоминание, связанные задачи, recurring-правило, time tracking, архивирование, конфиденциальность.

Props: `task: TaskWithAttachments | null`, `onClose: () => void`

### Task/TaskCreateDialog.tsx
Диалог создания задачи. Предзаполнение из `initialText` (clipboard) и `initialFiles` (пути). Выбор колонки, приоритета, тегов, шаблонов.

Props: `isOpen: boolean`, `onClose: () => void`, `initialText: string`, `initialFiles: string[]`

### Task/RelatedTasks.tsx
Секция связанных задач в TaskDetail. Поиск и привязка.

Props: `taskId: string`

### AI/AIAssistantDialog.tsx
Чат-окно AI-ассистента. Провайдеры: OpenRouter и Ollama. Контекст из активных задач (конфиденциальные исключаются).

Props: `isOpen: boolean`, `onClose: () => void`

### CommandPalette/CommandPalette.tsx
Ctrl+K. Поиск задач, заметок, команд. Встроенные команды: новая задача, настройки, AI, смена темы, quick note, export, перемещение задачи в колонку.

Props: `isOpen`, `onClose`, `onNewTask`, `onSettings`, `onAI`, `onQuickNote`, `onThemeCycle`, `currentTheme`

### GlobalSearch/GlobalSearch.tsx
Ctrl+Space. Поиск по задачам, заметкам, доскам с подсветкой совпадений. Фильтры по типу, навигация клавиатурой.

Props: `isOpen: boolean`, `onClose: () => void`

### Rules/RulesDialog.tsx
Визуальный конструктор Smart Rules. ЕСЛИ (trigger_field + trigger_op + trigger_value) → ТО (action_type + action_value).

Props: `isOpen: boolean`, `onClose: () => void`

### TaskDoctor/TaskDoctorDialog.tsx
Визард аудита задач. Запускает 8 диагнозов (`overdue`, `deadline_soon`, `no_deadline`, `empty_description`, `stale_task`, `no_tags`, `no_priority`, `abandoned_checklist`), показывает список проблемных задач с severity (error/warning), позволяет применить quick-fix (переместить, проставить приоритет, теги и т.п.).

Props: `isOpen: boolean`, `onClose: () => void`

### Projects/ProjectsCanvasView.tsx
Канвас проектов. Карточки с метаданными: название, ответственный (rp), архитектор, год старта, флаг PMI, ссылки на Confluence и ПАП, связанный тег. CRUD через `useProjectStore`. Поиск по названию/RP/архитектору.

### DropZone/DropZone.tsx
Зона перетаскивания файлов. .msg → `parseMsg()`, остальные файлы → создаёт задачу с вложениями.

### Layout/TitleBar.tsx
Кастомный title bar: логотип, BoardSwitcher, кнопки вида (kanban/timeline/calendar), кнопки Settings/AI/Rules, кнопки окна.

Props: `onNewTask`, `onSettings`, `onAI`, `onRules`, `viewMode: ViewMode`, `onViewChange`

`ViewMode = 'kanban' | 'timeline' | 'calendar' | 'files' | 'notes' | 'projects'`

### Layout/Sidebar.tsx
Сворачиваемый sidebar: поиск, фильтры по тегам/приоритету/источнику, NotesPanel, StatsPanel.

Ref handle: `{ focusSearch: () => void }`

### Layout/StatusBar.tsx
Нижняя строка: общее число задач, создано сегодня, хоткей-подсказки.

### Notes/QuickNoteDialog.tsx
Мини-диалог быстрой заметки (Ctrl+Shift+N). Enter → сохранить.

Props: `isOpen: boolean`, `onClose: () => void`

### Settings/SettingsDialog.tsx
Настройки: тема (dark/light/system), кастомные хоткеи, автозапуск, параметры автоматизации, бэкап/восстановление, экспорт/импорт JSON.

Props: `isOpen`, `onClose`, `onThemeChange`, `currentTheme`

### common/Toast.tsx
`useToast()` hook + `ToastContainer`. Типы: `success | error | info`. Клик по тосту с taskId открывает задачу.

### common/MarkdownEditor.tsx
Переключение между редактированием и preview. Рендеринг через react-markdown + remark-gfm. Кликабельные чеклисты.

### common/TagInput.tsx
Автокомплит тегов с созданием новых. Рандомный цвет для новых тегов.

---

## 5. Zustand Stores

### taskStore.ts — `useTaskStore`

| Поле / Action | Тип | Описание |
|---------------|-----|----------|
| `tasks` | `TaskWithAttachments[]` | Все активные задачи |
| `loading` | `boolean` | |
| `searchQuery` | `string` | |
| `filterTags` | `string[]` | tag ID |
| `filterPriority` | `Priority[]` | |
| `filterSource` | `SourceType[]` | |
| `fetchAll()` | `() => Promise<void>` | |
| `createTask(data)` | `=> Promise<Task>` | |
| `updateTask(id, data)` | `=> Promise<void>` | |
| `deleteTask(id)` | `=> Promise<void>` | |
| `moveTask(id, colId, order)` | `=> Promise<void>` | |
| `addTaskToStore(task)` | `=> void` | Добавить без IPC |
| `updateTaskTags(taskId, tags)` | `=> void` | Обновить теги локально |
| `deleteAttachment(taskId, attId)` | `=> Promise<void>` | |
| `setSearch(q)` | `=> void` | |
| `toggleTagFilter(tagId)` | `=> void` | |
| `togglePriorityFilter(p)` | `=> void` | |
| `toggleSourceFilter(s)` | `=> void` | |
| `resetFilters()` | `=> void` | |
| `filteredTasks()` | `=> TaskWithAttachments[]` | Computed (не getter) |

### columnStore.ts — `useColumnStore`

| Action | Описание |
|--------|----------|
| `fetchColumns()` | |
| `createColumn(data)` | |
| `updateColumn(id, data)` | |
| `deleteColumn(id)` | |
| `reorderColumns(columns)` | Оптимистичное обновление + persist |

### boardStore.ts — `useBoardStore`

| Поле / Action | Описание |
|---------------|----------|
| `boards: Board[]` | |
| `activeBoardId: string \| null` | Текущая доска |
| `fetchBoards()` | Загрузить, установить первую активной |
| `createBoard(data)` | |
| `updateBoard(id, data)` | |
| `deleteBoard(id)` | Удалить, переключить на следующую |
| `setActiveBoard(id)` | |

### noteStore.ts — `useNoteStore`

| Action | Описание |
|--------|----------|
| `fetchNotes()` | |
| `createNote(content)` | |
| `updateNote(id, content)` | |
| `deleteNote(id)` | |

### projectStore.ts — `useProjectStore`

| Поле / Action | Тип | Описание |
|---------------|-----|----------|
| `projects` | `Project[]` | Все проекты |
| `loading` | `boolean` | |
| `fetchProjects()` | `=> Promise<void>` | |
| `createProject(data)` | `=> Promise<Project>` | |
| `updateProject(id, data)` | `=> Promise<void>` | |
| `deleteProject(id)` | `=> Promise<void>` | |

---

## 6. IPC-каналы

### ipcMain.handle (invoke из renderer)

| Канал | Описание |
|-------|----------|
| `boards:getAll` | Все доски |
| `boards:create` | Создать доску |
| `boards:update` | Обновить |
| `boards:delete` | Удалить |
| `columns:getAll` | Все колонки |
| `columns:create` | Создать |
| `columns:update` | Обновить |
| `columns:delete` | Удалить |
| `tasks:getAll` | Все активные задачи с вложениями и тегами |
| `tasks:create` | Создать |
| `tasks:update` | Обновить |
| `tasks:move` | Переместить (columnId + sortOrder) |
| `tasks:delete` | Удалить |
| `tasks:archive` | Архивировать |
| `tasks:unarchive` | Разархивировать |
| `tasks:getArchived` | Архивированные |
| `tasks:getStats` | Статистика |
| `attachments:add` | Добавить вложение (путь → storage) |
| `attachments:delete` | Удалить |
| `file:open` | Открыть файл из storage (shell.openPath) |
| `msg:parse` | Парсить .msg → создать задачу автоматически |
| `tags:getAll` | Все теги |
| `tags:create` | Создать |
| `tags:delete` | Удалить |
| `task-tags:add` | Привязать тег к задаче |
| `task-tags:remove` | Отвязать |
| `notes:getAll` | |
| `notes:create` | |
| `notes:update` | |
| `notes:delete` | |
| `templates:getAll` | |
| `templates:create` | |
| `templates:delete` | |
| `related:get` | Связанные задачи |
| `related:add` | Добавить связь |
| `related:remove` | Убрать |
| `settings:getAll` | Все настройки |
| `settings:get` | Одна по key |
| `settings:set` | Установить |
| `settings:getAutoLaunch` | Статус автозапуска |
| `settings:setAutoLaunch` | Вкл/выкл |
| `data:export` | Экспорт JSON (dialog) |
| `data:import` | Импорт JSON (dialog) |
| `backup:list` | Список бэкапов |
| `backup:create` | Создать бэкап |
| `backup:restore` | Восстановить |
| `focus:start` | Начать фокус-сессию |
| `focus:end` | Завершить (duration + notes) |
| `focus:getByTask` | Сессии по задаче |
| `focus:getTotalTime` | Суммарное время |
| `focus:update-time` | Добавить время |
| `focus:complete` | Завершить + переместить в "Готово" |
| `ai:query` | Запрос к AI (OpenRouter/Ollama) |
| `recurring:setRule` | Установить правило повторения |
| `rules:getAll` | Все Smart Rules |
| `rules:create` | |
| `rules:update` | |
| `rules:delete` | |
| `rules:run` | Запустить вручную |
| `automation:run` | Запустить автоматизацию вручную |
| `projects:getAll` | Все проекты |
| `projects:create` | Создать проект |
| `projects:update` | Обновить проект |
| `projects:delete` | Удалить проект |
| `shell:openExternal` | Открыть URL в браузере (shell.openExternal) |

### ipcMain.on (send из renderer)

| Канал | Описание |
|-------|----------|
| `window:minimize` | |
| `window:maximize` | |
| `window:close` | Скрыть в трей |
| `hotkeys:reload` | Перезагрузить хоткеи из settings |
| `widget:openTask` | Открыть задачу из Widget |
| `focus:close` | Закрыть Focus окно |
| `focus:set-mini` | Переключить в мини-режим |

### Main → Renderer (webContents.send)

| Канал | Данные | Описание |
|-------|--------|----------|
| `grab:text` | `string` | Текст для создания задачи |
| `grab:files` | `string[]` | Пути файлов |
| `grab:instant` | `string` | Quick capture без диалога |
| `dialog:showCreate` | — | Открыть диалог создания |
| `dialog:showQuickNote` | — | |
| `reminder:show` | `taskId` | Кликнули по напоминанию |
| `screenshot:capture` | — | |
| `automation:toast` | `string` | Тост от автоматизации |
| `tasks:refresh` | — | Обновить задачи (recurring) |
| `focus:setTask` | `taskId` | Передать задачу в Focus |
| `widget:openTask` | `taskId` | Открыть из Widget |
| `search:open` | — | Открыть Global Search |

---

## 7. Схема БД (SQLite)

БД: `app.getPath('userData')/taskgrabber.db`

### boards
```sql
CREATE TABLE boards (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6', icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### columns
```sql
CREATE TABLE columns (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL, icon TEXT,
  sort_order INTEGER NOT NULL, is_default INTEGER DEFAULT 0,
  board_id TEXT,        -- FK → boards.id (добавлен через ALTER)
  wip_limit INTEGER,    -- NULL = без лимита
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```
Дефолтные колонки: Новые (#3B82F6), В работе (#F59E0B), Ждём (#8B5CF6), Готово (#10B981), Забито (#6B7280).

### tasks
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
  column_id TEXT NOT NULL REFERENCES columns(id),
  sort_order INTEGER NOT NULL,
  priority INTEGER DEFAULT 0,         -- 0=нет 1=низкий 2=средний 3=высокий
  color TEXT,
  source_type TEXT DEFAULT 'manual',  -- 'manual'|'text'|'file'|'email'
  source_info TEXT,                   -- JSON с метаданными источника
  due_date TEXT,                      -- ISO date
  reminder_at TEXT,                   -- ISO datetime
  archived_at TEXT,                   -- NULL = активна
  is_confidential INTEGER DEFAULT 0,  -- скрывать из AI-контекста
  recurrence_rule TEXT,               -- 'daily'|'weekly'|'monthly'|'weekdays'|'custom:N:day|week|month'
  recurrence_next TEXT,               -- ISO date следующего вхождения
  time_spent INTEGER DEFAULT 0,       -- секунды фокуса
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### attachments
```sql
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  filename TEXT NOT NULL, filepath TEXT NOT NULL,
  filesize INTEGER, mime_type TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
-- Лимит размера: 100 MB
```

### tags
```sql
CREATE TABLE tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, color TEXT NOT NULL);
```

### task_tags
```sql
CREATE TABLE task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  TEXT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);
```

### notes
```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY, content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### settings
```sql
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
```
Ключи: `autoLaunch`, `theme`, `hotkeys` (JSON), `automation_autoArchive`, `automation_autoArchiveDays`, `automation_overdueReminders`, `automation_staleHighPriority`.

### task_templates
```sql
CREATE TABLE task_templates (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
  priority INTEGER DEFAULT 0, tags TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);
```

### related_tasks
```sql
CREATE TABLE related_tasks (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  related_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, related_task_id)
);
```

### focus_sessions
```sql
CREATE TABLE focus_sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  started_at TEXT NOT NULL, ended_at TEXT,
  duration INTEGER, notes TEXT
);
```

### projects
```sql
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  confluence  TEXT,
  pap_url     TEXT,
  rp          TEXT,
  start_year  INTEGER,
  pmi_done    INTEGER DEFAULT 0,
  pmi_url     TEXT,
  architect   TEXT DEFAULT 'Я',
  tag_id      TEXT,   -- FK → tags.id (опциональная связь)
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);
```

### rules (Smart Rules)
```sql
CREATE TABLE rules (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, enabled INTEGER DEFAULT 1,
  trigger_field TEXT NOT NULL,  -- 'priority'|'column_id'|'due_date'|'tag'|'title'|'source_type'|'in_column_days'|'no_activity_days'
  trigger_op TEXT NOT NULL,     -- 'equals'|'not_equals'|'contains'|'overdue'|'greater_than'|'less_than'|'more_than_days'
  trigger_value TEXT NOT NULL,
  action_type TEXT NOT NULL,    -- 'move_to_column'|'set_priority'|'add_tag'|'archive'|'set_color'|'notify'
  action_value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 8. Хоткеи

### Глобальные (из любого места Windows)

| Хоткей | Действие |
|--------|----------|
| `Ctrl+Shift+T` (первое нажатие) | Открыть диалог создания задачи с текстом из clipboard |
| `Ctrl+Shift+T` (второе нажатие < 500ms) | Quick Capture — создать задачу без диалога |
| `Ctrl+Shift+F` | Открыть диалог создания (для файлов) |
| `Ctrl+Shift+N` | Быстрая заметка |
| `Ctrl+Shift+W` | Показать / скрыть Desktop Widget |
| `Ctrl+Shift+F2` | Показать / скрыть Focus Mode |
| `Ctrl+Shift+S` | Скриншот → диалог создания задачи |
| `Ctrl+Space` | Global Search Overlay |

GRAB_TEXT, GRAB_FILES, QUICK_NOTE, SCREENSHOT — кастомизируются в Settings, хранятся в `settings.hotkeys` (JSON).

### Внутри приложения

| Хоткей | Действие |
|--------|----------|
| `Ctrl+K` | Command Palette |
| Стрелки | Навигация по задачам (useKeyboardNav) |

---

## 9. Ключевые типы (`src/shared/types.ts`)

| Тип | Описание |
|-----|----------|
| `Task` | Задача (id, title, description, column_id, priority, source_type, ...) |
| `TaskWithAttachments` | `Task` + `attachments: Attachment[]` + `tags: Tag[]` |
| `Column` | Колонка (id, name, color, icon, sort_order, board_id, wip_limit, **column_type**) |
| `ColumnType` | `'backlog' \| 'in_progress' \| 'waiting' \| 'done' \| 'cancelled' \| null` — семантический тип колонки |
| `Board` | Доска (id, name, color, icon, sort_order) |
| `Tag` | Тег (id, name, color) |
| `Note` | Заметка (id, content, created_at, updated_at) |
| `Project` | Проект (id, name, confluence, pap_url, rp, start_year, pmi_done, pmi_url, architect, tag_id, sort_order) |
| `ViewMode` | `'kanban' \| 'timeline' \| 'calendar' \| 'files' \| 'notes' \| 'projects'` (в TitleBar.tsx) |

---

## 10. Конфиги (Vite, TS, Tailwind)

### vite.config.ts
- Root: `src/renderer`
- 3 entry points: `index.html`, `widget.html`, `focus.html`
- Output: `dist/renderer`
- Dev server: порт **6173** (strictPort)
- Alias: `@shared` → `src/shared`

### tsconfig.main.json
Компилирует `src/main/**/*.ts` → `dist/main/`. Для main process.

### tailwind.config.js
- `darkMode: 'class'` (переключение через `.light` / `.dark` на `<html>`)
- Цвета: `bg.*`, `glass.*`, `accent.*`
- Анимации: `fade-in`, `fade-in-scale`, `slide-up`, `glow-pulse`, `shimmer`
- Тени: `glow-blue`, `glow-purple`, `glow-sm`, `card-hover`, `drag`

### electron-builder.yml
- `appId: com.taskgrabber.app`
- Target: Windows NSIS x64
- `asar: true`, `asarUnpack: better-sqlite3` (нативный модуль)
- Output: `release/`

---

## 11. Дизайн-система

### CSS-переменные тем (`globals.css`)

| Переменная | Dark | Light |
|-----------|------|-------|
| `--bg-primary` | `#0F0F0F` | `#F8F9FA` |
| `--bg-secondary` | `#1A1A2E` | `#FFFFFF` |
| `--bg-tertiary` | `#16213E` | `#EFF1F5` |
| `--bg-card` | `#0F0F1A` | `#FFFFFF` |
| `--text-primary` | `rgba(255,255,255,0.9)` | `rgba(0,0,0,0.87)` |
| `--text-secondary` | `rgba(255,255,255,0.6)` | `rgba(0,0,0,0.55)` |
| `--text-muted` | `rgba(255,255,255,0.35)` | `rgba(0,0,0,0.35)` |
| `--border-color` | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.08)` |
| `--glass-bg` | `rgba(26,26,46,0.6)` | `rgba(255,255,255,0.7)` |
| `--glass-heavy` | `rgba(26,26,46,0.8)` | `rgba(255,255,255,0.9)` |

### Theme-aware utility-классы

Паттерн: `.text-t-XX` (текст opacity XX%), `.bg-t-XX` (фон), `.border-t-XX` (граница). При `.light` на `<html>` — автоматически переключаются на `rgba(0,0,0,...)`.

- `.text-t-primary` / `.text-t-secondary` / `.text-t-muted` — семантические
- `.text-t-50`, `.text-t-70`, `.text-t-85` — процентные (05–90)
- `.bg-t-02`–`.bg-t-12` — тонкие фоновые оверлеи
- `.border-t-04`–`.border-t-15` — границы
- Hover-варианты: `.hover:bg-t-08`, `.hover:text-t-80` и т.д.
- Group-hover: `.group-hover:text-t-90`, `.group-hover:opacity-t-100`

### Glassmorphism-классы

| Класс | Blur | Описание |
|-------|------|----------|
| `.glass` | 16px | `var(--glass-bg)` + border |
| `.glass-heavy` | 24px | `var(--glass-heavy)` |
| `.glass-card` | 8px | `var(--glass-card)` |

### CSS-анимации (globals.css)

| Keyframe | Описание |
|----------|----------|
| `fadeInScale` | Появление с лёгким масштабом (модалки) |
| `overlayFadeIn` | Плавное появление оверлея |
| `cardEnter` | Карточка снизу вверх |

### Прочие утилиты

| Класс | Описание |
|-------|----------|
| `.drag-region` | `-webkit-app-region: drag` (frameless) |
| `.no-drag` | Отмена drag в drag-регионе |
| `.gradient-border-bottom` / `.gradient-border-top` | Градиентные линии через `::after`/`::before` |
| `.glow-accent` | Hover-свечение через `::before` |
| `.column-drop-active` | Glow при DnD-дропе в колонку |
| `.markdown-body` | Стили для Markdown-рендеринга |
| `.scrollbar-thin` | Тонкий кастомный скроллбар |
