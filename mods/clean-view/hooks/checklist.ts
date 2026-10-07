// The checklist as plain functions: names made plain, a plan laid out, progress applied, a
// to-do list read, and the meter and clock the band draws.
import type { Checklist, Task } from '../types'

export const MAX_NAME = 40
export const METER = 10 // the fewest cells a bar gets; it widens to fill the row
const LABEL = 7 // the widest label after a bar: "Working", "Up next"
const CODE_EXTENSIONS =
  'tsx?|jsx?|mjs|cjs|py|rb|rs|go|java|kt|swift|c|h|cc|cpp|hpp|cs|php|lua|dart|scala|sh|bash|zsh|ps1|sql|json|jsonc|ya?ml|toml|ini|env|lock|xml|html?|css|scss|sass|less|vue|svelte|qml|md|mdx|txt|csv|ipynb|gradle|dockerfile'
const FILE_NAME = new RegExp(`^[\\w.@-]*\\.(${CODE_EXTENSIONS})[),.;:!?]*$`, 'i')

export const IDLE: Checklist = {
  jobId: 0,
  title: '',
  phase: 'idle',
  tasks: [],
  isPlanned: false,
  needsYouReason: null,
  stuckReason: null,
  startedAt: 0,
  finishedAt: null,
  isCollapsed: false,
}

export const PLACEHOLDERS: Task[] = [
  { id: 'placeholder-1', name: 'Understand your request', status: 'active', percent: 0, hasReported: false },
  { id: 'placeholder-2', name: 'Plan the steps', status: 'upcoming', percent: 0, hasReported: false },
]

// The one cleaner every name passes through: no code in backticks, nothing with a slash, no
// file name with a code extension; one space between words, a capital first, at most 40
// characters cut at a word with "…", and "Working on it" when nothing is left.
export function clean(raw: unknown, max = MAX_NAME): string {
  const text = typeof raw === 'string' ? raw : ''
  const words = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/`/g, ' ')
    .split(/\s+/)
    .filter(w => w !== '' && !w.includes('/') && !w.includes('\\') && !FILE_NAME.test(w))
  let name = words.join(' ').trim()
  if (name === '') return 'Working on it'
  name = name.charAt(0).toUpperCase() + name.slice(1)
  if (name.length <= max) return name
  const room = name.slice(0, max - 1)
  const at = name.charAt(max - 1) === ' ' ? room.length : room.lastIndexOf(' ') // a word that ends at the edge stays
  return `${(at > 0 ? room.slice(0, at) : room).replace(/[\s,;:.-]+$/, '')}…`
}

// A job's name from Haiku's answer (or the prompt itself): 2 to 6 words, plain.
export function title(raw: string) {
  const words = clean(raw.replace(/["'“”‘’]/g, '').replace(/[.!?]+$/g, ''), 200).split(' ')
  return clean(words.slice(0, 6).join(' '))
}

// plan_steps: the steps in order, the first one started.
export function planned(steps: string[]): Task[] {
  return steps.slice(0, 8).map((s, i) => ({
    id: `step-${i + 1}`,
    name: clean(s),
    status: i === 0 ? 'active' : 'upcoming',
    percent: 0,
    hasReported: false,
  }))
}

// report_progress: every step before the reported one is checked off; at 100 the step is
// checked off too and the next one starts. A name the plan does not have becomes a step of
// its own, worked on now, ahead of the ones not started.
export function progress(tasks: Task[], task: unknown, percent: unknown): Task[] {
  const p = clamp(percent)
  const name = clean(task)
  const key = name.toLowerCase()
  let list = tasks.map(t => ({ ...t }))
  let at = list.findIndex(t => t.name.toLowerCase() === key)
  if (at < 0) at = list.findIndex(t => t.status !== 'done' && (t.name.toLowerCase().startsWith(key) || key.startsWith(t.name.toLowerCase())))
  if (at < 0) {
    const firstOpen = list.findIndex(t => t.status !== 'done')
    at = firstOpen < 0 ? list.length : firstOpen
    list = [...list.slice(0, at), { id: `step-${Date.now().toString(36)}-${at}`, name, status: 'active', percent: 0, hasReported: false }, ...list.slice(at)]
  }
  return list.map((t, i) => {
    if (i < at) return { ...t, status: 'done', percent: 100 }
    if (i === at) return p >= 100 ? { ...t, status: 'done', percent: 100, hasReported: true } : { ...t, status: 'active', percent: p, hasReported: true }
    if (i === at + 1 && p >= 100 && t.status !== 'done') return { ...t, status: 'active', percent: 0, hasReported: false }
    return t.status === 'active' ? { ...t, status: 'upcoming' } : t
  })
}

// TodoWrite's list, read as the checklist (a step keeps its percent while its name stays).
export function fromTodos(todos: unknown, before: Task[]): Task[] {
  if (!Array.isArray(todos)) return before
  return todos
    .filter((t): t is { content?: unknown; activeForm?: unknown; status?: unknown } => typeof t === 'object' && t !== null)
    .map((t, i) => {
      const name = clean(t.content ?? t.activeForm)
      const was = before.find(b => b.name === name)
      const status = t.status === 'completed' ? 'done' : t.status === 'in_progress' ? 'active' : 'upcoming'
      return {
        id: `todo-${i + 1}`,
        name,
        status,
        percent: status === 'done' ? 100 : status === 'active' ? (was?.status === 'active' ? was.percent : 0) : 0,
        hasReported: status === 'active' && was?.status === 'active' ? was.hasReported : false,
      }
    })
}

// TaskCreate: one more step, after the ones there (the placeholders give way to the first).
export function created(tasks: Task[], id: string, subject: unknown): Task[] {
  const real = tasks.filter(t => !t.id.startsWith('placeholder-'))
  const step: Task = { id, name: clean(subject), status: real.some(t => t.status === 'active') || real.length > 0 ? 'upcoming' : 'active', percent: 0, hasReported: false }
  return [...real, step]
}

// TaskUpdate: a status, a new name, or the step gone.
export function updated(tasks: Task[], id: unknown, input: { status?: unknown; subject?: unknown }): Task[] {
  if (typeof id !== 'string') return tasks
  if (input.status === 'deleted') return tasks.filter(t => t.id !== id)
  return tasks.map(t => {
    if (t.id !== id) return t
    const next = { ...t, ...(typeof input.subject === 'string' ? { name: clean(input.subject) } : {}) }
    if (input.status === 'completed') return { ...next, status: 'done', percent: 100 }
    if (input.status === 'in_progress') return { ...next, status: 'active' }
    if (input.status === 'pending') return { ...next, status: 'upcoming', percent: 0 }
    return next
  })
}

// The bar's paint, orange to pink to violet: each cell's color by where it sits in the whole
// bar (a bar at 30% shows the orange end), a lighter stripe of the same hue drawn across it.
const BASE = ['#f68304', '#f96500', '#ef4b04', '#ff3440', '#ff2b88', '#f835a2', '#c52fcd', '#8634f6', '#5642f0']
const STRIPE = ['#ffb21b', '#ff8500', '#ff661b', '#ff5149', '#fe40b6', '#ff45ca', '#d846ee', '#aa41fc', '#855dff']
// A finished step's bar: the same stripes, green to blue.
const DONE_BASE = ['#16a34a', '#0f9f6e', '#0d9488', '#0891b2', '#0284c7', '#2563eb', '#3b4fe0']
const DONE_STRIPE = ['#4ade80', '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8']
export const FILLED = '╱' // a diagonal stripe on the cell's color
export const EMPTY = '░'

export type Cell = { char: string; color?: string; background?: string }

// `width` cells: full when done, filled to the percent, a sweep while no percent came yet.
export function cells(t: Task, frame: number, width = METER): Cell[] {
  const at = (i: number) => (width > 1 ? i / (width - 1) : 0)
  const filled = (i: number): Cell => ({ char: FILLED, color: blend(STRIPE, at(i)), background: blend(BASE, at(i)) })
  const empty: Cell = { char: EMPTY }
  if (t.status === 'done')
    return Array.from({ length: width }, (_, i) => ({ char: FILLED, color: blend(DONE_STRIPE, at(i)), background: blend(DONE_BASE, at(i)) }))
  if (t.status === 'upcoming') return Array.from({ length: width }, () => empty)
  if (!t.hasReported) {
    // The sweep covers about a third of the bar and crosses any bar in the same time as a ten-cell one.
    const span = Math.max(3, Math.round(width * 0.3))
    const step = Math.max(1, Math.round(width / METER))
    const head = (frame * step) % (width + span) // the sweep enters on the left and leaves on the right
    return Array.from({ length: width }, (_, i) => (i >= head - span && i < head ? filled(i) : empty))
  }
  const full = Math.round((clamp(t.percent) / 100) * width)
  return Array.from({ length: width }, (_, i) => (i < full ? filled(i) : empty))
}

// The color at a point (0 to 1) along a gradient of evenly spaced stops.
export function blend(stops: string[], at: number): string {
  const x = Math.min(1, Math.max(0, at)) * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(x))
  const f = x - i
  const [a, b] = [rgb(stops[i]!), rgb(stops[i + 1]!)]
  return `#${a.map((v, k) => Math.round(v + (b[k]! - v) * f).toString(16).padStart(2, '0')).join('')}`
}

function rgb(hex: string) {
  return [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16))
}

export function elapsed(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

// A row's columns: the names as wide as the longest one, the bar every cell left after the
// icon, the names and the label. A narrow row shortens the names before the bar.
export function columns(bodyColumns: number, names: string[]) {
  const fixed = 2 + 2 + 2 + LABEL + 1 // icon, the gaps around the bar, its label, a spare cell
  const longest = Math.min(MAX_NAME, Math.max(8, ...names.map(n => n.length)))
  const name = Math.max(8, Math.min(longest, bodyColumns - fixed - METER))
  return { name, meter: Math.max(METER, bodyColumns - fixed - name) }
}

export function fit(text: string, width: number) {
  if (text.length <= width) return text.padEnd(width)
  return `${text.slice(0, Math.max(1, width - 1))}…`
}

// An API error, in one calm sentence.
export function calm(kind: string | null, details = ''): string {
  const d = details.toLowerCase()
  if (/too long|context|too many tokens|prompt is too/.test(d)) return 'the conversation got too long: type /compact and try again'
  if (kind === 'rate_limit') return 'you hit your usage limit, try again a little later'
  if (kind === 'overloaded' || kind === 'server_error') return "Claude's servers are busy, try again in a minute"
  if (kind === 'authentication_failed' || kind === 'oauth_org_not_allowed' || kind === 'verification_required') return 'you are signed out: type /login'
  if (kind === 'billing_error' || kind === 'account_on_hold') return 'there is a problem with your account or billing'
  if (/network|econn|etimedout|enotfound|socket|fetch failed|connection/.test(d)) return 'the internet connection dropped'
  return 'something went wrong talking to Claude, try again'
}

function clamp(n: unknown) {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.min(100, Math.max(0, Math.round(v)))
}
