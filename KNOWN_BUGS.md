# Известные баги

## ~~CRITICAL~~ — ИСПРАВЛЕНЫ (2026-03-18)

### ~~1. Правый клик на карточке задачи — контекстное меню не появляется~~
**Статус:** ✅ ИСПРАВЛЕНО
**Решение:** Заменён `PointerSensor` на `MouseSensor + TouchSensor` в KanbanBoard.tsx. `PointerSensor.attach()` вешал `window contextmenu: preventDefault`, что блокировало контекстное меню. `MouseSensor` не использует Pointer Events API. Убран кастомный `rawListeners` хак из TaskCard.tsx.

### ~~2. Чеклист — клик на чекбокс выбирает не тот пункт~~
**Статус:** ✅ ИСПРАВЛЕНО
**Решение:** Заменён порядковый счётчик `checkboxIndexRef.current++` на `node.position.start.line` из AST-ноды react-markdown. Теперь `toggleChecklistItem` получает номер строки в markdown-тексте напрямую — O(1) без счётчиков. Исправлено в TaskDetail.tsx и MarkdownEditor.tsx.

### ~~3. Drop подсветка колонки — верхняя часть не подсвечивается~~
**Статус:** ✅ ИСПРАВЛЕНО
**Решение:** Заменён `ring` (box-shadow, обрезается `overflow-hidden`) на `border` в Column.tsx. Добавлена подсветка header (`bg-accent-blue/[0.03]`) при `isOver`. `border` не обрезается `overflow-hidden`, поэтому подсветка видна на всей колонке.
