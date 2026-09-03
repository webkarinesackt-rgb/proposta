'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, X, Search, Copy, Check, Pencil, BookOpen, Rocket, Send, Calculator, DollarSign } from 'lucide-react'
import { kbStore, KbEntry, KbSection, KbTableMissingError } from '@/lib/kbStore'
import { useToast } from '@/lib/useToast'
import BroadcastModal from './BroadcastModal'
import BudgetTemplatesPanel from './BudgetTemplatesPanel'
import PricingCalculator from './PricingCalculator'

export default function ComercialView() {
  const [entries, setEntries] = useState<KbEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [section, setSection] = useState<KbSection | 'orcamento' | 'precificacao'>('processo')
  // processos e scripts usam a base de conhecimento; orçamento/precificação são ferramentas
  const isKb = section === 'processo' || section === 'script'
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<KbEntry | null>(null)
  const [creating, setCreating] = useState(false)
  const [broadcastText, setBroadcastText] = useState<string | null>(null)
  const { show: showToast, Toast } = useToast()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      setEntries(await kbStore.getAll())
      setNeedsSetup(false)
    } catch (e) {
      if (e instanceof KbTableMissingError) setNeedsSetup(true)
    } finally {
      setLoading(false)
    }
  }

  async function save(draft: KbEntry) {
    try {
      if (draft.id) {
        await kbStore.update(draft.id, {
          section: draft.section,
          category: draft.category,
          title: draft.title,
          content: draft.content,
        })
        setEntries((es) => es.map((e) => (e.id === draft.id ? draft : e)))
      } else {
        const created = await kbStore.create({
          section: draft.section,
          category: draft.category,
          title: draft.title,
          content: draft.content,
        })
        setEntries((es) => [...es, created])
      }
      setEditing(null)
      setCreating(false)
      showToast('Salvo ✓')
    } catch (e) {
      if (e instanceof KbTableMissingError) setNeedsSetup(true)
      else showToast('Erro ao salvar', { kind: 'error' })
    }
  }

  async function remove(id: string) {
    if (!confirm('Excluir este item?')) return
    setEntries((es) => es.filter((e) => e.id !== id))
    try {
      await kbStore.remove(id)
    } catch {
      showToast('Erro ao excluir', { kind: 'error' })
    }
  }

  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries
      .filter((e) => e.section === section)
      .filter((e) =>
        !q ? true : [e.title, e.content, e.category].join(' ').toLowerCase().includes(q),
      )
  }, [entries, section, search])

  // scripts agrupados por categoria
  const grouped = useMemo(() => {
    const m = new Map<string, KbEntry[]>()
    for (const e of list) {
      const k = e.category || 'Geral'
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(e)
    }
    return [...m.entries()]
  }, [list])

  function startNew() {
    if (!isKb) return
    setEditing({ id: '', section, category: '', title: '', content: '', sort: Date.now() })
    setCreating(true)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#EDEDEA' }}>
      <Toast />
      {/* header */}
      <div className="px-5 md:px-8 pt-6 pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1
              className="text-[22px] md:text-[26px] font-bold"
              style={{ color: '#141414', fontFamily: 'var(--font-inter), Inter, sans-serif', fontStyle: 'normal' }}
            >
              Comercial
            </h1>
            <p className="text-[12px] mt-0.5" style={{ color: '#9B9B9B' }}>
              Base de conhecimento do time: processos e prospecção.
            </p>
          </div>
          {isKb && (
            <button
              onClick={startNew}
              className="flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 rounded-lg transition-opacity hover:opacity-90"
              style={{ background: '#141414', color: '#D6F23C' }}
            >
              <Plus size={14} /> {section === 'processo' ? 'Novo processo' : 'Novo script'}
            </button>
          )}
        </div>

        {/* sub-abas */}
        <div className="flex items-center gap-2 mt-4">
          {([
            { id: 'processo', label: 'Processos', icon: BookOpen },
            { id: 'script', label: 'Prospecção', icon: Rocket },
            { id: 'orcamento', label: 'Orçamentos', icon: Calculator },
            { id: 'precificacao', label: 'Precificação', icon: DollarSign },
          ] as const).map((t) => {
            const active = section === t.id
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setSection(t.id)}
                className="flex items-center gap-1.5 text-[12px] font-bold px-4 py-2 rounded-full transition-all"
                style={{
                  background: active ? '#141414' : '#FFFFFF',
                  color: active ? '#D6F23C' : '#6E6E6E',
                  border: '1px solid ' + (active ? '#141414' : '#E6E6E1'),
                }}
              >
                <Icon size={13} />
                {t.label}
              </button>
            )
          })}
          {isKb && (
            <div className="relative ml-auto max-w-[280px] flex-1 min-w-[160px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#A8B5B0' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar…"
                className="w-full text-[13px] pl-9 pr-3 py-2 rounded-lg outline-none"
                style={{ background: '#FFFFFF', border: '1px solid #E6E6E1', color: '#141414' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* conteúdo */}
      <div className="flex-1 min-h-0 overflow-auto px-5 md:px-8 pb-8">
        {section === 'precificacao' ? (
          <PricingCalculator />
        ) : section === 'orcamento' ? (
          <BudgetTemplatesPanel />
        ) : needsSetup ? (
          <SetupBanner onRetry={load} />
        ) : loading ? (
          <p className="text-[13px] text-center py-16" style={{ color: '#A8B5B0' }}>
            Carregando…
          </p>
        ) : list.length === 0 ? (
          <div
            className="text-center py-16 rounded-2xl"
            style={{ background: '#FFFFFF', border: '1px dashed #D8D8D0' }}
          >
            <p className="text-[14px] font-semibold" style={{ color: '#141414' }}>
              {section === 'processo'
                ? 'Nenhum processo cadastrado ainda.'
                : 'Nenhum script de prospecção ainda.'}
            </p>
            <button
              onClick={startNew}
              className="mt-3 text-[12px] font-bold px-4 py-2 rounded-lg"
              style={{ background: '#141414', color: '#D6F23C' }}
            >
              + Criar o primeiro
            </button>
          </div>
        ) : section === 'processo' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-5xl">
            {list.map((e) => (
              <ProcessCard key={e.id} entry={e} onEdit={() => setEditing(e)} onRemove={() => remove(e.id)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6 max-w-4xl">
            {grouped.map(([cat, items]) => (
              <div key={cat}>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#9B9B9B' }}>
                  {cat}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((e) => (
                    <ScriptCard
                      key={e.id}
                      entry={e}
                      onEdit={() => setEditing(e)}
                      onRemove={() => remove(e.id)}
                      onCopied={() => showToast('Script copiado ✓')}
                      onBroadcast={() => setBroadcastText(e.content)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <EditorModal
          entry={editing}
          isNew={creating}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSave={save}
        />
      )}

      {broadcastText !== null && (
        <BroadcastModal initialText={broadcastText} onClose={() => setBroadcastText(null)} />
      )}
    </div>
  )
}

/* ── cards ────────────────────────────────────────────── */

function ProcessCard({
  entry,
  onEdit,
  onRemove,
}: {
  entry: KbEntry
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <div
      className="rounded-2xl p-4 group"
      style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-[14px] font-bold" style={{ color: '#141414' }}>
          {entry.title || '(sem título)'}
        </p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onEdit} title="Editar" className="p-1 rounded hover:bg-[#F4F3EF]" style={{ color: '#6E6E6E' }}>
            <Pencil size={13} />
          </button>
          <button onClick={onRemove} title="Excluir" className="p-1 rounded hover:bg-[#FBE0E0]" style={{ color: '#C86B6B' }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <p className="text-[13px] whitespace-pre-wrap leading-relaxed" style={{ color: '#4A5A56' }}>
        {entry.content || '—'}
      </p>
    </div>
  )
}

function ScriptCard({
  entry,
  onEdit,
  onRemove,
  onCopied,
  onBroadcast,
}: {
  entry: KbEntry
  onEdit: () => void
  onRemove: () => void
  onCopied: () => void
  onBroadcast: () => void
}) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(entry.content).then(() => {
      setCopied(true)
      onCopied()
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div
      className="rounded-2xl p-4 flex flex-col group"
      style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-[13px] font-bold" style={{ color: '#141414' }}>
          {entry.title || '(sem título)'}
        </p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onEdit} title="Editar" className="p-1 rounded hover:bg-[#F4F3EF]" style={{ color: '#6E6E6E' }}>
            <Pencil size={12} />
          </button>
          <button onClick={onRemove} title="Excluir" className="p-1 rounded hover:bg-[#FBE0E0]" style={{ color: '#C86B6B' }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <p
        className="text-[12.5px] whitespace-pre-wrap leading-relaxed flex-1"
        style={{ color: '#4A5A56' }}
      >
        {entry.content || '—'}
      </p>
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
          style={{
            background: copied ? '#DCF3E4' : '#141414',
            color: copied ? '#137A3F' : '#D6F23C',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
        <button
          onClick={onBroadcast}
          title="Enviar esse script pra vários contatos de uma vez"
          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: '#FFFFFF', color: '#141414', border: '1px solid #E6E6E1' }}
        >
          <Send size={12} />
          Disparar
        </button>
      </div>
    </div>
  )
}

/* ── modal de edição ──────────────────────────────────── */

function EditorModal({
  entry,
  isNew,
  onClose,
  onSave,
}: {
  entry: KbEntry
  isNew: boolean
  onClose: () => void
  onSave: (e: KbEntry) => void
}) {
  const [draft, setDraft] = useState<KbEntry>(entry)
  const isScript = draft.section === 'script'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-[520px] rounded-2xl flex flex-col"
        style={{ background: '#FFFFFF', maxHeight: '85vh' }}
      >
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #E6E6E1' }}>
          <span className="text-[14px] font-bold" style={{ color: '#141414' }}>
            {isNew ? 'Novo' : 'Editar'} {isScript ? 'script' : 'processo'}
          </span>
          <button onClick={onClose} style={{ color: '#A8B5B0' }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-3 overflow-y-auto">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9B9B9B' }}>
              Título
            </label>
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder={isScript ? 'Ex: Primeira abordagem' : 'Ex: Como fechar contrato'}
              className="w-full text-[14px] px-3 py-2 rounded-lg outline-none"
              style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
            />
          </div>
          {isScript && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9B9B9B' }}>
                Categoria
              </label>
              <input
                list="kb-cats"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="Ex: Prospecção, Objeções, Follow-up"
                className="w-full text-[14px] px-3 py-2 rounded-lg outline-none"
                style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
              />
              <datalist id="kb-cats">
                <option value="Prospecção" />
                <option value="Objeções" />
                <option value="Follow-up" />
                <option value="Fechamento" />
              </datalist>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9B9B9B' }}>
              {isScript ? 'Texto do script (pra copiar)' : 'Conteúdo / passo a passo'}
            </label>
            <textarea
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              rows={isScript ? 6 : 9}
              placeholder={
                isScript
                  ? 'Oi {nome}! Tudo bem? Vi que você…'
                  : '1. Enviar proposta\n2. Follow-up em 2 dias\n3. …'
              }
              className="w-full text-[13px] px-3 py-2 rounded-lg outline-none resize-y leading-relaxed"
              style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
            />
          </div>
        </div>
        <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid #E6E6E1' }}>
          <button onClick={onClose} className="text-[12px] font-semibold px-4 py-2 rounded-lg" style={{ color: '#6E6E6E' }}>
            Cancelar
          </button>
          <button
            onClick={() => onSave(draft)}
            disabled={!draft.title.trim() && !draft.content.trim()}
            className="text-[12px] font-bold px-4 py-2 rounded-lg disabled:opacity-50"
            style={{ background: '#141414', color: '#D6F23C' }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── setup banner ─────────────────────────────────────── */

function SetupBanner({ onRetry }: { onRetry: () => void }) {
  const sql = `create table if not exists public.kb_entries (
  id uuid primary key default gen_random_uuid(),
  section text not null default 'processo',
  category text default '',
  title text not null default '',
  content text default '',
  sort bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
notify pgrst, 'reload schema';`
  const [copied, setCopied] = useState(false)
  return (
    <div className="max-w-[640px] mx-auto mt-4 rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
      <p className="text-[15px] font-bold" style={{ color: '#141414' }}>
        Falta um passo único (30 segundos)
      </p>
      <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: '#6E6E6E' }}>
        Pra guardar a base de conhecimento, precisamos criar a tabela uma vez.
        Copie o comando, cole no <b>SQL Editor</b> do Supabase (botão “Run”) e
        clique em “Já criei”.
      </p>
      <pre className="text-[11px] mt-3 p-3 rounded-lg overflow-x-auto" style={{ background: '#141414', color: '#EAF3E9' }}>
        {sql}
      </pre>
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => {
            navigator.clipboard.writeText(sql).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            })
          }}
          className="text-[12px] font-bold px-3 py-2 rounded-lg"
          style={{ background: '#F4F3EF', color: '#141414', border: '1px solid #E6E6E1' }}
        >
          {copied ? 'Copiado!' : 'Copiar comando'}
        </button>
        <button onClick={onRetry} className="text-[12px] font-bold px-3 py-2 rounded-lg" style={{ background: '#141414', color: '#D6F23C' }}>
          Já criei
        </button>
      </div>
    </div>
  )
}
