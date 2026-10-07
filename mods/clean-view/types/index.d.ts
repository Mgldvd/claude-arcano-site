// Clean View's checklist, kept under the plugin's own key so other mods can read it.

// Where the job stands. `waiting`: the turn ended with steps left, Claude waits for a reply.
// `stuck`: an API error or a refusal ended it.
export type Phase = 'idle' | 'working' | 'waiting' | 'stuck' | 'stopped' | 'done'

export type TaskStatus = 'done' | 'active' | 'upcoming'

export type Task = {
  id: string // `step-1` from plan_steps, a TaskCreate id, `todo-1` from TodoWrite, `placeholder-1`
  name: string // plain English, at most 40 characters
  status: TaskStatus
  percent: number // 0 to 100
  hasReported: boolean // report_progress has given this step a percent
}

export type Checklist = {
  jobId: number // a new prompt starts a new job; a late answer for an older one is dropped
  title: string // the job's name, 2 to 6 plain words
  phase: Phase
  tasks: Task[]
  isPlanned: boolean // a real plan arrived (plan_steps, TodoWrite, TaskCreate), not the placeholders
  needsYouReason: string | null // a permission prompt, a question, or a reply Claude waits for
  stuckReason: string | null
  startedAt: number // ms since the epoch
  finishedAt: number | null
  isCollapsed: boolean // a finished job shrinks to one line after 5 seconds
}

declare module 'claude-code' {
  interface PluginState {
    'clean-view': {
      cleanViewEnabled: boolean
      checklist: Checklist
      tick: number // the animation frame, advanced every 250ms while a job runs or waits on you
      failures: number // failed tool calls in a row
      apiError: string | null // the kind of API error that is ending the turn (StopFailure's word)
    }
  }
}
