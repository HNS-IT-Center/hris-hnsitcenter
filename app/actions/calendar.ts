'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getCalendarEvents() {
  try {
    const events = await prisma.calendarEvent.findMany({
      orderBy: { date: 'asc' }
    })
    
    // We need to return them as strings or handle serialization because date objects can be problematic over boundary
    return {
      success: true,
      data: events.map(e => ({
        ...e,
        date: e.date.toISOString().split('T')[0] // Return as YYYY-MM-DD
      }))
    }
  } catch (err) {
    console.error('Error fetching calendar events', err)
    return { success: false, error: 'Failed to fetch calendar events' }
  }
}

export async function getCalendarAudienceOptions() {
  try {
    const [users, shifts, stores] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, departmentName: true }
      }),
      prisma.shift.findMany({
        select: { id: true, name: true }
      }),
      prisma.store.findMany({
        select: { id: true, name: true }
      })
    ])

    const departments = Array.from(new Set(users.map(u => u.departmentName).filter(Boolean))) as string[]

    return {
      success: true,
      data: {
        employees: users,
        departments,
        shifts,
        stores
      }
    }
  } catch (err) {
    console.error('Error fetching audience options', err)
    return { success: false, error: 'Failed to fetch audience options' }
  }
}

export async function createCalendarEvent(data: {
  date: string
  title: string
  type: string
  scope: string
  scopeValue?: string | null
  note?: string | null
}) {
  try {
    const parsedDate = new Date(data.date + 'T00:00:00.000Z')
    const event = await prisma.calendarEvent.create({
      data: {
        date: parsedDate,
        title: data.title,
        type: data.type,
        scope: data.scope,
        scopeValue: data.scopeValue,
        note: data.note
      }
    })
    
    revalidatePath('/hrd/calendar')
    revalidatePath('/performance')
    
    return { success: true, data: event }
  } catch (err) {
    console.error('Error creating calendar event', err)
    return { success: false, error: 'Failed to create calendar event' }
  }
}

export async function deleteCalendarEvent(id: string) {
  try {
    await prisma.calendarEvent.delete({
      where: { id }
    })
    revalidatePath('/hrd/calendar')
    revalidatePath('/performance')
    return { success: true }
  } catch (err) {
    console.error('Error deleting calendar event', err)
    return { success: false, error: 'Failed to delete calendar event' }
  }
}
