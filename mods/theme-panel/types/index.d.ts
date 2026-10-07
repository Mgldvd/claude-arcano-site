// One theme the pane offers.
export type Theme = {
  value: string // what /config theme= takes: a built-in name, or `custom:<slug>`
  name: string // as the pane shows it
}

// The themes this session can switch to, and the one saved now.
export type Themes = {
  current: string // the theme shown now, in /config's spelling (the one the pane's own copies, while in use)
  isProxy: boolean // the pane's own theme is in use: a press repaints through its file
  builtIn: Theme[]
  custom: Theme[] // <config>/themes/*.json
  isLocked: boolean // a trusted source owns it: shown, not changed
}

declare module 'claude-code' {
  interface PluginState {
    'theme-panel': {
      themes: Themes | null // null until read
      pending: string | null // the theme being switched to
      isOpen: boolean
    }
  }
}
