/**
 * Cloudflare R2 Storage utilities.
 *
 * R2 is S3-compatible, so we use the AWS SDK v3.
 * All uploads go through the server-side API route /api/upload,
 * which signs the request with the R2 credentials kept server-side.
 *
 * Buckets (all in one R2 bucket, organised by path prefix):
 * - attendance-photos/userId/timestamp-id.webp
 * - sick-notes/userId/timestamp-id.webp (or .pdf)
 * - recruitment-docs/userId/timestamp-id.webp (or .pdf / .docx)
 * - avatars/userId/timestamp-id.webp
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// ─── Server-side R2 client ────────────────────────────────────────────────────

function createR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

// Lazy singleton — avoids creating the client during build-time
let _r2Client: S3Client | null = null

function getR2Client(): S3Client {
  if (!_r2Client) {
    _r2Client = createR2Client()
  }
  return _r2Client
}

const BUCKET = process.env.R2_BUCKET_NAME!

// ─── Public URL helper ────────────────────────────────────────────────────────

/**
 * Return the public URL for a stored object path.
 * Requires the R2 bucket to have a custom domain or r2.dev URL configured.
 */
export function getPublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '') ?? ''
  return `${base}/${path}`
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

/**
 * Upload a file buffer to Cloudflare R2.
 * Call this from API routes only (server-side), never from client components.
 *
 * @param path       - Storage path (e.g., "attendance-photos/userId/123.webp")
 * @param body       - File content as Buffer or Uint8Array
 * @param contentType - MIME type (e.g., "image/webp")
 */
export async function uploadToR2(
  path: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<UploadResult> {
  try {
    const client = getR2Client()
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: path,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    )

    return {
      success: true,
      url: getPublicUrl(path),
      path,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Upload gagal.',
    }
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete an object from Cloudflare R2.
 * @param path - Storage path to delete
 */
export async function deleteFromR2(path: string): Promise<boolean> {
  try {
    const client = getR2Client()
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: path }))
    return true
  } catch {
    return false
  }
}

// ─── Presigned Upload URL (for large files) ───────────────────────────────────

/**
 * Generate a presigned PUT URL so the client can upload directly to R2.
 * The URL expires in `expiresIn` seconds (default: 5 minutes).
 *
 * Use this for large files where you want to avoid routing through your server.
 */
export async function getPresignedUploadUrl(
  path: string,
  contentType: string,
  expiresIn = 300,
): Promise<string | null> {
  try {
    const client = getR2Client()
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: path,
      ContentType: contentType,
    })
    return await getSignedUrl(client, command, { expiresIn })
  } catch {
    return null
  }
}
