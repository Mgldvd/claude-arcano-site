// Theme Panel: Claude Code's themes in a side pane, one press each.
//   Lists the built-in themes and the custom ones in <config>/themes/, marks the one in use,
//   and draws a strip of its colors. Claude Code repaints at once only through /theme, the
//   `/config theme=<built-in>` shorthand, or an edit to the custom theme file in use (a plain
//   $.config.set only saves the theme for the next start). So a built-in theme is set with the
//   shorthand, and the pane keeps a theme of its own, "Theme Panel" (themes/theme-panel.json):
//   once that one is picked in /theme, a press copies the chosen theme's colors into it and
//   the interface follows, custom themes included. /theme-panel opens or closes the pane.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Theme, Themes } from '../types'

const PANE = 'theme-panel'
const TITLE = 'Themes'
const ACCENT = 'claude' // the theme's own accent, so the pane follows the theme it switches
const KEY = 'theme' // the /config row
const CUSTOM = 'custom:'
const SLUG = 'theme-panel'
const PROXY = `${CUSTOM}${SLUG}` // the saved theme while the pane's own is in use
const PROXY_NAME = 'Theme Panel'
const BASES = ['dark', 'light', 'dark-daltonized', 'light-daltonized', 'dark-ansi', 'light-ansi'] // what a custom theme can be drawn from
const WATCH_MS = 3000 // while open, a theme picked in /theme or a new theme file shows up this soon
// Theme keys drawn as the current theme's swatches.
const SWATCHES = ['claude', 'success', 'warning', 'error', 'suggestion', 'autoAccept', 'planMode', 'bashBorder', 'ide', 'permission']
const NAMES: Record<string, string> = {
  dark: 'Dark',
  light: 'Light',
  'dark-daltonized': 'Dark, colorblind-friendly',
  'light-daltonized': 'Light, colorblind-friendly',
  'dark-ansi': 'Dark, terminal colors',
  'light-ansi': 'Light, terminal colors',
  auto: 'Auto, as the terminal',
}
const BUILT_IN = Object.keys(NAMES)

// Held by the host, so the pane survives a hot reload of this file.
const themes = atom({ plugin: 'theme-panel', key: 'themes' } as const, null as Themes | null)
const pending = atom({ plugin: 'theme-panel', key: 'pending' } as const, null as string | null)
const isOpen = atom({ plugin: 'theme-panel', key: 'isOpen' } as const, false)

let watcher: { cancel: () => void } | undefined // rereads the themes while the pane is open

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await $.command.register({ name: 'theme-panel', description: 'Open or close the themes side pane' }).catch(() => {})
    await update($, pending, (): string | null => null) // a reload mid-switch leaves nothing spinning
    watcher?.cancel() // a reload starts the module over
    watcher = undefined
    void refresh($).catch(() => {})
    const isClosedByHand = (await $.store.get('isClosedByHand').catch(() => undefined)) === true
    if (!isClosedByHand) await open($).catch(() => {})
    return r
  })

  on('command.run', { command: 'theme-panel' }, async $ => {
    if (await read($, isOpen)) {
      await $.ui.close({ id: PANE })
      return { text: 'Themes pane closed. /theme-panel opens it again' }
    }
    void refresh($).catch(() => {})
    await open($, true)
    return { text: 'Themes pane open' }
  })

  on('ui.close', async ($, e, next) => {
    const r = await next(e)
    if (e.id !== PANE) return r
    await update($, isOpen, () => false)
    watcher?.cancel()
    watcher = undefined
    if (e.origin.kind !== 'unload') await $.store.set('isClosedByHand', true).catch(() => {}) // a reload is not the person closing it
    return r
  })

  // The theme changed through /config's menu: the pane follows.
  on('config.set', { key: KEY }, async ($, e, next) => {
    const r = await next(e)
    if (!r.deny) await update($, themes, (t): Themes | null => (t ? { ...t, current: String(r.value) } : t)).catch(() => {}) // only watching: never in the way
    return r
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const t = await read($, themes)
    const busy = await read($, pending)
    const width = Math.max(10, e.props.bodyColumns - 2)
    const current = t?.current ?? ''
    const row = (theme: Theme) => {
      const isCurrent = theme.value === current
      return (
        <Box key={`row:${theme.value}`} flexDirection="row" justifyContent="space-between">
          <Button
            key={`theme:${theme.value}`}
            plain
            dimColor={!isCurrent}
            label={`${busy === theme.value ? '◌' : isCurrent ? '●' : '○'} ${theme.name}`}
            onPress={() => {
              if (!isCurrent && busy === null && t?.isLocked !== true) void switchTheme($, theme)
            }}
          />
          {isCurrent && <Text color="success">in use</Text>}
        </Box>
      )
    }

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text wrap="truncate-end">
            <Text color={ACCENT}>{'✦ '}</Text>
            <Text bold>{TITLE}</Text>
          </Text>
          <Text dimColor wrap="truncate-start">
            {t ? nameOf(t, current) : ''}
          </Text>
        </Box>
        <Text dimColor>{'─'.repeat(width)}</Text>
        {!t && <Text dimColor>Reading the themes…</Text>}
        {t?.isLocked && <Text color="warning">Your organization sets the theme</Text>}
        {t && t.custom.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text dimColor>Custom</Text>
            {t.custom.map(row)}
            {!t.isProxy && (
              <Text color="warning" wrap="wrap">
                {`The first one opens /theme: pick “${PROXY_NAME}” there once, then every press switches at once`}
              </Text>
            )}
          </Box>
        )}
        {t && (
          <Box flexDirection="column">
            <Text dimColor>Built in</Text>
            {t.builtIn.map(row)}
          </Box>
        )}
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>Colors of this theme</Text>
          <Text wrap="truncate-end">
            {SWATCHES.map(key => (
              <Text key={`swatch:${key}`} color={key}>
                {'██ '}
              </Text>
            ))}
          </Text>
        </Box>
        <Box marginTop={1} flexDirection="row" justifyContent="space-between">
          <Text dimColor wrap="truncate-end">
            <Text color={ACCENT}>{'● '}</Text>
            {'press a theme to switch'}
          </Text>
          <Button key="reload" plain dimColor label="↻" onPress={() => void refresh($).catch(() => {})} />
        </Box>
      </Box>
    )
  })
}

export function pretty(value: string) {
  return NAMES[value] ?? value.replace(/^custom:/, '').replace(/[-_]+/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

function nameOf(t: Themes, value: string) {
  return [...t.custom, ...t.builtIn].find(theme => theme.value === value)?.name ?? pretty(value)
}

async function open($: EngineInterface, isAsked = false) {
  await $.ui.open(isAsked ? { id: PANE, title: TITLE, focus: true, columns: 36 } : { id: PANE, title: TITLE, columns: 36 })
  await update($, isOpen, () => true)
  if (isAsked) await $.store.set('isClosedByHand', false).catch(() => {})
  watcher ??= $.clock.every(WATCH_MS, () => void refresh($).catch(() => {}))
}

async function configDir($: EngineInterface) {
  return (await $.env.get('CLAUDE_CONFIG_DIR')) ?? `${(await $.env.get('HOME')) ?? ''}/.claude`
}

function parse(text: string): Record<string, unknown> | undefined {
  try {
    const value = JSON.parse(text) as unknown
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
  } catch {
    return undefined
  }
}

// The theme saved in the person's settings: what /theme and /config write.
async function savedTheme($: EngineInterface): Promise<string | undefined> {
  const text = await $.fs.read(`${await configDir($)}/settings.json`).catch(() => undefined)
  const theme = text === undefined ? undefined : parse(text)?.theme
  return typeof theme === 'string' ? theme : undefined
}

// The custom themes Claude Code loads: <config>/themes/<slug>.json, each with a name.
async function customThemes($: EngineInterface): Promise<Theme[]> {
  const dir = `${await configDir($)}/themes`
  const entries = await $.fs.list(dir).catch(() => [])
  const found: Theme[] = []
  for (const entry of entries) {
    if (!entry.name.endsWith('.json') || entry.kind === 'dir') continue
    const slug = entry.name.slice(0, -'.json'.length)
    if (slug === SLUG) continue // the pane's own, which stands in for the others
    const text = await $.fs.read(`${dir}/${entry.name}`).catch(() => undefined)
    const file = text === undefined ? undefined : parse(text)
    if (!file) continue
    found.push({ value: `${CUSTOM}${slug}`, name: typeof file.name === 'string' && file.name.trim() !== '' ? file.name : pretty(slug) })
  }
  return found.sort((a, b) => a.name.localeCompare(b.name))
}

async function refresh($: EngineInterface) {
  const row = (await $.config.list()).find(r => r.key === KEY)
  const options = row?.kind === 'choice' && row.options ? row.options.filter(o => !o.startsWith(CUSTOM)) : BUILT_IN
  const saved = (await savedTheme($)) ?? (row ? String(row.value) : '')
  const proxy = saved === PROXY ? await readTheme($, SLUG) : undefined
  const found: Themes = {
    current: proxy && typeof proxy.source === 'string' ? proxy.source : saved,
    isProxy: saved === PROXY,
    builtIn: options.map(value => ({ value, name: pretty(value) })),
    custom: await customThemes($),
    isLocked: row?.isLocked === true,
  }
  const before = await read($, themes)
  if (JSON.stringify(before) !== JSON.stringify(found)) await update($, themes, (): Themes | null => found)
}

async function readTheme($: EngineInterface, slug: string) {
  const text = await $.fs.read(`${await configDir($)}/themes/${slug}.json`).catch(() => undefined)
  return text === undefined ? undefined : parse(text)
}

// The pane's own theme, drawn as `theme`: a built-in one by its name, a custom one by its colors.
async function writeProxy($: EngineInterface, theme: Theme) {
  const custom = theme.value.startsWith(CUSTOM) ? await readTheme($, theme.value.slice(CUSTOM.length)) : undefined
  const base = custom ? (typeof custom.base === 'string' && BASES.includes(custom.base) ? custom.base : 'dark') : theme.value
  const overrides = custom && typeof custom.overrides === 'object' && custom.overrides !== null ? custom.overrides : {}
  const file = { name: `${PROXY_NAME} · ${theme.name}`, base, overrides, source: theme.value }
  await $.fs.write(`${await configDir($)}/themes/${SLUG}.json`, `${JSON.stringify(file, null, 2)}\n`)
}

// With the pane's own theme in use, any theme but Auto is a copy into its file: the interface
// repaints at once. Otherwise a built-in theme goes through `/config theme=`, which repaints
// too, and a custom one is copied in and /theme opens, where "Theme Panel" is picked once.
async function switchTheme($: EngineInterface, theme: Theme) {
  const t = await read($, themes)
  await update($, pending, (): string | null => theme.value)
  try {
    const isCustom = theme.value.startsWith(CUSTOM)
    if (t?.isProxy && theme.value !== 'auto') {
      await writeProxy($, theme)
      $.ui.toast(`Theme: ${theme.name}`)
    } else if (!isCustom) {
      const said = await $.command
        .run({ command: 'config', args: `${KEY}=${theme.value}` })
        .then(r => r.text ?? '')
        .catch(() => undefined)
      if (said === undefined) {
        const r = await $.config.set({ key: KEY, value: theme.value })
        if (r.deny !== undefined) throw new Error(r.deny)
        $.ui.toast(`${theme.name} is saved: it shows from the next start`)
      } else if (said !== '' && !/^Set /.test(said)) {
        throw new Error(said.split('\n')[0]!)
      } else {
        $.ui.toast(`Theme: ${theme.name}`)
      }
    } else {
      await writeProxy($, theme)
      const isOpened = await $.command
        .run({ command: 'theme', args: '' })
        .then(() => true)
        .catch(() => false)
      $.ui.toast(
        `${isOpened ? 'In /theme' : 'Type /theme and'} pick “${PROXY_NAME} · ${theme.name}” once: from then on every press here switches at once`,
        { timeoutMs: 10_000 },
      )
    }
  } catch (error) {
    $.ui.toast(`Could not switch the theme: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await update($, pending, (): string | null => null)
  }
  await refresh($).catch(() => {})
}
