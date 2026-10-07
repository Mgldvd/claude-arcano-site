import { describe, expect, test } from 'claude-code/testing'

import { after, choices, EFFORTS, family, hasEffort, pretty } from '../hooks/models'

const IDS: Record<string, string> = { fable: 'claude-fable-5-1', opus: 'claude-opus-5-5', sonnet: 'claude-sonnet-5-5', haiku: 'claude-haiku-4-5-20251001' }
const OPTIONS = ['default', 'sonnet', 'opus', 'haiku', 'fable', 'best', 'sonnet[1m]', 'opus[1m]', 'fable[1m]', 'opusplan']

// Stands for the engine: /model moves the session's model, /effort its level.
function engine(on: any, start = 'claude-opus-5-5', settings: object = { modelSettings: { 'claude-opus-5-5': { effortLevel: 'high' } } }) {
  const world = { id: start, ran: [] as string[], toasts: [] as string[] }
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: world.id }))
  on('config.list', () => ({ value: [{ key: 'model', label: 'Model', kind: 'choice', value: 'opus', options: OPTIONS, provider: { plugin: 'engine', tier: 'core' }, isLocked: false }] }))
  on('settings.read', () => ({ value: settings }))
  on('ui.toast', (_$: any, e: any) => (world.toasts.push(e.text), { value: undefined }))
  on('command.run', (_$: any, e: any) => {
    world.ran.push(`/${e.command} ${e.args}`)
    if (e.command === 'model') {
      world.id = IDS[e.args] ?? world.id
      return { text: `Set model to \`${e.args}\` for this session only` }
    }
    return { text: `Set effort level to ${e.args} (this session only)` }
  })
  return world
}

async function started($: any, on: any, ...rest: any[]) {
  const world = (engine as any)(on, ...rest)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/w' } as any)
  return world
}
const mount = ($: any, modes: string[] = []) => $.ui.mount({ plugin: 'model-switch', surface: 'terminal', component: 'SessionMode', props: { modes } } as any)
const label = async (pane: any, key: string) => (await pane.find({ type: 'Button', key }))?.text as string | undefined

describe('model-switch', () => {
  test('helpers', () => {
    expect(pretty('claude-opus-5-5')).toBe('Opus 5.5')
    expect(pretty('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
    expect(pretty('claude-fable-5-1[1m]')).toBe('Fable 5.1 1M')
    expect(pretty('sonnet')).toBe('Sonnet')
    expect(family('claude-sonnet-5-5')).toBe('sonnet')
    expect(hasEffort('claude-haiku-4-5-20251001')).toBe(false)
    expect(choices(OPTIONS)).toEqual(['fable', 'opus', 'sonnet', 'haiku'])
    expect(choices(['sonnet', 'haiku'])).toEqual(['sonnet', 'haiku'])
    expect(choices(undefined)).toEqual(['fable', 'opus', 'sonnet', 'haiku'])
    expect(after(['a', 'b', 'c'], 'c')).toBe('a')
    expect(after(['a', 'b'], 'zzz')).toBe('a')
    expect(after(EFFORTS, 'max')).toBe('auto')
  })

  test('shows the model and its effort beside the footer modes', async ($, on) => {
    await started($, on)
    const corner = await mount($, ['focus'])
    expect(await label(corner, 'model')).toBe('Opus 5.5')
    expect(await label(corner, 'effort')).toBe('high')
    expect(await corner.find({ type: 'Text', text: /^focus/ })).toBeDefined()
    await corner.unmount()
  })

  test('a click on the model goes to the next one, wrapping', async ($, on) => {
    const world = await started($, on)
    const corner = await mount($)
    await corner.press({ key: 'model' })
    expect(world.ran).toEqual(['/model sonnet'])
    expect(await label(corner, 'model')).toBe('Sonnet 5.5')
    await corner.press({ key: 'model' })
    expect(await label(corner, 'model')).toBe('Haiku 4.5')
    expect(await label(corner, 'effort')).toBe('no effort')
    await corner.press({ key: 'effort' }) // Haiku takes none: nothing runs
    expect(world.ran).toEqual(['/model sonnet', '/model haiku'])
    expect(world.toasts.at(-1)).toMatch(/no effort/)
    await corner.press({ key: 'model' })
    expect(world.ran.at(-1)).toBe('/model fable')
    expect(await label(corner, 'model')).toBe('Fable 5.1')
    expect(world.toasts.some(t => t.includes('Set model to fable'))).toBe(true)
    await corner.unmount()
  })

  test('a click on the effort goes to the next level; a typed /effort moves it too', async ($, on) => {
    const world = await started($, on)
    const corner = await mount($)
    await corner.press({ key: 'effort' })
    expect(world.ran).toEqual(['/effort xhigh'])
    expect(await label(corner, 'effort')).toBe('xhigh')
    await corner.press({ key: 'effort' })
    await corner.press({ key: 'effort' })
    expect(await label(corner, 'effort')).toBe('auto')
    await $.command.run({ command: 'effort', args: 'low', origin: { kind: 'composer' }, presentation: 'text' } as any)
    expect(await label(corner, 'effort')).toBe('low')
    await corner.unmount()
  })

  test('with no effort kept in the settings it starts at auto', async ($, on) => {
    await started($, on, 'claude-sonnet-5-5', {})
    const corner = await mount($)
    expect(await label(corner, 'model')).toBe('Sonnet 5.5')
    expect(await label(corner, 'effort')).toBe('auto')
    await corner.unmount()
  })
})
