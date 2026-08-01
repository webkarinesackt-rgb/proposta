'use client'

import { useEffect, useState } from 'react'
import { waServer, WaSnippet, WaAudio } from '@/lib/waServer'
import { X, Plus, Trash2, MessageSquare, Mic, Upload, Pencil } from 'lucide-react'

/* agrupa itens por categoria */
function groupByCategory<T extends { category: string }>(items: T[]) {
  const map = new Map<string, T[]>()
  for (const it of items) {
    const k = it.category?.trim() || 'Sem categoria'
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(it)
  }
  return [...map.entries()]
}

function fmtDur(s: number) {
  s = Math.round(s || 0)
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}

export default function ModelsPanel({
  chatId,
  onClose,
  onSent,
  onInsert,
}: {
  chatId: string
  onClose: () => void
  onSent: () => void
  onInsert: (text: string) => void
}) {
  const [tab, setTab] = useState<'snippets' | 'audios'>('snippets')
  const [snippets, setSnippets] = useState<WaSnippet[]>([])
  const [audios, setAudios] = useState<WaAudio[]>([])
  const [status, setStatus] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)

  // formulário
  const [fName, setFName] = useState('')
  const [fCat, setFCat] = useState('')
  const [fContent, setFContent] = useState('')
  const [fFile, setFFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null) // modelo em edição

  async function load() {
    try {
      const lib = await waServer.library()
      setSnippets(lib.snippets)
      setAudios(lib.audios)
    } catch {
      flash('Servidor offline.')
    }
  }
  useEffect(() => {
    load()
  }, [])

  function flash(msg: string) {
    setStatus(msg)
    setTimeout(() => setStatus(''), 2600)
  }

  function insertSnippet(s: WaSnippet) {
    // insere o texto no campo de digitação pra editar antes de enviar
    onInsert(s.content)
  }

  async function sendAudio(a: WaAudio) {
    setBusy(true)
    flash('Enviando áudio…')
    try {
      const r = await waServer.sendSavedAudio(chatId, a.id)
      flash(r.ok ? 'Áudio enviado!' : 'Erro: ' + (r.error || ''))
      if (r.ok) onSent()
    } catch {
      flash('Erro ao enviar.')
    } finally {
      setBusy(false)
    }
  }

  async function handleAdd() {
    if (tab === 'snippets') {
      if (!fName.trim() || !fContent.trim()) return flash('Preencha nome e conteúdo.')
      // edição: apaga o antigo e recria com o conteúdo novo
      if (editingId) await waServer.delSnippet(editingId)
      const r = await waServer.addSnippet(fName.trim(), fCat.trim(), fContent.trim())
      if (!r.ok) return flash('Erro: ' + (r.error || ''))
    } else {
      if (!fName.trim() || !fFile) return flash('Preencha nome e escolha um arquivo.')
      flash('Salvando áudio…')
      const r = await waServer.addAudio(fName.trim(), fCat.trim(), fFile)
      if (!r.ok) return flash('Erro: ' + (r.error || ''))
    }
    setFName('')
    setFCat('')
    setFContent('')
    setFFile(null)
    setAdding(false)
    const wasEditing = editingId
    setEditingId(null)
    await load()
    flash(wasEditing ? 'Modelo editado!' : 'Salvo!')
  }

  function startEdit(s: WaSnippet) {
    setTab('snippets')
    setFName(s.name)
    setFCat(s.category || '')
    setFContent(s.content)
    setEditingId(s.id)
    setAdding(true)
  }

  async function handleDelete(kind: 'snippet' | 'audio', id: string) {
    if (!confirm('Apagar este modelo?')) return
    if (kind === 'snippet') await waServer.delSnippet(id)
    else await waServer.delAudio(id)
    await load()
  }

  const categories = [
    ...new Set(
      [...snippets, ...audios].map((i) => i.category?.trim()).filter(Boolean)
    ),
  ]
  const groups =
    tab === 'snippets' ? groupByCategory(snippets) : groupByCategory(audios)

  return (
    <div
      className="fixed inset-0 z-50 w-full md:static md:w-[320px] md:flex-shrink-0 flex flex-col"
      style={{ background: '#FFFFFF', borderLeft: '1px solid #E6E6E1' }}
    >
      {/* header */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid #E6E6E1' }}
      >
        <span className="text-[13px] font-bold text-[#162322]">Modelos</span>
        <button onClick={onClose} className="text-[#A8B5B0] hover:text-[#162322]">
          <X size={16} />
        </button>
      </div>

      {/* tabs */}
      <div className="flex gap-1 p-2 flex-shrink-0">
        {(
          [
            { id: 'snippets', label: 'Mensagens', icon: <MessageSquare size={12} /> },
            { id: 'audios', label: 'Áudios', icon: <Mic size={12} /> },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id)
              setAdding(false)
              setEditingId(null)
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-colors"
            style={{
              background: tab === t.id ? '#0D3839' : '#F4F3EF',
              color: tab === t.id ? '#F4F99D' : '#8AA09A',
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {status && (
        <div className="px-4 py-1.5 text-[11px] font-semibold text-[#0D7A4A] flex-shrink-0">
          {status}
        </div>
      )}

      {/* lista */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
        {groups.length === 0 ? (
          <p className="text-[12px] text-[#A8B5B0] text-center py-8">
            Nenhum modelo salvo ainda.
          </p>
        ) : (
          groups.map(([cat, items]) => (
            <div key={cat} className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#A8B5B0] px-2 py-1">
                {cat}
              </p>
              <div className="flex flex-col gap-1">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="group flex items-center gap-2 px-2.5 py-2 rounded-lg"
                    style={{ background: '#F4F3EF' }}
                  >
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        tab === 'snippets'
                          ? insertSnippet(it as WaSnippet)
                          : sendAudio(it as WaAudio)
                      }
                      title={tab === 'snippets' ? 'Usar (joga no campo pra editar e enviar)' : 'Enviar áudio'}
                      className="flex-1 min-w-0 text-left disabled:opacity-40"
                    >
                      <p className="text-[12px] font-bold text-[#162322] truncate">
                        {it.name}
                      </p>
                      <p className="text-[11px] text-[#8AA09A] truncate">
                        {tab === 'snippets'
                          ? (it as WaSnippet).content
                          : '🎙️ ' + fmtDur((it as WaAudio).seconds)}
                      </p>
                    </button>
                    {tab === 'snippets' && (
                      <button
                        onClick={() => startEdit(it as WaSnippet)}
                        title="Editar este modelo"
                        className="text-[#8AA09A] hover:text-[#0D3839] flex-shrink-0"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    <button
                      onClick={() =>
                        handleDelete(tab === 'snippets' ? 'snippet' : 'audio', it.id)
                      }
                      title="Apagar"
                      className="text-[#C9CCC6] hover:text-[#A33] flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* adicionar */}
      <div className="flex-shrink-0 p-2" style={{ borderTop: '1px solid #E6E6E1' }}>
        {!adding ? (
          <button
            onClick={() => {
              setEditingId(null)
              setFName('')
              setFCat('')
              setFContent('')
              setAdding(true)
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold border border-dashed"
            style={{ borderColor: '#0D3839', color: '#0D3839' }}
          >
            <Plus size={13} />
            {tab === 'snippets' ? 'Nova mensagem' : 'Novo áudio'}
          </button>
        ) : (
          <div className="flex flex-col gap-2.5">
            {editingId && (
              <p className="text-[11px] font-bold text-[#0D3839]">✏️ Editando modelo</p>
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8AA09A] mb-1">
                Nome
              </p>
              <input
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                placeholder={
                  tab === 'snippets' ? 'Ex.: Saudação inicial' : 'Ex.: Áudio de apresentação'
                }
                className="w-full px-3 py-2 rounded-lg text-[12px] outline-none"
                style={{ background: '#F4F3EF', border: '1px solid #E6E6E1' }}
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8AA09A] mb-1">
                Categoria
              </p>
              <input
                value={fCat}
                onChange={(e) => setFCat(e.target.value)}
                placeholder="Ex.: Follow-up"
                list="model-cats"
                className="w-full px-3 py-2 rounded-lg text-[12px] outline-none"
                style={{ background: '#F4F3EF', border: '1px solid #E6E6E1' }}
              />
              <datalist id="model-cats">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            {tab === 'snippets' ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8AA09A] mb-1">
                  Mensagem
                </p>
                <textarea
                  value={fContent}
                  onChange={(e) => setFContent(e.target.value)}
                  placeholder="Conteúdo da mensagem"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-[12px] outline-none resize-none"
                  style={{ background: '#F4F3EF', border: '1px solid #E6E6E1' }}
                />
                <p className="text-[10px] text-[#A8B5B0] mt-1">
                  Dica: use <span className="font-bold">{'{{nome}}'}</span> ou{' '}
                  <span className="font-bold">{'{{primeiro_nome}}'}</span> — vira o
                  nome do cliente ao inserir na conversa.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8AA09A] mb-1">
                  Arquivo de áudio
                </p>
                <label
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-[12px] font-semibold"
                  style={{
                    background: '#F4FAF8',
                    border: '1px dashed #0D3839',
                    color: '#0D3839',
                  }}
                >
                  <Upload size={14} className="flex-shrink-0" />
                  <span className="truncate">
                    {fFile ? fFile.name : 'Escolher arquivo de áudio'}
                  </span>
                  <input
                    type="file"
                    onChange={(e) => setFFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] text-[#A8B5B0] mt-1">
                  Qualquer formato (mp3, m4a, ogg…) — vira mensagem de voz automaticamente.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="flex-1 py-2 rounded-lg text-[11px] font-bold"
                style={{ background: '#0D3839', color: '#F4F99D' }}
              >
                {editingId ? 'Salvar alterações' : 'Salvar'}
              </button>
              <button
                onClick={() => {
                  setAdding(false)
                  setEditingId(null)
                }}
                className="px-3 py-2 rounded-lg text-[11px] font-bold"
                style={{ background: '#F4F3EF', color: '#8AA09A' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
