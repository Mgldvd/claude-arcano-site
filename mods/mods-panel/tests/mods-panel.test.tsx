import { describe, expect, test } from 'claude-code/testing'

const PANE = { component: 'Pane', requestId: 'mods-panel', props: { title: 'Mods', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 80 }, view: {} } }

// Stands for the machine: the mods folder beside this plugin, the session's hot-reload folder
// (its links), and the plugin CLI's installed list.
function engine(on: any, opts: { refuse?: boolean } = {}) {
  const world = { ran: [] as string[][], reloads: 0, toasts: [] as string[], links: new Set(['clean-view', 'mods-panel']), installed: [] as { id: string; enabled: boolean }[] }
  let root = ''
  let modsDir = ''
  const live = '/cfg/dev-mods/s1'
  const manifest = (name: string, description: string) => JSON.stringify({ name, version: '0.1.0', description })
  const files = () => ({
    [`${modsDir}/clean-view/.claude-plugin/plugin.json`]: manifest('clean-view', 'A calm view'),
    [`${modsDir}/files-panel/.claude-plugin/plugin.json`]: manifest('files-panel', 'Project files as a tree'),
    [`${modsDir}/model-switch/.claude-plugin/plugin.json`]: manifest('model-switch', 'Model and effort, one click each'),
    [`${modsDir}/mods-panel/.claude-plugin/plugin.json`]: manifest('mods-panel', 'This pane'),
  })
  world.installed = [
    { id: 'files-panel@claude-mods', enabled: true },
    { id: 'model-switch@claude-mods', enabled: false },
    { id: 'superpowers@anthropic-plugin-directory', enabled: true },
  ]
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 's1' }))
  on('command.register', () => ({ value: undefined }))
  on('command.run', { command: 'reload-plugins' }, () => ((world.reloads += 1), { text: 'Reloaded' }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('env.get', (_$: any, e: any) => ({ value: e.name === 'CLAUDE_CONFIG_DIR' ? '/cfg' : '/home/me' }))
  on('ui.open', () => ({ value: undefined }))
  on('ui.toast', (_$: any, e: any) => (world.toasts.push(e.text), { value: undefined }))
  on('fs.stat', (_$: any, e: any) => {
    if (e.path.startsWith(`${live}/`)) {
      if (!world.links.has(e.path.slice(live.length + 1))) throw new Error('ENOENT')
      return { value: { kind: 'dir', size: 0, mtimeMs: 0, isLink: true } }
    }
    root = e.path // the plugin's own folder, asked first
    modsDir = root.slice(0, root.lastIndexOf('/'))
    return { value: { kind: 'dir', size: 0, mtimeMs: 0, isLink: false, ...(e.resolve ? { realPath: e.path } : {}) } }
  })
  on('fs.exists', (_$: any, e: any) => ({ value: e.path === live }))
  on('fs.list', (_$: any, e: any) => {
    if (e.path === live) return { value: [...world.links].map(name => ({ name, kind: 'other', size: 0, mtimeMs: 0, isLink: true })) }
    return { value: ['clean-view', 'files-panel', 'model-switch', 'mods-panel', 'notes', '.claude-plugin'].map(name => ({ name, kind: 'dir', size: 0, mtimeMs: 0, isLink: false })) }
  })
  on('fs.read', (_$: any, e: any) => {
    const f = files() as Record<string, string>
    if (!(e.path in f)) throw new Error(`ENOENT ${e.path}`)
    return { value: f[e.path] }
  })
  on('process.run', (_$: any, e: any) => {
    const argv: string[] = [...e.argv]
    world.ran.push(argv)
    const out = (exitCode: number, body: unknown, stderr = '') => ({ value: { exitCode, stdout: typeof body === 'string' ? body : JSON.stringify(body), stderr, isStdoutTruncated: false, isStderrTruncated: false } })
    if (argv[0] === 'ln') return world.links.add(argv[3]!.split('/').pop()!), out(0, '')
    if (argv[0] === 'rm') return world.links.delete(argv[1]!.split('/').pop()!), out(0, '')
    const [, , verb, id] = argv
    if (verb === 'list') return out(0, world.installed)
    if (opts.refuse) return out(1, { outcome: 'error', message: 'not allowed here' })
    for (const p of world.installed) if (p.id === id) p.enabled = verb === 'enable'
    return out(0, { outcome: 'ok' })
  })
  return world
}

const wait = (ms: number) => new Promise(done => (globalThis as any).setTimeout(done, ms))
async function started($: any, on: any, opts?: Parameters<typeof engine>[1]) {
  const world = engine(on, opts)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/w' } as any)
  await wait(40) // the first read runs in the background
  return world
}
const mount = ($: any) => $.ui.mount({ plugin: 'mods-panel', surface: 'terminal', ...PANE } as any)
const label = async (pane: any, key: string) => (await pane.find({ type: 'Button', key }))?.text as string | undefined

describe('mods-panel', () => {
  test('lists the mods with where each is loaded, and no switch for itself', async ($, on) => {
    await started($, on)
    const pane = await mount($)
    expect(await pane.find({ type: 'Text', text: /3 on · 1 off/ })).toBeDefined()
    expect(await label(pane, 'switch:clean-view')).toBe('● on')
    expect(await label(pane, 'switch:files-panel')).toBe('● on')
    expect(await label(pane, 'switch:model-switch')).toBe('○ off')
    expect(await label(pane, 'switch:mods-panel')).toBeUndefined()
    expect(await pane.find({ type: 'Text', text: /this pane/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /live in this session/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /installed, disabled/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /notes/ })).toBeUndefined() // no plugin.json
    await pane.unmount()
  })

  test('a live mod is unlinked and linked again, and the plugins reload', async ($, on) => {
    const world = await started($, on)
    const pane = await mount($)
    await pane.press({ key: 'switch:clean-view' })
    expect(world.ran.some(a => a[0] === 'rm' && a[1] === '/cfg/dev-mods/s1/clean-view')).toBe(true)
    expect(world.reloads).toBe(1)
    expect(await label(pane, 'switch:clean-view')).toBe('○ off')
    await pane.press({ key: 'switch:clean-view' })
    expect(world.ran.some(a => a[0] === 'ln' && a[1] === '-s' && a[2]!.endsWith('/clean-view') && a[3] === '/cfg/dev-mods/s1/clean-view')).toBe(true)
    expect(await label(pane, 'switch:clean-view')).toBe('● on')
    expect(world.toasts).toEqual(['clean-view off', 'clean-view on'])
    await pane.unmount()
  })

  test('an installed mod is disabled and enabled through the plugin CLI', async ($, on) => {
    const world = await started($, on)
    const pane = await mount($)
    await pane.press({ key: 'switch:files-panel' })
    expect(world.ran).toContainEqual(['claude', 'plugin', 'disable', 'files-panel@claude-mods', '--json'])
    expect(await label(pane, 'switch:files-panel')).toBe('○ off')
    await pane.press({ key: 'switch:model-switch' })
    expect(world.ran).toContainEqual(['claude', 'plugin', 'enable', 'model-switch@claude-mods', '--json'])
    expect(await label(pane, 'switch:model-switch')).toBe('● on')
    await pane.unmount()
  })

  test('a refused switch says why and changes nothing', async ($, on) => {
    const world = await started($, on, { refuse: true })
    const pane = await mount($)
    await pane.press({ key: 'switch:files-panel' })
    expect(world.toasts.at(-1)).toBe('Could not switch files-panel: not allowed here')
    expect(world.reloads).toBe(0)
    expect(await label(pane, 'switch:files-panel')).toBe('● on')
    await pane.unmount()
  })
})
