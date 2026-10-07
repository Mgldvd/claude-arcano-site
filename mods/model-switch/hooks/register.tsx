// Model Switch: the model and the effort, one click each, at the bottom right of the prompt.
//   Drawn in the footer's mode corner (beside `focus`, `memory paused` when those show):
//   `◆ Opus 5.5 · high`. A click on the model goes to the next one (Fable → Opus → Sonnet →
//   Haiku → Fable), a click on the effort to the next level (low → medium → high → xhigh →
//   max → auto). Each click runs /model or /effort, so it holds for this session as typing
//   them would. The corner follows a /model or /effort you type too, and what each request
//   really went out with.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Effort } from '../types'
import { after, choices, colorOf, EFFORTS, family, hasEffort, isEffort, pretty } from './models'

// Held by the host, so the corner survives a hot reload of this file.
const model = atom({ plugin: 'model-switch', key: 'model' } as const, '')
const models = atom({ plugin: 'model-switch', key: 'models' } as const, [] as string[])
const effort = atom({ plugin: 'model-switch', key: 'effort' } as const, 'auto' as Effort)
const applied = atom({ plugin: 'model-switch', key: 'applied' } as const, '')
const busy = atom({ plugin: 'model-switch', key: 'busy' } as const, false)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await update($, busy, () => false) // a reload mid-switch leaves nothing spinning
    await sync($).catch(() => {})
    return r
  })

  // A /model or /effort typed by hand moves the corner too.
  on('command.run', async ($, e, next) => {
    const r = await next(e)
    if (e.command === 'model') await sync($).catch(() => {})
    if (e.command === 'effort') {
      const level = e.args.trim().toLowerCase()
      if (isEffort(level)) await update($, effort, () => level)
    }
    return r
  })

  // What each request of the main conversation goes out with, as the engine resolved it.
  on('turn.step', async function* ($, e, next) {
    if (!e.agentId) {
      await update($, model, () => e.model)
      await update($, applied, () => (typeof e.effort === 'string' ? e.effort : ''))
    }
    return yield* next(e)
  })

  on('ui.render', { component: 'SessionMode' }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const id = await read($, model)
    const modes = e.props.modes
    if (id === '') return <Text dimColor>{modes.join(' & ')}</Text>
    const level = await read($, effort)
    const real = await read($, applied)
    const isBusy = await read($, busy)
    const takesEffort = hasEffort(id)
    const effortLabel = !takesEffort ? 'no effort' : level === 'auto' && real !== '' ? `auto · ${real}` : level

    return (
      <Box flexDirection="row">
        {modes.length > 0 && <Text dimColor>{`${modes.join(' & ')}  `}</Text>}
        <Text color={colorOf(id) ?? 'gray'}>{isBusy ? '◌ ' : '◆ '}</Text>
        <Button key="model" plain label={pretty(id)} onPress={() => void cycleModel($)} />
        <Text dimColor>{' · '}</Text>
        <Button key="effort" plain dimColor={!takesEffort} label={effortLabel} onPress={() => void cycleEffort($)} />
      </Box>
    )
  })
}

// The session's model, the families /config offers, and the effort the settings keep for it.
async function sync($: EngineInterface) {
  const id = await $.session.model()
  await update($, model, () => id)
  const row = (await $.config.list().catch(() => [])).find(r => r.key === 'model')
  await update($, models, () => choices(row?.options))
  const settings = (await $.settings.read().catch(() => ({}))) as { modelSettings?: Record<string, { effortLevel?: unknown }>; effortLevel?: unknown }
  const kept = settings.modelSettings?.[id]?.effortLevel ?? settings.effortLevel
  if (isEffort(kept)) await update($, effort, () => kept)
}

async function cycleModel($: EngineInterface) {
  if (await read($, busy)) return
  const list = await read($, models)
  const next = after(list.length > 0 ? list : ['opus'], family(await read($, model)))
  await run($, 'model', next)
  await update($, model, () => '') // until the session says which id the alias landed on
  await sync($).catch(() => {})
  await update($, applied, () => '')
}

async function cycleEffort($: EngineInterface) {
  if (await read($, busy)) return
  if (!hasEffort(await read($, model))) {
    $.ui.toast('This model takes no effort setting')
    return
  }
  const next = after(EFFORTS, await read($, effort))
  if (await run($, 'effort', next)) {
    await update($, effort, () => next)
    await update($, applied, () => '')
  }
}

// Runs /model or /effort as typing it would, and toasts what it said.
async function run($: EngineInterface, command: 'model' | 'effort', args: string) {
  await update($, busy, () => true)
  try {
    const r = await $.command.run({ command, args })
    const said = typeof r?.text === 'string' ? r.text.replace(/`/g, '').split('\n')[0]! : `/${command} ${args}`
    $.ui.toast(said.length > 90 ? `${said.slice(0, 89)}…` : said)
    return true
  } catch (error) {
    $.ui.toast(`/${command} ${args} failed: ${String(error)}`)
    return false
  } finally {
    await update($, busy, () => false)
  }
}
