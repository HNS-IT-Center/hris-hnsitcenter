'use server'

import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function updateProfilePhoneNumber(phoneNumber: string) {
  try {
    const ssoUser = await getServerUser()
    let formattedNumber = phoneNumber.trim()
    
    // Auto format: replace leading 0 with +62
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '+62' + formattedNumber.slice(1)
    } else if (formattedNumber.startsWith('62')) {
      formattedNumber = '+' + formattedNumber
    }

    await prisma.user.update({
      where: { email: ssoUser.email },
      data: { phoneNumber: formattedNumber }
    })

    revalidatePath('/profile')
    revalidatePath('/hrd/employees')
    
    return { success: true, formattedNumber }
  } catch (error) {
    console.error('Error updating phone number:', error)
    return { success: false, error: 'Failed to update phone number.' }
  }
}

export async function updateProfileAvatar(avatarUrl: string) {
  try {
    const ssoUser = await getServerUser()
    await prisma.user.update({
      where: { email: ssoUser.email },
      data: { avatarUrl }
    })

    revalidatePath('/profile')
    revalidatePath('/hrd/employees')
    
    return { success: true }
  } catch (error) {
    console.error('Error updating avatar:', error)
    return { success: false, error: 'Failed to update avatar.' }
  }
}
