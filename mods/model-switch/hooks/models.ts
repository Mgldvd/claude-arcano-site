// Plain functions: a model id told as people say it, and the next model or effort a click picks.
import type { Effort } from '../types'

// The families a click cycles through, most capable first; the [1m] and plan variants stay in /model.
export const FAMILIES = ['fable', 'opus', 'sonnet', 'haiku']
export const EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max', 'auto']
const COLORS: Record<string, string> = { fable: '#bb9af7', opus: '#d97757', sonnet: '#7aa2f7', haiku: '#9ece6a' }

// `claude-opus-5-5` → `Opus 5.5`, `claude-haiku-4-5-20251001` → `Haiku 4.5`, `opus[1m]` → `Opus 1M`.
export function pretty(id: string) {
  const isWide = /\[1m\]$/i.test(id)
  const bare = id.replace(/\[1m\]$/i, '')
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/.exec(bare)
  const name = m ? `${cap(m[1]!)} ${m[2]}${m[3] ? `.${m[3]}` : ''}` : cap(bare)
  return isWide ? `${name} 1M` : name
}

export function family(id: string) {
  return FAMILIES.find(f => id.toLowerCase().includes(f)) ?? ''
}

export function colorOf(id: string) {
  return COLORS[family(id)]
}

// Haiku takes no effort setting: the request goes out without one.
export function hasEffort(id: string) {
  return family(id) !== 'haiku'
}

// The families the /config row offers, in FAMILIES' order (all four when it says nothing).
export function choices(options: readonly string[] | undefined) {
  const offered = FAMILIES.filter(f => !options || options.includes(f))
  return offered.length > 0 ? offered : FAMILIES
}

// The one after the current, wrapping; the first when the current is not in the list.
export function after<T>(list: readonly T[], current: T): T {
  const at = list.indexOf(current)
  return list[(at + 1) % list.length]!
}

export function isEffort(value: unknown): value is Effort {
  return typeof value === 'string' && (EFFORTS as string[]).includes(value)
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
