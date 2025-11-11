import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

/**
 * POST /api/upload/professional-image
 * Upload immagine profilo professionista
 *
 * Accetta multipart/form-data con campo "image"
 * Salva in public/uploads/professionals/ con nome random
 * Ritorna URL pubblico dell'immagine
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Nessun file fornito' },
        { status: 400 }
      )
    }

    // Validazione tipo file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo file non supportato. Usa JPG, PNG o WebP' },
        { status: 400 }
      )
    }

    // Validazione dimensione (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File troppo grande. Massimo 5MB' },
        { status: 400 }
      )
    }

    // Genera nome file unico
    const timestamp = Date.now()
    const randomString = randomBytes(8).toString('hex')
    const extension = file.name.split('.').pop()
    const filename = `${timestamp}-${randomString}.${extension}`

    // Converti file in buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Salva file
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'professionals')
    const filepath = path.join(uploadDir, filename)

    await writeFile(filepath, buffer)

    // Ritorna URL pubblico
    const publicUrl = `/uploads/professionals/${filename}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: filename,
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Errore durante upload immagine' },
      { status: 500 }
    )
  }
}

/**
 * Configurazione per permettere upload file
 */
export const config = {
  api: {
    bodyParser: false,
  },
}
