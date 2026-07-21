import { NextRequest, NextResponse } from 'next/server'
import { uploadToR2, getPublicUrl } from '@/lib/utils/storage'
import { getServerUser } from '@/lib/auth'
import { generateStoragePath } from '@/lib/utils/file'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    const { fileBase64, originalBase64, userId: targetUserId } = await req.json()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isPrivileged = ['HRD', 'ADMIN', 'BOSS'].includes(user.role)

    if (!isPrivileged) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { email: true }
      })

      if (!targetUser || targetUser.email !== user.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
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
    const path = `avatars/${targetUserId}/${timestamp}-${randomId}.${ext}`

    const uploadResult = await uploadToR2(path, buffer, type)

    let originalUrl = null
    if (originalBase64) {
      const originalData = originalBase64.split(',')[1]
      const originalBuffer = Buffer.from(originalData, 'base64')
      const originalType = originalBase64.match(/:(.*?);/)?.[1] || 'image/webp'
      const originalExt = originalType.split('/')[1] || 'webp'
      const originalPath = `avatars/${targetUserId}/${timestamp}-${randomId}-original.${originalExt}`
      const originalUploadResult = await uploadToR2(originalPath, originalBuffer, originalType)
      if (originalUploadResult.success) {
        originalUrl = originalUploadResult.url
      }
    }

    if (uploadResult.success) {
      return NextResponse.json({ url: uploadResult.url, originalUrl })
    } else {
      return NextResponse.json({ error: uploadResult.error }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
