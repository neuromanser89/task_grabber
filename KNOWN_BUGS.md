# Известные баги — все исправлены

## ~~CRITICAL~~ — ИСПРАВЛЕНЫ (2026-03-18)

### ~~1. Правый клик на карточке задачи — контекстное меню не появляется~~
**Статус:** ✅ ИСПРАВЛЕНО
**Реальная причина:** `transform` от dnd-kit на TaskCard создавал новый CSS containing block → `fixed`-позиционированное меню рендерилось относительно карточки, а не viewport → обрезалось `overflow-hidden` колонки. Меню было, но невидимое.
**Решение:** `createPortal(menu, document.body)` — меню рендерится вне DOM-дерева карточки. Также заменён `PointerSensor` на `MouseSensor + TouchSensor`.

### ~~2. Чеклист — клик на чекбокс выбирает не тот пункт~~
**Статус:** ✅ ИСПРАВЛЕНО
**Реальная причина:** react-markdown v10 — `input` элементы генерируются remark-rehype без `position`. `node.position` на input всегда `undefined`. Но `li` элементы ИМЕЮТ position.
**Решение:** Toggle логика перенесена в `li` компонент. Определение task-list-item по `className='task-list-item'` (GFM стандарт). `node.position.start.line` берётся с `li` ноды. Код дедуплицирован в `src/renderer/utils/checklist.ts`.

### ~~3. Drop подсветка колонки — верхняя часть не подсвечивается~~
**Статус:** ✅ ИСПРАВЛЕНО
**Реальная причина:** `closestCenter` collision detection — при hover над header находил task card droppable ближе, чем колонку → `isOver=false`. Также `ring` (box-shadow) обрезался `overflow-hidden`.
**Решение:** KanbanBoard трекает `overColumnId` через `handleDragOver` и передаёт `isDropTarget` в Column. Подсветка через inline `outline` (не обрезается overflow-hidden). Колонка подсвечивается по `isOver || isDropTarget`.

## Аудит кода (2026-03-18)

Проведён масштабный аудит всей кодовой базы (5 параллельных ревьюеров). Исправлено:
- **Security:** path traversal в file-handler.ts, SSRF через Ollama baseUrl
- **Data loss:** importAllData терял 6 полей tasks при импорте
- **Дублирование:** toggleChecklistItem/countChecklist вынесены в utils/checklist.ts
- **Cleanup:** Toast ID через crypto.randomUUID, убран мёртвый код
