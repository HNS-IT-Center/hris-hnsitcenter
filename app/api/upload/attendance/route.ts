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

    const formData = await req.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string

    if (!file || !userId) {
      return NextResponse.json({ error: "File and userId are required" }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const ext = file.name.split('.').pop() || 'webp'
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const path = `attendance/${userId}/${timestamp}-${randomId}.${ext}`

    const uploadResult = await uploadToR2(path, buffer, file.type)

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
