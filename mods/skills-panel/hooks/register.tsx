// Skills Panel: which skills does this session have?
//   A side pane listing every skill, on and off, grouped by the plugin or place it comes from.
//   A filter narrows the list as you type; three boxes show or hide the skills you installed,
//   the ones synced from claude.ai and Claude Code's own (the choice kept across sessions).
//   A plugin's group has an on/off switch (`claude plugin enable|disable`, then
//   /reload-plugins); a skill of its own has one too, kept as skillOverrides in the user
//   settings. What is off stays listed, dimmed, read from its SKILL.md, and ▸ opens any
//   skill's details. "use" puts `/<skill> ` in the prompt. /skills-panel opens or closes it;
//   closed by hand, it stays closed in later sessions.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Catalog, DiskSkill, Kind, Known, PluginRow, Shown, SkillEntry } from '../types'
import { filter, frontmatter, hue, lastJson, remember, sections, SYNCED_SKILLS, toCatalog, toPlugins, tokens } from './catalog'

const PANE = 'skills-panel'
const TITLE = 'Skills'
const ACCENT = 'claude' // the theme's own accent, so the pane follows the CLI's theme
const KINDS: [Kind, string][] = [
  ['installed', 'Installed'],
  ['synced', 'claude.ai'],
  ['claude', 'Claude Code'],
]
const CLI_TIMEOUT = 60_000
const SETTLE_MS = 800 // the engine applies a settings change on its own clock

// Held by the host, so the pane survives a hot reload of this file.
const catalog = atom({ plugin: 'skills-panel', key: 'catalog' } as const, null as Catalog | null)
const query = atom({ plugin: 'skills-panel', key: 'query' } as const, '')
const collapsed = atom({ plugin: 'skills-panel', key: 'collapsed' } as const, [] as string[])
const opened = atom({ plugin: 'skills-panel', key: 'opened' } as const, [] as string[])
const expanded = atom({ plugin: 'skills-panel', key: 'expanded' } as const, [] as string[])
const isOpen = atom({ plugin: 'skills-panel', key: 'isOpen' } as const, false)
const shown = atom({ plugin: 'skills-panel', key: 'shown' } as const, { installed: true, synced: true, claude: true } as Shown)
const plugins = atom({ plugin: 'skills-panel', key: 'plugins' } as const, [] as PluginRow[])
const disk = atom({ plugin: 'skills-panel', key: 'disk' } as const, [] as DiskSkill[])
const overrides = atom({ plugin: 'skills-panel', key: 'overrides' } as const, {} as Record<string, string>)
const pending = atom({ plugin: 'skills-panel', key: 'pending' } as const, [] as string[])

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await $.command.register({ name: 'skills-panel', description: 'Open or close the skills side pane' }).catch(() => {})
    await update($, pending, () => []) // a reload mid-switch leaves nothing spinning
    void reloadAll($).catch(() => {})
    const kept = (await $.store.get('shown').catch(() => undefined)) as Partial<Shown> | undefined
    if (kept) await update($, shown, s => ({ ...s, ...kept }))
    const isClosedByHand = (await $.store.get('isClosedByHand').catch(() => undefined)) === true
    if (!isClosedByHand) await open($).catch(() => {})
    return r
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (!e.agentId && (await read($, isOpen))) await refresh($).catch(() => {}) // a skill added mid-session shows up
    return r
  })

  on('command.run', { command: 'skills-panel' }, async $ => {
    if (await read($, isOpen)) {
      await $.ui.close({ id: PANE })
      return { text: 'Skills pane closed. /skills-panel opens it again' }
    }
    await reloadAll($).catch(() => {})
    await open($, true)
    return { text: 'Skills pane open' }
  })

  on('ui.close', async ($, e, next) => {
    const r = await next(e)
    if (e.id !== PANE) return r
    await update($, isOpen, () => false)
    if (e.origin.kind !== 'unload') await $.store.set('isClosedByHand', true).catch(() => {}) // a reload is not the person closing it
    return r
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Text, Button } = elements
    const Input = 'Input' in elements ? elements.Input : undefined // the mobile app draws no text field
    const c = await read($, catalog)
    const q = await read($, query)
    const width = Math.max(10, e.props.bodyColumns - 2) // inside the side padding

    if (!c) {
      return (
        <Box flexDirection="column" paddingX={1}>
          <Header Text={Text} Box={Box} right="" />
          <Text dimColor>Reading the skills…</Text>
        </Box>
      )
    }

    const show = await read($, shown)
    const rows = await read($, plugins)
    const busy = new Set(await read($, pending))
    const folded = new Set(await read($, collapsed))
    const unfolded = new Set(await read($, opened))
    const open = new Set(await read($, expanded))
    const groups = sections(c.skills, rows, show, q)
    const visible = groups.reduce((n, g) => n + g.skills.length, 0)
    const offCount = c.skills.filter(s => s.isOff).length
    const isFiltering = q.trim() !== ''
    const isNarrowed = isFiltering || KINDS.some(([kind]) => !show[kind])
    const isGroupOff = (g: { plugin?: PluginRow }) => g.plugin?.enabled === false
    const isFolded = (g: { name: string; plugin?: PluginRow }) => (isGroupOff(g) ? !unfolded.has(g.name) : !isFiltering && folded.has(g.name))
    const allFolded = groups.length > 0 && groups.every(isFolded)
    const right = isNarrowed ? `${visible} of ${c.skills.length}` : `${c.skills.length - offCount} on · ${offCount} off`
    const count = (kind: Kind) => c.skills.filter(s => s.kind === kind).length
    const toggleKind = async (kind: Kind) => {
      const next = await update($, shown, s => ({ ...s, [kind]: !s[kind] }))
      await $.store.set('shown', next).catch(() => {})
    }
    const flip = (list: string[], name: string) => (list.includes(name) ? list.filter(x => x !== name) : [...list, name])
    const toggleFold = (name: string, isOff: boolean) =>
      void (isOff ? update($, opened, l => flip(l, name)) : update($, collapsed, l => flip(l, name)))
    const toggleDetails = (name: string) => void update($, expanded, l => flip(l, name))
    const foldAll = async () => {
      const names = groups.map(g => g.name)
      await update($, collapsed, () => (allFolded ? [] : names))
      await update($, opened, () => (allFolded ? names : []))
    }

    return (
      <Box flexDirection="column" paddingX={1}>
        <Header Text={Text} Box={Box} right={right} />
        <Text dimColor>{'─'.repeat(width)}</Text>
        {Input && (
          <Input
            key="filter"
            placeholder="Filter by name, description or source…"
            value={q}
            onInput={(value: string) => void update($, query, () => value)}
            onSubmit={(value: string) => {
              void update($, query, () => value)
              const only = filter(c.skills.filter(s => show[s.kind] && !s.isOff), value)
              if (only.length === 1) void use($, only[0]!) // Enter on a single match puts it in the prompt
            }}
          />
        )}
        <Box flexDirection="row" columnGap={3} flexWrap="wrap">
          {KINDS.map(([kind, label]) => (
            <Button
              key={`show:${kind}`}
              plain
              dimColor={!show[kind]}
              label={`${show[kind] ? '☑' : '☐'} ${label} ${count(kind)}`}
              onPress={() => void toggleKind(kind)}
            />
          ))}
        </Box>
        <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <Text dimColor wrap="truncate-end">
            {c.included < c.total ? `${c.included} of ${c.total} fit the listing · ` : ''}
            {`${tokens(c.tokens)} tokens`}
          </Text>
          {!isFiltering && groups.length > 1 && (
            <Button key="fold-all" plain dimColor label={allFolded ? 'expand all' : 'collapse all'} onPress={() => void foldAll()} />
          )}
        </Box>

        {groups.length === 0 && (
          <Box flexDirection="column" alignItems="center" marginY={1}>
            <Text dimColor>
              {isFiltering ? `Nothing matches “${q.trim()}”` : KINDS.every(([kind]) => !show[kind]) ? 'Tick a box above to see skills' : 'No skills here'}
            </Text>
          </Box>
        )}

        <Box flexDirection="column" gap={1}>
          {groups.map(g => {
            const { name, skills, plugin } = g
            const color = hue(name)
            const isOff = isGroupOff(g)
            const isShut = isFolded(g)
            const isBusy = plugin !== undefined && busy.has(plugin.id)
            const onCount = skills.filter(s => !s.isOff).length
            return (
              <Box key={`g:${name}`} flexDirection="column">
                <Box flexDirection="row" justifyContent="space-between">
                  <Box flexDirection="row" gap={1}>
                    <Text color={isOff ? undefined : color} dimColor={isOff}>
                      {isShut ? '▸' : '▾'}
                    </Text>
                    <Button key={`fold:${name}`} plain dimColor={isOff} label={name} onPress={() => toggleFold(name, isOff)} />
                    {isOff ? (
                      <Text dimColor>{skills.length > 0 ? `${skills.length} · disabled` : 'disabled'}</Text>
                    ) : (
                      <Text>
                        <Text color="inverseText" backgroundColor={color}>{` ${onCount} `}</Text>
                        {onCount < skills.length && <Text dimColor>{` +${skills.length - onCount} off`}</Text>}
                      </Text>
                    )}
                  </Box>
                  {plugin && (
                    <Button
                      key={`plugin:${plugin.id}`}
                      plain
                      dimColor={isOff || isBusy}
                      label={isBusy ? '◌ …' : plugin.enabled ? '● on' : '○ off'}
                      onPress={() => {
                        if (!isBusy) void switchPlugin($, plugin, !plugin.enabled)
                      }}
                    />
                  )}
                </Box>
                {!isShut &&
                  skills.map(s => {
                    const isDetailed = open.has(s.name)
                    const isSwitching = busy.has(s.name)
                    return (
                      <Box key={`s:${s.name}`} flexDirection="column">
                        <Box flexDirection="row" justifyContent="space-between">
                          <Box flexDirection="row">
                            <Text color={color} dimColor={s.isOff}>
                              {'│ '}
                            </Text>
                            <Button key={`more:${s.name}`} plain dimColor label={isDetailed ? '▾' : '▸'} onPress={() => toggleDetails(s.name)} />
                            <Text wrap="truncate-end">
                              {' '}
                              <Text bold={!s.isOff} dimColor={s.isOff} strikethrough={s.isOff && !isOff}>
                                {s.short}
                              </Text>
                            </Text>
                          </Box>
                          <Box flexDirection="row" columnGap={2}>
                            {s.canSwitch && (
                              <Button
                                key={`skill:${s.name}`}
                                plain
                                dimColor={s.isOff || isSwitching}
                                label={isSwitching ? '◌ …' : s.isOff ? '○ off' : '● on'}
                                onPress={() => {
                                  if (!isSwitching) void switchSkill($, s, s.isOff)
                                }}
                              />
                            )}
                            {!s.isOff && <Button key={`use:${s.name}`} plain dimColor label="use ↵" onPress={() => void use($, s)} />}
                          </Box>
                        </Box>
                        {!isDetailed && s.description !== '' && (
                          <Text wrap="truncate-end">
                            <Text color={color} dimColor={s.isOff}>
                              {'│ '}
                            </Text>
                            <Text dimColor>{s.description}</Text>
                          </Text>
                        )}
                        {isDetailed && (
                          <Box flexDirection="row">
                            <Text color={color} dimColor={s.isOff}>
                              {'│ '}
                            </Text>
                            <Box flexDirection="column" paddingLeft={2} flexShrink={1}>
                              <Text wrap="wrap">{s.description || '(no description)'}</Text>
                              <Text dimColor wrap="wrap">{`/${s.name}`}</Text>
                              <Text dimColor wrap="wrap">
                                {`from ${s.plugin ?? origin(s)}`}
                                {s.tokens > 0 ? ` · ${tokens(s.tokens)} tokens listed` : ''}
                              </Text>
                              <Text wrap="wrap">
                                <Text color={s.isOff ? 'error' : 'success'}>{s.isOff ? '○ off' : '● on'}</Text>
                                <Text dimColor>{` ${state(s)}`}</Text>
                              </Text>
                              {s.path && (
                                <Text dimColor wrap="truncate-start">
                                  {s.path}
                                </Text>
                              )}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    )
                  })}
              </Box>
            )
          })}
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text dimColor wrap="truncate-end">
            <Text color={ACCENT}>{'▸ '}</Text>
            {'details · use ↵ puts /skill in the prompt'}
          </Text>
          <Text dimColor wrap="truncate-end">
            <Text color={ACCENT}>{'● '}</Text>
            {'on / off switches a plugin or a skill'}
          </Text>
        </Box>
      </Box>
    )
  })
}

function Header({ Box, Text, right }: { Box: any; Text: any; right: string }) {
  return (
    <Box flexDirection="row" justifyContent="space-between">
      <Text wrap="truncate-end">
        <Text color={ACCENT}>{'✦ '}</Text>
        <Text bold>{TITLE}</Text>
      </Text>
      <Text dimColor wrap="truncate-start">
        {right}
      </Text>
    </Box>
  )
}

function origin(s: SkillEntry) {
  if (s.kind === 'claude') return 'Claude Code'
  if (s.kind === 'synced') return 'claude.ai'
  return `${s.group} skills`
}

// What the switch means for this skill, in a few words.
function state(s: SkillEntry) {
  if (!s.isOff) return s.override && s.override !== 'on' ? `listed (${s.override})` : 'listed for Claude, /command works'
  if (!s.canSwitch) return 'its plugin is disabled'
  if (s.override === 'user-invocable-only') return 'hidden from Claude, /command still works'
  return 'hidden from Claude and from / (skillOverrides)'
}

async function open($: EngineInterface, isAsked = false) {
  await $.ui.open(isAsked ? { id: PANE, title: TITLE, focus: true, columns: 48 } : { id: PANE, title: TITLE, columns: 48 })
  await update($, isOpen, () => true)
  if (isAsked) await $.store.set('isClosedByHand', false).catch(() => {})
}

async function use($: EngineInterface, s: SkillEntry) {
  await $.prompt.fill({ text: `/${s.name} `, mode: 'replace' })
  $.ui.toast(`/${s.name} is in the prompt`)
}

// Enables or disables a plugin the way `claude plugin enable|disable` does (it writes the
// settings), then has the session reload its plugins so the skill listing follows.
async function switchPlugin($: EngineInterface, plugin: PluginRow, enabled: boolean) {
  const verb = enabled ? 'enable' : 'disable'
  await update($, pending, list => [...list, plugin.id])
  try {
    const r = await $.process.run(['claude', 'plugin', verb, plugin.id, '--json'], { timeoutMs: CLI_TIMEOUT })
    const said = lastJson(r.stdout) as { outcome?: string; message?: string } | undefined
    if (r.exitCode !== 0 || said?.outcome !== 'ok') {
      $.ui.toast(`Could not ${verb} ${plugin.name}: ${said?.message ?? (firstLine(r.stderr) || `exit ${r.exitCode}`)}`)
      return
    }
    await update($, plugins, list => list.map(p => (p.id === plugin.id ? { ...p, enabled } : p)))
  } catch (error) {
    $.ui.toast(`Could not ${verb} ${plugin.name}: ${String(error)}`)
    return
  } finally {
    await update($, pending, list => list.filter(id => id !== plugin.id))
  }
  $.ui.toast(`${plugin.name} ${enabled ? 'enabled' : 'disabled'}`)
  const isReloaded = await $.command
    .run({ command: 'reload-plugins' })
    .then(() => true)
    .catch(() => false)
  if (!isReloaded) $.ui.toast('Run /reload-plugins to apply it')
  await reloadAll($).catch(() => {})
}

// Turns one skill on or off through skillOverrides in the user settings (what /skills writes,
// kept for every project of this account): off hides it from Claude and from `/`.
async function switchSkill($: EngineInterface, s: SkillEntry, on: boolean) {
  await update($, pending, list => [...list, s.name])
  try {
    const path = `${await configDir($)}/settings.json`
    const text = (await $.fs.exists(path)) ? await $.fs.read(path) : '{}'
    let settings: Record<string, unknown>
    try {
      settings = JSON.parse(text) as Record<string, unknown>
    } catch {
      $.ui.toast(`Could not read ${path}: it is not plain JSON`)
      return
    }
    const next = { ...((settings.skillOverrides as Record<string, string> | undefined) ?? {}) }
    if (on) delete next[s.name]
    else next[s.name] = 'off'
    const { skillOverrides: _, ...rest } = settings
    await $.fs.write(path, `${JSON.stringify(Object.keys(next).length > 0 ? { ...rest, skillOverrides: next } : rest, null, 2)}\n`)
    await update($, overrides, o => {
      const copy = { ...o }
      if (on) delete copy[s.name]
      else copy[s.name] = 'off'
      return copy
    })
    $.ui.toast(`${s.short} ${on ? 'on' : 'off'}`)
  } catch (error) {
    $.ui.toast(`Could not switch ${s.short}: ${String(error)}`)
    return
  } finally {
    await update($, pending, list => list.filter(x => x !== s.name))
  }
  await new Promise(done => (globalThis as any).setTimeout(done, SETTLE_MS))
  await refresh($).catch(() => {})
}

async function reloadAll($: EngineInterface) {
  await refreshPlugins($).catch(() => {})
  await scanDisk($).catch(() => {})
  await refresh($)
}

async function refreshPlugins($: EngineInterface) {
  const r = await $.process.run(['claude', 'plugin', 'list', '--json'], { timeoutMs: CLI_TIMEOUT })
  if (r.exitCode !== 0) return
  const rows = toPlugins(lastJson(r.stdout))
  await update($, plugins, () => rows)
}

// The SKILL.md files the pane can show while their skills are off: each plugin's skills/
// folder, your own skills folder, and the skills claude.ai syncs on their own.
async function scanDisk($: EngineInterface) {
  const found: DiskSkill[] = []
  const readDir = async (dir: string, name: (folder: string, fm: { name?: string }) => string, extra: Partial<DiskSkill>) => {
    const entries = await $.fs.list(dir).catch(() => [])
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.kind === 'file') continue
      const path = `${dir}/${entry.name}/SKILL.md`
      const text = await $.fs.read(path).catch(() => undefined)
      if (text === undefined) continue
      const fm = frontmatter(text)
      found.push({ name: name(entry.name, fm), description: fm.description ?? '', path, ...extra })
    }
  }
  for (const p of await read($, plugins)) {
    if (p.installPath) await readDir(`${p.installPath}/skills`, (folder, fm) => `${p.name}:${fm.name ?? folder}`, { plugin: p.id })
  }
  const dir = await configDir($)
  await readDir(`${dir}/skills`, (folder, fm) => (folder === 'synced' ? '' : (fm.name ?? folder)), {})
  for (const bucket of await $.fs.list(`${dir}/skills/synced`).catch(() => [])) {
    if (!bucket.name.startsWith('.') && bucket.kind !== 'file') {
      await readDir(`${dir}/skills/synced/${bucket.name}`, (folder, fm) => `${SYNCED_SKILLS}:${fm.name ?? folder}`, { isSynced: true })
    }
  }
  await update($, disk, () => found.filter(d => d.name !== ''))
}

// The skill listing from /context's breakdown (estimated locally), each named skill joined
// with the one line the slash-command typeahead shows for it, plus what is off.
async function refresh($: EngineInterface) {
  const [usage, commands, settings] = await Promise.all([
    $.session.usage({ breakdown: 'summary' }),
    $.command.list().catch(() => []),
    $.settings.read().catch(() => ({})),
  ])
  const set = ((settings as { skillOverrides?: Record<string, string> }).skillOverrides ?? {}) as Record<string, string>
  await update($, overrides, () => set)
  const known = ((await $.store.get('known').catch(() => undefined)) ?? {}) as Known
  const next = toCatalog({
    listing: usage.context.breakdown?.skills,
    commands,
    plugins: await read($, plugins),
    disk: await read($, disk),
    overrides: set,
    known,
  })
  await update($, catalog, () => next)
  await $.store.set('known', remember(known, next.skills)).catch(() => {})
}

async function configDir($: EngineInterface) {
  return (await $.env.get('CLAUDE_CONFIG_DIR')) ?? `${(await $.env.get('HOME')) ?? ''}/.claude`
}

function firstLine(text: string) {
  return text.trim().split('\n')[0] ?? ''
}

