# Task Grabber — План разработки

## Концепция
Windows tray-приложение для мгновенного создания задач из любого места: выделенный текст, файлы, письма Outlook (.msg). Канбан-доска для управления задачами с drag&drop, кастомные колонки, красивый современный UI.

---

## Технологический стек

| Компонент | Технология |
|-----------|-----------|
| Runtime | Electron 33+ |
| Frontend | React 18 + TypeScript |
| State management | Zustand (лёгкий, без бойлерплейта) |
| UI библиотека | Tailwind CSS + Framer Motion (анимации drag&drop) |
| Канбан drag&drop | @dnd-kit (современная, accessible) |
| БД | SQLite (better-sqlite3, синхронный) |
| Глобальные хоткеи | Electron globalShortcut |
| Парсинг .msg | @nicktomlin/msg-reader или node-msg-reader |
| Сборка | electron-builder |
| Иконки | Lucide React |

---

## Архитектура

```
task_grabber/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts              # Entry point, app lifecycle
│   │   ├── tray.ts              # System tray логика + контекстное меню
│   │   ├── hotkeys.ts           # Глобальные хоткеи (кастомизируемые, reloadHotkeys)
│   │   ├── file-handler.ts      # Обработка файлов (копирование в хранилище)
│   │   ├── msg-parser.ts        # Парсинг .msg писем Outlook
│   │   ├── widget.ts            # Desktop Widget окно (always-on-top)
│   │   ├── focus-window.ts      # Focus Mode окно (Pomodoro таймер)
│   │   ├── automation.ts        # Автоматизация (автоархив, напоминания)
│   │   ├── backup.ts            # Автобэкап + восстановление БД
│   │   ├── preload.ts           # Electron preload (contextBridge)
│   │   ├── db/
│   │   │   ├── database.ts      # Инициализация SQLite
│   │   │   ├── migrations.ts    # Миграции схемы
│   │   │   └── queries.ts       # CRUD операции
│   │   └── ipc-handlers.ts      # IPC между main и renderer
│   ├── renderer/                # React UI
│   │   ├── index.html
│   │   ├── widget.html          # Widget entry point
│   │   ├── focus.html           # Focus Mode entry point
│   │   ├── App.tsx              # Основное приложение
│   │   ├── Widget.tsx           # Desktop Widget компонент
│   │   ├── FocusWindow.tsx      # Focus Mode компонент
│   │   ├── main.tsx             # Renderer entry
│   │   ├── widget-entry.tsx     # Widget entry
│   │   ├── focus-entry.tsx      # Focus entry
│   │   ├── stores/
│   │   │   ├── taskStore.ts     # Zustand store для задач
│   │   │   ├── columnStore.ts   # Zustand store для колонок
│   │   │   └── noteStore.ts     # Zustand store для заметок
│   │   ├── components/
│   │   │   ├── Board/
│   │   │   │   ├── KanbanBoard.tsx    # Основная доска
│   │   │   │   ├── Column.tsx         # Колонка канбана (WIP лимиты)
│   │   │   │   └── ColumnEditor.tsx   # Редактор колонок
│   │   │   ├── Task/
│   │   │   │   ├── TaskCard.tsx        # Карточка задачи
│   │   │   │   ├── TaskDetail.tsx      # Детальный вид задачи (модалка)
│   │   │   │   ├── TaskCreateDialog.tsx # Диалог создания задачи
│   │   │   │   └── RelatedTasks.tsx    # Связанные задачи
│   │   │   ├── AI/
│   │   │   │   └── AIAssistantDialog.tsx # AI ассистент (OpenRouter/Ollama)
│   │   │   ├── CommandPalette/
│   │   │   │   └── CommandPalette.tsx  # Command Palette (Ctrl+K)
│   │   │   ├── DropZone/
│   │   │   │   └── DropZone.tsx        # Зона для drag&drop файлов/писем
│   │   │   ├── Layout/
│   │   │   │   ├── TitleBar.tsx        # Кастомный title bar
│   │   │   │   ├── Sidebar.tsx         # Боковая панель (фильтры, поиск)
│   │   │   │   └── StatusBar.tsx       # Статус бар внизу
│   │   │   ├── Notes/
│   │   │   │   ├── NotesPanel.tsx      # Панель заметок в sidebar
│   │   │   │   └── QuickNoteDialog.tsx # Быстрая заметка
│   │   │   ├── Settings/
│   │   │   │   └── SettingsDialog.tsx  # Настройки (хоткеи, тема, автозапуск, автоматизация)
│   │   │   ├── Stats/
│   │   │   │   └── StatsPanel.tsx      # Статистика + архив
│   │   │   └── common/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Modal.tsx
│   │   │       └── Badge.tsx
│   │   ├── hooks/
│   │   │   └── useKeyboardNav.ts       # Keyboard navigation по доске
│   │   └── styles/
│   │       └── globals.css
│   └── shared/
│       ├── types.ts             # Общие типы (Task, Column, etc.)
│       └── constants.ts         # Константы (DEFAULT_COLUMNS, HOTKEYS, PRIORITY_*)
├── assets/
│   └── icons/                   # Иконки для трея и приложения
├── storage/                     # Хранилище вложений (создаётся runtime)
├── package.json
├── tsconfig.json
├── tsconfig.main.json
├── tailwind.config.js
├── electron-builder.yml
└── vite.config.ts               # Vite для сборки renderer
```

---

## Схема БД (SQLite)

### Таблица `columns`
```sql
CREATE TABLE columns (
    id          TEXT PRIMARY KEY,     -- UUID
    name        TEXT NOT NULL,
    color       TEXT NOT NULL,        -- HEX цвет
    icon        TEXT,                 -- Название иконки (Lucide)
    sort_order  INTEGER NOT NULL,
    is_default  INTEGER DEFAULT 0,   -- Колонка по умолчанию для новых задач
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
);
```

### Дефолтные колонки
| Колонка | Цвет | Иконка |
|---------|------|--------|
| 📥 Новые | #3B82F6 (blue) | inbox |
| 🔄 В работе | #F59E0B (amber) | loader |
| ⏸ Ждём | #8B5CF6 (violet) | pause-circle |
| ✅ Готово | #10B981 (green) | check-circle |
| 💀 Забито | #6B7280 (gray) | x-circle |

### Таблица `columns` (обновлена)
```sql
-- Новые поля:
wip_limit   INTEGER   -- Лимит задач в колонке (WIP limit), NULL = без лимита
```

### Таблица `tasks` (обновлена)
```sql
CREATE TABLE tasks (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT,
    column_id       TEXT NOT NULL REFERENCES columns(id),
    sort_order      INTEGER NOT NULL,
    priority        INTEGER DEFAULT 0,     -- 0=none, 1=low, 2=medium, 3=high
    color           TEXT,
    source_type     TEXT DEFAULT 'manual', -- 'manual' | 'text' | 'file' | 'email'
    source_info     TEXT,
    due_date        TEXT,                  -- Дедлайн (ISO date)
    reminder_at     TEXT,                  -- Время напоминания (ISO datetime)
    archived_at     TEXT,                  -- Дата архивирования (NULL = активна)
    is_confidential INTEGER DEFAULT 0,    -- Скрывать из AI контекста
    recurrence_rule TEXT,                  -- Правило повторения (RRULE / JSON)
    recurrence_next TEXT,                  -- Дата следующего вхождения
    time_spent      INTEGER DEFAULT 0,    -- Потраченное время (секунды)
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);
```

### Таблица `attachments`
```sql
CREATE TABLE attachments (
    id           TEXT PRIMARY KEY,
    task_id      TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    filename     TEXT NOT NULL,          -- Оригинальное имя файла
    filepath     TEXT NOT NULL,          -- Путь в storage/
    filesize     INTEGER,
    mime_type    TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
);
```

### Таблица `tags`
```sql
CREATE TABLE tags (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL
);
```

### Таблица `task_tags`
```sql
CREATE TABLE task_tags (
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);
```

### Таблица `notes`
```sql
CREATE TABLE notes (
    id         TEXT PRIMARY KEY,
    content    TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
```

### Таблица `settings`
```sql
CREATE TABLE settings (
    key   TEXT PRIMARY KEY,  -- 'autoLaunch', 'theme', 'hotkeys', 'automation_*'
    value TEXT NOT NULL
);
```

### Таблица `task_templates`
```sql
CREATE TABLE task_templates (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    priority    INTEGER DEFAULT 0,
    tags        TEXT DEFAULT '[]',   -- JSON массив тегов
    created_at  TEXT DEFAULT (datetime('now'))
);
```

### Таблица `related_tasks`
```sql
CREATE TABLE related_tasks (
    task_id         TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    related_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, related_task_id)
);
```

### Таблица `focus_sessions`
```sql
CREATE TABLE focus_sessions (
    id         TEXT PRIMARY KEY,
    task_id    TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    started_at TEXT NOT NULL,
    ended_at   TEXT,
    duration   INTEGER,  -- секунды
    notes      TEXT
);
```

---

## Дизайн UI

### Общая концепция
- **Тёмная тема** по умолчанию (с возможностью светлой)
- Стиль: modern glassmorphism + subtle gradients
- Кастомный frameless window с title bar
- Плавные анимации через Framer Motion
- Цветовая палитра: тёмно-серые фоны (#0F0F0F, #1A1A2E, #16213E) с яркими акцентами

### Основной экран (Канбан)
```
┌─────────────────────────────────────────────────────────────────┐
│ ◉ Task Grabber           🔍 Поиск...    [+ Задача]  [⚙]  [—×] │
├────────┬────────────────────────────────────────────────────────┤
│        │                                                        │
│ Фильтры│  📥 Новые    🔄 В работе   ⏸ Ждём   ✅ Готово  💀    │
│        │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐      │
│ #теги  │  │ Task 1 │  │ Task 3 │  │ Task 5 │  │ Task 7 │      │
│        │  │ 📎 2   │  │        │  │ ✉️     │  │        │      │
│ Приор. │  ├────────┤  ├────────┤  └────────┘  └────────┘      │
│        │  │ Task 2 │  │ Task 4 │                               │
│ Источн.│  │ 🔴 high│  │ #tag   │                               │
│        │  └────────┘  └────────┘                               │
│        │                                                        │
│        │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│        │  │  📎 Перетащите файлы или .msg сюда для новой     │ │
│        │  │     задачи                                        │ │
│        │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
├────────┴────────────────────────────────────────────────────────┤
│ Задач: 12  │  Сегодня создано: 3  │  Ctrl+Shift+T — текст     │
└─────────────────────────────────────────────────────────────────┘
```

### Карточка задачи
- Заголовок (жирный, обрезается если длинный)
- Цветная полоска сбоку = приоритет
- Иконка источника (📝 текст, 📁 файл, ✉️ письмо, ✋ ручная)
- Количество вложений (📎 N)
- Теги (цветные бейджи)
- Дата создания (relative: "2ч назад")
- Hover: лёгкое свечение + поднятие (shadow)

### Диалог создания задачи (по хоткею)
```
┌──────────────────────────────────────┐
│  ✨ Новая задача                     │
│                                      │
│  Заголовок: [___________________]    │
│                                      │
│  Описание:                           │
│  ┌──────────────────────────────┐    │
│  │ (предзаполнено из clipboard) │    │
│  └──────────────────────────────┘    │
│                                      │
│  Колонка:  [📥 Новые      ▾]        │
│  Приоритет: ○ ● ● ●                 │
│  Теги:     [+ добавить]             │
│                                      │
│  📎 Вложения:                        │
│  ┌──────────────────────────────┐    │
│  │  Перетащите файлы сюда       │    │
│  └──────────────────────────────┘    │
│                                      │
│         [Отмена]  [✅ Создать]       │
└──────────────────────────────────────┘
```

---

## Фичи

### MVP (Phase 1) ✅ DONE
- [x] Инициализация проекта (Electron + React + Vite + TS)
- [x] System tray с иконкой и контекстным меню
- [x] SQLite база данных с миграциями
- [x] Канбан-доска с 5 дефолтными колонками
- [x] Drag&drop задач между колонками (@dnd-kit)
- [x] CRUD задач (создание, редактирование, удаление)
- [x] Глобальный хоткей `Ctrl+Shift+T` — задача из выделенного текста
- [x] Глобальный хоткей `Ctrl+Shift+F` — задача из выбранных файлов
- [x] Drop zone для файлов (внизу доски)
- [x] Детальный вид задачи (модалка)
- [x] Приоритеты задач (none/low/medium/high)
- [x] Тёмная тема, кастомный title bar
- [x] Common UI компоненты (Modal, Button, Input, Badge)
- [x] Security: SQL injection protection, path traversal protection, IPC listener cleanup

### Phase 2 — Расширение ✅ DONE
- [x] Парсинг .msg файлов (Outlook drag&drop) — автосоздание задачи из письма
- [x] Теги с цветами — autocomplete, рандомный цвет, inline добавление
- [x] Фильтрация по тегам, приоритету, источнику — client-side, мгновенная
- [x] Поиск по задачам — fuzzy search в sidebar
- [x] Кастомизация колонок (добавление, удаление, переименование, цвет, порядок)
- [x] Вложения к задачам (файловое хранилище в userData/storage)
- [x] Markdown в описании + кликабельные чеклисты (подзадачи)
- [x] Quick notes — Ctrl+Shift+N, мгновенные заметки
- [x] Дедлайны на задачах (опциональные, date picker)
- [x] Sidebar — сворачиваемый, фильтры, заметки
- [x] Glassmorphism UI polish (Phase 1 + Phase 2 компоненты)

### Phase 3 — Полировка ✅ DONE
- [x] Уведомления (напоминания по задачам) — reminder_at + Electron Notification + 30s поллинг
- [x] Экспорт/импорт данных (JSON) — экспорт/импорт через dialog
- [x] Бэкап БД — автобэкап + ручное восстановление (backup.ts)
- [x] Настройки хоткеев (кастомизация) — Settings dialog + reloadHotkeys()
- [x] Автозапуск с Windows — loginItem settings
- [x] Статистика (сколько задач создано/закрыто) — StatsPanel в sidebar
- [x] Светлая тема + переключатель — через Settings (dark/light/system)
- [x] Архив задач — архивирование из TaskDetail + просмотр в StatsPanel
- [x] Связанные задачи — RelatedTasks в TaskDetail, таблица related_tasks

### Phase 4 — Продвинутые фичи ✅ DONE
- [x] Focus Mode — отдельное окно (focus-window.ts + FocusWindow.tsx), always-on-top, таймер Pomodoro, фокус на одной задаче
- [x] Desktop Widget — отдельное прозрачное окно (widget.ts + Widget.tsx), always-on-top, показывает приоритетные задачи
- [x] Command Palette — `Ctrl+K`, поиск задач/команд/заметок, навигация, перемещение задач между колонками
- [x] WIP-лимиты колонок — поле wip_limit в таблице columns, визуальное предупреждение при превышении
- [x] Повторяющиеся задачи (recurring) — поля recurrence_rule + recurrence_next в tasks, автосоздание следующего вхождения
- [x] Конфиденциальность задач — поле is_confidential, скрытие данных при экспорте в AI контекст
- [x] Трекинг времени — поле time_spent в tasks, таблица focus_sessions, запись сессий фокуса

### Phase 5 — AI и автоматизация ✅ DONE
- [x] AI-ассистент — AIAssistantDialog.tsx, поддержка OpenRouter и Ollama, контекст из задач, исключение конфиденциальных
- [x] Quick Capture (мгновенный захват) — двойное нажатие Ctrl+Shift+T → instant create без диалога
- [x] Screenshot capture — хоткей Ctrl+Shift+S, захват экрана → вложение к задаче
- [x] Автоматизация (automation.ts) — авто-архивация через N дней, напоминания о просроченных, предупреждения о залежавшихся важных задачах
- [x] Шаблоны задач (task_templates) — создание задачи из шаблона, сохранение задачи как шаблон
- [x] Keyboard navigation — useKeyboardNav.ts, навигация по доске без мыши

---

## Глобальные хоткеи

| Хоткей | Действие |
|--------|----------|
| `Ctrl+Shift+T` | Захватить выделенный текст → диалог создания задачи (текст в описание) |
| `Ctrl+Shift+T` (двойное) | Quick Capture — мгновенное создание задачи без диалога |
| `Ctrl+Shift+F` | Захватить путь к выбранным файлам → диалог создания задачи (файлы как вложения) |
| `Ctrl+Shift+N` | Быстрая заметка → мини-окно → Enter → сохранено |
| `Ctrl+Shift+W` | Показать/скрыть Desktop Widget |
| `Ctrl+Shift+F2` | Показать/скрыть Focus Mode окно |
| `Ctrl+Shift+S` | Скриншот → вложение к новой задаче |
| `Ctrl+K` | Command Palette (поиск задач, команды) |

### Логика работы хоткеев

**Ctrl+Shift+T (текст):**
1. Перехватываем текущий clipboard
2. Симулируем Ctrl+C (копируем выделенный текст)
3. Ждём 100ms, читаем clipboard
4. Открываем диалог создания задачи
5. Вставляем текст в поле описания
6. Первая строка текста → предзаполняем заголовок
7. Восстанавливаем оригинальный clipboard

**Ctrl+Shift+T (quick capture — двойное нажатие):**
1. Второе нажатие в течение 500ms определяется как "быстрое"
2. Мгновенное создание задачи из clipboard без диалога
3. Задача попадает в дефолтную колонку

**Ctrl+Shift+F (файлы):**
1. Получаем пути выбранных файлов через clipboard (Explorer копирует пути)
2. Или через Shell API для выбранных файлов
3. Открываем диалог создания задачи
4. Файлы подгружаются как вложения
5. Имя первого файла → предзаполняем заголовок

**Ctrl+K (Command Palette):**
1. Открывается поверх доски
2. Поиск по задачам, заметкам, командам
3. Поддержка команд: новая задача, настройки, экспорт, AI, смена темы
4. Inline перемещение задачи в другую колонку

---

## System Tray

### Контекстное меню (правый клик)
```
📋 Новая задача          Ctrl+Shift+T
📁 Задача из файлов      Ctrl+Shift+F
─────────────────────
📊 Открыть доску
─────────────────────
⚙️  Настройки
❌ Выход
```

### Левый клик
- Показать/скрыть главное окно

---

## Этапы разработки (порядок реализации)

### Этап 1: Скелет приложения
1. Инициализация Electron + Vite + React + TypeScript
2. Настройка electron-builder
3. Кастомный frameless window
4. System tray с базовым меню
5. Tailwind CSS + базовые стили тёмной темы

### Этап 2: База данных
6. Подключение better-sqlite3
7. Миграции и создание таблиц
8. CRUD операции (queries.ts)
9. IPC handlers для связи main ↔ renderer

### Этап 3: Канбан-доска
10. Компонент KanbanBoard + Column
11. Компонент TaskCard
12. Drag&drop между колонками (@dnd-kit)
13. Создание задачи (диалог)
14. Редактирование задачи (детальный вид)
15. Удаление задачи

### Этап 4: Хоткеи и захват
16. Глобальные хоткеи (Ctrl+Shift+T, Ctrl+Shift+F)
17. Захват текста из clipboard
18. Захват файлов
19. Drop zone для файлов на доске

### Этап 5: Расширенные фичи
20. Парсинг .msg (Outlook)
21. Теги
22. Фильтрация и поиск
23. Кастомизация колонок

### Этап 6: Полировка
24. Анимации (Framer Motion)
25. Светлая тема
26. Настройки приложения
27. Автозапуск
28. Финальная сборка и тестирование

---

## Текущий статус

**Фаза:** Phase 5 завершена
**Прогресс Phase 1:** 12/12 ✅
**Прогресс Phase 2:** 11/11 ✅
**Прогресс Phase 3:** 9/9 ✅
**Прогресс Phase 4:** 7/7 ✅
**Прогресс Phase 5:** 6/6 ✅

---

## Phase 6 — Новые фичи ✅ В РАЗРАБОТКЕ

- [x] **Поддержка нескольких досок** — таблица `boards`, `board_id` в колонках, BoardSwitcher в TitleBar, фильтрация KanbanBoard по активной доске
- [x] **Global Search Overlay** — Ctrl+Space, поиск по задачам/заметкам/доскам с подсветкой, фильтры по типу, навигация клавиатурой
- [x] **Timeline/Gantt view** — альтернативное отображение задач на временной шкале
- [x] **Календарный вид** — просмотр задач по датам в формате календаря
- [ ] **Smart Rules Engine** — визуальный конструктор ЕСЛИ → ТО (в разработке)
- [ ] **Массовые действия** — выбор нескольких задач и групповые операции (в разработке)
- [ ] **Синхронизация** — облачная синхронизация через WebDAV / локальная сеть
- [ ] **Мобильное companion-приложение** — просмотр задач с телефона
- [ ] **Интеграции** — Telegram-бот для создания задач, webhook приём
- [ ] **Расширенная аналитика** — графики продуктивности, тренды по неделям, heatmap активности
- [ ] **Drag из браузера** — расширение для браузера (захват URL/статей → задача)
- [ ] **OCR из скриншота** — распознавание текста в захваченных скриншотах через Tesseract
- [ ] **Голосовой ввод** — создание задачи голосом через Whisper API
- [ ] **Outlook/Exchange интеграция** — двусторонняя синхронизация задач с Exchange Tasks
- [ ] **Экспорт в CSV/Excel** — для отчётности
