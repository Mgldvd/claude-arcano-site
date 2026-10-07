// Mods Panel: every mod of the mods folder, each with an on/off switch.
//   A side pane listing the folders beside this one that hold a plugin.json, with their
//   description and where this session has them: live (linked into the session's hot-reload
//   folder) or installed (`<name>@<marketplace>`). The switch unlinks or links a live mod,
//   and disables or enables an installed one through `claude plugin`, then reloads the
//   plugins so the session follows. /mods-panel opens or closes it; closed by hand, it stays
//   closed in later sessions.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Mod } from '../types'

const PANE = 'mods-panel'
const TITLE = 'Mods'
const ACCENT = 'claude' // the theme's own accent, so the pane follows the CLI's theme
const CLI_TIMEOUT = 60_000

// Held by the host, so the pane survives a hot reload of this file.
const mods = atom({ plugin: 'mods-panel', key: 'mods' } as const, null as Mod[] | null)
const pending = atom({ plugin: 'mods-panel', key: 'pending' } as const, [] as string[])
const isOpen = atom({ plugin: 'mods-panel', key: 'isOpen' } as const, false)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await $.command.register({ name: 'mods-panel', description: 'Open or close the mods side pane' }).catch(() => {})
    await update($, pending, () => []) // a reload mid-switch leaves nothing spinning
    void refresh($).catch(() => {})
    const isClosedByHand = (await $.store.get('isClosedByHand').catch(() => undefined)) === true
    if (!isClosedByHand) await open($).catch(() => {})
    return r
  })

  on('command.run', { command: 'mods-panel' }, async $ => {
    if (await read($, isOpen)) {
      await $.ui.close({ id: PANE })
      return { text: 'Mods pane closed. /mods-panel opens it again' }
    }
    void refresh($).catch(() => {})
    await open($, true)
    return { text: 'Mods pane open' }
  })

  on('ui.close', async ($, e, next) => {
    const r = await next(e)
    if (e.id !== PANE) return r
    await update($, isOpen, () => false)
    if (e.origin.kind !== 'unload') await $.store.set('isClosedByHand', true).catch(() => {}) // a reload is not the person closing it
    return r
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const list = await read($, mods)
    const busy = new Set(await read($, pending))
    const width = Math.max(10, e.props.bodyColumns - 2)
    const self = $.plugin.name
    const onCount = (list ?? []).filter(isOn).length

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text wrap="truncate-end">
            <Text color={ACCENT}>{'✦ '}</Text>
            <Text bold>{TITLE}</Text>
          </Text>
          <Text dimColor wrap="truncate-start">
            {list ? `${onCount} on · ${list.length - onCount} off` : ''}
          </Text>
        </Box>
        <Text dimColor>{'─'.repeat(width)}</Text>
        {!list && <Text dimColor>Reading the mods…</Text>}
        {list?.length === 0 && <Text dimColor>No mods in this folder</Text>}
        <Box flexDirection="column" gap={1}>
          {(list ?? []).map(m => {
            const isSelf = m.name === self
            const isBusy = busy.has(m.name)
            const isModOn = isOn(m)
            return (
              <Box key={`mod:${m.name}`} flexDirection="column">
                <Box flexDirection="row" justifyContent="space-between">
                  <Text wrap="truncate-end">
                    <Text color={isModOn ? 'success' : undefined} dimColor={!isModOn}>
                      {isModOn ? '● ' : '○ '}
                    </Text>
                    <Text bold={isModOn} dimColor={!isModOn}>
                      {m.name}
                    </Text>
                    <Text dimColor>{`  ${m.version}`}</Text>
                  </Text>
                  {isSelf ? (
                    <Text dimColor>this pane</Text>
                  ) : (
                    <Button
                      key={`switch:${m.name}`}
                      plain
                      dimColor={!isModOn || isBusy}
                      label={isBusy ? '◌ …' : isModOn ? '● on' : '○ off'}
                      onPress={() => {
                        if (!isBusy) void switchMod($, m, !isModOn)
                      }}
                    />
                  )}
                </Box>
                {m.description !== '' && (
                  <Text dimColor wrap="truncate-end">
                    {`  ${m.description}`}
                  </Text>
                )}
                <Text dimColor wrap="truncate-end">
                  {`  ${where(m)}`}
                </Text>
              </Box>
            )
          })}
        </Box>
        <Box marginTop={1} flexDirection="row" justifyContent="space-between">
          <Text dimColor wrap="truncate-end">
            <Text color={ACCENT}>{'● '}</Text>
            {'on / off switches a mod'}
          </Text>
          <Button key="reload" plain dimColor label="↻" onPress={() => void refresh($).catch(() => {})} />
        </Box>
      </Box>
    )
  })
}

function isOn(m: Mod) {
  return m.isLive || m.isInstalledOn
}

function where(m: Mod) {
  const parts = [m.isLive ? 'live in this session' : '', m.installedId ? `installed${m.isInstalledOn ? '' : ', disabled'}` : '']
  const said = parts.filter(Boolean).join(' · ')
  return said || 'not loaded'
}

async function open($: EngineInterface, isAsked = false) {
  await $.ui.open(isAsked ? { id: PANE, title: TITLE, focus: true, columns: 44 } : { id: PANE, title: TITLE, columns: 44 })
  await update($, isOpen, () => true)
  if (isAsked) await $.store.set('isClosedByHand', false).catch(() => {})
}

// Where the mods live (the folder holding this one) and this session's hot-reload folder.
async function places($: EngineInterface) {
  const st = await $.fs.stat($.plugin.root, { resolve: true }).catch(() => undefined)
  const root = st?.realPath ?? $.plugin.root
  const modsDir = root.slice(0, root.lastIndexOf('/'))
  const config = (await $.env.get('CLAUDE_CONFIG_DIR')) ?? `${(await $.env.get('HOME')) ?? ''}/.claude`
  const liveDir = `${config}/dev-mods/${await $.session.id()}`
  const hasLiveDir = await $.fs.exists(liveDir).catch(() => false)
  return { modsDir, liveDir: hasLiveDir ? liveDir : undefined }
}

async function refresh($: EngineInterface) {
  const { modsDir, liveDir } = await places($)
  const live = new Set((liveDir ? await $.fs.list(liveDir).catch(() => []) : []).map(e => e.name))
  const installed = await installedPlugins($)
  const found: Mod[] = []
  for (const entry of await $.fs.list(modsDir).catch(() => [])) {
    if (entry.kind !== 'dir' || entry.name.startsWith('.')) continue
    const folder = `${modsDir}/${entry.name}`
    const text = await $.fs.read(`${folder}/.claude-plugin/plugin.json`).catch(() => undefined)
    if (text === undefined) continue
    let manifest: { name?: unknown; description?: unknown; version?: unknown }
    try {
      manifest = JSON.parse(text) as typeof manifest
    } catch {
      continue
    }
    const name = typeof manifest.name === 'string' ? manifest.name : entry.name
    const plugin = installed.find(p => p.id.split('@')[0] === name)
    found.push({
      name,
      description: typeof manifest.description === 'string' ? oneLine(manifest.description) : '',
      version: typeof manifest.version === 'string' ? manifest.version : '',
      folder,
      isLive: live.has(entry.name) || live.has(name),
      ...(plugin ? { installedId: plugin.id } : {}),
      isInstalledOn: plugin?.enabled === true,
    })
  }
  await update($, mods, () => found.sort((a, b) => a.name.localeCompare(b.name)))
}

async function installedPlugins($: EngineInterface): Promise<{ id: string; enabled: boolean }[]> {
  const r = await $.process.run(['claude', 'plugin', 'list', '--json'], { timeoutMs: CLI_TIMEOUT }).catch(() => undefined)
  if (!r || r.exitCode !== 0) return []
  const json = lastJson(r.stdout)
  if (!Array.isArray(json)) return []
  return json
    .filter((p): p is { id: string; enabled?: boolean } => typeof p?.id === 'string')
    .map(p => ({ id: p.id, enabled: p.enabled !== false }))
}

// Off: an installed mod is disabled and a live one unlinked. On: an installed mod is enabled,
// else the mod is linked into this session's hot-reload folder. Then the session reloads.
async function switchMod($: EngineInterface, m: Mod, isTurningOn: boolean) {
  await update($, pending, l => [...l, m.name])
  try {
    const { liveDir } = await places($)
    if (isTurningOn) {
      if (m.installedId) await cli($, ['enable', m.installedId])
      else if (liveDir) await sh($, ['ln', '-s', m.folder, `${liveDir}/${m.name}`])
      else throw new Error(`install it first: claude plugin install ${m.name}@<marketplace>`)
    } else {
      if (m.installedId && m.isInstalledOn) await cli($, ['disable', m.installedId])
      if (m.isLive && liveDir) {
        const link = `${liveDir}/${m.name}`
        const st = await $.fs.stat(link).catch(() => undefined)
        if (st?.isLink) await sh($, ['rm', link]) // only the link: the mod's own folder stays
      }
    }
    $.ui.toast(`${m.name} ${isTurningOn ? 'on' : 'off'}`)
  } catch (error) {
    $.ui.toast(`Could not switch ${m.name}: ${error instanceof Error ? error.message : String(error)}`)
    return
  } finally {
    await update($, pending, l => l.filter(x => x !== m.name))
  }
  const isReloaded = await $.command
    .run({ command: 'reload-plugins', args: '' })
    .then(() => true)
    .catch(() => false)
  if (!isReloaded) $.ui.toast('Run /reload-plugins to apply it')
  await refresh($).catch(() => {})
}

async function cli($: EngineInterface, args: string[]) {
  const r = await $.process.run(['claude', 'plugin', ...args, '--json'], { timeoutMs: CLI_TIMEOUT })
  const said = lastJson(r.stdout) as { outcome?: string; message?: string } | undefined
  if (r.exitCode !== 0 || said?.outcome !== 'ok') throw new Error(said?.message ?? (r.stderr.trim().split('\n')[0] || `exit ${r.exitCode}`))
}

async function sh($: EngineInterface, argv: string[]) {
  const r = await $.process.run(argv, { timeoutMs: CLI_TIMEOUT })
  if (r.exitCode !== 0) throw new Error(r.stderr.trim().split('\n')[0] || `${argv[0]} exited ${r.exitCode}`)
}

// The CLI's --json output, read from its last JSON value (a warning line may come first).
function lastJson(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    for (const line of trimmed.split('\n').reverse()) {
      try {
        return JSON.parse(line)
      } catch {}
    }
    return undefined
  }
}

function oneLine(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}
