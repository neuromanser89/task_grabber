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
│   │   ├── hotkeys.ts           # Глобальные хоткеи
│   │   ├── clipboard.ts         # Перехват текста из clipboard
│   │   ├── file-handler.ts      # Обработка файлов (копирование в хранилище)
│   │   ├── msg-parser.ts        # Парсинг .msg писем Outlook
│   │   ├── db/
│   │   │   ├── database.ts      # Инициализация SQLite
│   │   │   ├── migrations.ts    # Миграции схемы
│   │   │   └── queries.ts       # CRUD операции
│   │   └── ipc-handlers.ts      # IPC между main и renderer
│   ├── renderer/                # React UI
│   │   ├── index.html
│   │   ├── App.tsx
│   │   ├── stores/
│   │   │   ├── taskStore.ts     # Zustand store для задач
│   │   │   └── columnStore.ts   # Zustand store для колонок
│   │   ├── components/
│   │   │   ├── Board/
│   │   │   │   ├── KanbanBoard.tsx    # Основная доска
│   │   │   │   ├── Column.tsx         # Колонка канбана
│   │   │   │   └── ColumnEditor.tsx   # Редактор колонок (добавить/удалить/переименовать)
│   │   │   ├── Task/
│   │   │   │   ├── TaskCard.tsx        # Карточка задачи
│   │   │   │   ├── TaskDetail.tsx      # Детальный вид задачи (модалка)
│   │   │   │   ├── TaskCreateDialog.tsx # Диалог создания задачи
│   │   │   │   └── TaskAttachments.tsx  # Блок вложений
│   │   │   ├── DropZone/
│   │   │   │   └── DropZone.tsx        # Зона для drag&drop файлов/писем
│   │   │   ├── Layout/
│   │   │   │   ├── TitleBar.tsx        # Кастомный title bar
│   │   │   │   ├── Sidebar.tsx         # Боковая панель (фильтры, поиск)
│   │   │   │   └── StatusBar.tsx       # Статус бар внизу
│   │   │   └── common/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Modal.tsx
│   │   │       └── Badge.tsx
│   │   ├── hooks/
│   │   │   ├── useTaskActions.ts
│   │   │   └── useDragAndDrop.ts
│   │   └── styles/
│   │       └── globals.css
│   └── shared/
│       ├── types.ts             # Общие типы (Task, Column, etc.)
│       └── constants.ts         # Константы (дефолтные колонки, хоткеи)
├── assets/
│   └── icons/                   # Иконки для трея и приложения
├── storage/                     # Хранилище вложений (создаётся runtime)
├── package.json
├── tsconfig.json
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

### Таблица `tasks`
```sql
CREATE TABLE tasks (
    id           TEXT PRIMARY KEY,      -- UUID
    title        TEXT NOT NULL,
    description  TEXT,                  -- Полный текст / тело письма
    column_id    TEXT NOT NULL REFERENCES columns(id),
    sort_order   INTEGER NOT NULL,      -- Порядок внутри колонки
    priority     INTEGER DEFAULT 0,     -- 0=none, 1=low, 2=medium, 3=high
    color        TEXT,                  -- Цветная метка (опционально)
    source_type  TEXT DEFAULT 'manual', -- 'manual' | 'text' | 'file' | 'email'
    source_info  TEXT,                  -- JSON с инфой об источнике
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
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

### Phase 3 — Полировка
- [ ] Уведомления (напоминания по задачам)
- [ ] Экспорт/импорт данных (JSON)
- [ ] Бэкап БД
- [ ] Настройки хоткеев (кастомизация)
- [ ] Автозапуск с Windows
- [ ] Статистика (сколько задач создано/закрыто)
- [ ] Светлая тема + переключатель

---

## Глобальные хоткеи

| Хоткей | Действие |
|--------|----------|
| `Ctrl+Shift+T` | Захватить выделенный текст → диалог создания задачи (текст в описание) |
| `Ctrl+Shift+F` | Захватить путь к выбранным файлам → диалог создания задачи (файлы как вложения) |
| `Ctrl+Shift+N` | Быстрая заметка → мини-окно → Enter → сохранено |

### Логика работы хоткеев

**Ctrl+Shift+T (текст):**
1. Перехватываем текущий clipboard
2. Симулируем Ctrl+C (копируем выделенный текст)
3. Ждём 100ms, читаем clipboard
4. Открываем диалог создания задачи
5. Вставляем текст в поле описания
6. Первая строка текста → предзаполняем заголовок
7. Восстанавливаем оригинальный clipboard

**Ctrl+Shift+F (файлы):**
1. Получаем пути выбранных файлов через clipboard (Explorer копирует пути)
2. Или через Shell API для выбранных файлов
3. Открываем диалог создания задачи
4. Файлы подгружаются как вложения
5. Имя первого файла → предзаполняем заголовок

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

**Фаза:** Phase 2 завершена, ожидание финального ревью
**Текущая задача:** Код-ревью Phase 2
**Прогресс Phase 1:** 12/12 ✅
**Прогресс Phase 2:** 11/11 ✅ (ревью в процессе)
**Прогресс Phase 3:** 0/7
