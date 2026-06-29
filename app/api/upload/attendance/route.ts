import { NextResponse } from "next/server"

// IMPORTANT: Node.js runtime is required for Buffer processing.
// Edge runtime doesn't have full Buffer support out of the box.
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Create unique filename based on time (ensure no collisions)
    const fileName = `attendance-${Date.now()}-${Math.floor(Math.random() * 1000)}.webp`

    // Normally you would use your R2 client here:
    // e.g., await r2.putObject({ Bucket: "hris", Key: fileName, Body: buffer, ContentType: 'image/webp' })
    // For now, let's mock it since we haven't configured the physical R2 bucket keys yet
    const fileUrl = `https://r2.hnsitcenter.id/${fileName}`

    // Return the mock URL (or real URL if R2 was active)
    return NextResponse.json({ url: fileUrl })
  } catch (error) {
    console.error("Error uploading attendance photo:", error)
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 })
  }
}
