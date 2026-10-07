import { describe, expect, test } from 'claude-code/testing'

const PANE = { component: 'Pane', requestId: 'theme-panel', props: { title: 'Themes', isFocused: true, bodyColumns: 36, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} } }
const OPTIONS = ['auto', 'dark', 'light', 'dark-daltonized', 'light-ansi']
const FILE = '/cfg/themes/theme-panel.json'
const SETTINGS = '/cfg/settings.json'

// Stands for the engine: the /config theme row, the settings file /theme writes, the custom
// themes folder, and what setting the row and running /theme do.
function engine(on: any, opts: { refuse?: string; isLocked?: boolean; saved?: string } = {}) {
  const world = {
    theme: opts.saved ?? 'dark',
    sets: [] as string[],
    commands: [] as string[],
    toasts: [] as string[],
    files: { [SETTINGS]: JSON.stringify({ theme: opts.saved ?? 'dark' }) } as Record<string, string>,
  }
  const base = () => JSON.parse(world.files[FILE] ?? '{}').base as string | undefined
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: undefined }))
  on('command.run', { command: 'theme' }, (_$: any, e: any) => (world.commands.push(`/theme ${e.args}`.trim()), { text: '' }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('ui.open', () => ({ value: undefined }))
  on('ui.toast', (_$: any, e: any) => (world.toasts.push(e.text), { value: undefined }))
  on('clock.every', () => new Promise(() => {})) // the watch's periods never come in a test
  on('env.get', (_$: any, e: any) => ({ value: e.name === 'CLAUDE_CONFIG_DIR' ? '/cfg' : '/home/me' }))
  on('fs.read', (_$: any, e: any) => {
    if (!(e.path in world.files)) throw new Error(`ENOENT ${e.path}`)
    return { value: world.files[e.path] }
  })
  on('fs.write', (_$: any, e: any) => ((world.files[e.path] = e.text), { value: undefined }))
  on('config.list', () => ({
    value: [
      { key: 'verbose', label: 'Verbose', kind: 'boolean', value: false, provider: { plugin: 'engine', tier: 'core' }, isLocked: false },
      { key: 'theme', label: 'Theme', kind: 'choice', value: world.theme, options: OPTIONS, provider: { plugin: 'engine', tier: 'core' }, isLocked: opts.isLocked === true },
    ],
  }))
  on('config.set', (_$: any, e: any) => {
    if (opts.refuse) return { deny: opts.refuse }
    world.sets.push(e.value)
    world.theme = e.value
    return { value: e.value }
  })
  return { world, base }
}

const wait = (ms: number) => new Promise(done => (globalThis as any).setTimeout(done, ms))
async function started($: any, on: any, opts?: Parameters<typeof engine>[1]) {
  const w = engine(on, opts)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/w' } as any)
  await wait(20) // the first read runs in the background
  return w
}
const mount = ($: any) => $.ui.mount({ plugin: 'theme-panel', surface: 'terminal', ...PANE } as any)
const label = async (pane: any, name: string) => (await pane.find({ type: 'Button', key: `theme:${name}` }))?.text as string | undefined

describe('theme-panel', () => {
  test('lists the themes by plain names, marks the one in use, draws its colors, and writes its own theme', async ($, on) => {
    const { base } = await started($, on)
    const pane = await mount($)
    expect(await label(pane, 'dark')).toBe('● Dark')
    expect(await label(pane, 'light')).toBe('○ Light')
    expect(await label(pane, 'dark-daltonized')).toBe('○ Dark, colorblind-friendly')
    expect(await label(pane, 'light-ansi')).toBe('○ Light, terminal colors')
    expect(await label(pane, 'auto')).toBe('○ Auto, as the terminal')
    expect(await pane.find({ type: 'Text', text: /Colors of this theme/ })).toBeDefined()
    expect(base()).toBe('dark') // drawn from the theme in use, so /theme lists it
    await pane.unmount()
  })

  test('before its own theme is picked, a press saves the theme for the next start and says how to switch at once', async ($, on) => {
    const { world, base } = await started($, on)
    const pane = await mount($)
    expect(await pane.find({ type: 'Text', text: /pick “Theme Panel” in \/theme one time/ })).toBeDefined()
    await pane.press({ key: 'theme:light' })
    expect(world.sets).toEqual(['light'])
    expect(base()).toBe('light') // picking it later keeps this choice
    expect(world.toasts.at(-1)).toMatch(/^Light is saved for the next start/)
    await pane.press({ key: 'setup' })
    expect(world.commands).toEqual(['/theme'])
    expect(world.toasts.at(-1)).toBe('Pick “Theme Panel” in the list')
    await pane.unmount()
  })

  test('with its own theme in use, a press rewrites that theme, which repaints at once', async ($, on) => {
    const { world, base } = await started($, on, { saved: 'custom:theme-panel' })
    const pane = await mount($)
    expect(await pane.find({ type: 'Text', text: /one time/ })).toBeUndefined()
    expect(await label(pane, 'dark')).toBe('● Dark') // the pane's theme is drawn from dark
    expect(await label(pane, 'auto')).toBeUndefined() // a custom theme cannot be drawn from auto
    await pane.press({ key: 'theme:light-ansi' })
    expect(world.sets).toEqual([]) // nothing saved: the file is the switch
    expect(base()).toBe('light-ansi')
    expect(world.toasts.at(-1)).toBe('Theme: Light, terminal colors')
    expect(await label(pane, 'light-ansi')).toBe('● Light, terminal colors')
    expect(await label(pane, 'dark')).toBe('○ Dark')
    await pane.unmount()
  })

  test('a refused switch says why and changes nothing', async ($, on) => {
    const { world } = await started($, on, { refuse: 'only its dialog changes it' })
    const pane = await mount($)
    await pane.press({ key: 'theme:light' })
    expect(world.toasts.at(-1)).toBe('Could not switch the theme: only its dialog changes it')
    expect(await label(pane, 'dark')).toBe('● Dark')
    await pane.unmount()
  })

  test('a theme the organization sets is shown, not switched', async ($, on) => {
    const { world } = await started($, on, { isLocked: true })
    const pane = await mount($)
    expect(await pane.find({ type: 'Text', text: /Your organization sets the theme/ })).toBeDefined()
    await pane.press({ key: 'theme:light' })
    expect(world.sets).toEqual([])
    await pane.unmount()
  })
})
