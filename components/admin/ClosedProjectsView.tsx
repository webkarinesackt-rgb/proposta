'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, ExternalLink, X, FileText, Search } from 'lucide-react'
import {
  closedProjectsStore,
  ClosedProject,
  ContractStatus,
  PaymentMethod,
  TableMissingError,
} from '@/lib/closedProjectsStore'
import { proposalStore } from '@/lib/proposalStore'
import { Proposal } from '@/lib/types'

/* ── opções coloridas (espelham a planilha atual) ─────── */

const CONTRACT_OPTS: { id: ContractStatus; label: string; bg: string; color: string }[] = [
  { id: 'negociacao', label: 'Em negociação', bg: '#FBE0E0', color: '#B42318' },
  { id: 'fechado', label: 'Contrato fechado', bg: '#DCF3E4', color: '#137A3F' },
  { id: 'cancelado', label: 'Cancelado', bg: '#EDEDE8', color: '#8A8A82' },
]
const PAYMENT_OPTS: { id: PaymentMethod; label: string; bg: string; color: string }[] = [
  { id: 'nao_efetuado', label: 'Não efetuado', bg: '#FBE0E0', color: '#B42318' },
  { id: 'meio_pago', label: '50% pago', bg: '#EDE3F7', color: '#7A2FA0' },
  { id: 'pix', label: 'Pix', bg: '#DCF3E4', color: '#137A3F' },
  { id: 'parcelado', label: 'Parcelado cartão', bg: '#DCEAFB', color: '#1D4ED8' },
  { id: 'pago', label: 'Pago', bg: '#CDEBD8', color: '#0F6B39' },
]
const RESPONSAVEIS = ['Karine', 'Tainá']

function contractMeta(id: ContractStatus) {
  return CONTRACT_OPTS.find((o) => o.id === id) || CONTRACT_OPTS[0]
}
function paymentMeta(id: PaymentMethod) {
  return PAYMENT_OPTS.find((o) => o.id === id) || PAYMENT_OPTS[0]
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function proposalLink(slug: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/p/${slug}`
}

/* ── componente principal ─────────────────────────────── */

export default function ClosedProjectsView() {
  const [rows, setRows] = useState<ClosedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [search, setSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await closedProjectsStore.getAll()
      setRows(data)
      setNeedsSetup(false)
    } catch (e) {
      if (e instanceof TableMissingError) setNeedsSetup(true)
    } finally {
      setLoading(false)
    }
  }

  // atualização otimista: aplica local e persiste
  async function patchRow(id: string, patch: Partial<ClosedProject>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    try {
      await closedProjectsStore.update(id, patch)
    } catch (e) {
      console.error('[closed.update]', e)
    }
  }

  async function addBlank() {
    try {
      const r = await closedProjectsStore.create({ contract_status: 'fechado' })
      setRows((rs) => [r, ...rs])
    } catch (e) {
      if (e instanceof TableMissingError) setNeedsSetup(true)
    }
  }

  async function addFromProposal(p: Proposal, plan?: { name: string; value: number }) {
    try {
      const r = await closedProjectsStore.create({
        client_name: p.client_name || '',
        proposal_link: proposalLink(p.slug),
        plan_name: plan?.name || '',
        value: plan?.value || 0,
        proposal_id: p.id,
        contract_status: 'fechado',
      })
      setRows((rs) => [r, ...rs])
      setShowPicker(false)
    } catch (e) {
      if (e instanceof TableMissingError) setNeedsSetup(true)
    }
  }

  async function removeRow(id: string) {
    setRows((rs) => rs.filter((r) => r.id !== id))
    try {
      await closedProjectsStore.remove(id)
    } catch (e) {
      console.error('[closed.remove]', e)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.client_name, r.plan_name, r.notes, r.responsavel]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [rows, search])

  const totals = useMemo(() => {
    let fechado = 0,
      negociacao = 0,
      count = 0
    for (const r of rows) {
      if (r.contract_status === 'fechado') {
        fechado += r.value
        count++
      } else if (r.contract_status === 'negociacao') {
        negociacao += r.value
      }
    }
    return { fechado, negociacao, count }
  }, [rows])

  return (
    <div className="flex flex-col h-full" style={{ background: '#F7F7F4' }}>
      {/* header */}
      <div className="px-5 md:px-8 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1
              className="text-[22px] md:text-[26px] font-bold"
              style={{ color: '#162322', fontFamily: 'var(--font-serif, ivypresto-display)' }}
            >
              Projetos fechados
            </h1>
            <p className="text-[12px] mt-0.5" style={{ color: '#8AA09A' }}>
              Registre os fechamentos, valores e forma de pagamento.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 rounded-lg transition-opacity hover:opacity-90"
              style={{ background: '#FFFFFF', color: '#0D3839', border: '1px solid #E6E6E1' }}
            >
              <FileText size={14} /> Puxar de proposta
            </button>
            <button
              onClick={addBlank}
              className="flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 rounded-lg transition-opacity hover:opacity-90"
              style={{ background: '#0D3839', color: '#F4F99D' }}
            >
              <Plus size={14} /> Nova linha
            </button>
          </div>
        </div>

        {/* totais */}
        <div className="flex items-center gap-2.5 mt-4 flex-wrap">
          <StatCard label="Total fechado" value={fmtBRL(totals.fechado)} accent="#137A3F" />
          <StatCard label="Projetos fechados" value={String(totals.count)} accent="#0D3839" />
          <StatCard label="Em negociação" value={fmtBRL(totals.negociacao)} accent="#B45309" />
        </div>

        {/* busca */}
        <div className="relative mt-4 max-w-[320px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: '#A8B5B0' }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente, plano…"
            className="w-full text-[13px] pl-9 pr-3 py-2 rounded-lg outline-none"
            style={{ background: '#FFFFFF', border: '1px solid #E6E6E1', color: '#162322' }}
          />
        </div>
      </div>

      {/* conteúdo */}
      <div className="flex-1 min-h-0 overflow-auto px-5 md:px-8 pb-8">
        {needsSetup ? (
          <SetupBanner onRetry={load} />
        ) : loading ? (
          <p className="text-[13px] text-center py-16" style={{ color: '#A8B5B0' }}>
            Carregando…
          </p>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-16 rounded-2xl"
            style={{ background: '#FFFFFF', border: '1px dashed #D8D8D0' }}
          >
            <p className="text-[14px] font-semibold" style={{ color: '#162322' }}>
              Nenhum projeto registrado ainda.
            </p>
            <p className="text-[12px] mt-1" style={{ color: '#8AA09A' }}>
              Use “Puxar de proposta” pra trazer cliente, plano e valor automaticamente.
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[900px]">
                <thead>
                  <tr style={{ background: '#F2F5EC' }}>
                    <Th>Cliente</Th>
                    <Th>Data</Th>
                    <Th>Proposta / plano</Th>
                    <Th>Status do contrato</Th>
                    <Th>Pagamento</Th>
                    <Th className="text-right">Valor</Th>
                    <Th>Resp.</Th>
                    <Th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <Row
                      key={r.id}
                      row={r}
                      onPatch={(p) => patchRow(r.id, p)}
                      onRemove={() => removeRow(r.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showPicker && (
        <ProposalPickerModal
          onClose={() => setShowPicker(false)}
          onPick={addFromProposal}
        />
      )}
    </div>
  )
}

/* ── linha editável ───────────────────────────────────── */

function Row({
  row,
  onPatch,
  onRemove,
}: {
  row: ClosedProject
  onPatch: (p: Partial<ClosedProject>) => void
  onRemove: () => void
}) {
  const cm = contractMeta(row.contract_status)
  const pm = paymentMeta(row.payment_method)
  const isCancel = row.contract_status === 'cancelado'
  return (
    <tr
      style={{
        borderTop: '1px solid #F0F0EC',
        background: isCancel ? '#FCF3F3' : 'transparent',
      }}
    >
      {/* cliente */}
      <Td>
        <CellInput
          value={row.client_name}
          onSave={(v) => onPatch({ client_name: v })}
          placeholder="Nome do cliente"
          bold
        />
      </Td>
      {/* data */}
      <Td>
        <input
          type="date"
          value={row.closed_date || ''}
          onChange={(e) => onPatch({ closed_date: e.target.value })}
          className="text-[12px] bg-transparent outline-none w-[120px]"
          style={{ color: '#4A5A56' }}
        />
      </Td>
      {/* proposta / plano */}
      <Td>
        <div className="flex items-center gap-1.5">
          <CellInput
            value={row.plan_name}
            onSave={(v) => onPatch({ plan_name: v })}
            placeholder="Qual plano"
          />
          {row.proposal_link && (
            <a
              href={row.proposal_link}
              target="_blank"
              rel="noopener"
              title="Abrir proposta"
              className="flex-shrink-0"
              style={{ color: '#0D3839' }}
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </Td>
      {/* status contrato */}
      <Td>
        <PillSelect
          value={row.contract_status}
          options={CONTRACT_OPTS}
          onChange={(v) => onPatch({ contract_status: v as ContractStatus })}
          bg={cm.bg}
          color={cm.color}
        />
      </Td>
      {/* pagamento */}
      <Td>
        <PillSelect
          value={row.payment_method}
          options={PAYMENT_OPTS}
          onChange={(v) => onPatch({ payment_method: v as PaymentMethod })}
          bg={pm.bg}
          color={pm.color}
        />
      </Td>
      {/* valor */}
      <Td className="text-right">
        <ValueInput value={row.value} onSave={(v) => onPatch({ value: v })} />
      </Td>
      {/* responsável */}
      <Td>
        <select
          value={row.responsavel}
          onChange={(e) => onPatch({ responsavel: e.target.value })}
          className="text-[12px] bg-transparent outline-none cursor-pointer"
          style={{ color: row.responsavel ? '#162322' : '#A8B5B0' }}
        >
          <option value="">—</option>
          {RESPONSAVEIS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </Td>
      {/* excluir */}
      <Td>
        <button
          onClick={() => {
            if (confirm('Excluir esta linha?')) onRemove()
          }}
          title="Excluir"
          className="p-1 rounded transition-colors hover:bg-[#FBE0E0]"
          style={{ color: '#C86B6B' }}
        >
          <Trash2 size={13} />
        </button>
      </Td>
    </tr>
  )
}

/* ── células ──────────────────────────────────────────── */

function CellInput({
  value,
  onSave,
  placeholder,
  bold,
}: {
  value: string
  onSave: (v: string) => void
  placeholder?: string
  bold?: boolean
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onSave(draft)
      }}
      placeholder={placeholder}
      className="text-[12px] bg-transparent outline-none w-full min-w-[90px]"
      style={{ color: '#162322', fontWeight: bold ? 600 : 400 }}
    />
  )
}

function ValueInput({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [draft, setDraft] = useState(String(value || ''))
  useEffect(() => setDraft(String(value || '')), [value])
  return (
    <div className="flex items-center justify-end gap-0.5">
      <span className="text-[11px]" style={{ color: '#A8B5B0' }}>
        R$
      </span>
      <input
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = Math.max(0, Number(draft) || 0)
          if (n !== value) onSave(n)
        }}
        placeholder="0"
        className="text-[12px] font-bold bg-transparent outline-none text-right w-[80px]"
        style={{ color: '#162322' }}
      />
    </div>
  )
}

function PillSelect({
  value,
  options,
  onChange,
  bg,
  color,
}: {
  value: string
  options: { id: string; label: string }[]
  onChange: (v: string) => void
  bg: string
  color: string
}) {
  return (
    <div
      className="inline-flex items-center rounded-full pr-1"
      style={{ background: bg }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-[11px] font-bold bg-transparent outline-none cursor-pointer appearance-none pl-2.5 pr-1 py-1"
        style={{ color }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id} style={{ color: '#162322' }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-left text-[10px] font-bold uppercase tracking-wider px-3 py-2.5 ${className || ''}`}
      style={{ color: '#6B8585' }}
    >
      {children}
    </th>
  )
}
function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-middle ${className || ''}`}>{children}</td>
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="px-4 py-2.5 rounded-xl"
      style={{ background: '#FFFFFF', border: '1px solid #E6E6E1', minWidth: 130 }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#A8B5B0' }}>
        {label}
      </p>
      <p className="text-[16px] font-bold mt-0.5" style={{ color: accent }}>
        {value}
      </p>
    </div>
  )
}

/* ── banner de setup (tabela ainda não criada) ────────── */

function SetupBanner({ onRetry }: { onRetry: () => void }) {
  const sql = `create table if not exists public.closed_projects (
  id uuid primary key default gen_random_uuid(),
  client_name text not null default '',
  closed_date date,
  proposal_link text default '',
  plan_name text default '',
  contract_status text not null default 'negociacao',
  payment_method text not null default 'nao_efetuado',
  value numeric not null default 0,
  responsavel text default '',
  proposal_id uuid,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
notify pgrst, 'reload schema';`
  const [copied, setCopied] = useState(false)
  return (
    <div
      className="max-w-[640px] mx-auto mt-4 rounded-2xl p-6"
      style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}
    >
      <p className="text-[15px] font-bold" style={{ color: '#162322' }}>
        Falta um passo único (30 segundos)
      </p>
      <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: '#6B8585' }}>
        Pra guardar os projetos no banco, precisamos criar a tabela uma vez. É
        só copiar o comando abaixo e colar no <b>SQL Editor</b> do Supabase
        (botão “Run”). Depois clique em “Já criei”.
      </p>
      <pre
        className="text-[11px] mt-3 p-3 rounded-lg overflow-x-auto"
        style={{ background: '#0D3839', color: '#EAF3E9' }}
      >
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
          style={{ background: '#F4F3EF', color: '#0D3839', border: '1px solid #E6E6E1' }}
        >
          {copied ? 'Copiado!' : 'Copiar comando'}
        </button>
        <button
          onClick={onRetry}
          className="text-[12px] font-bold px-3 py-2 rounded-lg"
          style={{ background: '#0D3839', color: '#F4F99D' }}
        >
          Já criei
        </button>
      </div>
    </div>
  )
}

/* ── modal: puxar de proposta ─────────────────────────── */

function ProposalPickerModal({
  onClose,
  onPick,
}: {
  onClose: () => void
  onPick: (p: Proposal, plan?: { name: string; value: number }) => void
}) {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    proposalStore
      .getAll()
      .then(setProposals)
      .finally(() => setLoading(false))
  }, [])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return proposals
    return proposals.filter((p) =>
      [p.client_name, p.client_company].join(' ').toLowerCase().includes(s),
    )
  }, [proposals, q])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-[440px] rounded-2xl flex flex-col"
        style={{ background: '#FFFFFF', maxHeight: '80vh' }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid #E6E6E1' }}
        >
          <span className="text-[14px] font-bold" style={{ color: '#162322' }}>
            Puxar de uma proposta
          </span>
          <button onClick={onClose} style={{ color: '#A8B5B0' }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente…"
            autoFocus
            className="w-full text-[13px] px-3 py-2 rounded-lg outline-none"
            style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#162322' }}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
          {loading ? (
            <p className="text-[12px] text-center py-8" style={{ color: '#A8B5B0' }}>
              Carregando…
            </p>
          ) : list.length === 0 ? (
            <p className="text-[12px] text-center py-8" style={{ color: '#A8B5B0' }}>
              Nenhuma proposta encontrada.
            </p>
          ) : (
            list.map((p) => {
              const open = expanded === p.id
              const plans = p.selected_plans || []
              return (
                <div key={p.id} className="mb-1">
                  <button
                    onClick={() => {
                      if (plans.length <= 1) {
                        const pl = plans[0]
                        onPick(
                          p,
                          pl ? { name: pl.name, value: pl.price_cash || 0 } : undefined,
                        )
                      } else {
                        setExpanded(open ? null : p.id)
                      }
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 transition-colors hover:bg-[#FAFAF8]"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: '#F4F3EF', color: '#8AA09A' }}
                    >
                      <FileText size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold truncate" style={{ color: '#162322' }}>
                        {p.client_name || 'Sem nome'}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: '#8AA09A' }}>
                        {plans.length > 1
                          ? `${plans.length} planos — escolher`
                          : plans[0]?.name || 'Sem plano'}
                      </p>
                    </div>
                  </button>
                  {open && (
                    <div className="pl-11 pr-2 pb-1">
                      {plans.map((pl) => (
                        <button
                          key={pl.id}
                          onClick={() =>
                            onPick(p, { name: pl.name, value: pl.price_cash || 0 })
                          }
                          className="w-full text-left px-3 py-1.5 rounded-md flex items-center justify-between transition-colors hover:bg-[#F4F3EF]"
                        >
                          <span className="text-[12px]" style={{ color: '#162322' }}>
                            {pl.name}
                          </span>
                          <span className="text-[12px] font-bold" style={{ color: '#137A3F' }}>
                            {fmtBRL(pl.price_cash || 0)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
