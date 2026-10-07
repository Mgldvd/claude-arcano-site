// What the footer shows: the session's model and the effort it thinks with.
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max' | 'auto'

declare module 'claude-code' {
  interface PluginState {
    'model-switch': {
      model: string // the id the session runs, `claude-opus-5-5`
      models: string[] // the aliases a click cycles through, `fable`, `opus`, `sonnet`, `haiku`
      effort: Effort // the level picked (`auto` leaves it to the model)
      applied: string // the level the last request went out with, `medium`; '' before any
      busy: boolean
    }
  }
}
