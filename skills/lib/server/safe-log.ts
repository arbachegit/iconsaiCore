import 'server-only'

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g

export function safeLogText(value: unknown, maxLength = 500): string {
  return String(value ?? '')
    .normalize('NFC')
    .replace(CONTROL_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export function safeErrorName(error: unknown): string {
  return error instanceof Error ? safeLogText(error.name, 120) : 'unknown'
}
