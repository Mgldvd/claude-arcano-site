// Where a skill comes from: one the person installed (a plugin, their own, the project's,
// managed), one synced from their claude.ai account, or one that ships with Claude Code.
export type Kind = 'installed' | 'synced' | 'claude'

export type Shown = Record<Kind, boolean>

export type SkillEntry = {
  name: string // as the Skill tool and the slash command call it (`superpowers:brainstorming`)
  short: string // the name without its namespace (`brainstorming`)
  group: string // the plugin or place it comes from
  kind: Kind
  description: string
  tokens: number // what its listing costs the context; 0 while it is off
  plugin?: string // the id of the plugin it comes with
  path?: string // its SKILL.md, when read from disk
  override?: string // its skillOverrides value, when one is set
  isOff: boolean // its plugin is disabled, or skillOverrides hides it
  canSwitch: boolean // a skill of its own (no plugin), switched through skillOverrides
}

export type Catalog = {
  skills: SkillEntry[]
  total: number // skills the session has
  included: number // skills the listing fit in its budget
  tokens: number // the listing's tokens in all
}

// One plugin as `claude plugin list --json` reports it.
export type PluginRow = {
  id: string // `superpowers@anthropic-plugin-directory`, `figma@synced`
  name: string // `superpowers`, the namespace its skills carry
  enabled: boolean
  isSynced: boolean // synced from claude.ai
  installPath?: string
}

// A skill read from its SKILL.md on disk: what the pane shows of it while it is off.
export type DiskSkill = {
  name: string // namespaced as the listing would name it
  description: string
  path: string
  plugin?: string // the id of the plugin it comes with
  isSynced?: boolean // a skill claude.ai syncs on its own
}

// What the pane last saw of each listed skill, so one hidden later can still be shown.
export type Known = Record<string, { description: string; group: string; kind: Kind }>

declare module 'claude-code' {
  interface PluginState {
    'skills-panel': {
      catalog: Catalog | null
      query: string
      collapsed: string[]
      opened: string[] // groups of a disabled plugin the person unfolded
      expanded: string[] // skills whose details are open
      isOpen: boolean
      shown: Shown
      plugins: PluginRow[]
      disk: DiskSkill[]
      overrides: Record<string, string>
      pending: string[] // plugin ids and skill names being switched
    }
  }
}
