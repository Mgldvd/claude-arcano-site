// The mods of this plugin, each registered from its own file; Clean View is the first.
import type { Register } from 'claude-code'

import { registerCleanView } from './clean-view'

export const register: Register = on => {
  registerCleanView(on)
}
