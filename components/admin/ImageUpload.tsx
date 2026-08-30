'use client'

import { useRef, useState } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'

interface ImageUploadProps {
  label: string
  value: string
  onChange: (path: string) => void
  folder: string
  hint?: string
  aspect?: string
}

export function ImageUpload({ label, value, onChange, folder, hint, aspect = '1/1' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  async function upload(file: File) {
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', folder)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro')
      onChange(data.path)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro no upload')
    } finally {
      setLoading(false)
    }
  }

  function handleFile(file: File | undefined) {
    if (file) upload(file)
  }

  return (
    <div>
      <label
        className="block text-[10px] font-bold uppercase tracking-[0.13em] mb-1.5"
        style={{ color: '#8AA09A' }}
      >
        {label}
      </label>

      <div className="flex gap-4 items-start">
        {/* Preview */}
        <div
          className="relative flex-shrink-0 rounded-xl overflow-hidden"
          style={{
            width: '80px',
            aspectRatio: aspect,
            background: '#F4F3EF',
            border: '1px solid #DFE0DB',
          }}
        >
          {value ? (
            <>
              <img
                src={value}
                alt=""
                className="w-full h-full object-cover"
                onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2' }}
              />
              <button
                onClick={() => onChange('')}
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.5)' }}
              >
                <X size={10} style={{ color: '#fff' }} />
              </button>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon size={18} style={{ color: '#C8CEC9' }} />
            </div>
          )}
        </div>

        {/* Drop zone */}
        <div
          className="flex-1"
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault()
            setDragging(false)
            handleFile(e.dataTransfer.files[0])
          }}
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="w-full rounded-xl px-4 py-3 text-left transition-all"
            style={{
              background: dragging ? '#E8F4F1' : '#F4F3EF',
              border: `1px dashed ${dragging ? '#173B32' : '#C8CEC9'}`,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <div className="flex items-center gap-2">
              <Upload size={14} style={{ color: '#8AA09A' }} />
              <span className="text-[12px]" style={{ color: '#8AA09A' }}>
                {loading ? 'Enviando...' : 'Clique ou arraste uma imagem'}
              </span>
            </div>
            {hint && (
              <p className="text-[10px] mt-1" style={{ color: '#A8B5B0' }}>{hint}</p>
            )}
          </button>

          {error && (
            <p className="text-[10px] mt-1" style={{ color: '#E57373' }}>{error}</p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
