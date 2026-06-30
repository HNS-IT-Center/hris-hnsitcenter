import { NextResponse } from "next/server"
import { uploadToR2 } from '@/lib/utils/storage'
import { getServerUser } from '@/lib/auth'

// IMPORTANT: Node.js runtime is required for Buffer processing.
// Edge runtime doesn't have full Buffer support out of the box.
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileBase64, userId } = await req.json()

    if (!fileBase64 || !userId) {
      return NextResponse.json({ error: "File and userId are required" }, { status: 400 })
    }

    const base64Data = fileBase64.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')
    const type = fileBase64.match(/:(.*?);/)?.[1] || 'image/webp'
    
    const ext = type.split('/')[1] || 'webp'
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const path = `attendance/${userId}/${timestamp}-${randomId}.${ext}`

    const uploadResult = await uploadToR2(path, buffer, type)

    if (uploadResult.success) {
      return NextResponse.json({ url: uploadResult.url })
    } else {
      return NextResponse.json({ error: uploadResult.error }, { status: 500 })
    }
  } catch (error) {
    console.error("Error uploading attendance photo:", error)
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 })
  }
}
