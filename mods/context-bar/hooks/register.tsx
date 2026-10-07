// Context Bar: what is filling my context window?
//   A side pane with the window as one stacked bar, a color per category as /context draws
//   them (system prompt, tools, MCP tools, memory files, skills, messages, free), then a row
//   per category with its tokens and share, and where auto-compaction runs. It refreshes
//   after each turn. /context-bar opens or closes it; closed by hand, it stays closed in
//   later sessions.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Reading, Slice } from '../types'

const PANE = 'context-bar'
const TITLE = 'Context'
const COLUMNS = 40
const MIN_WIDTH = 10 // the bar never gets narrower than this
// /context's theme gives several rows the same grey, so each used row gets its own color, in order.
const PALETTE = ['#7aa2f7', '#7dcfff', '#bb9af7', '#9ece6a', '#e0af68', '#f7768e', '#73daca', '#ff9e64', '#c0caf5']
const MESSAGES = '#d97757' // the row that grows, in the accent color
const FREE = '#808080' // a mid grey thin line reads as empty on dark and light themes alike
const BUFFER = '#808080'
const GLYPH = { used: '█', free: '─', buffer: '░' } as const

// Held by the host, so the pane survives a hot reload of this file.
const reading = atom({ plugin: 'context-bar', key: 'reading' } as const, null as Reading | null)
const isOpen = atom({ plugin: 'context-bar', key: 'isOpen' } as const, false)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await $.command.register({ name: 'context-bar', description: 'Open or close the context window side pane' }).catch(() => {}) // a name Claude Code already has is refused: start anyway
    const isClosedByHand = (await $.store.get('isClosedByHand').catch(() => undefined)) === true
    if (!isClosedByHand) await open($).catch(() => {})
    void refresh($).catch(() => {})
    return r
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (!e.agentId) await refresh($).catch(() => {}) // a subagent's turn fills its own window, not this one
    return r
  })

  on('session.compact', async ($, e, next) => {
    const r = await next(e)
    if (!e.agentId && 'messages' in r) void refresh($).catch(() => {}) // a /compact empties the window without a turn ending
    return r
  })

  on('command.run', { command: 'context-bar' }, async $ => {
    if (await read($, isOpen)) {
      await $.ui.close({ id: PANE })
      return { text: 'Context pane closed. /context-bar opens it again' }
    }
    await open($, true)
    await refresh($).catch(() => {})
    return { text: 'Context pane open' }
  })

  on('ui.close', async ($, e, next) => {
    const r = await next(e)
    if (e.id !== PANE) return r
    await update($, isOpen, () => false)
    if (e.origin.kind !== 'unload') await $.store.set('isClosedByHand', true).catch(() => {}) // a reload is not the person closing it
    return r
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const r = await read($, reading)
    const width = Math.max(MIN_WIDTH, e.props.bodyColumns - 2) // inside the side padding

    if (!r) {
      return (
        <Box flexDirection="column" paddingX={1}>
          <Text dimColor>Measuring the context window…</Text>
        </Box>
      )
    }

    const level = r.compactsAt ? r.total / r.compactsAt : r.total / r.window
    return (
      <Box flexDirection="column" paddingX={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text wrap="truncate-end">
            <Text color={MESSAGES}>{'◆ '}</Text>
            <Text bold>{`${tokens(r.total)} of ${tokens(r.window)}`}</Text>
          </Text>
          <Text bold color="black" backgroundColor={level >= 0.9 ? 'red' : level >= 0.7 ? 'yellow' : 'green'}>
            {` ${r.percent}% `}
          </Text>
        </Box>
        {r.compactsAt !== undefined && <Text dimColor wrap="truncate-end">{`compacts at ${tokens(r.compactsAt)}`}</Text>}
        <Text> </Text>
        <Text>
          {cells(r, width).map(c => (
            <Text color={c.color}>{c.text}</Text>
          ))}
        </Text>
        <Text> </Text>
        {r.slices.map(s => (
          <Box flexDirection="row" justifyContent="space-between">
            <Text wrap="truncate-end">
              <Text color={s.color}>{s.kind === 'used' ? '■ ' : `${GLYPH[s.kind]} `}</Text>
              <Text dimColor={s.kind !== 'used'}>{s.name}</Text>
            </Text>
            <Text>
              <Text bold={s.kind === 'used'} dimColor={s.kind !== 'used'}>{tokens(s.tokens)}</Text>
              <Text dimColor>{` ${share(s.tokens, r.window).padStart(5)}`}</Text>
            </Text>
          </Box>
        ))}
      </Box>
    )
  })
}

async function open($: EngineInterface, isAsked = false) {
  await $.ui.open(isAsked ? { id: PANE, title: TITLE, focus: true, columns: COLUMNS } : { id: PANE, title: TITLE, columns: COLUMNS })
  await update($, isOpen, () => true)
  if (isAsked) await $.store.set('isClosedByHand', false).catch(() => {})
}

// Asks the engine for /context's breakdown, estimated locally (no token-count calls).
async function refresh($: EngineInterface) {
  const usage = await $.session.usage({ breakdown: 'summary' })
  const b = usage.context.breakdown
  if (!b || !(b.rawMaxTokens > 0)) return // no window to measure against
  await update($, reading, () => toReading(b))
}

export function toReading(b: {
  categories: { name: string; tokens: number; color: string; kind: string }[]
  totalTokens: number
  rawMaxTokens: number
  percentage: number
  autoCompactThreshold?: number
  isAutoCompactEnabled: boolean
}): Reading {
  const slices: Slice[] = b.categories
    .filter(c => c.kind !== 'deferred' && c.tokens > 0)
    .map(c => ({ name: c.name.toLowerCase(), tokens: c.tokens, color: c.color, kind: c.kind as Slice['kind'] }))
  const order = { used: 0, free: 1, buffer: 2 }
  slices.sort((x, y) => order[x.kind] - order[y.kind]) // stable: used rows keep /context's order
  let next = 0
  for (const s of slices) {
    s.color = s.kind === 'free' ? FREE : s.kind === 'buffer' ? BUFFER : s.name === 'messages' ? MESSAGES : PALETTE[next++ % PALETTE.length]!
  }
  return {
    slices,
    total: b.totalTokens,
    window: b.rawMaxTokens,
    percent: b.percentage,
    compactsAt: b.isAutoCompactEnabled ? b.autoCompactThreshold : undefined,
  }
}

// The bar as runs of cells: each slice gets its share of `width`, a used one at least one cell.
export function cells(r: Reading, width: number) {
  const sizes = r.slices.map(s => Math.max(s.kind === 'used' ? 1 : 0, Math.round((s.tokens / r.window) * width)))
  // Rounding leaves the sum a few cells off: free space takes the difference first, then the largest slices.
  let diff = width - sizes.reduce((a, n) => a + n, 0)
  const isUsed = (i: number) => r.slices[i]!.kind === 'used'
  const order = r.slices.map((_, i) => i).sort((a, b) => Number(isUsed(a)) - Number(isUsed(b)) || sizes[b]! - sizes[a]!)
  for (const i of order) {
    if (diff === 0) break
    const size = Math.max(isUsed(i) ? 1 : 0, sizes[i]! + diff)
    diff -= size - sizes[i]!
    sizes[i] = size
  }
  return r.slices.map((s, i) => ({ color: s.color, kind: s.kind, text: GLYPH[s.kind].repeat(sizes[i]!) })).filter(c => c.text !== '')
}

export function tokens(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}k`
  return String(n)
}

export function share(n: number, window: number) {
  const p = (n / window) * 100
  if (p > 0 && p < 0.1) return '<0.1%'
  return `${p >= 10 ? Math.round(p) : +p.toFixed(1)}%`
}
