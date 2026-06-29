'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function resolveAttentionFlag(id: string) {
  await prisma.attentionFlag.update({
    where: { id },
    data: { isResolved: true },
  })
  revalidatePath('/hrd/dashboard')
}
