import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, X, AlertTriangle, Eye, RefreshCw, Lock, Unlock } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useColumnStore } from '../../stores/columnStore';
import type { TaskWithAttachments } from '@shared/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIConfig {
  provider: 'openrouter' | 'ollama';
  model: string;
  apiKey: string;
  baseUrl: string;
  excludeConfidential: boolean;
}

interface AIAssistantDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRIORITY_LABELS = ['', 'Low', 'Medium', 'High'];

function buildTasksContext(
  tasks: TaskWithAttachments[],
  colMap: Record<string, string>,
  excludeConfidential: boolean
): { text: string; preview: { title: string; column: string; priority: number; confidential: boolean }[] } {
  const preview: { title: string; column: string; priority: number; confidential: boolean }[] = [];
  const lines: string[] = [];
  let confIdx = 1;

  for (const task of tasks) {
    const colName = colMap[task.column_id] ?? 'Unknown';
    if (task.is_confidential) {
      if (excludeConfidential) continue;
      const title = `CONFIDENTIAL CASE #${confIdx++}`;
      preview.push({ title, column: colName, priority: task.priority, confidential: true });
      lines.push(`- [${colName}] ${title} (priority: ${PRIORITY_LABELS[task.priority] || 'none'})`);
    } else {
      preview.push({ title: task.title, column: colName, priority: task.priority, confidential: false });
      const desc = task.description ? ` — ${task.description.slice(0, 100)}` : '';
      lines.push(`- [${colName}] ${task.title}${desc} (priority: ${PRIORITY_LABELS[task.priority] || 'none'})`);
    }
  }

  return { text: lines.join('\n'), preview };
}

function DaySummaryPreview({
  preview,
  onClose,
  onSend,
}: {
  preview: { title: string; column: string; priority: number; confidential: boolean }[];
  onClose: () => void;
  onSend: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[500px] mx-4 glass-heavy rounded-2xl border border-t-08 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-t-06">
          <div className="flex items-center gap-2">
            <Eye size={14} className="text-accent-blue" />
            <span className="text-sm font-medium text-t-85">Предпросмотр — что уйдёт на сервер</span>
          </div>
          <button onClick={onClose} className="text-t-40 hover:text-t-70 transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="p-4 max-h-[400px] overflow-y-auto scrollbar-thin space-y-1.5">
          {preview.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                item.confidential
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-t-03 border border-t-06'
              }`}
            >
              {item.confidential ? (
                <Lock size={10} className="text-amber-400 flex-shrink-0" />
              ) : (
                <Unlock size={10} className="text-t-30 flex-shrink-0" />
              )}
              <span className={item.confidential ? 'text-amber-300/80' : 'text-t-70'}>{item.title}</span>
              <span className="ml-auto text-t-30 flex-shrink-0">{item.column}</span>
            </div>
          ))}
          {preview.length === 0 && (
            <div className="text-center text-sm text-t-30 py-4">Нет задач для отправки</div>
          )}
        </div>
        <div className="flex gap-2 px-4 py-3 border-t border-t-06">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-xs text-t-50 hover:text-t-70 bg-t-04 hover:bg-t-08 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={onSend}
            className="flex-1 py-2 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-accent-blue to-accent-purple hover:opacity-90 transition-opacity"
          >
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AIAssistantDialog({ isOpen, onClose }: AIAssistantDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{ title: string; column: string; priority: number; confidential: boolean }[]>([]);
  const [pendingSummary, setPendingSummary] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const daySummaryContextRef = useRef<string>('');

  const { tasks } = useTaskStore();
  const { columns } = useColumnStore();
  const colMap = Object.fromEntries(columns.map((c) => [c.id, c.name]));

  // Load AI config from settings
  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      window.electronAPI?.getSetting('ai_provider'),
      window.electronAPI?.getSetting('ai_model'),
      window.electronAPI?.getSetting('ai_api_key'),
      window.electronAPI?.getSetting('ai_base_url'),
      window.electronAPI?.getSetting('ai_exclude_confidential'),
    ]).then(([provider, model, apiKey, baseUrl, excludeConf]) => {
      setConfig({
        provider: (provider as 'openrouter' | 'ollama') || 'openrouter',
        model: (model as string) || 'openai/gpt-4o-mini',
        apiKey: (apiKey as string) || '',
        baseUrl: (baseUrl as string) || 'http://localhost:11434',
        excludeConfidential: excludeConf === 'true',
      });
    });
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeTasks = tasks.filter((t) => !t.archived_at);

  const sendMessage = useCallback(async (userContent: string, systemOverride?: string) => {
    if (!config || !userContent.trim()) return;

    const userMsg: Message = { role: 'user', content: userContent };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const systemPrompt = systemOverride ?? `Ты — AI-помощник в приложении Task Grabber (менеджер задач).
Помогай пользователю анализировать задачи, давать советы по приоритизации и планированию.
Отвечай кратко и по делу на русском языке.`;

    const allMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
      userMsg,
    ];

    try {
      const result = await window.electronAPI?.aiQuery?.({
        provider: config.provider,
        model: config.model,
        apiKey: config.apiKey || null,
        baseUrl: config.baseUrl || null,
        messages: allMessages,
      }) as { content: string } | undefined;

      const assistantContent = result?.content ?? '(пустой ответ)';
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Ошибка: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [config, messages]);

  const handleDaySummary = useCallback(() => {
    if (!config) return;
    const { text, preview } = buildTasksContext(activeTasks, colMap, config.excludeConfidential);
    setPreviewData(preview);
    setPendingSummary(true);
    daySummaryContextRef.current = text;
    setShowPreview(true);
  }, [config, activeTasks, colMap]);

  const handleConfirmSummary = useCallback(() => {
    setShowPreview(false);
    setPendingSummary(false);
    const text = daySummaryContextRef.current;
    const systemPrompt = `Ты — AI-помощник в Task Grabber. Проанализируй список задач пользователя и дай краткий итог дня:
- Что сделано / в работе
- Что застряло или требует внимания
- Топ-3 рекомендации на завтра
Отвечай по-русски, кратко.`;
    sendMessage(
      `Вот мои текущие задачи:\n${text}\n\nСделай итог дня.`,
      systemPrompt
    );
  }, [sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim()) sendMessage(input);
    }
  };

  if (!isOpen) return null;

  const isConfigured = config && (config.provider === 'ollama' || config.apiKey);

  return (
    <>
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="relative w-full max-w-[620px] mx-4 glass-heavy rounded-2xl border border-t-08 shadow-2xl flex flex-col animate-fade-in-scale" style={{ maxHeight: '80vh' }}>
          {/* Top gradient line */}
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-accent-purple/30 to-transparent rounded-full" />
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-t-06 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <span className="text-sm font-medium text-t-85">AI Помощник</span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleDaySummary}
                disabled={!isConfigured || loading}
                className="flex items-center gap-1.5 h-7 px-3 text-xs text-t-60 hover:text-t-85 bg-t-05 hover:bg-t-10 border border-t-08 rounded-lg transition-all duration-150 disabled:opacity-40"
              >
                <RefreshCw size={11} />
                Итог дня
              </button>
              <button onClick={onClose} className="text-t-40 hover:text-t-70 transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Security warning — ПОСТОЯННОЕ */}
          <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-500/[0.07] border-b border-amber-500/[0.15] flex-shrink-0">
            <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <span className="text-[11px] text-amber-300/80">
              Данные отправляются на внешний сервер ({config?.provider === 'ollama' ? 'Ollama (локально)' : 'OpenRouter'}).
              Конфиденциальные задачи обфусцируются.
            </span>
          </div>

          {/* No config warning */}
          {!isConfigured && (
            <div className="px-4 py-3 text-xs text-t-50 flex-shrink-0">
              Настройте AI в Настройки → вкладка AI (укажите API ключ или Ollama URL).
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin min-h-0">
            {messages.length === 0 && (
              <div className="text-center text-sm text-t-25 py-8">
                Задайте вопрос или нажмите «Итог дня»
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-accent-blue/25 border border-accent-blue/30 text-t-85'
                      : 'bg-t-04 border border-t-06 text-t-75'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-t-04 border border-t-06 rounded-xl px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-t-10 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-t-10 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-t-10 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 px-3 py-3 border-t border-t-06 flex-shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isConfigured || loading}
              placeholder={isConfigured ? 'Введите сообщение... (Enter — отправить, Shift+Enter — перенос)' : 'Настройте AI в настройках'}
              rows={2}
              className="flex-1 resize-none bg-t-04 border border-t-08 focus:border-accent-blue/40 rounded-xl px-3 py-2 text-sm text-t-85 placeholder:text-t-25 outline-none transition-colors scrollbar-thin disabled:opacity-40"
            />
            <button
              onClick={() => { if (input.trim()) sendMessage(input); }}
              disabled={!isConfigured || loading || !input.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple text-white hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {showPreview && (
        <DaySummaryPreview
          preview={previewData}
          onClose={() => { setShowPreview(false); setPendingSummary(false); }}
          onSend={handleConfirmSummary}
        />
      )}
    </>
  );
}
