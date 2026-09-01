import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { createServerClient } from '@supabase/ssr'

const MAX_BYTES = 8 * 1024 * 1024 // 8MB

// Só usuário autenticado (sessão do /admin) pode subir arquivo.
async function isAuthed(request: NextRequest): Promise<boolean> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    )
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ])
    return !!(result && 'data' in result && result.data.user)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthed(request))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folderRaw = (formData.get('folder') as string | null) ?? ''

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx 8MB)' }, { status: 413 })
    }

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 400 })
    }

    // pasta: só letras/números/-/_ e barra; sem traversal
    const folder = folderRaw.replace(/[^a-zA-Z0-9/_-]/g, '')
    if (folder.includes('..') || folder.startsWith('/')) {
      return NextResponse.json({ error: 'Pasta inválida' }, { status: 400 })
    }

    // sanitize filename
    const ext = (file.name.split('.').pop()?.toLowerCase() ?? 'jpg').replace(/[^a-z0-9]/g, '')
    const base = file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .slice(0, 60)
    const filename = `${base || 'arquivo'}.${ext || 'jpg'}`

    const publicDir = path.resolve(process.cwd(), 'public')
    const destDir = path.resolve(folder ? path.join(publicDir, folder) : publicDir)
    // garante que o destino fica DENTRO de /public (anti path-traversal)
    if (destDir !== publicDir && !destDir.startsWith(publicDir + path.sep)) {
      return NextResponse.json({ error: 'Pasta inválida' }, { status: 400 })
    }

    await mkdir(destDir, { recursive: true })
    const bytes = await file.arrayBuffer()
    await writeFile(path.join(destDir, filename), Buffer.from(bytes))

    const publicPath = folder ? `/${folder}/${filename}` : `/${filename}`
    return NextResponse.json({ path: publicPath })
  } catch (err) {
    console.error('upload error', err)
    return NextResponse.json({ error: 'Erro ao salvar arquivo' }, { status: 500 })
  }
}
