import { NextRequest, NextResponse } from 'next/server'
import { uploadToR2, getPublicUrl } from '@/lib/utils/storage'
import { getServerUser } from '@/lib/auth'
import { generateStoragePath } from '@/lib/utils/file'

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || !['HRD', 'ADMIN', 'BOSS'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const targetUserId = formData.get('userId') as string | null

    if (!file || !targetUserId) {
      return NextResponse.json({ error: 'File and userId are required' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const ext = file.name.split('.').pop() || 'webp'
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const path = `avatars/${targetUserId}/${timestamp}-${randomId}.${ext}`

    const uploadResult = await uploadToR2(path, buffer, file.type)

    if (uploadResult.success) {
      return NextResponse.json({ url: uploadResult.url })
    } else {
      return NextResponse.json({ error: uploadResult.error }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
