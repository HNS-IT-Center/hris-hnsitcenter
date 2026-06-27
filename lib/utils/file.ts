/**
 * File validation and client-side WebP compression utilities.
 * All image uploads are losslessly compressed to WebP before being sent to R2.
 *
 * Bucket configurations (matching project brief 11-FILE-HANDLING.md):
 * - attendance-photos : JPEG/PNG/WebP, max 5MB, compress → WebP 85%
 * - sick-notes        : JPEG/PNG/WebP/PDF, max 10MB, images → WebP, PDF kept
 * - recruitment-docs  : PDF/JPEG/PNG/WebP/DOC/DOCX, max 10MB, images → WebP
 * - avatars           : JPEG/PNG/WebP, max 2MB, compress → WebP 90%
 */

export const MAX_FILE_SIZES: Record<string, number> = {
  'attendance-photos': 5 * 1024 * 1024,  // 5 MB
  'sick-notes': 10 * 1024 * 1024,        // 10 MB
  'recruitment-docs': 10 * 1024 * 1024,  // 10 MB
  'avatars': 2 * 1024 * 1024,            // 2 MB
}

export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  'attendance-photos': ['image/jpeg', 'image/png', 'image/webp'],
  'sick-notes': ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  'recruitment-docs': [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  'avatars': ['image/jpeg', 'image/png', 'image/webp'],
}

/** Default WebP quality per bucket (0-1) */
export const WEBP_QUALITY: Record<string, number> = {
  'attendance-photos': 0.85,
  'sick-notes': 0.85,
  'recruitment-docs': 0.85,
  'avatars': 0.90,
}

export interface FileValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate file format and size before upload.
 * Should be called client-side before any upload attempt.
 */
export function validateFile(file: File, bucket: string): FileValidationResult {
  const allowedTypes = ALLOWED_MIME_TYPES[bucket]
  const maxSize = MAX_FILE_SIZES[bucket]

  if (!allowedTypes) {
    return { valid: false, error: 'Bucket tidak dikenali.' }
  }

  if (!allowedTypes.includes(file.type)) {
    const readable = allowedTypes
      .map((t) => t.split('/')[1].toUpperCase().replace('VND.OPENXMLFORMATS-OFFICEDOCUMENT.WORDPROCESSINGML.DOCUMENT', 'DOCX').replace('MSWORD', 'DOC'))
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(', ')
    return {
      valid: false,
      error: `Format file tidak didukung. Format yang diterima: ${readable}`,
    }
  }

  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024))
    return {
      valid: false,
      error: `Ukuran file terlalu besar. Maksimal ${maxMB}MB.`,
    }
  }

  return { valid: true }
}

/**
 * Compress an image file to WebP using the Canvas API.
 * - Skips non-image files (PDFs, DOCs) and returns them as-is.
 * - Skips already-small WebP files (< 500 KB).
 * - Scales down images wider than maxWidthPx.
 *
 * NOTE: This is a client-side only function (uses browser Canvas API).
 */
export async function compressToWebP(
  file: File,
  quality = 0.85,
  maxWidthPx = 1920,
): Promise<File> {
  // Not an image — return as-is
  if (!file.type.startsWith('image/')) return file
  // Already WebP and small — skip compression
  if (file.type === 'image/webp' && file.size < 500 * 1024) return file

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const canvas = document.createElement('canvas')
      let { width, height } = img

      // Scale down proportionally if image is too wide
      if (width > maxWidthPx) {
        height = Math.round((height * maxWidthPx) / width)
        width = maxWidthPx
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context tidak tersedia.'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Gagal mengkompresi gambar.'))
            return
          }
          const originalName = file.name.replace(/\.[^/.]+$/, '')
          const compressed = new File([blob], `${originalName}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
          })
          resolve(compressed)
        },
        'image/webp',
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Gagal memuat gambar.'))
    }

    img.src = objectUrl
  })
}

/**
 * Generate a unique storage path for a file.
 * Format: userId/timestamp-randomId.ext
 */
export function generateStoragePath(bucket: string, userId: string, file: File): string {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)
  const ext = file.name.split('.').pop() ?? 'bin'
  return `${bucket}/${userId}/${timestamp}-${randomId}.${ext}`
}

/**
 * Convert a File to base64 data URL (for offline IndexedDB storage).
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Convert a base64 data URL back to a File (for offline sync upload).
 */
export function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/webp'
  const bstr = atob(arr[1])
  const u8arr = new Uint8Array(bstr.length)
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i)
  return new File([u8arr], filename, { type: mime })
}
