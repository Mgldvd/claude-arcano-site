// Clean View: Claude Code, calm and friendly for people who are not technical.
//   While it is on, tool calls, diffs and command output are hidden, and one checklist above
//   the prompt shows the plan, the step under way and how far along it is. Claude lays the
//   plan out with plan_steps and fills the meters with report_progress (no other tool runs
//   until a plan exists); a to-do list (TodoWrite, TaskCreate, TaskUpdate) fills it too. The
//   header says when Claude needs you, is stuck, was stopped, or is done. The button at its
//   right, or /simple on|off, turns it all off and back on; the choice is kept.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'

import type { Checklist, Task } from '../types'
import { calm, cells, columns, created, elapsed, fit, fromTodos, IDLE, PLACEHOLDERS, planned, progress, title, updated } from './checklist'

const PLUGIN = 'clean-view'
const PLAN_TOOL = `mcp__${PLUGIN}__plan_steps`
const PROGRESS_TOOL = `mcp__${PLUGIN}__report_progress`
const ALWAYS_ALLOWED = new Set(['ToolSearch', 'TodoWrite', 'TaskCreate', 'TaskUpdate', 'AskUserQuestion', PLAN_TOOL, PROGRESS_TOOL])
const TICK_MS = 250
const COLLAPSE_MS = 5_000
const FAILURES_TO_STUCK = 3
const ACCENT = '#d97757'

const NEEDS_OK = 'Claude needs your OK to continue'
const HAS_QUESTION = 'Claude has a question for you'
const WAITS_REPLY = 'Claude is waiting for your reply'
const SAID_NO = 'you said no to a step, so Claude paused'
const KEEPS_FAILING = 'a step keeps failing, Claude is trying another way'
const REFUSED = "Claude couldn't help with that request"
const REJECTED = /doesn't want to proceed|was rejected|user (denied|rejected|declined)|permission (was )?denied/i

// Held by the host, so the checklist survives a hot reload of this file.
const enabled = atom({ plugin: 'clean-view', key: 'cleanViewEnabled' } as const, true)
const checklist = atom({ plugin: 'clean-view', key: 'checklist' } as const, IDLE as Checklist)
const tick = atom({ plugin: 'clean-view', key: 'tick' } as const, 0)
const failures = atom({ plugin: 'clean-view', key: 'failures' } as const, 0)
const apiError = atom({ plugin: 'clean-view', key: 'apiError' } as const, null as string | null)

let ticker: { cancel: () => void } | undefined // the animation clock, running only while a job runs or waits on you

export function registerCleanView(on: On) {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await $.tool
      .register({
        name: 'plan_steps',
        description:
          'Lay out every step of the job up front, before any other tool: 2 to 8 short step names in order, in plain English a non-technical person understands (under 40 characters, starting with a verb, no file names, paths, commands or code). The first step starts right away.',
        inputSchema: {
          type: 'object',
          properties: { steps: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 8, description: 'The step names, in order' } },
          required: ['steps'],
        },
      })
      .catch(() => {})
    await $.tool
      .register({
        name: 'report_progress',
        description:
          "Report progress on the current step of the plan, as real progress happens, and with 100 the moment a step finishes (the next one then starts). Steps before the one reported are checked off. A name that isn't in the plan becomes a new step.",
        inputSchema: {
          type: 'object',
          properties: {
            task: { type: 'string', description: 'The step name, as planned' },
            percent: { type: 'number', minimum: 0, maximum: 100, description: 'How far along the step is, 0 to 100' },
          },
          required: ['task', 'percent'],
        },
      })
      .catch(() => {})
    await $.command.register({ name: 'simple', description: 'Turn Clean View on or off', argumentHint: 'on|off' }).catch(() => {})
    const kept = await $.store.get('cleanViewEnabled').catch(() => undefined)
    if (typeof kept === 'boolean') await update($, enabled, () => kept)
    ticker?.cancel() // a reload starts the module over; the clock follows the checklist again
    ticker = undefined
    await syncClock($)
    return r
  })

  // While Clean View is on, Claude is told to plan first and to name steps plainly.
  on('prompt.compose', async ($, e, next) => {
    const r = await next(e)
    if (!(await read($, enabled))) return r
    const hasTodos = e.tools.includes('TodoWrite') || e.tools.includes('TaskCreate')
    return { ...r, sections: [...r.sections, { id: `${PLUGIN}:plan`, text: guide(hasTodos), scope: 'session' as const }] }
  })

  // A real prompt sent while nothing runs starts a new job; a reply to a waiting one goes on with it.
  on('turn.start', async ($, e, next) => {
    const text = e.text.trim()
    if (!(await read($, enabled)) || text === '' || text.startsWith('/')) return next(e)
    const now = await $.clock.now()
    const c = await read($, checklist)
    await update($, failures, () => 0)
    await update($, apiError, () => null)
    if (c.phase === 'working' || c.phase === 'waiting') {
      await update($, checklist, (x): Checklist => ({ ...x, phase: 'working', needsYouReason: null, stuckReason: null }))
    } else {
      const job = c.jobId + 1
      await update($, checklist, (): Checklist => ({
        ...IDLE,
        jobId: job,
        title: title(text),
        phase: 'working',
        tasks: PLACEHOLDERS.map(t => ({ ...t })),
        startedAt: now,
      }))
      void nameJob($, job, text).catch(() => {})
    }
    await syncClock($)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId) return next(e) // subagents are neither gated nor tracked

    if (e.tool === PLAN_TOOL) {
      const steps = Array.isArray(e.steps) ? e.steps.filter((s): s is string => typeof s === 'string' && s.trim() !== '') : []
      if (steps.length === 0) return { deny: 'plan_steps needs `steps`: 2 to 8 short step names, in order.' }
      const now = await $.clock.now()
      const tasks = planned(steps)
      await update($, checklist, (c): Checklist => {
        const isRunning = c.phase === 'working' || c.phase === 'waiting'
        return {
          ...(isRunning ? c : { ...IDLE, jobId: c.jobId + 1, title: 'Your request', startedAt: now }),
          phase: 'working',
          tasks,
          isPlanned: true,
          needsYouReason: null,
          stuckReason: null,
        }
      })
      await syncClock($)
      return { result: `Planned ${tasks.length} steps. The first one has started.` }
    }

    if (e.tool === PROGRESS_TOOL) {
      const p = typeof e.percent === 'number' ? Math.min(100, Math.max(0, Math.round(e.percent))) : 0
      await update($, checklist, (c): Checklist => ({ ...c, tasks: progress(c.tasks, e.task, e.percent), needsYouReason: null }))
      return { result: `Progress noted: ${p}%.` }
    }

    const isOn = await read($, enabled)
    const c = await read($, checklist)
    if (isOn && !c.isPlanned && !ALWAYS_ALLOWED.has(e.tool)) {
      return {
        deny: `Clean View: call ${PLAN_TOOL} first with the plain-English steps of this job (load it with ToolSearch if it is deferred), then try again.`,
      }
    }

    if (e.tool === 'AskUserQuestion') {
      await needsYou($, HAS_QUESTION)
      const r = await next(e)
      await needsYou($, null)
      return r
    }

    if (c.needsYouReason !== null && c.phase === 'working') await needsYou($, null) // the next tool runs: you answered
    const r = await next(e)
    if (!isOn && c.phase === 'idle') return r

    if (r.deny === undefined && r.isError !== true) {
      if (e.tool === 'TodoWrite') {
        await update($, checklist, (x): Checklist => {
          const tasks = fromTodos(e.todos, x.tasks)
          return tasks.length > 0 ? { ...x, tasks, isPlanned: true } : x
        })
      } else if (e.tool === 'TaskCreate') {
        const id = (r.result as { task?: { id?: unknown } } | undefined)?.task?.id
        if (typeof id === 'string') await update($, checklist, (x): Checklist => ({ ...x, tasks: created(x.tasks, id, e.subject), isPlanned: true }))
      } else if (e.tool === 'TaskUpdate') {
        await update($, checklist, (x): Checklist => ({ ...x, tasks: updated(x.tasks, e.taskId, { status: e.status, subject: e.subject }), isPlanned: true }))
      }
    }

    // A refusal at the dialog pauses Claude; three failures in a row read as stuck; a success clears both.
    if (r.isError === true) {
      if (REJECTED.test(r.text ?? String(r.result ?? ''))) {
        await update($, checklist, (x): Checklist => ({ ...x, needsYouReason: null, stuckReason: SAID_NO }))
      } else {
        const n = await update($, failures, k => k + 1)
        if (n >= FAILURES_TO_STUCK) await update($, checklist, (x): Checklist => ({ ...x, stuckReason: KEEPS_FAILING }))
      }
    } else if (r.deny === undefined) {
      await update($, failures, () => 0)
      if (c.stuckReason !== null || (await read($, checklist)).stuckReason !== null) await update($, checklist, (x): Checklist => ({ ...x, stuckReason: null }))
    }
    return r
  })

  // A permission prompt (or an MCP server's question) waits on you.
  on('classic.Notification', async ($, e, next) => {
    if (e.notification_type === 'permission_prompt' || e.notification_type === 'elicitation_dialog') await needsYou($, NEEDS_OK)
    return next(e)
  })

  on('classic.PermissionDenied', async ($, e, next) => {
    await update($, checklist, (x): Checklist => (x.phase === 'idle' ? x : { ...x, needsYouReason: null, stuckReason: SAID_NO }))
    return next(e)
  })

  // The kind of API error that is about to end the turn, for turn.complete to say calmly.
  on('classic.StopFailure', async ($, e, next) => {
    await update($, apiError, () => `${e.error}\n${e.error_details ?? ''}`)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId) return r
    const c = await read($, checklist)
    if (c.phase !== 'working' && c.phase !== 'waiting') return r
    const now = await $.clock.now()
    if (e.reason === 'error') {
      const [kind = null, details = ''] = ((await read($, apiError)) ?? '').split('\n')
      await update($, checklist, (x): Checklist => ({ ...x, phase: 'stuck', needsYouReason: null, stuckReason: calm(kind || null, details), finishedAt: now }))
    } else if (e.reason === 'refusal') {
      await update($, checklist, (x): Checklist => ({ ...x, phase: 'stuck', needsYouReason: null, stuckReason: REFUSED, finishedAt: now }))
    } else if (e.reason === 'aborted' || e.isAborted) {
      await update($, checklist, (x): Checklist => ({ ...x, phase: 'stopped', needsYouReason: null, finishedAt: now }))
    } else if (c.isPlanned && c.tasks.some(t => t.status !== 'done')) {
      await update($, checklist, (x): Checklist => ({ ...x, phase: 'waiting', needsYouReason: WAITS_REPLY }))
    } else {
      const job = c.jobId
      await update($, checklist, (x): Checklist => ({
        ...x,
        phase: 'done',
        tasks: x.tasks.map(t => ({ ...t, status: 'done', percent: 100 })),
        needsYouReason: null,
        stuckReason: null,
        finishedAt: now,
      }))
      $.clock.after(COLLAPSE_MS, () => void update($, checklist, (x): Checklist => (x.jobId === job && x.phase === 'done' ? { ...x, isCollapsed: true } : x)))
    }
    await syncClock($)
    return r
  })

  on('command.run', { command: 'simple' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg !== '' && arg !== 'on' && arg !== 'off') return { text: 'Usage: /simple on|off (no argument flips it)' }
    const value = arg === '' ? !(await read($, enabled)) : arg === 'on'
    await setEnabled($, value)
    return { text: value ? 'Clean View is on: technical details are hidden' : 'Clean View is off: every detail is shown' }
  })

  // The band: the checklist, and the button at the right of its header on every screen.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const rest = await next(e) // what other mods (the context bar) and Claude Code draw here stays, under the checklist
    if (e.props.hasSurvey) return rest // a survey has the band: stay out of the way
    const { Box, Text, Button } = $.ui.resolve(e)
    const isOn = await read($, enabled)
    const c = await read($, checklist)
    const frame = await read($, tick)
    const now = await $.clock.now()
    const button = (
      <Button
        key="clean-view"
        label={isOn ? '● Clean View: ON' : '○ Clean View: OFF'}
        onPress={() => void setEnabled($, !isOn)}
      />
    )
    if (!isOn || c.phase === 'idle') {
      return (
        <Box flexDirection="column">
          <Box flexDirection="row" justifyContent="flex-end">
            {button}
          </Box>
          {rest}
        </Box>
      )
    }

    const width = columns(e.props.bodyColumns, c.tasks.map(t => t.name))
    const isWaitingOnYou = c.needsYouReason !== null && (c.phase === 'working' || c.phase === 'waiting')
    const firstUpcoming = c.tasks.findIndex(t => t.status === 'upcoming')
    const took = elapsed((c.finishedAt ?? now) - c.startedAt)

    const header = (() => {
      if (c.phase === 'done')
        return (
          <Text wrap="truncate-end">
            <Text color="green">{'✓ '}</Text>
            <Text bold>{'All done'}</Text>
            <Text dimColor>{` · ${c.title} · took ${took}`}</Text>
          </Text>
        )
      if (c.phase === 'stopped')
        return (
          <Text wrap="truncate-end">
            <Text bold>{'■ Stopped'}</Text>
            <Text dimColor>{` · ${c.title} · you pressed Esc`}</Text>
          </Text>
        )
      if (isWaitingOnYou)
        return (
          <Text wrap="truncate-end">
            <Text bold color="black" backgroundColor="yellow">
              {' Needs you '}
            </Text>
            <Text>{` ${c.needsYouReason}`}</Text>
          </Text>
        )
      if (c.stuckReason !== null)
        return (
          <Text wrap="truncate-end" color="yellow">
            {`⚠ Stuck: ${c.stuckReason}`}
          </Text>
        )
      return (
        <Text wrap="truncate-end">
          <Text bold>{c.title}</Text>
          <Text dimColor>{` · ${took}`}</Text>
        </Text>
      )
    })()

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Box flexShrink={1}>{header}</Box>
          {button}
        </Box>
        {!c.isCollapsed &&
          c.tasks.map((t, i) => (
            <Text key={`task:${t.id}`} wrap="truncate-end">
              <Text color={rowColor(t)} dimColor={t.status === 'upcoming'}>
                {`${icon(t, isWaitingOnYou)} `}
              </Text>
              <Text bold={t.status === 'active'} dimColor={t.status !== 'active'}>
                {fit(t.name, width.name)}
              </Text>
              <Text>{'  '}</Text>
              {cells(t, frame, width.meter).map((cell, k) =>
                cell.background ? (
                  <Text key={`cell:${k}`} color={cell.color} backgroundColor={cell.background}>
                    {cell.char}
                  </Text>
                ) : (
                  <Text key={`cell:${k}`} dimColor>
                    {cell.char}
                  </Text>
                ),
              )}
              <Text dimColor={t.status !== 'active'}>{`  ${label(t, i === firstUpcoming)}`}</Text>
            </Text>
          ))}
        {rest}
      </Box>
    )
  })

  // The technical rows: hidden while Clean View is on, the engine's own while it is off.
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => ((await read($, enabled)) ? hidden($, e) : next(e)))
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => ((await read($, enabled)) ? hidden($, e) : next(e)))
  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => ((await read($, enabled)) ? hidden($, e) : next(e)))
  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) =>
    (await read($, enabled)) ? next({ ...e, props: { ...e.props, hint: '' } }) : next(e),
  )
}

function hidden($: EngineInterface, e: Parameters<EngineInterface['ui']['resolve']>[0]) {
  const { Box } = $.ui.resolve(e)
  return <Box />
}

function icon(t: Task, isWaitingOnYou: boolean) {
  if (t.status === 'done') return '✓'
  if (t.status === 'active') return isWaitingOnYou ? '‖' : '▶'
  return '○'
}

function rowColor(t: Task) {
  if (t.status === 'done') return 'green'
  if (t.status === 'active') return ACCENT
  return undefined
}

function label(t: Task, isNext: boolean) {
  if (t.status === 'done') return 'Done'
  if (t.status === 'active') return t.hasReported ? `${t.percent}%` : 'Working'
  return isNext ? 'Next' : 'Up next'
}

function guide(hasTodos: boolean) {
  return [
    '# Clean View',
    'The person watching this session is not technical. Tool calls, diffs and command output are hidden from them: they follow your work through a checklist above the prompt.',
    `- For every request, even a quick question, call ${PLAN_TOOL} first with 2 to 8 short steps in order. Load it with ToolSearch first if it is deferred. Other tools are refused until a plan exists.`,
    `- Then call ${PROGRESS_TOOL} as real progress happens, and with percent 100 the moment a step finishes.`,
    '- Write every step name in plain English a non-technical person understands. Keep it under 40 characters and start it with a verb, like "Build the pricing section".',
    '- Never put file paths, file names, commands, code or tool names in a step name.',
    ...(hasTodos ? ['- If you keep a to-do list (TodoWrite or TaskCreate), it can be the plan instead, under the same naming rules.'] : []),
  ].join('\n')
}

async function needsYou($: EngineInterface, reason: string | null) {
  await update($, checklist, (x): Checklist => (x.phase === 'idle' || x.needsYouReason === reason ? x : { ...x, needsYouReason: reason }))
}

async function setEnabled($: EngineInterface, value: boolean) {
  await update($, enabled, () => value)
  await $.store.set('cleanViewEnabled', value).catch(() => {})
  $.ui.toast(value ? 'Clean View on: technical details are hidden' : 'Clean View off: every detail is shown')
  await syncClock($)
}

// The header's name: Haiku's few words for the job, dropped when a newer job has started.
async function nameJob($: EngineInterface, job: number, text: string) {
  const r = await $.model.complete({
    model: 'haiku',
    effort: 'low',
    maxTokens: 30,
    timeoutMs: 20_000,
    prompt: `Name this job in 2 to 6 plain English words that start with a verb, for a person who is not technical. No file names, code or punctuation. Reply with the name only.\n\nThe request:\n${text.slice(0, 2_000)}`,
  })
  if (!r.isAnswered) return
  const name = title(r.text)
  await update($, checklist, (c): Checklist => (c.jobId === job && name !== 'Working on it' ? { ...c, title: name } : c))
}

// Advances the animation frame every 250ms while a job runs or waits on you; no timer otherwise.
async function syncClock($: EngineInterface) {
  const c = await read($, checklist)
  const isLive = (await read($, enabled)) && (c.phase === 'working' || c.phase === 'waiting')
  if (isLive && !ticker) ticker = $.clock.every(TICK_MS, () => void update($, tick, n => (n + 1) % 1_000_000))
  if (!isLive && ticker) {
    ticker.cancel()
    ticker = undefined
  }
}

