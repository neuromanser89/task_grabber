# Известные баги — требуют исправления

## CRITICAL (не работают ключевые фичи)

### 1. Правый клик на карточке задачи — контекстное меню не появляется
**Симптом:** При правом клике на TaskCard меню "Перенести на доску" не показывается. Курсор в виде "grab" (хватательной лапы). Карточка не двигается, но меню не появляется.
**Причина:** dnd-kit PointerSensor перехватывает pointer events до React. Попытки с `releasePointerCapture`, фильтром `onPointerDown(button===2)`, кастомным sensor — не помогли.
**Файлы:** `src/renderer/components/Task/TaskCard.tsx`, `src/renderer/components/Board/KanbanBoard.tsx`
**Возможное решение:** Нужен кастомный PointerSensor который игнорирует button===2 на уровне sensor, или использовать MouseSensor вместо PointerSensor, или drag handle (отдельная зона для drag вместо всей карточки).

### 2. Чеклист — клик на чекбокс выбирает не тот пункт
**Симптом:** При клике на checkbox в TaskDetail (preview markdown) — отмечается не тот пункт на который кликнул, а другой (рандомный).
**Причина:** `checkboxIndexRef.current++` в React-markdown `input` компоненте считает индексы в порядке рендера DOM, но `toggleChecklistItem` использует regex по строкам. Порядок может не совпадать если между чекбоксами есть заголовки, текст, вложенные списки.
**Файлы:** `src/renderer/components/Task/TaskDetail.tsx` (функция `toggleChecklistItem` + `checkboxIndexRef`), `src/renderer/components/common/MarkdownEditor.tsx`
**Возможное решение:** Привязать каждый checkbox к номеру строки в тексте (не к порядковому номеру рендера). Передавать line number через data-атрибут.

### 3. Drop подсветка колонки — верхняя часть не подсвечивается
**Симптом:** При перетаскивании задачи в другую колонку, подсветка (синий ring) появляется только в нижней части колонки, верхняя часть (заголовок) не реагирует визуально.
**Причина:** `isOver` от `useDroppable` привязан к ref на корневом div, но CSS класс `ring-1 ring-accent-blue/30` может не отображаться из-за `overflow-hidden` на колонке или из-за того что `isOver` не обновляется при hover над header.
**Файлы:** `src/renderer/components/Board/Column.tsx`
**Возможное решение:** Проверить что ref действительно на корневом div. Убрать `overflow-hidden` с колонки или использовать `box-shadow` вместо `ring` для подсветки.

---

## Контекст
- Все три бага пытались фиксить 3 раза в текущей сессии — безуспешно
- Vite cache очищался, full rebuild делался, dev server перезапускался
- Код фиксов присутствует в git но визуально ничего не меняется
- Возможно нужен дебаг через DevTools консоль в runtime
