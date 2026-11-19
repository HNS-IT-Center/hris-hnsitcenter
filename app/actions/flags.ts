'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requirePrivileged } from '@/lib/auth/guards'
import { notify } from '@/lib/notify'

export async function resolveAttentionFlag(id: string) {
  await requirePrivileged()
  const flag = await prisma.attentionFlag.update({
    where: { id },
    data: { isResolved: true },
  })
  await notify(
    { userIds: [flag.userId] },
    {
      category: 'ATTENDANCE',
      title: 'Catatan Absensi Ditinjau',
      body: `HRD telah meninjau catatan absensi Anda: ${flag.description}`,
      url: '/performance',
    }
  )
  revalidatePath('/hrd/dashboard')
  revalidatePath('/hrd/anomalies')
}
