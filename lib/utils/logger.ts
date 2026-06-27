type LogLevel = 'info' | 'warn' | 'error' | 'debug'

/**
 * Simple structured logger for server-side use.
 * In production, consider forwarding to a service like Axiom or Sentry.
 */
export function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString()
  const entry = {
    timestamp,
    level,
    message,
    ...(meta && { meta }),
  }

  const formatted = JSON.stringify(entry)

  switch (level) {
    case 'error':
      console.error(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.debug(formatted)
      }
      break
    default:
      console.log(formatted)
  }
}
