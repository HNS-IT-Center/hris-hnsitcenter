import { NextRequest, NextResponse } from 'next/server'
import { uploadToR2, getPublicUrl } from '@/lib/utils/storage'
import { getServerUser } from '@/lib/auth'
import { generateStoragePath } from '@/lib/utils/file'

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    const { fileBase64, userId: targetUserId } = await req.json()

    if (!user || (!['HRD', 'ADMIN', 'BOSS'].includes(user.role) && targetUserId !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!fileBase64 || !targetUserId) {
      return NextResponse.json({ error: 'File and userId are required' }, { status: 400 })
    }

    const base64Data = fileBase64.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')
    const type = fileBase64.match(/:(.*?);/)?.[1] || 'image/webp'
    
    const ext = type.split('/')[1] || 'webp'
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const path = `sick-notes/${targetUserId}/${timestamp}-${randomId}.${ext}`

    const uploadResult = await uploadToR2(path, buffer, type)

    if (uploadResult.success) {
      return NextResponse.json({ url: uploadResult.url })
    } else {
      return NextResponse.json({ error: uploadResult.error }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
