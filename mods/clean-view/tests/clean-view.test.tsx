import { describe, expect, test } from 'claude-code/testing'

import { blend, cells, clean, progress, planned } from '../hooks/checklist'

const PLAN = 'mcp__clean-view__plan_steps'
const PROGRESS = 'mcp__clean-view__report_progress'
const band = (bodyColumns = 80) => ({ component: 'AbovePrompt', props: { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns, scroll: { offset: 0, bodyRows: 20 } } })
const TODOS = [
  { content: 'Read your brand notes', status: 'completed', activeForm: 'Reading your brand notes' },
  { content: 'Build the pricing section', status: 'in_progress', activeForm: 'Building the pricing section' },
  { content: 'Add the contact form', status: 'pending', activeForm: 'Adding the contact form' },
  { content: 'Polish the footer', status: 'pending', activeForm: 'Polishing the footer' },
]

const wait = (ms: number) => new Promise(done => (globalThis as any).setTimeout(done, ms))

// Stands for the engine beneath the mod: every tool answers, Haiku names the job.
function engine(on: any, store: Record<string, unknown> = {}) {
  const world = { store, toasts: [] as string[], ran: [] as string[], named: 0 }
  let taskId = 0
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('tool.register', (_$: any, e: any) => ({ value: { tool: `mcp__clean-view__${e.name}` } }))
  on('command.register', () => ({ value: undefined }))
  on('store.get', (_$: any, e: any) => ({ value: store[e.key] }))
  on('store.set', (_$: any, e: any) => ((store[e.key] = e.value), { value: undefined }))
  on('ui.toast', (_$: any, e: any) => (world.toasts.push(e.text), { value: undefined }))
  on('model.complete', () => ((world.named += 1), { value: { isAnswered: true, text: 'Build my landing page.', usage: {} } }))
  on('turn.start', (_$: any, e: any) => ({ turnId: e.turnId }))
  on('turn.complete', (_$: any, e: any) => ({ text: e.answer }))
  on('clock.now', () => ({ value: Date.now() }))
  on('clock.every', () => new Promise(() => {})) // the animation's periods never come in a test
  on('clock.after', async () => (await wait(5), { value: undefined })) // 5 seconds pass at once
  on('classic.Notification', () => ({}))
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine row'] })) // the engine's own drawing
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'You are Claude Code.', scope: 'shared' }] }))
  on('tool.call', (_$: any, e: any) => {
    world.ran.push(e.tool)
    if (e.tool === 'TaskCreate') return { result: { task: { id: String(++taskId), subject: e.subject } } }
    if (e.tool === 'Bash' && e.command === 'fail') return { isError: true, result: 'boom', text: 'boom' }
    return { result: { ok: true }, text: 'ok' }
  })
  return world
}

async function started($: any, on: any, store?: Record<string, unknown>) {
  const world = engine(on, store)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/w' } as any)
  return world
}
let n = 0
const call = ($: any, tool: string, input: object = {}) => $.tool.call({ tool, tool_use_id: `u${++n}`, ...input } as any)
const job = ($: any, text = 'Build my landing page with a pricing section') => $.turn.start({ text, turnId: `t${++n}` } as any)
const texts = async (ui: any) => (await ui.findAll({ type: 'Text' })).map((t: any) => t.text as string)
const mountBand = ($: any, surface = 'terminal', cols = 80) => $.ui.mount({ plugin: 'clean-view', surface, ...band(cols) } as any)

describe('clean-view', () => {
  test('1. names come out plain', () => {
    expect(clean('Build the pricing section in `src/Pricing.tsx`')).toBe('Build the pricing section in')
    expect(clean('Update src/app/main.ts with the new header')).toBe('Update with the new header')
    expect(clean('fix Pricing.tsx and styles.css spacing')).toBe('Fix and spacing')
    const long = clean('Rewrite the whole onboarding experience so that new customers feel welcome today')
    expect(long.length).toBeLessThanOrEqual(40)
    expect(long.endsWith('…')).toBe(true)
    expect(long).toBe('Rewrite the whole onboarding experience…')
    expect(clean('`npm test`')).toBe('Working on it')
    expect(clean('   lots   of\n space ')).toBe('Lots of space')
  })

  test('the bars are painted orange to violet with a lighter stripe, by where each cell sits; a finished one green to blue', () => {
    const task = (status: 'done' | 'active' | 'upcoming', percent: number, hasReported = true) => ({ id: 't', name: 'T', status, percent, hasReported })
    const done = cells(task('done', 100), 0)
    expect(done.map(c => c.char).join('')).toBe('╱'.repeat(10))
    expect(done[0]).toEqual({ char: '╱', color: '#4ade80', background: '#16a34a' }) // the green end
    expect(done[9]).toEqual({ char: '╱', color: '#818cf8', background: '#3b4fe0' }) // the blue end
    const ninety = cells(task('active', 90), 0)
    expect(ninety[0]).toEqual({ char: '╱', color: '#ffb21b', background: '#f68304' }) // working: the orange end
    expect(ninety[8]!.background).not.toBe(done[8]!.background)
    const sixty = cells(task('active', 60), 0)
    expect(sixty.filter(c => c.background).length).toBe(6)
    expect(sixty[5]!.background).toBe(ninety[5]!.background) // a cell keeps its color however full the bar is
    expect(sixty[6]).toEqual({ char: '░' })
    expect(cells(task('upcoming', 0), 0).every(c => !c.background)).toBe(true)
    expect(cells(task('active', 0, false), 4).filter(c => c.background).length).toBe(3) // the sweep
    expect(blend(['#000000', '#ffffff'], 0.5)).toBe('#808080')
  })

  test('2. a to-do list and a 60% report draw ✓ / ▶ 60% / Next / Up next, terminal and desktop', async ($, on) => {
    await started($, on)
    await job($)
    await call($, 'TodoWrite', { todos: TODOS })
    await call($, PROGRESS, { task: 'Build the pricing section', percent: 60 })
    for (const surface of ['terminal', 'desktop']) {
      const ui = await mountBand($, surface)
      const all = await texts(ui)
      const row = (name: string) => all.find((t: string) => t.includes(name) && /(Done|%|Next|Up next|Working)$/.test(t))
      expect(row('Read your brand notes')).toMatch(/^✓ .*╱{10} {2}Done$/)
      expect(row('Build the pricing section')).toMatch(/^▶ .*╱{6}░{4} {2}60%$/)
      expect(row('Add the contact form')).toMatch(/^○ .*░░░░░░░░░░ {2}Next$/)
      expect(row('Polish the footer')).toMatch(/Up next$/)
      expect(all.some((t: string) => /Build my landing page · \d+s/.test(t))).toBe(true) // Haiku's name for it
      expect(await ui.find({ type: 'Button', key: 'clean-view', text: '● Clean View: ON' })).toBeDefined()
      expect(all).toContain('engine row') // what lies beneath (the context bar) still draws, under the checklist
      await ui.unmount()
    }
  })

  test('3. a permission prompt shows Needs you, and the next tool clears it', async ($, on) => {
    await started($, on)
    await job($)
    await call($, PLAN, { steps: ['Read your notes', 'Build the page'] })
    await $.classic.Notification({ message: 'Claude needs your permission to use Bash', notification_type: 'permission_prompt' } as any)
    const ui = await mountBand($)
    expect(await ui.find({ type: 'Text', text: /^ Needs you $/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Claude needs your OK to continue/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^‖ / })).toBeDefined() // the current step's ▶ becomes ‖
    await call($, 'Bash', { command: 'ls' })
    expect(await ui.find({ type: 'Text', text: /Needs you/ })).toBeUndefined()
    await ui.unmount()
  })

  test('4. /simple off hides the band and brings the tool rows back', async ($, on) => {
    const world = await started($, on)
    await job($)
    await call($, PLAN, { steps: ['Read your notes', 'Build the page'] })
    const ui = await mountBand($)
    expect(await ui.find({ type: 'Text', text: /Read your notes/ })).toBeDefined()
    const row = await $.ui.mount({ plugin: 'clean-view', surface: 'terminal', component: 'ToolUse', requestId: 'u1', props: { tool_use_id: 'u1', tool: 'Bash', input: { command: 'ls' }, isRunning: false, isErrored: false, isInterrupted: false } } as any)
    expect(await row.find({ type: 'Text' })).toBeUndefined() // hidden while on

    const r: any = await $.command.run({ command: 'simple', args: 'off', origin: { kind: 'composer' }, presentation: 'text' } as any)
    expect(r.text).toMatch(/off/)
    expect(world.store.cleanViewEnabled).toBe(false)
    expect(await ui.find({ type: 'Text', text: /Read your notes/ })).toBeUndefined()
    expect(await ui.find({ type: 'Button', key: 'clean-view', text: '○ Clean View: OFF' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'engine row' })).toBeDefined() // off: the band beneath still draws
    expect(await row.find({ type: 'Text', text: 'engine row' })).toBeDefined() // the tool row is back
    await call($, 'Bash', { command: 'ls' }) // no gate while off
    await ui.press({ key: 'clean-view' }) // one click turns it back on, with a toast
    expect(world.store.cleanViewEnabled).toBe(true)
    expect(world.toasts.at(-1)).toMatch(/Clean View on/)
    await row.unmount()
    await ui.unmount()
  })

  test('5. plan_steps, then report_progress at 100, checks off step one and starts step two', async ($, on) => {
    await started($, on)
    await job($)
    const planRes: any = await call($, PLAN, { steps: ['Read your brand notes', 'Build the pricing section in `src/Pricing.tsx`', 'Polish the footer'] })
    expect(planRes.result).toBe('Planned 3 steps. The first one has started.')
    const r: any = await call($, PROGRESS, { task: 'Read your brand notes', percent: 140 })
    expect(r.result).toBe('Progress noted: 100%.')
    const ui = await mountBand($)
    const all = await texts(ui)
    expect(all.find((t: string) => t.startsWith('✓ Read your brand notes'))).toBeDefined()
    expect(all.find((t: string) => t.startsWith('▶ Build the pricing section in') && t.endsWith('Working'))).toBeDefined()
    expect(all.find((t: string) => t.startsWith('○ Polish the footer') && t.endsWith('Next'))).toBeDefined()

    // The job ends: All done, then one line after 5 seconds.
    await call($, PROGRESS, { task: 'Polish the footer', percent: 100 })
    await $.turn.complete({ answer: 'Done.', durationMs: 1, isAborted: false, turnId: 'tx', reason: 'answer' } as any)
    expect(await ui.find({ type: 'Text', text: /^✓ All done · .* · took \d+s$/ })).toBeDefined()
    await ui.unmount()

    // Pure: a step not in the plan joins it; 100 starts the next.
    const tasks = progress(planned(['A one', 'B two']), 'Surprise step', 30)
    expect(tasks.map(t => `${t.name}:${t.status}`)).toEqual(['Surprise step:active', 'A one:upcoming', 'B two:upcoming'])
  })

  test('6. every tool is refused before a plan exists and allowed after', async ($, on) => {
    const world = await started($, on)
    await job($)
    const denied: any = await call($, 'Read', { file_path: '/w/a.txt' })
    expect(denied.deny).toMatch(/plan_steps first/)
    expect(world.ran).toEqual([])
    const searched: any = await call($, 'ToolSearch', { query: 'select:plan_steps', max_results: 1 })
    expect(searched.deny).toBeUndefined() // always allowed
    const sub: any = await $.tool.call({ tool: 'Read', tool_use_id: 'sub1', file_path: '/w/a', agentId: 'agent-1' } as any)
    expect(sub.deny).toBeUndefined() // subagents are never gated
    await call($, PLAN, { steps: ['Read your file', 'Explain it'] })
    const allowed: any = await call($, 'Read', { file_path: '/w/a.txt' })
    expect(allowed.deny).toBeUndefined()
    expect(world.ran.filter(t => t === 'Read').length).toBe(2)
  })

  test('the system prompt asks for a plan while on; failures and Esc read calmly', async ($, on) => {
    await started($, on)
    const composed: any = await $.prompt.compose({ model: 'm', promptModel: 'm', surfaces: ['terminal'], tools: ['Read', 'TodoWrite'], outputStyle: null, traits: [] } as any)
    expect(composed.sections.at(-1).id).toBe('clean-view:plan')
    expect(composed.sections.at(-1).text).toMatch(/plain English/)
    await job($)
    await call($, PLAN, { steps: ['Try it', 'Finish'] })
    for (let i = 0; i < 3; i++) await call($, 'Bash', { command: 'fail' })
    const ui = await mountBand($)
    expect(await ui.find({ type: 'Text', text: /⚠ Stuck: a step keeps failing/ })).toBeDefined()
    await call($, 'Bash', { command: 'ls' })
    expect(await ui.find({ type: 'Text', text: /Stuck/ })).toBeUndefined()
    await $.turn.complete({ answer: '', durationMs: 1, isAborted: true, turnId: 'ty', reason: 'aborted' } as any)
    expect(await ui.find({ type: 'Text', text: /^■ Stopped/ })).toBeDefined()
    await wait(10)
    await ui.unmount()
  })
})
