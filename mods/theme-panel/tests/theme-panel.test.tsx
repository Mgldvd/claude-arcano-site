import { describe, expect, test } from 'claude-code/testing'

const PANE = { component: 'Pane', requestId: 'theme-panel', props: { title: 'Themes', isFocused: true, bodyColumns: 36, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} } }
const OPTIONS = ['auto', 'dark', 'light', 'dark-daltonized', 'light-ansi']
const DIR = '/cfg/themes'
const PROXY = `${DIR}/theme-panel.json`
const SETTINGS = '/cfg/settings.json'
const DRACULA = { name: 'Dracula', base: 'dark', overrides: { claude: '#ff79c6', text: '#f8f8f2' } }

// Stands for the engine: the settings file, the custom themes folder, the /config theme row,
// and what `/config theme=`, `/theme` and $.config.set do.
function engine(on: any, opts: { saved?: string; isLocked?: boolean; refuse?: string } = {}) {
  const world = {
    shorthand: [] as string[],
    opened: 0,
    sets: [] as string[],
    toasts: [] as string[],
    files: {
      [SETTINGS]: JSON.stringify({ theme: opts.saved ?? 'dark' }),
      [`${DIR}/dracula.json`]: JSON.stringify(DRACULA),
      [`${DIR}/monokai.json`]: JSON.stringify({ name: 'Monokai', base: 'dark', overrides: { claude: '#fd971f' } }),
    } as Record<string, string>,
  }
  const saved = () => JSON.parse(world.files[SETTINGS]!).theme as string
  const proxy = () => JSON.parse(world.files[PROXY] ?? 'null')
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: undefined }))
  on('command.run', { command: 'config' }, (_$: any, e: any) => {
    world.shorthand.push(e.args)
    if (opts.refuse) return { text: opts.refuse }
    const value = e.args.split('=')[1]
    if (!OPTIONS.includes(value)) return { text: `Theme takes one of: ${OPTIONS.join(', ')}. For custom themes, use /theme.` }
    world.files[SETTINGS] = JSON.stringify({ theme: value })
    return { text: `Set Theme to ${value}` }
  })
  on('command.run', { command: 'theme' }, () => ((world.opened += 1), { text: '' }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('ui.open', () => ({ value: undefined }))
  on('ui.toast', (_$: any, e: any) => (world.toasts.push(e.text), { value: undefined }))
  on('clock.every', () => new Promise(() => {})) // the watch's periods never come in a test
  on('env.get', (_$: any, e: any) => ({ value: e.name === 'CLAUDE_CONFIG_DIR' ? '/cfg' : '/home/me' }))
  on('fs.list', (_$: any, e: any) => ({
    value: Object.keys(world.files)
      .filter(path => path.startsWith(`${e.path}/`))
      .map(path => ({ name: path.slice(e.path.length + 1), kind: 'file', size: 1, mtimeMs: 0, isLink: false })),
  }))
  on('fs.read', (_$: any, e: any) => {
    if (!(e.path in world.files)) throw new Error(`ENOENT ${e.path}`)
    return { value: world.files[e.path] }
  })
  on('fs.write', (_$: any, e: any) => ((world.files[e.path] = e.text), { value: undefined }))
  on('config.list', () => ({
    value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: saved(), options: OPTIONS, provider: { plugin: 'engine', tier: 'core' }, isLocked: opts.isLocked === true }],
  }))
  on('config.set', (_$: any, e: any) => {
    if (opts.refuse) return { deny: opts.refuse }
    world.sets.push(e.value)
    return { value: e.value }
  })
  return { world, saved, proxy }
}

const wait = (ms: number) => new Promise(done => (globalThis as any).setTimeout(done, ms))
async function started($: any, on: any, opts?: Parameters<typeof engine>[1]) {
  const w = engine(on, opts)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/w' } as any)
  await wait(20) // the first read runs in the background
  return w
}
const mount = ($: any) => $.ui.mount({ plugin: 'theme-panel', surface: 'terminal', ...PANE } as any)
const label = async (pane: any, value: string) => (await pane.find({ type: 'Button', key: `theme:${value}` }))?.text as string | undefined

describe('theme-panel', () => {
  test('lists the custom themes by their names and the built-in ones, and marks the one in use', async ($, on) => {
    await started($, on)
    const pane = await mount($)
    expect(await label(pane, 'custom:dracula')).toBe('○ Dracula')
    expect(await label(pane, 'custom:monokai')).toBe('○ Monokai')
    expect(await label(pane, 'dark')).toBe('● Dark')
    expect(await label(pane, 'dark-daltonized')).toBe('○ Dark, colorblind-friendly')
    expect(await label(pane, 'custom:theme-panel')).toBeUndefined() // the pane's own stands in for the others
    expect(await pane.find({ type: 'Text', text: /Colors of this theme/ })).toBeDefined()
    await pane.unmount()
  })

  test('a built-in theme goes through /config theme=, which repaints at once', async ($, on) => {
    const { world, saved } = await started($, on)
    const pane = await mount($)
    await pane.press({ key: 'theme:light' })
    expect(world.shorthand).toEqual(['theme=light'])
    expect(world.sets).toEqual([]) // not the save-only path
    expect(saved()).toBe('light')
    expect(world.toasts.at(-1)).toBe('Theme: Light')
    expect(await label(pane, 'light')).toBe('● Light')
    await pane.unmount()
  })

  test('a custom theme is copied into the pane\'s own and /theme opens, to pick it once', async ($, on) => {
    const { world, proxy } = await started($, on)
    const pane = await mount($)
    expect(await pane.find({ type: 'Text', text: /pick “Theme Panel” there once/ })).toBeDefined()
    await pane.press({ key: 'theme:custom:dracula' })
    expect(world.shorthand).toEqual([]) // /config refuses custom themes
    expect(proxy()).toEqual({ name: 'Theme Panel · Dracula', base: 'dark', overrides: DRACULA.overrides, source: 'custom:dracula' })
    expect(world.opened).toBe(1)
    expect(world.toasts.at(-1)).toMatch(/^In \/theme pick “Theme Panel · Dracula” once/)
    await pane.unmount()
  })

  test('with the pane\'s own theme in use, any press rewrites it, custom or built in', async ($, on) => {
    const { world, proxy } = await started($, on, { saved: 'custom:theme-panel' })
    const pane = await mount($)
    expect(await pane.find({ type: 'Text', text: /there once/ })).toBeUndefined()
    await pane.press({ key: 'theme:custom:monokai' })
    expect(proxy().source).toBe('custom:monokai')
    expect(proxy().overrides).toEqual({ claude: '#fd971f' })
    expect(world.toasts.at(-1)).toBe('Theme: Monokai')
    expect(await label(pane, 'custom:monokai')).toBe('● Monokai')
    await pane.press({ key: 'theme:light-ansi' })
    expect(proxy()).toEqual({ name: 'Theme Panel · Light, terminal colors', base: 'light-ansi', overrides: {}, source: 'light-ansi' })
    expect(world.shorthand).toEqual([]) // all through the file
    expect(world.opened).toBe(0)
    expect(await label(pane, 'light-ansi')).toBe('● Light, terminal colors')
    await pane.unmount()
  })

  test('a refusal from /config says why and changes nothing', async ($, on) => {
    const { world, saved } = await started($, on, { refuse: 'Theme is managed by your settings file' })
    const pane = await mount($)
    await pane.press({ key: 'theme:light' })
    expect(world.shorthand).toEqual(['theme=light'])
    expect(world.sets).toEqual([]) // a refusal is not a reason to fall back to saving
    expect(saved()).toBe('dark')
    expect(world.toasts.at(-1)).toBe('Could not switch the theme: Theme is managed by your settings file')
    expect(await label(pane, 'dark')).toBe('● Dark')
    await pane.unmount()
  })

  test('a theme the organization sets is shown, not switched', async ($, on) => {
    const { world } = await started($, on, { isLocked: true })
    const pane = await mount($)
    expect(await pane.find({ type: 'Text', text: /Your organization sets the theme/ })).toBeDefined()
    await pane.press({ key: 'theme:light' })
    expect(world.shorthand).toEqual([])
    await pane.unmount()
  })
})
