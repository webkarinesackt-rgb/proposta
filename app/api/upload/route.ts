import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string | null) ?? ''

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 400 })
    }

    // sanitize filename
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const base = file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .slice(0, 60)
    const filename = `${base}.${ext}`

    const publicDir = path.join(process.cwd(), 'public')
    const destDir = folder ? path.join(publicDir, folder) : publicDir

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
