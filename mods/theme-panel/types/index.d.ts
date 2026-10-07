// The theme as this session has it, and the pane's own custom theme.
export type Themes = {
  current: string // the /config theme row's value: a built-in theme, or `custom:<slug>`
  options: string[] // the built-in themes, in the menu's order
  isLocked: boolean // a trusted source owns it: shown, not changed
  isLive: boolean // the session draws the pane's own custom theme, so a press repaints at once
  base: string // the built-in theme that custom theme is drawn from
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
