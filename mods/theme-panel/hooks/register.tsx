// Theme Panel: Claude Code's themes in a side pane, one press each.
//   Claude Code repaints only for a theme picked in /theme or /config; a theme a plugin sets
//   is saved for the next start. It does repaint at once when the custom theme in use changes
//   on disk, so the pane keeps one of its own, "Theme Panel" (<config>/themes/theme-panel.json),
//   drawn from a built-in theme: once that theme is picked in /theme, a press here rewrites
//   its base and the whole interface follows. Until then a press saves the theme for the next
//   start. /theme-panel opens or closes the pane; closed by hand, it stays closed.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Themes } from '../types'

const PANE = 'theme-panel'
const TITLE = 'Themes'
const ACCENT = 'claude' // the theme's own accent, so the pane follows the theme it switches
const KEY = 'theme' // the /config row
const SLUG = 'theme-panel'
const LIVE = `custom:${SLUG}` // the row's value while the pane's own theme is in use
const THEME_NAME = 'Theme Panel' // as /theme lists it
const BASES = ['dark', 'light', 'dark-daltonized', 'light-daltonized', 'dark-ansi', 'light-ansi'] // what a custom theme can be drawn from
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

// Held by the host, so the pane survives a hot reload of this file.
const themes = atom({ plugin: 'theme-panel', key: 'themes' } as const, null as Themes | null)
const pending = atom({ plugin: 'theme-panel', key: 'pending' } as const, null as string | null)
const isOpen = atom({ plugin: 'theme-panel', key: 'isOpen' } as const, false)

const WATCH_MS = 2000
let watcher: { cancel: () => void } | undefined // rereads the theme until the pane's own is picked in /theme

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await $.command.register({ name: 'theme-panel', description: 'Open or close the themes side pane' }).catch(() => {})
    await update($, pending, (): string | null => null) // a reload mid-switch leaves nothing spinning
    watcher?.cancel() // a reload starts the module over
    watcher = undefined
    void refresh($, true).catch(() => {})
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
    if (e.origin.kind !== 'unload') await $.store.set('isClosedByHand', true).catch(() => {}) // a reload is not the person closing it
    return r
  })

  // The theme changed in /theme or /config: the pane follows (and learns when its own is picked).
  on('config.set', { key: KEY }, async ($, e, next) => {
    const r = await next(e)
    if (!r.deny) await update($, themes, (t): Themes | null => (t ? { ...t, current: String(r.value), isLive: String(r.value) === LIVE } : t)).catch(() => {}) // only watching: never in the way
    return r
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const t = await read($, themes)
    const busy = await read($, pending)
    const width = Math.max(10, e.props.bodyColumns - 2)
    const inUse = t ? (t.isLive ? t.base : t.current) : ''
    const options = t ? (t.isLive ? t.options.filter(name => BASES.includes(name)) : t.options) : []

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text wrap="truncate-end">
            <Text color={ACCENT}>{'✦ '}</Text>
            <Text bold>{TITLE}</Text>
          </Text>
          <Text dimColor wrap="truncate-start">
            {inUse ? pretty(inUse) : ''}
          </Text>
        </Box>
        <Text dimColor>{'─'.repeat(width)}</Text>
        {!t && <Text dimColor>Reading the theme…</Text>}
        {t?.isLocked && <Text color="warning">Your organization sets the theme</Text>}
        {t && !t.isLive && !t.isLocked && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color="warning" wrap="wrap">
              {`To switch at once, pick “${THEME_NAME}” in /theme one time. Until then a press saves the theme for the next start.`}
            </Text>
            <Button key="setup" plain label="▸ Open /theme" onPress={() => void setUp($)} />
          </Box>
        )}
        <Box flexDirection="column">
          {options.map(name => {
            const isCurrent = name === inUse
            return (
              <Box key={`row:${name}`} flexDirection="row" justifyContent="space-between">
                <Button
                  key={`theme:${name}`}
                  plain
                  dimColor={!isCurrent}
                  label={`${busy === name ? '◌' : isCurrent ? '●' : '○'} ${pretty(name)}`}
                  onPress={() => {
                    if (!isCurrent && busy === null && t?.isLocked !== true) void switchTheme($, name)
                  }}
                />
                {isCurrent && <Text color="success">in use</Text>}
              </Box>
            )
          })}
        </Box>
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
            {t?.isLive ? 'press a theme: it applies at once' : 'press a theme to switch'}
          </Text>
          <Button key="reload" plain dimColor label="↻" onPress={() => void refresh($).catch(() => {})} />
        </Box>
      </Box>
    )
  })
}

export function pretty(name: string) {
  if (name === LIVE) return THEME_NAME
  return NAMES[name] ?? name.replace(/^custom:/, '').replace(/[-_]+/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

async function open($: EngineInterface, isAsked = false) {
  await $.ui.open(isAsked ? { id: PANE, title: TITLE, focus: true, columns: 36 } : { id: PANE, title: TITLE, columns: 36 })
  await update($, isOpen, () => true)
  if (isAsked) await $.store.set('isClosedByHand', false).catch(() => {})
}

async function configDir($: EngineInterface) {
  return (await $.env.get('CLAUDE_CONFIG_DIR')) ?? `${(await $.env.get('HOME')) ?? ''}/.claude`
}

// The pane's custom theme file, beside the person's other custom themes.
async function themeFile($: EngineInterface) {
  return `${await configDir($)}/themes/${SLUG}.json`
}

// The theme saved in the person's settings: what /theme writes when they pick one.
async function savedTheme($: EngineInterface): Promise<string | undefined> {
  const text = await $.fs.read(`${await configDir($)}/settings.json`).catch(() => undefined)
  if (text === undefined) return undefined
  try {
    const theme = (JSON.parse(text) as { theme?: unknown }).theme
    return typeof theme === 'string' ? theme : undefined
  } catch {
    return undefined
  }
}

async function readBase($: EngineInterface): Promise<string | undefined> {
  const text = await $.fs.read(await themeFile($)).catch(() => undefined)
  if (text === undefined) return undefined
  try {
    const base = (JSON.parse(text) as { base?: unknown }).base
    return typeof base === 'string' && BASES.includes(base) ? base : undefined
  } catch {
    return undefined
  }
}

async function writeBase($: EngineInterface, base: string) {
  await $.fs.write(await themeFile($), `${JSON.stringify({ name: THEME_NAME, base, overrides: {} }, null, 2)}\n`)
}

// The theme row as /config lists it, and the pane's own theme. On the first read, the pane's
// theme file is written when missing (drawn from the theme in use), so /theme lists it.
async function refresh($: EngineInterface, isFirst = false) {
  const row = (await $.config.list()).find(r => r.key === KEY)
  const current = row ? String(row.value) : ''
  let base = await readBase($)
  if (base === undefined && isFirst) {
    base = BASES.includes(current) ? current : 'dark'
    await writeBase($, base).catch(() => {})
  }
  const options = row?.kind === 'choice' && row.options ? row.options.filter(o => !o.startsWith('custom:')) : BASES
  const isLive = current === LIVE || (await savedTheme($)) === LIVE
  const found: Themes = { current, options: [...options], isLocked: row?.isLocked === true, isLive, base: base ?? 'dark' }
  await update($, themes, (): Themes | null => found)
  // Not live yet: keep looking, since picking a theme in /theme raises no event a plugin sees.
  if (!isLive && !watcher) watcher = $.clock.every(WATCH_MS, () => void refresh($).catch(() => {}))
  if (isLive && watcher) {
    watcher.cancel()
    watcher = undefined
  }
}

// While the pane's theme is in use, a press rewrites its base and Claude Code repaints at
// once. Otherwise the theme is saved as /config would, for the next start (and the pane's
// theme follows, so picking it in /theme later keeps this choice).
async function switchTheme($: EngineInterface, name: string) {
  const t = await read($, themes)
  await update($, pending, (): string | null => name)
  try {
    if (BASES.includes(name)) await writeBase($, name)
    if (t?.isLive && BASES.includes(name)) {
      $.ui.toast(`Theme: ${pretty(name)}`)
    } else {
      const r = await $.config.set({ key: KEY, value: name })
      if (r.deny !== undefined) throw new Error(r.deny)
      $.ui.toast(`${pretty(name)} is saved for the next start. To switch at once, pick “${THEME_NAME}” in /theme`)
    }
  } catch (error) {
    $.ui.toast(`Could not switch the theme: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await update($, pending, (): string | null => null)
  }
  await refresh($).catch(() => {})
}

// Opens /theme, where the person picks the pane's own theme once.
async function setUp($: EngineInterface) {
  const t = await read($, themes)
  if ((await readBase($)) === undefined) await writeBase($, t && BASES.includes(t.current) ? t.current : 'dark').catch(() => {})
  const isOpened = await $.command
    .run({ command: 'theme', args: '' })
    .then(() => true)
    .catch(() => false)
  $.ui.toast(isOpened ? `Pick “${THEME_NAME}” in the list` : `Type /theme and pick “${THEME_NAME}”`)
}
