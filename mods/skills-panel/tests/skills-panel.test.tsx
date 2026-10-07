import { describe, expect, test } from 'claude-code/testing'

import { filter, frontmatter, grouped, hue, sections, toCatalog, toPlugins } from '../hooks/catalog'

const PANE = { component: 'Pane', requestId: 'skills-panel', props: { title: 'Skills', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 80 }, view: {} } }
const CONFIG = '/cfg'
const SETTINGS = `${CONFIG}/settings.json`

// The skill listing as /context's breakdown hands it over, when everything is on.
const FRONTMATTER = [
  { name: 'superpowers:brainstorming', source: 'plugin', pluginName: 'superpowers', tokens: 400 },
  { name: 'superpowers:systematic-debugging', source: 'plugin', pluginName: 'superpowers', tokens: 300 },
  { name: 'figma:figma-use', source: 'plugin', pluginName: 'figma', tokens: 100 },
  { name: 'unity:unity-cli', source: 'plugin', pluginName: 'unity', tokens: 100 },
  { name: 'anthropic-skills:pdf', source: 'syncedSkills', tokens: 100 },
  { name: 'my-notes', source: 'userSettings', tokens: 200 },
  { name: 'deploy', source: 'projectSettings', tokens: 500 },
  { name: 'simplify', source: 'built-in', tokens: 400 },
]
const listing = (skills = FRONTMATTER) => ({ totalSkills: skills.length, includedSkills: skills.length, tokens: 2_000, skillFrontmatter: skills })
const COMMANDS = [
  { name: 'superpowers:brainstorming', description: 'Explores intent and design\n  before building', source: 'plugin' },
  { name: 'superpowers:systematic-debugging', description: 'Finds the root cause of a bug', source: 'plugin' },
  { name: 'figma:figma-use', description: 'Works on Figma files', source: 'plugin' },
  { name: 'unity:unity-cli', description: 'Drives the Unity CLI', source: 'plugin' },
  { name: 'my-notes', description: 'Keeps my notes tidy', source: 'user' },
  { name: 'deploy', description: 'Ships the project', source: 'user' },
  { name: 'simplify', description: 'Cleans up changed code', source: 'builtin' },
  { name: 'help', description: 'Shows help', source: 'builtin' },
]
const PLUGINS = [
  { id: 'superpowers@anthropic-plugin-directory', enabled: true, scope: 'user', installPath: '/p/superpowers' },
  { id: 'figma@synced', enabled: true, scope: 'synced', installPath: '/p/figma' },
  { id: 'unity@synced', enabled: false, scope: 'synced', installPath: '/p/unity' },
]
const md = (name: string, description: string) => `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`
// The files the pane reads: each plugin's skills/ folder and the user's own skills folder.
const FILES: Record<string, string> = {
  '/p/superpowers/skills/brainstorming/SKILL.md': md('brainstorming', 'Explores intent and design before building'),
  '/p/superpowers/skills/systematic-debugging/SKILL.md': md('systematic-debugging', 'Finds the root cause of a bug'),
  '/p/figma/skills/figma-use/SKILL.md': md('figma-use', 'Works on Figma files'),
  '/p/unity/skills/unity-cli/SKILL.md': md('unity-cli', '"Drives the Unity CLI: \\"editor\\" and builds"'),
  [`${CONFIG}/skills/my-notes/SKILL.md`]: md('my-notes', 'Keeps my notes tidy'),
}

// Stands for the engine beneath the mod: the plugin CLI keeps its own enabled flags, the
// settings file its skillOverrides, and the listing drops whatever either turns off.
function engine(on: any, opts: { store?: Record<string, unknown>; refuse?: boolean; settings?: object } = {}) {
  const store = opts.store ?? {}
  const files: Record<string, string> = { ...FILES, ...(opts.settings ? { [SETTINGS]: JSON.stringify(opts.settings) } : {}) }
  const opened: unknown[] = []
  const filled: string[] = []
  const ran: string[][] = []
  const reloads: unknown[] = []
  const state = PLUGINS.map(p => ({ ...p }))
  const overrides = () => (files[SETTINGS] ? (JSON.parse(files[SETTINGS]).skillOverrides ?? {}) : {}) as Record<string, string>
  const children = (dir: string) => [
    ...new Set(
      Object.keys(files)
        .filter(f => f.startsWith(`${dir}/`))
        .map(f => f.slice(dir.length + 1).split('/')[0]!),
    ),
  ]
  on('session.start', (_$: any, e: any) => ({ sessionId: 's', cwd: e.cwd }))
  on('command.register', () => ({ value: undefined }))
  on('command.list', () => ({ value: COMMANDS }))
  on('command.run', { command: 'reload-plugins' }, (_$: any, e: any) => (reloads.push(e), { text: 'Reloaded' }))
  on('store.get', (_$: any, e: any) => ({ value: store[e.key] }))
  on('store.set', (_$: any, e: any) => ((store[e.key] = e.value), { value: undefined }))
  on('env.get', (_$: any, e: any) => ({ value: e.name === 'CLAUDE_CONFIG_DIR' ? CONFIG : '/home/me' }))
  on('settings.read', () => ({ value: { skillOverrides: overrides() } }))
  on('fs.exists', (_$: any, e: any) => ({ value: e.path in files }))
  on('fs.read', (_$: any, e: any) => {
    if (!(e.path in files)) throw new Error(`ENOENT ${e.path}`)
    return { value: files[e.path] }
  })
  on('fs.write', (_$: any, e: any) => ((files[e.path] = e.text), { value: undefined }))
  on('fs.list', (_$: any, e: any) => ({
    value: children(e.path).map(name => ({ name, kind: `${e.path}/${name}` in files ? 'file' : 'dir', size: 0, mtimeMs: 0, isLink: false })),
  }))
  on('ui.open', (_$: any, e: any) => (opened.push(e), { value: undefined }))
  on('prompt.fill', (_$: any, e: any) => (filled.push(e.text), { isFilled: true }))
  on('ui.toast', () => ({ value: undefined }))
  on('process.run', (_$: any, e: any) => {
    const argv: string[] = [...e.argv]
    ran.push(argv)
    const [, , verb, id] = argv
    const out = (exitCode: number, body: unknown) => ({ value: { exitCode, stdout: JSON.stringify(body), stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
    if (verb === 'list') return out(0, state)
    if (opts.refuse) return out(1, { outcome: 'error', message: 'nope' })
    for (const p of state) if (p.id === id) p.enabled = verb === 'enable'
    return out(0, { outcome: 'ok' })
  })
  on('session.usage', () => {
    const off = new Set(state.filter(p => !p.enabled).map(p => p.id.split('@')[0]))
    const hidden = overrides()
    const skills = FRONTMATTER.filter(f => !(f.pluginName && off.has(f.pluginName)) && hidden[f.name] !== 'off')
    return { value: { startedAt: 0, context: { tokens: 1, window: 10, percent: 10, breakdown: { categories: [], skills: listing(skills) } }, rateLimits: {}, cost: { usd: 0 } } }
  })
  return { opened, filled, ran, reloads, store, files }
}

const wait = (ms: number) => new Promise(done => (globalThis as any).setTimeout(done, ms))
const settle = () => wait(40) // the first refresh runs in the background
const SWITCH_SETTLE = 1_000 // a skill switch waits for the engine to apply the settings

async function started($: any, on: any, opts?: Parameters<typeof engine>[1]) {
  const world = engine(on, opts)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)
  await settle()
  return world
}
const mount = ($: any) => $.ui.mount({ plugin: 'skills-panel', surface: 'terminal', ...PANE } as any)
const text = async (pane: any, re: RegExp) => pane.find({ type: 'Text', text: re })
const button = async (pane: any, key: string) => (await pane.find({ type: 'Button', key }))?.text as string | undefined

describe('skills-panel', () => {
  test('helpers', () => {
    expect(frontmatter(md('a', 'plain words'))).toEqual({ name: 'a', description: 'plain words' })
    expect(frontmatter('---\nname: b\ndescription: "quoted: \\"yes\\""\n---\n')).toEqual({ name: 'b', description: 'quoted: "yes"' })
    expect(frontmatter('---\nname: c\ndescription: >\n  folded\n  block\n---\n')).toEqual({ name: 'c', description: 'folded block' })
    expect(frontmatter('no frontmatter')).toEqual({})

    const rows = toPlugins(PLUGINS)
    expect(rows.map(p => [p.name, p.isSynced, p.enabled])).toEqual([
      ['superpowers', false, true],
      ['figma', true, true],
      ['unity', true, false],
    ])
    const on = FRONTMATTER.filter(f => f.pluginName !== 'unity' && f.name !== 'simplify')
    const disk = [
      { name: 'unity:unity-cli', description: 'Drives the Unity CLI', path: '/p/unity/skills/unity-cli/SKILL.md', plugin: 'unity@synced' },
      { name: 'my-notes', description: 'Keeps my notes tidy', path: '/cfg/skills/my-notes/SKILL.md' },
    ]
    const c = toCatalog({
      listing: listing(on),
      commands: COMMANDS,
      plugins: rows,
      disk,
      overrides: { simplify: 'off' },
      known: { simplify: { description: 'Cleans up changed code', group: 'claude code', kind: 'claude' } },
    })
    expect(c.skills.map(s => `${s.name}/${s.group}/${s.kind}/${s.isOff ? 'off' : 'on'}/${s.canSwitch ? 'switch' : '-'}`)).toEqual([
      'superpowers:brainstorming/superpowers/installed/on/-',
      'superpowers:systematic-debugging/superpowers/installed/on/-',
      'figma:figma-use/figma/synced/on/-',
      'anthropic-skills:pdf/anthropic-skills/synced/on/switch',
      'my-notes/personal/installed/on/switch',
      'deploy/project/installed/on/switch',
      'unity:unity-cli/unity/synced/off/-', // its plugin is disabled: read from disk
      'simplify/claude code/claude/off/switch', // hidden by skillOverrides: from what was seen before
    ])
    expect(c.skills.find(s => s.name === 'my-notes')?.path).toBe('/cfg/skills/my-notes/SKILL.md')
    expect(c.skills[0]!.description).toBe('Explores intent and design before building') // one line
    // Your own skills first, then by name, then anthropic-skills and Claude Code's last; off skills after on ones.
    expect(grouped(c.skills).map(([g]) => g)).toEqual(['personal', 'project', 'figma', 'superpowers', 'unity', 'anthropic-skills', 'claude code'])
    expect(filter(c.skills, 'root BUG').map(s => s.short)).toEqual(['systematic-debugging'])
    expect(hue('superpowers')).toBe(hue('superpowers'))
    expect(toCatalog({ listing: undefined, commands: [] }).skills).toEqual([])
    expect(toPlugins('not json')).toEqual([])

    const all = { installed: true, synced: true, claude: true }
    const unity = sections(c.skills, rows, all, '').find(g => g.name === 'unity')
    expect(unity?.skills.map(s => s.short)).toEqual(['unity-cli'])
    expect(unity?.plugin?.enabled).toBe(false)
    expect(sections(c.skills, rows, { ...all, synced: false }, '').some(g => g.name === 'unity')).toBe(false)
  })

  test('opens at start and lists the skills grouped, with descriptions', async ($, on) => {
    const { opened } = await started($, on)
    expect(opened.length).toBe(1)
    const pane = await mount($)
    expect(await text(pane, /7 on · 1 off/)).toBeDefined() // unity's skill is off
    expect(await button(pane, 'fold:superpowers')).toBeDefined()
    expect(await text(pane, /^brainstorming$/)).toBeDefined()
    expect(await text(pane, /Finds the root cause/)).toBeDefined()
    expect(await text(pane, /Shows help/)).toBeUndefined() // a command, not a skill
    await pane.unmount()
  })

  test('filters as you type, folds a group, and puts a skill in the prompt', async ($, on) => {
    const { filled } = await started($, on)
    const pane = await mount($)
    await pane.press({ key: 'fold:superpowers' })
    expect(await text(pane, /^brainstorming$/)).toBeUndefined()
    await pane.press({ key: 'fold:superpowers' })
    expect(await text(pane, /^brainstorming$/)).toBeDefined()

    await pane.input({ key: 'filter', text: 'deploy', kind: 'change' })
    expect(await text(pane, /1 of 8/)).toBeDefined()
    await pane.input({ key: 'filter', text: 'nothing-like-this', kind: 'change' })
    expect(await text(pane, /Nothing matches/)).toBeDefined()

    await pane.input({ key: 'filter', text: '', kind: 'change' })
    await pane.press({ key: 'use:superpowers:brainstorming' })
    expect(filled).toEqual(['/superpowers:brainstorming '])
    await pane.input({ key: 'filter', text: 'tidy' }) // Enter on a single match uses it
    expect(filled.at(-1)).toBe('/my-notes ')
    await pane.unmount()
  })

  test('three boxes show or hide installed, claude.ai and Claude Code skills, and the choice is kept', async ($, on) => {
    const { store } = await started($, on)
    const pane = await mount($)
    expect(await button(pane, 'show:installed')).toMatch(/☑ Installed 4/)
    expect(await button(pane, 'show:synced')).toMatch(/☑ claude\.ai 3/)
    expect(await button(pane, 'show:claude')).toMatch(/☑ Claude Code 1/)

    await pane.press({ key: 'show:synced' })
    expect(await button(pane, 'show:synced')).toMatch(/☐ claude\.ai/)
    expect(await text(pane, /^figma-use$/)).toBeUndefined()
    expect(await button(pane, 'fold:unity')).toBeUndefined()
    expect(await text(pane, /5 of 8/)).toBeDefined()
    expect(store.shown).toEqual({ installed: true, synced: false, claude: true })

    await pane.press({ key: 'show:claude' })
    await pane.press({ key: 'show:installed' })
    expect(await text(pane, /Tick a box above/)).toBeDefined()
    await pane.unmount()
  })

  test('a disabled plugin stays browsable: folded, then its skills and their details from disk', async ($, on) => {
    await started($, on)
    const pane = await mount($)
    expect(await text(pane, /^1 · disabled$/)).toBeDefined()
    expect(await text(pane, /^unity-cli$/)).toBeUndefined() // folded until asked
    await pane.press({ key: 'fold:unity' })
    expect(await text(pane, /^unity-cli$/)).toBeDefined()
    expect(await button(pane, 'use:unity:unity-cli')).toBeUndefined() // nothing to use while off
    expect(await button(pane, 'skill:unity:unity-cli')).toBeUndefined() // its plugin's switch decides

    await pane.press({ key: 'more:unity:unity-cli' })
    expect(await text(pane, /Drives the Unity CLI: "editor" and builds/)).toBeDefined()
    expect(await text(pane, /^from unity@synced$/)).toBeDefined()
    expect(await text(pane, /its plugin is disabled/)).toBeDefined()
    expect(await text(pane, /\/p\/unity\/skills\/unity-cli\/SKILL\.md/)).toBeDefined()
    await pane.press({ key: 'more:unity:unity-cli' })
    expect(await text(pane, /\/p\/unity\/skills/)).toBeUndefined()
    await pane.unmount()
  })

  test('a skill of its own switches off and on through skillOverrides in the user settings', async ($, on) => {
    const { files } = await started($, on, { settings: { model: 'opus' } })
    const pane = await mount($)
    expect(await button(pane, 'skill:my-notes')).toMatch(/● on/)
    expect(await button(pane, 'skill:superpowers:brainstorming')).toBeUndefined() // a plugin's skill: the plugin switch

    await pane.press({ key: 'skill:my-notes' })
    await wait(SWITCH_SETTLE)
    expect(JSON.parse(files[SETTINGS]!)).toEqual({ model: 'opus', skillOverrides: { 'my-notes': 'off' } })
    expect(await button(pane, 'skill:my-notes')).toMatch(/○ off/)
    expect(await text(pane, /^my-notes$/)).toBeDefined() // still listed, dimmed
    expect(await button(pane, 'use:my-notes')).toBeUndefined()
    await pane.press({ key: 'more:my-notes' })
    expect(await text(pane, /hidden from Claude and from \//)).toBeDefined()

    await pane.press({ key: 'skill:my-notes' })
    await wait(SWITCH_SETTLE)
    expect(JSON.parse(files[SETTINGS]!)).toEqual({ model: 'opus' })
    expect(await button(pane, 'skill:my-notes')).toMatch(/● on/)
    await pane.unmount()
  })

  test('a built-in skill turned off is still shown from what the pane saw of it', async ($, on) => {
    await started($, on, { store: { known: { simplify: { description: 'Cleans up changed code', group: 'claude code', kind: 'claude' } } }, settings: { skillOverrides: { simplify: 'off' } } })
    const pane = await mount($)
    expect(await button(pane, 'skill:simplify')).toMatch(/○ off/)
    expect(await text(pane, /Cleans up changed code/)).toBeDefined()
    await pane.unmount()
  })

  test('a plugin switches off and on through the CLI, then the session reloads its plugins', async ($, on) => {
    const { ran, reloads } = await started($, on)
    const pane = await mount($)
    expect(await button(pane, 'plugin:figma@synced')).toMatch(/● on/)
    expect(await button(pane, 'plugin:unity@synced')).toMatch(/○ off/)

    await pane.press({ key: 'plugin:figma@synced' })
    await settle()
    expect(ran).toContainEqual(['claude', 'plugin', 'disable', 'figma@synced', '--json'])
    expect(reloads.length).toBe(1)
    expect(await button(pane, 'plugin:figma@synced')).toMatch(/○ off/)
    await pane.press({ key: 'fold:figma' })
    expect(await text(pane, /^figma-use$/)).toBeDefined() // browsable while off

    await pane.press({ key: 'plugin:unity@synced' })
    await settle()
    expect(ran).toContainEqual(['claude', 'plugin', 'enable', 'unity@synced', '--json'])
    expect(await button(pane, 'plugin:unity@synced')).toMatch(/● on/)
    expect(await button(pane, 'use:unity:unity-cli')).toBeDefined()
    await pane.unmount()
  })

  test('a refused switch leaves the plugin as it was', async ($, on) => {
    const { reloads } = await started($, on, { refuse: true })
    const pane = await mount($)
    await pane.press({ key: 'plugin:superpowers@anthropic-plugin-directory' })
    await settle()
    expect(reloads.length).toBe(0)
    expect(await button(pane, 'plugin:superpowers@anthropic-plugin-directory')).toMatch(/● on/)
    await pane.unmount()
  })

  test('closed by hand, it stays closed next session; /skills-panel opens it again', async ($, on) => {
    const { opened, store } = await started($, on, { store: { isClosedByHand: true } })
    expect(opened.length).toBe(0)
    expect((await $.command.run({ command: 'skills-panel', args: '' } as any)).text).toBe('Skills pane open')
    expect(opened.length).toBe(1)
    expect(store.isClosedByHand).toBe(false)
  })
})
