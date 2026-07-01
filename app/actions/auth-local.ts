"use server"

import { prisma } from "@/lib/prisma"
import { getServerUser } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { SignJWT } from "jose"
import { cookies } from "next/headers"

/** Decode the JWT_SECRET env variable once for Edge Runtime compatibility */
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set.")
  }
  return new TextEncoder().encode(secret)
}

export async function updatePassword(newPassword: string) {
  try {
    const user = await getServerUser()
    
    if (newPassword.length < 8) {
      return { success: false, error: "Password harus minimal 8 karakter" }
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(newPassword, salt)

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    })

    return { success: true }
  } catch (error: any) {
    console.error("Error updating password:", error)
    return { success: false, error: "Terjadi kesalahan sistem saat mengubah password" }
  }
}

export async function loginLocal(email: string, password: string, rememberMe: boolean) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { department: true, position: true }
    })

    if (!user || !user.isActive) {
      return { success: false, error: "Akun tidak ditemukan atau telah dinonaktifkan." }
    }

    if (!user.passwordHash) {
      return { success: false, error: "Akun ini belum mengatur password lokal. Silakan Masuk dengan SSO." }
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return { success: false, error: "Password salah." }
    }

    // Payload exactly matches what proxy.ts expects (which is what SSO injects)
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      globalRole: user.globalRole, // note: user.role is Role enum, but SSO uses globalRole string
      // In HRIS local, we map user.role to globalRole for the proxy
      // wait, in HRIS db, the field is `role`, let's map it:
      positionId: user.ssoPositionId || user.positionId,
      positionName: user.positionName || (user as any).position?.name,
      departmentId: user.ssoDepartmentId || user.departmentId,
      departmentName: user.departmentName || (user as any).department?.name,
    }

    // Adjusting globalRole based on local `role`
    const finalPayload = {
      ...payload,
      globalRole: user.role
    }

    const token = await new SignJWT(finalPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(rememberMe ? Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) : Math.floor(Date.now() / 1000) + (24 * 60 * 60))
      .sign(getSecret())

    const cookieStore = await cookies()
    cookieStore.set("sso_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(rememberMe && { maxAge: 7 * 24 * 60 * 60 })
    })

    return { success: true }
  } catch (error: any) {
    console.error("Error logging in locally:", error)
    return { success: false, error: "Terjadi kesalahan sistem saat proses login." }
  }
}
