import React, { useEffect, useState, useCallback } from 'react';
import type { Rule, RuleTriggerField, RuleTriggerOp, RuleActionType, Column, Tag } from '@shared/types';
import { Plus, Trash2, Play, ToggleLeft, ToggleRight, X, Zap } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ── Labels ──────────────────────────────────────────────────────────────────

const TRIGGER_FIELD_LABELS: Record<RuleTriggerField, string> = {
  priority: 'Приоритет',
  column_id: 'Колонка',
  due_date: 'Дедлайн',
  tag: 'Тег',
  title: 'Заголовок',
  source_type: 'Источник',
};

const TRIGGER_OP_LABELS: Record<RuleTriggerOp, string> = {
  equals: 'равно',
  not_equals: 'не равно',
  contains: 'содержит',
  overdue: 'просрочен',
  greater_than: 'больше',
  less_than: 'меньше',
};

const ACTION_TYPE_LABELS: Record<RuleActionType, string> = {
  move_to_column: 'Переместить в колонку',
  set_priority: 'Установить приоритет',
  add_tag: 'Добавить тег',
  archive: 'Архивировать',
  set_color: 'Установить цвет',
};

const PRIORITY_LABELS: Record<string, string> = {
  '0': 'Нет',
  '1': 'Низкий',
  '2': 'Средний',
  '3': 'Высокий',
};

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Вручную',
  text: 'Текст',
  file: 'Файл',
  email: 'Письмо',
};

// ── Available ops per field ──────────────────────────────────────────────────

function getOpsForField(field: RuleTriggerField): RuleTriggerOp[] {
  switch (field) {
    case 'priority': return ['equals', 'not_equals', 'greater_than', 'less_than'];
    case 'column_id': return ['equals', 'not_equals'];
    case 'due_date': return ['overdue'];
    case 'tag': return ['equals', 'not_equals'];
    case 'title': return ['contains', 'equals', 'not_equals'];
    case 'source_type': return ['equals', 'not_equals'];
    default: return ['equals'];
  }
}

// ── Available actions (some fields constrain certain actions) ────────────────

const ALL_ACTIONS: RuleActionType[] = ['move_to_column', 'set_priority', 'add_tag', 'archive', 'set_color'];

// ── Color options for set_color ──────────────────────────────────────────────

const PRESET_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#6B7280'];

// ── Empty rule template ──────────────────────────────────────────────────────

function emptyRule(): Omit<Rule, 'id' | 'created_at'> {
  return {
    name: '',
    enabled: 1,
    trigger_field: 'priority',
    trigger_op: 'equals',
    trigger_value: '3',
    action_type: 'move_to_column',
    action_value: '',
    sort_order: 0,
  };
}

// ── Trigger value editor ─────────────────────────────────────────────────────

function TriggerValueEditor({
  field,
  op,
  value,
  onChange,
  columns,
  tags,
}: {
  field: RuleTriggerField;
  op: RuleTriggerOp;
  value: string;
  onChange: (v: string) => void;
  columns: Column[];
  tags: Tag[];
}) {
  if (op === 'overdue') return <span className="text-[11px] text-t-30 italic">автоматически</span>;

  switch (field) {
    case 'priority':
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-t-04 border border-t-06 rounded-lg px-2 py-1 text-[12px] text-t-80 outline-none focus:border-accent-blue/50"
        >
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      );
    case 'column_id':
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-t-04 border border-t-06 rounded-lg px-2 py-1 text-[12px] text-t-80 outline-none focus:border-accent-blue/50"
        >
          <option value="">— выбрать —</option>
          {columns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      );
    case 'tag':
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-t-04 border border-t-06 rounded-lg px-2 py-1 text-[12px] text-t-80 outline-none focus:border-accent-blue/50"
        >
          <option value="">— выбрать —</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      );
    case 'source_type':
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-t-04 border border-t-06 rounded-lg px-2 py-1 text-[12px] text-t-80 outline-none focus:border-accent-blue/50"
        >
          {Object.entries(SOURCE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      );
    default:
      return (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="значение"
          className="bg-t-04 border border-t-06 rounded-lg px-2 py-1 text-[12px] text-t-80 outline-none focus:border-accent-blue/50 w-32"
        />
      );
  }
}

// ── Action value editor ──────────────────────────────────────────────────────

function ActionValueEditor({
  actionType,
  value,
  onChange,
  columns,
  tags,
}: {
  actionType: RuleActionType;
  value: string;
  onChange: (v: string) => void;
  columns: Column[];
  tags: Tag[];
}) {
  switch (actionType) {
    case 'archive':
      return <span className="text-[11px] text-t-30 italic">задача будет архивирована</span>;
    case 'move_to_column':
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-t-04 border border-t-06 rounded-lg px-2 py-1 text-[12px] text-t-80 outline-none focus:border-accent-blue/50"
        >
          <option value="">— выбрать —</option>
          {columns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      );
    case 'set_priority':
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-t-04 border border-t-06 rounded-lg px-2 py-1 text-[12px] text-t-80 outline-none focus:border-accent-blue/50"
        >
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      );
    case 'add_tag':
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-t-04 border border-t-06 rounded-lg px-2 py-1 text-[12px] text-t-80 outline-none focus:border-accent-blue/50"
        >
          <option value="">— выбрать —</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      );
    case 'set_color':
      return (
        <div className="flex items-center gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onChange(c)}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${value === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      );
    default:
      return (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="значение"
          className="bg-t-04 border border-t-06 rounded-lg px-2 py-1 text-[12px] text-t-80 outline-none focus:border-accent-blue/50 w-32"
        />
      );
  }
}

// ── Main dialog ──────────────────────────────────────────────────────────────

export default function RulesDialog({ isOpen, onClose }: Props) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<Omit<Rule, 'id' | 'created_at'>>(emptyRule());
  const [runResult, setRunResult] = useState<{ actionsApplied: number } | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const [r, c, t] = await Promise.all([
      window.electronAPI?.getRules?.() ?? [],
      window.electronAPI?.getColumns() ?? [],
      window.electronAPI?.getTags() ?? [],
    ]);
    setRules(r as Rule[]);
    setColumns(c as Column[]);
    setTags(t as Tag[]);
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (editingId) setEditingId(null);
        else onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, editingId, onClose]);

  if (!isOpen) return null;

  async function handleSave() {
    if (!draft.name.trim()) return;
    if (editingId === 'new') {
      await window.electronAPI?.createRule?.(draft);
    } else if (editingId) {
      await window.electronAPI?.updateRule?.(editingId, draft);
    }
    setEditingId(null);
    await load();
  }

  async function handleDelete(id: string) {
    await window.electronAPI?.deleteRule?.(id);
    await load();
  }

  async function handleToggle(rule: Rule) {
    await window.electronAPI?.updateRule?.(rule.id, { enabled: rule.enabled ? 0 : 1 });
    await load();
  }

  async function handleRun() {
    setRunning(true);
    setRunResult(null);
    try {
      const result = await window.electronAPI?.runRules?.();
      setRunResult(result ?? { actionsApplied: 0 });
    } finally {
      setRunning(false);
    }
  }

  function startEdit(rule: Rule) {
    setDraft({
      name: rule.name,
      enabled: rule.enabled,
      trigger_field: rule.trigger_field,
      trigger_op: rule.trigger_op,
      trigger_value: rule.trigger_value,
      action_type: rule.action_type,
      action_value: rule.action_value,
      sort_order: rule.sort_order,
    });
    setEditingId(rule.id);
  }

  function startNew() {
    setDraft(emptyRule());
    setEditingId('new');
  }

  function updateDraftField<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      // Auto-reset op when field changes
      if (key === 'trigger_field') {
        const ops = getOpsForField(value as RuleTriggerField);
        if (!ops.includes(next.trigger_op as RuleTriggerOp)) {
          next.trigger_op = ops[0];
        }
        // Reset trigger_value
        next.trigger_value = value === 'priority' ? '3' : value === 'source_type' ? 'manual' : '';
      }
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-heavy border border-t-08 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4 shadow-2xl animate-fade-in-scale">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-t-06">
          <div className="flex items-center gap-2.5">
            <Zap size={16} className="text-accent-amber" />
            <h2 className="text-[15px] font-semibold text-t-85">Умные правила</h2>
            <span className="text-[11px] text-t-30 bg-t-04 px-2 py-0.5 rounded-full">ЕСЛИ → ТО</span>
          </div>
          <div className="flex items-center gap-2">
            {runResult && (
              <span className="text-[11px] text-accent-green">
                Применено: {runResult.actionsApplied}
              </span>
            )}
            <button
              onClick={handleRun}
              disabled={running || rules.filter((r) => r.enabled).length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-t-60 hover:text-t-85 hover:bg-t-06 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Запустить все активные правила"
            >
              <Play size={12} />
              {running ? 'Запуск...' : 'Запустить'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-t-30 hover:text-t-60 hover:bg-t-06 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          {/* Rule editor (new or edit) */}
          {editingId && (
            <div className="glass border border-accent-blue/25 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] text-accent-blue font-medium uppercase tracking-wide">
                  {editingId === 'new' ? 'Новое правило' : 'Редактировать'}
                </span>
              </div>

              {/* Name */}
              <input
                value={draft.name}
                onChange={(e) => updateDraftField('name', e.target.value)}
                placeholder="Название правила"
                className="bg-t-04 border border-t-06 rounded-lg px-3 py-1.5 text-[13px] text-t-85 outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/15 transition-all w-full"
              />

              {/* ЕСЛИ section */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-t-40 font-medium uppercase tracking-wide">ЕСЛИ</span>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Trigger field */}
                  <select
                    value={draft.trigger_field}
                    onChange={(e) => updateDraftField('trigger_field', e.target.value as RuleTriggerField)}
                    className="bg-t-04 border border-t-06 rounded-lg px-2 py-1 text-[12px] text-t-80 outline-none focus:border-accent-blue/50"
                  >
                    {(Object.keys(TRIGGER_FIELD_LABELS) as RuleTriggerField[]).map((f) => (
                      <option key={f} value={f}>{TRIGGER_FIELD_LABELS[f]}</option>
                    ))}
                  </select>

                  {/* Trigger op */}
                  <select
                    value={draft.trigger_op}
                    onChange={(e) => updateDraftField('trigger_op', e.target.value as RuleTriggerOp)}
                    className="bg-t-04 border border-t-06 rounded-lg px-2 py-1 text-[12px] text-t-80 outline-none focus:border-accent-blue/50"
                  >
                    {getOpsForField(draft.trigger_field).map((op) => (
                      <option key={op} value={op}>{TRIGGER_OP_LABELS[op]}</option>
                    ))}
                  </select>

                  {/* Trigger value */}
                  <TriggerValueEditor
                    field={draft.trigger_field}
                    op={draft.trigger_op}
                    value={draft.trigger_value}
                    onChange={(v) => updateDraftField('trigger_value', v)}
                    columns={columns}
                    tags={tags}
                  />
                </div>
              </div>

              {/* ТО section */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-accent-amber font-medium uppercase tracking-wide">ТО</span>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Action type */}
                  <select
                    value={draft.action_type}
                    onChange={(e) => {
                      updateDraftField('action_type', e.target.value as RuleActionType);
                      updateDraftField('action_value', '');
                    }}
                    className="bg-t-04 border border-t-06 rounded-lg px-2 py-1 text-[12px] text-t-80 outline-none focus:border-accent-amber/50"
                  >
                    {ALL_ACTIONS.map((a) => (
                      <option key={a} value={a}>{ACTION_TYPE_LABELS[a]}</option>
                    ))}
                  </select>

                  {/* Action value */}
                  <ActionValueEditor
                    actionType={draft.action_type}
                    value={draft.action_value}
                    onChange={(v) => updateDraftField('action_value', v)}
                    columns={columns}
                    tags={tags}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1.5 rounded-lg text-[12px] text-t-40 hover:text-t-60 bg-t-04 hover:bg-t-08 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={!draft.name.trim()}
                  className="px-4 py-1.5 rounded-lg text-[12px] text-white bg-accent-blue/80 hover:bg-accent-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </div>
          )}

          {/* Rules list */}
          {rules.length === 0 && !editingId && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Zap size={32} className="text-t-15 mb-3" />
              <p className="text-[13px] text-t-35">Правил пока нет</p>
              <p className="text-[11px] text-t-20 mt-1">Создайте первое правило автоматизации</p>
            </div>
          )}

          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`glass rounded-xl px-4 py-3 flex items-start gap-3 border transition-all duration-150 ${
                rule.enabled ? 'border-t-06' : 'border-t-04 opacity-50'
              } ${editingId === rule.id ? 'hidden' : ''}`}
            >
              {/* Toggle */}
              <button
                onClick={() => handleToggle(rule)}
                className="mt-0.5 text-t-30 hover:text-accent-blue transition-colors flex-shrink-0"
                title={rule.enabled ? 'Отключить' : 'Включить'}
              >
                {rule.enabled
                  ? <ToggleRight size={16} className="text-accent-blue" />
                  : <ToggleLeft size={16} />
                }
              </button>

              {/* Rule summary */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-t-75 truncate">{rule.name}</p>
                <p className="text-[11px] text-t-30 mt-0.5">
                  <span className="text-accent-blue/70">ЕСЛИ</span>{' '}
                  {TRIGGER_FIELD_LABELS[rule.trigger_field]}{' '}
                  {TRIGGER_OP_LABELS[rule.trigger_op]}
                  {rule.trigger_op !== 'overdue' && (
                    <> {getRuleValueLabel(rule.trigger_field, rule.trigger_value, columns, tags)}</>
                  )}
                  {' '}→{' '}
                  <span className="text-accent-amber/70">ТО</span>{' '}
                  {ACTION_TYPE_LABELS[rule.action_type]}
                  {rule.action_type !== 'archive' && (
                    <> {getActionValueLabel(rule.action_type, rule.action_value, columns, tags)}</>
                  )}
                </p>
              </div>

              {/* Edit + Delete */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(rule)}
                  className="px-2.5 py-1 rounded-lg text-[11px] text-t-40 hover:text-t-70 hover:bg-t-06 transition-colors"
                >
                  Изменить
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="p-1.5 rounded-lg text-t-25 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {!editingId && (
          <div className="px-5 py-3 border-t border-t-06">
            <button
              onClick={startNew}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] text-t-60 hover:text-t-85 hover:bg-t-06 border border-t-06 hover:border-t-10 transition-all duration-150 w-full justify-center"
            >
              <Plus size={13} />
              Новое правило
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRuleValueLabel(field: RuleTriggerField, value: string, columns: Column[], tags: Tag[]): string {
  if (field === 'priority') return PRIORITY_LABELS[value] ?? value;
  if (field === 'column_id') return columns.find((c) => c.id === value)?.name ?? value;
  if (field === 'tag') return tags.find((t) => t.id === value)?.name ?? value;
  if (field === 'source_type') return SOURCE_LABELS[value] ?? value;
  return value;
}

function getActionValueLabel(actionType: RuleActionType, value: string, columns: Column[], tags: Tag[]): string {
  if (actionType === 'move_to_column') return columns.find((c) => c.id === value)?.name ?? value;
  if (actionType === 'set_priority') return PRIORITY_LABELS[value] ?? value;
  if (actionType === 'add_tag') return tags.find((t) => t.id === value)?.name ?? value;
  if (actionType === 'set_color') return value;
  return value;
}
