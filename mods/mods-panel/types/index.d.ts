// One mod of the mods folder, and how this session has it.
export type Mod = {
  name: string // plugin.json's name, also its folder's
  description: string
  version: string
  folder: string // absolute
  isLive: boolean // linked into this session's hot-reload folder
  installedId?: string // `<name>@<marketplace>` when installed as a plugin
  isInstalledOn: boolean // installed and enabled
}

declare module 'claude-code' {
  interface PluginState {
    'mods-panel': {
      mods: Mod[] | null
      pending: string[] // mods being switched
      isOpen: boolean
    }
  }
}
