import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Trash2, Pencil, X, Check, User, Briefcase, ChevronDown } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import type { Project, Tag } from '@shared/types';

const CURRENT_YEAR = new Date().getFullYear();

interface ProjectFormData {
  name: string;
  rp: string;
  architect: string;
  start_year: string;
  pmi_done: boolean;
  pmi_url: string;
  confluence: string;
  pap_url: string;
  tag_id: string;
}

const defaultForm = (): ProjectFormData => ({
  name: '',
  rp: '',
  architect: 'Я',
  start_year: String(CURRENT_YEAR),
  pmi_done: false,
  pmi_url: '',
  confluence: '',
  pap_url: '',
  tag_id: '',
});

function TagDropdown({ value, onChange, tags }: { value: string; onChange: (v: string) => void; tags: Tag[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = tags.find((t) => t.id === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-1 bg-t-04 border border-t-06 hover:border-t-10 rounded-md px-2 py-1 text-[12px] text-t-75 outline-none transition-colors"
      >
        <span className="flex items-center gap-1.5 truncate">
          {selected ? (
            <>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />
              {selected.name}
            </>
          ) : (
            <span className="text-t-30">Без тега</span>
          )}
        </span>
        <ChevronDown size={10} className={`text-t-30 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 glass-heavy border border-t-10 rounded-lg shadow-2xl max-h-48 overflow-y-auto py-1">
          <button
            onClick={() => { onChange(''); setOpen(false); }}
            className={`w-full px-2.5 py-1.5 text-left text-[11px] hover:bg-t-06 transition-colors ${!value ? 'text-accent-blue' : 'text-t-50'}`}
          >
            Без тега
          </button>
          {tags.map((t) => (
            <button
              key={t.id}
              onClick={() => { onChange(t.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] hover:bg-t-06 transition-colors ${value === t.id ? 'text-accent-blue' : 'text-t-70'}`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  tags: Tag[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Project>) => void;
}

function ProjectCard({ project, tags, onDelete, onUpdate }: ProjectCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProjectFormData>({
    name: project.name,
    rp: project.rp ?? '',
    architect: project.architect,
    start_year: project.start_year != null ? String(project.start_year) : '',
    pmi_done: !!project.pmi_done,
    pmi_url: project.pmi_url ?? '',
    confluence: project.confluence ?? '',
    pap_url: project.pap_url ?? '',
    tag_id: project.tag_id ?? '',
  });

  const tag = tags.find((t) => t.id === project.tag_id);

  const startEdit = () => {
    setForm({
      name: project.name,
      rp: project.rp ?? '',
      architect: project.architect,
      start_year: project.start_year != null ? String(project.start_year) : '',
      pmi_done: !!project.pmi_done,
      pmi_url: project.pmi_url ?? '',
      confluence: project.confluence ?? '',
      pap_url: project.pap_url ?? '',
      tag_id: project.tag_id ?? '',
    });
    setEditing(true);
  };

  const [saveError, setSaveError] = useState('');

  const save = async () => {
    setSaveError('');
    try {
      await onUpdate(project.id, {
        name: form.name.trim() || project.name,
        rp: form.rp.trim() || null,
        architect: form.architect.trim() || 'Я',
        start_year: form.start_year ? Number(form.start_year) : null,
        pmi_done: form.pmi_done ? 1 : 0,
        pmi_url: form.pmi_url.trim() || null,
        confluence: form.confluence.trim() || null,
        pap_url: form.pap_url.trim() || null,
        tag_id: form.tag_id || null,
      });
      setEditing(false);
    } catch (err) {
      setSaveError(String(err instanceof Error ? err.message : err));
    }
  };

  const cancel = () => setEditing(false);

  const openUrl = (url: string) => window.electronAPI?.openExternal?.(url);

  if (editing) {
    return (
      <div className="glass-card rounded-xl p-4 flex flex-col gap-2.5 border-accent-blue/30 animate-fade-in">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Название проекта"
          className="w-full bg-transparent text-[13px] font-semibold text-t-85 outline-none border-b border-t-06 pb-1.5 placeholder-t-20"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={form.rp}
            onChange={(e) => setForm((f) => ({ ...f, rp: e.target.value }))}
            placeholder="РП"
            className="w-full bg-t-04 border border-t-06 rounded-md px-2 py-1 text-[12px] text-t-75 outline-none placeholder-t-20"
          />
          <input
            type="text"
            value={form.architect}
            onChange={(e) => setForm((f) => ({ ...f, architect: e.target.value }))}
            placeholder="Архитектор"
            className="w-full bg-t-04 border border-t-06 rounded-md px-2 py-1 text-[12px] text-t-75 outline-none placeholder-t-20"
          />
          <input
            type="number"
            value={form.start_year}
            onChange={(e) => setForm((f) => ({ ...f, start_year: e.target.value }))}
            placeholder="Год старта"
            className="w-full bg-t-04 border border-t-06 rounded-md px-2 py-1 text-[12px] text-t-75 outline-none placeholder-t-20"
          />
          <TagDropdown
            value={form.tag_id}
            onChange={(v) => setForm((f) => ({ ...f, tag_id: v }))}
            tags={tags}
          />
        </div>
        <input
          type="url"
          value={form.confluence}
          onChange={(e) => setForm((f) => ({ ...f, confluence: e.target.value }))}
          placeholder="Confluence URL"
          className="w-full bg-t-04 border border-t-06 rounded-md px-2 py-1 text-[12px] text-t-75 outline-none placeholder-t-20"
        />
        <input
          type="url"
          value={form.pap_url}
          onChange={(e) => setForm((f) => ({ ...f, pap_url: e.target.value }))}
          placeholder="ПАП URL"
          className="w-full bg-t-04 border border-t-06 rounded-md px-2 py-1 text-[12px] text-t-75 outline-none placeholder-t-20"
        />
        <input
          type="url"
          value={form.pmi_url}
          onChange={(e) => setForm((f) => ({ ...f, pmi_url: e.target.value }))}
          placeholder="ПМИ URL"
          className="w-full bg-t-04 border border-t-06 rounded-md px-2 py-1 text-[12px] text-t-75 outline-none placeholder-t-20"
        />
        <label className="flex items-center gap-2 cursor-pointer text-[12px] text-t-60">
          <input
            type="checkbox"
            checked={form.pmi_done}
            onChange={(e) => setForm((f) => ({ ...f, pmi_done: e.target.checked }))}
            className="w-3.5 h-3.5 accent-emerald-500"
          />
          ПМИ пройден
        </label>
        {saveError && (
          <p className="text-[11px] text-red-400 bg-red-500/10 rounded px-2 py-1">{saveError}</p>
        )}
        <div className="flex gap-1.5 justify-end pt-1 border-t border-t-06">
          <button
            onClick={save}
            className="flex items-center gap-1 px-3 py-1 rounded-md text-[11px] bg-accent-blue/80 hover:bg-accent-blue text-white transition-colors"
          >
            <Check size={11} /> Сохранить
          </button>
          <button
            onClick={cancel}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-t-30 hover:text-t-60 hover:bg-t-05 transition-colors"
          >
            <X size={11} /> Отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group glass-card rounded-xl p-4 flex flex-col gap-2.5 transition-all duration-200 hover:border-t-12 hover:shadow-lg animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-t-90 leading-snug flex-1">{project.name}</p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={startEdit}
            className="p-1.5 rounded-md text-t-25 hover:text-t-60 hover:bg-t-05 transition-colors"
            title="Редактировать"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="p-1.5 rounded-md text-t-25 hover:text-red-400/80 hover:bg-red-400/10 transition-colors"
            title="Удалить"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {project.rp && (
        <div className="flex items-center gap-1.5">
          <User size={11} className="text-t-30 flex-shrink-0" />
          <span className="text-xs text-t-50">РП: {project.rp}</span>
        </div>
      )}
      {project.architect && (
        <p className="text-xs text-t-50">Архитектор: {project.architect}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {project.start_year != null && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-t-06 text-t-40">{project.start_year}</span>
        )}
        {project.pmi_done ? (
          <button
            onClick={() => project.pmi_url && openUrl(project.pmi_url)}
            className={`px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 ${project.pmi_url ? 'cursor-pointer hover:bg-emerald-500/25' : 'cursor-default'}`}
          >
            ✓ ПМИ пройден
          </button>
        ) : (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/15 text-red-400">
            ✗ ПМИ не пройден
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {project.confluence && (
          <button
            onClick={() => openUrl(project.confluence!)}
            className="text-xs text-accent-blue hover:underline"
          >
            Confluence →
          </button>
        )}
        {project.pap_url && (
          <button
            onClick={() => openUrl(project.pap_url!)}
            className="text-xs text-accent-blue hover:underline"
          >
            ПАП →
          </button>
        )}
      </div>

      {tag && (
        <div className="pt-1 border-t border-t-04">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
          >
            {tag.name}
          </span>
        </div>
      )}
    </div>
  );
}

function CreateProjectCard({ tags, onCreate }: { tags: Tag[]; onCreate: (data: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'tag_id' | 'sort_order'>) => Promise<Project> }) {
  const [active, setActive] = useState(false);
  const [form, setForm] = useState<ProjectFormData>(defaultForm());
  const [saveError, setSaveError] = useState('');

  const activate = () => setActive(true);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaveError('');
    try {
      await onCreate({
        name: form.name.trim(),
        rp: form.rp.trim() || null,
        architect: form.architect.trim() || 'Я',
        start_year: form.start_year ? Number(form.start_year) : null,
        pmi_done: form.pmi_done ? 1 : 0,
        pmi_url: form.pmi_url.trim() || null,
        confluence: form.confluence.trim() || null,
        pap_url: form.pap_url.trim() || null,
      });
      setForm(defaultForm());
      setActive(false);
    } catch (err) {
      setSaveError(String(err instanceof Error ? err.message : err));
    }
  };

  const cancel = () => {
    setForm(defaultForm());
    setSaveError('');
    setActive(false);
  };

  if (!active) {
    return (
      <button
        onClick={activate}
        className="glass-card rounded-xl p-4 flex items-center gap-2 text-[13px] text-t-25 hover:text-t-50 hover:border-t-12 transition-all duration-200 border-2 border-dashed border-t-08 min-h-[100px]"
      >
        <Plus size={16} className="flex-shrink-0" />
        Новый проект
      </button>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4 flex flex-col gap-2.5 border-accent-blue/30 animate-fade-in">
      <input
        autoFocus
        type="text"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        placeholder="Название проекта"
        className="w-full bg-transparent text-[13px] font-semibold text-t-85 outline-none border-b border-t-06 pb-1.5 placeholder-t-20"
        onKeyDown={(e) => { if (e.key === 'Escape') cancel(); if (e.key === 'Enter' && e.ctrlKey) save(); }}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={form.rp}
          onChange={(e) => setForm((f) => ({ ...f, rp: e.target.value }))}
          placeholder="РП"
          className="w-full bg-t-04 border border-t-06 rounded-md px-2 py-1 text-[12px] text-t-75 outline-none placeholder-t-20"
        />
        <input
          type="text"
          value={form.architect}
          onChange={(e) => setForm((f) => ({ ...f, architect: e.target.value }))}
          placeholder="Архитектор"
          className="w-full bg-t-04 border border-t-06 rounded-md px-2 py-1 text-[12px] text-t-75 outline-none placeholder-t-20"
        />
        <input
          type="number"
          value={form.start_year}
          onChange={(e) => setForm((f) => ({ ...f, start_year: e.target.value }))}
          placeholder="Год старта"
          className="w-full bg-t-04 border border-t-06 rounded-md px-2 py-1 text-[12px] text-t-75 outline-none placeholder-t-20"
        />
        <select
          value={form.tag_id}
          onChange={(e) => setForm((f) => ({ ...f, tag_id: e.target.value }))}
          className="w-full bg-t-04 border border-t-06 rounded-md px-2 py-1 text-[12px] text-t-75 outline-none appearance-none"
        >
          <option value="">Без тега</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <input
        type="url"
        value={form.confluence}
        onChange={(e) => setForm((f) => ({ ...f, confluence: e.target.value }))}
        placeholder="Confluence URL"
        className="w-full bg-t-04 border border-t-06 rounded-md px-2 py-1 text-[12px] text-t-75 outline-none placeholder-t-20"
      />
      <input
        type="url"
        value={form.pap_url}
        onChange={(e) => setForm((f) => ({ ...f, pap_url: e.target.value }))}
        placeholder="ПАП URL"
        className="w-full bg-t-04 border border-t-06 rounded-md px-2 py-1 text-[12px] text-t-75 outline-none placeholder-t-20"
      />
      <input
        type="url"
        value={form.pmi_url}
        onChange={(e) => setForm((f) => ({ ...f, pmi_url: e.target.value }))}
        placeholder="ПМИ URL"
        className="w-full bg-t-04 border border-t-06 rounded-md px-2 py-1 text-[12px] text-t-75 outline-none placeholder-t-20"
      />
      <label className="flex items-center gap-2 cursor-pointer text-[12px] text-t-60">
        <input
          type="checkbox"
          checked={form.pmi_done}
          onChange={(e) => setForm((f) => ({ ...f, pmi_done: e.target.checked }))}
          className="w-3.5 h-3.5 accent-emerald-500"
        />
        ПМИ пройден
      </label>
      {saveError && (
        <p className="text-[11px] text-red-400 bg-red-500/10 rounded px-2 py-1">{saveError}</p>
      )}
      <div className="flex gap-1.5 justify-end pt-1 border-t border-t-06">
        <button
          onClick={save}
          className="flex items-center gap-1 px-3 py-1 rounded-md text-[11px] bg-accent-blue/80 hover:bg-accent-blue text-white transition-colors"
        >
          <Check size={11} /> Сохранить
        </button>
        <button
          onClick={cancel}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-t-30 hover:text-t-60 hover:bg-t-05 transition-colors"
        >
          <X size={11} /> Отмена
        </button>
      </div>
    </div>
  );
}

export default function ProjectsCanvasView() {
  const { projects, fetchProjects, createProject, updateProject, deleteProject } = useProjectStore();
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProjects();
    window.electronAPI?.getTags?.().then(setTags).catch(() => {});
  }, [fetchProjects]);

  const filtered = search.trim()
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.rp ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : projects;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-t-04 flex-shrink-0">
        <Briefcase size={15} className="text-t-40 flex-shrink-0" />
        <h2 className="text-[14px] font-semibold text-t-70 flex-shrink-0">Проекты</h2>
        <span className="text-[11px] text-t-20 flex-shrink-0">{projects.length}</span>
        <div className="flex-1" />
        <div className="relative flex-shrink-0 w-56">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t-25 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по проектам..."
            className="w-full bg-t-04 border border-t-06 hover:border-t-10 focus:border-accent-blue/40 rounded-lg pl-7 pr-3 py-1.5 text-[12px] text-t-75 outline-none placeholder:text-t-20 transition-all duration-150"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-t-20 hover:text-t-50 transition-colors"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
            alignItems: 'start',
          }}
        >
          <CreateProjectCard tags={tags} onCreate={createProject} />
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tags={tags}
              onDelete={deleteProject}
              onUpdate={updateProject}
            />
          ))}
        </div>

        {filtered.length === 0 && search && (
          <div className="flex flex-col items-center justify-center py-16 text-t-20">
            <p className="text-[13px]">Ничего не найдено по запросу «{search}»</p>
          </div>
        )}

        {projects.length === 0 && !search && (
          <div className="flex flex-col items-center justify-center py-16 text-t-20 pointer-events-none">
            <p className="text-[14px] mb-1">Проектов пока нет</p>
            <p className="text-[12px]">Создайте первый проект</p>
          </div>
        )}
      </div>
    </div>
  );
}
