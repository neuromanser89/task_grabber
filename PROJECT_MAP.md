# PROJECT_MAP.md — Task Grabber

> Карта проекта для Claude. Читать перед любой работой с кодом.

---

## 1. Обзор проекта

**Task Grabber** — Windows tray-приложение для мгновенного создания задач из любого места: выделенный текст, файлы, письма Outlook (.msg). Канбан-доска с drag&drop, кастомными колонками, тегами, вложениями, фокус-сессиями и автоматизацией.

**Статус:** Phase 3 полностью завершена. Все фичи реализованы.

### Стек

| Компонент | Технология |
|-----------|-----------|
| Runtime | Electron 33 |
| Frontend | React 18 + TypeScript |
| State | Zustand 4 |
| UI | Tailwind CSS 3 + Framer Motion 11 |
| Drag&Drop | @dnd-kit/core + @dnd-kit/sortable |
| БД | SQLite (better-sqlite3, синхронный) |
| Глобальные хоткеи | Electron globalShortcut |
| .msg парсинг | msgreader |
| Markdown | react-markdown + remark-gfm |
| Иконки | Lucide React |
| Сборка | electron-builder (NSIS для Windows) |

### Запуск

```bash
npm run dev      # Dev режим: Vite (порт 6173) + Electron
npm run build    # Сборка: tsc + vite build
npm run pack     # Сборка + создание инсталлятора
```

---

## 2. Структура файлов

```
task_grabber/
├── src/
│   ├── main/                         # Electron main process (Node.js)
│   │   ├── main.ts                   # Entry: создаёт окно, запускает всё
│   │   ├── preload.ts                # Мост main↔renderer (contextBridge)
│   │   ├── ipc-handlers.ts           # Все IPC handle/on обработчики
│   │   ├── hotkeys.ts                # Глобальные хоткеи (Ctrl+Shift+T/F/N/S)
│   │   ├── tray.ts                   # System tray + контекстное меню
│   │   ├── widget.ts                 # Мини-виджет окно (alwaysOnTop)
│   │   ├── focus-window.ts           # Фокус-таймер окно (alwaysOnTop)
│   │   ├── automation.ts             # Автоматизация: автоархив, напоминания
│   │   ├── backup.ts                 # Бэкап/восстановление БД
│   │   ├── msg-parser.ts             # Парсинг .msg файлов Outlook
│   │   ├── file-handler.ts           # Копирование файлов в userData/storage
│   │   └── db/
│   │       ├── database.ts           # Инициализация SQLite (WAL mode)
│   │       ├── migrations.ts         # Создание таблиц + ALTER migrations
│   │       └── queries.ts            # Все CRUD операции
│   ├── renderer/                     # React UI
│   │   ├── index.html                # Главное окно
│   │   ├── widget.html               # HTML для виджет-окна
│   │   ├── focus.html                # HTML для фокус-окна
│   │   ├── main.tsx                  # React entry для главного окна
│   │   ├── widget-entry.tsx          # React entry для виджета
│   │   ├── focus-entry.tsx           # React entry для фокуса
│   │   ├── App.tsx                   # Root компонент: layout + глобальные события
│   │   ├── Widget.tsx                # Виджет компонент (мини-доска)
│   │   ├── FocusWindow.tsx           # Фокус-таймер компонент
│   │   ├── env.d.ts                  # Типы для window.electronAPI
│   │   ├── stores/
│   │   │   ├── taskStore.ts          # Zustand: задачи + фильтры
│   │   │   ├── columnStore.ts        # Zustand: колонки
│   │   │   └── noteStore.ts          # Zustand: заметки
│   │   ├── hooks/
│   │   │   └── useKeyboardNav.ts     # Хук: клавиатурная навигация по доске
│   │   ├── components/
│   │   │   ├── Board/
│   │   │   │   ├── KanbanBoard.tsx   # Главная доска + DnD контекст
│   │   │   │   ├── Column.tsx        # Колонка: сортируемая, droppable
│   │   │   │   └── ColumnEditor.tsx  # Попап редактора колонки (правый клик)
│   │   │   ├── Task/
│   │   │   │   ├── TaskCard.tsx      # Карточка задачи (sortable)
│   │   │   │   ├── TaskDetail.tsx    # Модалка детального вида задачи
│   │   │   │   ├── TaskCreateDialog.tsx # Диалог создания задачи
│   │   │   │   └── RelatedTasks.tsx  # Блок связанных задач
│   │   │   ├── DropZone/
│   │   │   │   └── DropZone.tsx      # Зона drag&drop файлов/писем (внизу)
│   │   │   ├── Layout/
│   │   │   │   ├── TitleBar.tsx      # Кастомный title bar (frameless window)
│   │   │   │   ├── Sidebar.tsx       # Боковая панель (фильтры/заметки/статистика)
│   │   │   │   └── StatusBar.tsx     # Статус бар снизу
│   │   │   ├── Notes/
│   │   │   │   ├── QuickNoteDialog.tsx  # Диалог быстрой заметки
│   │   │   │   └── NotesPanel.tsx    # Панель заметок в Sidebar
│   │   │   ├── Stats/
│   │   │   │   └── StatsPanel.tsx    # Панель статистики + архив
│   │   │   ├── Settings/
│   │   │   │   └── SettingsDialog.tsx # Настройки: хоткеи, тема, автозапуск и т.д.
│   │   │   ├── CommandPalette/
│   │   │   │   └── CommandPalette.tsx # Ctrl+K палитра команд
│   │   │   ├── AI/
│   │   │   │   └── AIAssistantDialog.tsx # AI ассистент (OpenRouter/Ollama)
│   │   │   └── common/
│   │   │       ├── Button.tsx        # Кнопка
│   │   │       ├── Input.tsx         # Инпут
│   │   │       ├── Modal.tsx         # Базовая модалка
│   │   │       ├── Badge.tsx         # Бейдж
│   │   │       ├── Toast.tsx         # Toast уведомления + useToast хук
│   │   │       ├── TagInput.tsx      # Инпут тегов с autocomplete
│   │   │       └── MarkdownEditor.tsx # Редактор markdown
│   │   └── styles/
│   │       └── globals.css           # Глобальные стили, CSS переменные, .glass классы
│   └── shared/
│       ├── types.ts                  # Все TypeScript типы + IPC константы
│       └── constants.ts             # DEFAULT_COLUMNS, HOTKEYS, PRIORITY_*
├── assets/
│   └── icons/                       # Иконки приложения (icon.ico)
├── package.json
├── tsconfig.json                    # Renderer TypeScript конфиг
├── tsconfig.main.json               # Main process TypeScript конфиг
├── tailwind.config.js
├── vite.config.ts                   # Vite: 3 entry points (main/widget/focus)
└── electron-builder.yml             # Сборка: NSIS x64
```

---

## 3. Архитектура

### Main Process vs Renderer

```
Main Process (Node.js)          Renderer Process (React)
─────────────────────           ────────────────────────
main.ts                         App.tsx
  ├─ setupTray()                  ├─ KanbanBoard
  ├─ setupHotkeys()               ├─ Sidebar
  ├─ setupIpcHandlers()           ├─ TaskDetail (modal)
  ├─ setupWidgetHotkey/Ipc()      ├─ SettingsDialog
  ├─ setupFocusHotkey/Ipc()       ├─ CommandPalette
  ├─ startReminderPoller()        └─ AIAssistantDialog
  ├─ startRecurringPoller()
  └─ runAutomation() (5min)

Preload (contextBridge):
  window.electronAPI = { все методы }
```

### Windows

| Окно | Файл | Размер | Особенности |
|------|------|--------|-------------|
| Главное | `index.html` | 1200×800 | `frame: false`, тёмный фон |
| Виджет | `widget.html` | 300×400 | `alwaysOnTop`, `transparent`, `skipTaskbar` |
| Фокус | `focus.html` | 360×520 | `alwaysOnTop`, `transparent`, `skipTaskbar` |

### Безопасность

- `contextIsolation: true`, `nodeIntegration: false`
- Все IPC через `contextBridge.exposeInMainWorld`
- SQL injection защита: `safeFilterFields()` с whitelist полей
- Path traversal защита: `file:open` только из `userData/storage`
- Размер вложений: макс 100MB

---

## 4. Компоненты

### App.tsx
Root компонент. Управляет: темой, модалками, глобальными IPC событиями.
- Props: нет (root)
- State: `showCreateDialog`, `showQuickNote`, `showSettings`, `showPalette`, `showAI`, `initialText`, `initialFiles`, `sidebarCollapsed`, `theme`
- IPC listeners: `onGrabText`, `onGrabFiles`, `onShowCreateDialog`, `onShowQuickNote`, `onGrabInstant`, `onScreenshotCapture`, `onAutomationToast`
- Keyboard: `Ctrl+K` → CommandPalette

### KanbanBoard.tsx
Главная доска с DnD. Управляет колонками и задачами через dnd-kit.
- Props: `onCreateTask?`, `onFocusSearch?`
- Загружает задачи и колонки при mount
- DnD: задачи между колонками + сортировка колонок
- WIP limit: показывает toast при превышении
- Keyboard nav через `useKeyboardNav`

### Column.tsx
Одна колонка канбана.
- Props: `column`, `tasks`, `onTaskClick?`, `isDragOverlay?`, `selectedTaskId?`
- `useSortable` с ID `col::${column.id}` (префикс для различения от task IDs)
- `useDroppable` с ID `column.id`
- WIP limit: красная полоска + badge `tasks/limit` при превышении
- ContextMenu (правый клик) → открывает `ColumnEditor`

### TaskCard.tsx
Карточка задачи.
- Props: `task`, `isDragOverlay?`, `isSelected?`, `onClick?`
- `useSortable` с ID `task.id`
- Показывает: приоритет (полоска), теги, дедлайн, вложения, чеклист прогресс, время
- Кнопка фокус-таймера (hover, отправляет `focus:openTask` IPC)

### TaskDetail.tsx
Модалка детального вида задачи.
- Props: `task`, `isOpen`, `onClose`
- Редактирование: title, description (markdown), priority, column, due_date, reminder, tags
- Вложения: drag&drop + превью изображений
- Чеклисты: кликабельные (toggle done/undone)
- Архивирование задачи
- Связанные задачи через `RelatedTasks`
- Конфиденциальность (`is_confidential`)
- Повторяемость (`recurrence_rule`)

### TaskCreateDialog.tsx
Диалог создания задачи (открывается по хоткею или кнопке).
- Props: `isOpen`, `onClose`, `initialText?`, `initialFiles?`
- Предзаполняет title из первой строки текста
- Поддерживает drag&drop файлов прямо в диалог
- Поддерживает шаблоны задач

### Sidebar.tsx
Боковая панель (200px, сворачивается до 10px).
- Props: `collapsed`, `onToggle`
- Ref: `SidebarHandle { focusSearch() }`
- Вкладки: Фильтры / Заметки / Статистика
- Фильтры: текстовый поиск, теги, приоритет, источник

### TitleBar.tsx
Кастомный title bar для frameless окна.
- Props: `onNewTask`, `onSettings`, `onAI`
- Кнопки: drag region, новая задача, настройки, AI, minimize/maximize/close

### StatusBar.tsx
Нижний статус бар. Показывает: кол-во задач, создано сегодня, хоткей подсказка.

### SettingsDialog.tsx
Настройки приложения.
- Props: `isOpen`, `onClose`, `onThemeChange`, `currentTheme`
- Разделы: Тема, Хоткеи, Автозапуск, Экспорт/Импорт, Бэкапы, Автоматизация, Шаблоны, AI

### CommandPalette.tsx
Палитра команд (Ctrl+K).
- Props: `isOpen`, `onClose`, `onNewTask`, `onSettings`, `onAI`, `onQuickNote`, `onThemeCycle`, `currentTheme`
- Fuzzy search по командам

### AIAssistantDialog.tsx
AI ассистент. Поддерживает OpenRouter и Ollama.
- Props: `isOpen`, `onClose`
- Читает настройки `ai_provider`, `ai_model`, `ai_api_key`, `ai_base_url`
- Отправляет через `window.electronAPI.aiQuery()`

### DropZone.tsx
Зона внизу доски для drag&drop файлов и .msg писем.
- Автоопределяет .msg → парсит через `window.electronAPI.parseMsg()`
- Обычные файлы → создаёт задачу с вложениями

### Widget.tsx / FocusWindow.tsx
Отдельные React-приложения для popup окон. Используют тот же `window.electronAPI`.

---

## 5. Zustand Stores

### taskStore.ts (`useTaskStore`)

```typescript
State:
  tasks: TaskWithAttachments[]
  loading: boolean
  searchQuery: string
  filterTags: string[]        // tag IDs
  filterPriority: Priority[]
  filterSource: SourceType[]

Actions:
  fetchAll()                  // Загрузить все задачи из БД
  createTask(data)            // Создать + добавить в store
  updateTask(id, data)        // Обновить в БД + store
  deleteTask(id)              // Удалить из БД + store
  moveTask(id, colId, order)  // Переместить задачу
  addTaskToStore(task)        // Добавить уже созданную задачу
  updateTaskTags(taskId, tags) // Обновить теги в store
  deleteAttachment(taskId, attId) // Удалить вложение

  setSearch(q)
  toggleTagFilter(tagId)
  togglePriorityFilter(p)
  toggleSourceFilter(s)
  resetFilters()
  filteredTasks()             // Computed: применяет все фильтры
```

### columnStore.ts (`useColumnStore`)

```typescript
State:
  columns: Column[]
  loading: boolean

Actions:
  fetchColumns()
  createColumn(data)
  updateColumn(id, data)
  deleteColumn(id)
  reorderColumns(columns)   // Оптимистично обновляет sort_order
```

### noteStore.ts (`useNoteStore`)

```typescript
State:
  notes: Note[]
  loading: boolean

Actions:
  fetchNotes()
  createNote(content)
  updateNote(id, content)
  deleteNote(id)
```

---

## 6. IPC каналы

### Renderer → Main (invoke/handle)

| Канал | Параметры | Возвращает |
|-------|-----------|-----------|
| `tasks:getAll` | — | `TaskWithAttachments[]` |
| `tasks:create` | `Omit<Task, 'id'\|'created_at'\|'updated_at'>` | `Task` |
| `tasks:update` | `id, Partial<Task>` | `Task` |
| `tasks:delete` | `id` | `true` |
| `tasks:move` | `id, columnId, sortOrder` | `true` |
| `tasks:archive` | `id` | `true` |
| `tasks:unarchive` | `id` | `true` |
| `tasks:getArchived` | — | `TaskWithAttachments[]` |
| `tasks:getStats` | — | `TaskStats` |
| `columns:getAll` | — | `Column[]` |
| `columns:create` | data | `Column` |
| `columns:update` | `id, data` | `Column` |
| `columns:delete` | `id` | `true` |
| `attachments:add` | `taskId, filePath` | `Attachment` |
| `attachments:delete` | `id` | `true` |
| `file:open` | `filePath` | `true` |
| `msg:parse` | `filePath` | `TaskWithAttachments` |
| `tags:getAll` | — | `Tag[]` |
| `tags:create` | `name, color` | `Tag` |
| `tags:delete` | `id` | `true` |
| `task-tags:add` | `taskId, tagId` | `true` |
| `task-tags:remove` | `taskId, tagId` | `true` |
| `notes:getAll` | — | `Note[]` |
| `notes:create` | `content` | `Note` |
| `notes:update` | `id, content` | `Note` |
| `notes:delete` | `id` | `true` |
| `templates:getAll` | — | `TaskTemplate[]` |
| `templates:create` | data | `TaskTemplate` |
| `templates:delete` | `id` | `true` |
| `settings:getAll` | — | `Record<string,string>` |
| `settings:get` | `key` | `string\|null` |
| `settings:set` | `key, value` | `true` |
| `settings:getAutoLaunch` | — | `boolean` |
| `settings:setAutoLaunch` | `enable` | `true` |
| `related:get` | `taskId` | `Task[]` |
| `related:add` | `taskId, relatedId` | `true` |
| `related:remove` | `taskId, relatedId` | `true` |
| `data:export` | — | `{success, filePath?}` |
| `data:import` | — | `{success, error?}` |
| `backup:list` | — | `string[]` |
| `backup:create` | — | `{success, backupPath}` |
| `backup:restore` | `backupPath` | `{success}` |
| `focus:start` | `taskId\|null` | `FocusSession` |
| `focus:end` | `id, duration, notes` | `FocusSession` |
| `focus:getByTask` | `taskId` | `FocusSession[]` |
| `focus:getTotalTime` | `taskId` | `number` (seconds) |
| `focus:update-time` | `taskId, seconds` | `true` |
| `focus:complete` | `taskId, seconds` | `true` |
| `ai:query` | `{provider, model, apiKey, baseUrl, messages}` | `{content}` |
| `automation:run` | — | `{ok}` |
| `recurring:setRule` | `taskId, rule, startDate` | `true` |

### Renderer → Main (send/on, без ответа)

| Канал | Параметры |
|-------|-----------|
| `window:minimize` | — |
| `window:maximize` | — |
| `window:close` | — |
| `hotkeys:reload` | — |
| `widget:openTask` | `taskId` |
| `widget:toggle` | — |
| `focus:openTask` | `taskId` |

### Main → Renderer (send → on)

| Канал | Данные | Когда |
|-------|--------|-------|
| `grab:text` | `text: string` | Хоткей Ctrl+Shift+T (long press) |
| `grab:files` | `files: string[]` | Хоткей Ctrl+Shift+F |
| `grab:instant` | `clipText: string` | Хоткей Ctrl+Shift+T (quick press) |
| `dialog:showCreate` | — | Хоткей или tray меню |
| `dialog:showQuickNote` | — | Хоткей Ctrl+Shift+N |
| `screenshot:capture` | — | Хоткей Ctrl+Shift+S |
| `reminder:show` | `taskId: string` | Клик на системное уведомление |
| `automation:toast` | `message: string` | Автоматизация выполнила действие |
| `widget:openTask` | `taskId: string` | Клик в виджете |
| `focus:setTask` | `taskId: string` | Открытие фокус-окна с задачей |
| `tasks:refresh` | — | Recurring spawner создал новую задачу |

---

## 7. БД Схема

**Файл:** `userData/tasks.db` (SQLite WAL mode, foreign keys ON)

### Таблица `columns`

| Поле | Тип | Описание |
|------|-----|---------|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL | Название |
| color | TEXT NOT NULL | HEX цвет |
| icon | TEXT | Имя иконки Lucide |
| sort_order | INTEGER NOT NULL | Порядок отображения |
| is_default | INTEGER DEFAULT 0 | 1 = колонка по умолчанию |
| wip_limit | INTEGER | WIP лимит (0/NULL = нет) |
| created_at | TEXT | datetime('now') |
| updated_at | TEXT | datetime('now') |

### Таблица `tasks`

| Поле | Тип | Описание |
|------|-----|---------|
| id | TEXT PK | UUID |
| title | TEXT NOT NULL | Заголовок |
| description | TEXT | Markdown текст |
| column_id | TEXT FK→columns | Колонка |
| sort_order | INTEGER NOT NULL | Порядок в колонке |
| priority | INTEGER DEFAULT 0 | 0=нет, 1=низкий, 2=средний, 3=высокий |
| color | TEXT | Цветная метка |
| source_type | TEXT DEFAULT 'manual' | 'manual'\|'text'\|'file'\|'email' |
| source_info | TEXT | JSON с инфой об источнике |
| due_date | TEXT | ISO дата дедлайна |
| archived_at | TEXT | NULL = не архивирована |
| reminder_at | TEXT | ISO datetime напоминания |
| is_confidential | INTEGER DEFAULT 0 | 1 = скрыть содержимое |
| recurrence_rule | TEXT | NULL\|'daily'\|'weekly'\|'monthly'\|'weekdays'\|'custom:N:day\|week\|month' |
| recurrence_next | TEXT | ISO дата следующего экземпляра |
| time_spent | INTEGER DEFAULT 0 | Секунды фокус-времени |
| created_at | TEXT | datetime('now') |
| updated_at | TEXT | datetime('now') |

### Таблица `attachments`

| Поле | Тип | Описание |
|------|-----|---------|
| id | TEXT PK | UUID |
| task_id | TEXT FK→tasks CASCADE | Задача |
| filename | TEXT NOT NULL | Оригинальное имя файла |
| filepath | TEXT NOT NULL | Путь в userData/storage/ |
| filesize | INTEGER | Размер в байтах |
| mime_type | TEXT | MIME тип (пока null) |
| created_at | TEXT | datetime('now') |

### Таблица `tags`

| Поле | Тип | Описание |
|------|-----|---------|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL UNIQUE | Название |
| color | TEXT NOT NULL | HEX цвет |

### Таблица `task_tags`

| Поле | Тип |
|------|-----|
| task_id | TEXT FK→tasks CASCADE |
| tag_id | TEXT FK→tags CASCADE |
| PK | (task_id, tag_id) |

### Таблица `notes`

| Поле | Тип |
|------|-----|
| id | TEXT PK |
| content | TEXT NOT NULL |
| created_at | TEXT |
| updated_at | TEXT |

### Таблица `settings`

| Поле | Тип |
|------|-----|
| key | TEXT PK |
| value | TEXT NOT NULL |

**Дефолтные настройки:**
- `autoLaunch`: `'false'`
- `theme`: `'dark'` | `'light'` | `'system'`
- `hotkeys`: JSON строка с настройками хоткеев
- `automation_autoArchive`: `'true'`
- `automation_autoArchiveDays`: `'7'`
- `automation_overdueReminders`: `'true'`
- `automation_staleHighPriority`: `'true'`
- `ai_provider`: `'openrouter'` | `'ollama'`
- `ai_model`: строка
- `ai_api_key`: строка (не экспортируется!)
- `ai_base_url`: строка

### Таблица `task_templates`

| Поле | Тип |
|------|-----|
| id | TEXT PK |
| title | TEXT NOT NULL |
| description | TEXT |
| priority | INTEGER DEFAULT 0 |
| tags | TEXT DEFAULT '[]' | JSON массив имён тегов |
| created_at | TEXT |

### Таблица `related_tasks`

| Поле | Тип |
|------|-----|
| task_id | TEXT FK→tasks CASCADE |
| related_task_id | TEXT FK→tasks CASCADE |
| PK | (task_id, related_task_id) |

Хранится в каноническом виде: меньший UUID всегда в `task_id`.

### Таблица `focus_sessions`

| Поле | Тип |
|------|-----|
| id | TEXT PK |
| task_id | TEXT FK→tasks ON DELETE SET NULL |
| started_at | TEXT NOT NULL |
| ended_at | TEXT |
| duration | INTEGER | Секунды |
| notes | TEXT |

---

## 8. Хоткеи

### Глобальные (работают из любого приложения)

| Хоткей | Действие | Настраиваемый |
|--------|----------|--------------|
| `Ctrl+Shift+T` | Захватить текст: быстрый press (<500ms) = instant create, долгий = диалог | Да |
| `Ctrl+Shift+F` | Открыть диалог создания (для файлов) | Да |
| `Ctrl+Shift+N` | Диалог быстрой заметки | Да |
| `Ctrl+Shift+S` | Скриншот (открывает диалог создания) | Да |
| `Ctrl+Shift+W` | Показать/скрыть виджет | Нет |
| `Ctrl+Shift+F2` | Показать/скрыть фокус-окно | Нет |

### Локальные (только внутри приложения)

| Хоткей | Действие |
|--------|----------|
| `Ctrl+K` | Command Palette |
| `←→` | Навигация между колонками |
| `↑↓` | Навигация между задачами в колонке |
| `Enter` | Открыть задачу |
| `N` | Новая задача |
| `Del/Backspace` | Удалить задачу (с подтверждением) |
| `Shift+←→` | Переместить задачу в другую колонку |
| `Ctrl+F` / `/` | Фокус на поиск |

---

## 9. Конфиги

### vite.config.ts
- root: `src/renderer`
- 3 entry points: `index.html`, `widget.html`, `focus.html`
- alias `@shared` → `src/shared`
- dev server: порт 6173 (strictPort)
- build output: `dist/renderer`

### tsconfig.json (renderer)
- target: ES2020, module: ESNext, jsx: react-jsx
- strict: true
- path alias: `@shared/*` → `src/shared/*`
- include: только `src/renderer`

### tsconfig.main.json (main process)
- Отдельный конфиг для компиляции Electron main
- output: `dist/main`

### tailwind.config.js
- darkMode: `'class'` (через `.dark` на `<html>`)
- content: `src/renderer/**/*.{html,js,ts,jsx,tsx}`

### electron-builder.yml
- appId: `com.taskgrabber.app`
- Windows: NSIS x64
- icon: `assets/icons/icon.ico`
- extraResources: `assets/`

---

## 10. Дизайн-система

### Цвета (Tailwind custom)

```
bg-primary:    #0F0F0F   — основной фон
bg-secondary:  #1A1A2E   — вторичный фон
bg-tertiary:   #16213E   — третичный фон
bg-card:       #0F0F1A   — фон карточки
bg-card-hover: #16162A   — фон карточки при hover

glass-light:   rgba(255,255,255,0.05)
glass-medium:  rgba(255,255,255,0.08)
glass-heavy:   rgba(255,255,255,0.12)

accent-blue:   #3B82F6
accent-purple: #8B5CF6
accent-amber:  #F59E0B
accent-green:  #10B981
accent-red:    #EF4444
```

### CSS классы (globals.css)

- `.glass` — glassmorphism карточка (backdrop-blur + border + bg)
- `.glass-card` — более насыщенная версия для карточек задач
- `.glass-heavy` — тяжёлый glass для модалок
- `.t-NN` — текстовые opacity классы: `text-t-15`, `text-t-25`, `text-t-30`, `text-t-40`, `text-t-50`, `text-t-60`, `text-t-70`, `text-t-75`, `text-t-80`, `text-t-85`, `text-t-90`
- `.bg-t-NN` — фоновые opacity: `bg-t-03`, `bg-t-04`, `bg-t-05`, `bg-t-06`, `bg-t-07`, `bg-t-08`, `bg-t-10`, `bg-t-12`, `bg-t-15`
- `.border-t-NN` — border opacity аналогично

### Анимации (Tailwind keyframes)

| Класс | Описание |
|-------|---------|
| `animate-fade-in` | 0.2s opacity 0→1 |
| `animate-fade-in-scale` | 0.2s opacity+scale+translateY |
| `animate-slide-up` | 0.25s opacity+translateY(8px→0) |
| `animate-glow-pulse` | 2s pulse opacity 0.4→0.8 |
| `animate-shimmer` | 2s background-position sweep |

### Box shadows

- `shadow-glow-blue` — синее свечение для фокуса
- `shadow-glow-purple` — фиолетовое свечение
- `shadow-glow-sm` — слабое свечение
- `shadow-card-hover` — тень при hover карточки
- `shadow-drag` — тень при drag

### Темы

Переключение: добавить/убрать `dark` класс на `<html>`. CSS переменные автоматически подхватываются. Настройка хранится в `settings.theme` (`'dark'|'light'|'system'`).

---

## 11. Автоматизация (automation.ts)

Запускается при старте + каждые 5 минут.

| Правило | Настройка | Логика |
|---------|-----------|--------|
| Автоархив | `automation_autoArchive`, `automation_autoArchiveDays` | Архивирует задачи из "done/cancelled" колонок старше N дней |
| Просроченные напоминания | `automation_overdueReminders` | Ставит reminder_at+1min для просроченных задач без напоминания |
| Залежавшиеся важные | `automation_staleHighPriority` | Toast: высокоприоритетные задачи в "inbox" > 3 дней |

---

## 12. Файловое хранилище

- Вложения копируются в `userData/storage/` через `file-handler.ts`
- `copyToStorage(src)` — копирует файл, возвращает dest путь
- `saveBufferToStorage(name, buffer)` — сохраняет буфер (из .msg)
- Открывать файлы только через `file:open` IPC (защита path traversal)
- Бэкапы БД: `userData/backups/tasks_YYYY-MM-DD_HH-MM-SS.db`
