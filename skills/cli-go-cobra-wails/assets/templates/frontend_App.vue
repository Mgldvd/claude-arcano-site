<!--
  Template: frontend/src/App.vue

  Minimal config screen skeleton, wired to the Config shape defined in
  internal/config/config.go (Provider, Scope, UI.Theme) and the bound
  methods in gui/bindings.go (LoadConfig, SaveConfig).

  This uses a <select> for Provider because this skill's default Config has
  a single Provider string. If a real project's config needs several
  independent boolean toggles instead (e.g. "enable N of these providers"),
  repeat the .checkbox-row markup per option and change Config.Provider to
  a []string — just keep that shape change in internal/config, not here.

  Note on types: this deliberately declares its own ConfigState interface
  instead of importing the generated `config.Config` type from
  wailsjs/go/models.ts. Wails' TypeScript codegen for structs — especially
  nested ones like our UIConfig field — has had version-dependent rough
  edges (see wails-facts.md and github.com/wailsapp/wails issues #1476,
  #2348, #2489). After your first `wails dev` run, check the real generated
  frontend/wailsjs/go/models.ts: if it cleanly exports `namespace config {
  class Config }`, feel free to import and use that type instead of this
  local mirror — just don't assume it sight-unseen.
-->
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { LoadConfig, SaveConfig } from '../../wailsjs/go/gui/App'
import { Quit } from '../../wailsjs/runtime/runtime'

interface ConfigState {
  provider: string
  scope: string
  ui: { theme: string }
}

const state = reactive<ConfigState>({
  provider: '',
  scope: 'project',
  ui: { theme: 'dark' },
})

const loaded = ref(false)
const saving = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    Object.assign(state, await LoadConfig())
  } catch (err) {
    error.value = String(err)
  } finally {
    loaded.value = true
  }
})

async function save() {
  saving.value = true
  error.value = ''
  try {
    await SaveConfig(state)
  } catch (err) {
    error.value = String(err)
  } finally {
    saving.value = false
  }
}

function cancel() {
  // No unsaved-state to discard beyond this window's local `state` ref —
  // nothing was persisted, so just quit. Plain `window.close()` is a
  // browser API and is NOT part of Wails' documented surface (it's a no-op
  // in most webviews for windows not opened via script); the actual Wails
  // v2 runtime export for this is `Quit()` from wailsjs/runtime/runtime,
  // which triggers app shutdown and returns control to the Go call that
  // is blocked in wails.Run (see wails-facts.md fact #10).
  Quit()
}
</script>

<template>
  <main class="window" v-if="loaded">
    <div class="field-group">
      <h2>Provider</h2>
      <select v-model="state.provider">
        <option value="claude">Claude</option>
        <option value="opencode">OpenCode</option>
        <option value="cursor">Cursor</option>
      </select>
    </div>

    <div class="field-group">
      <h2>Scope</h2>
      <select v-model="state.scope">
        <option value="project">Project</option>
        <option value="global">Global</option>
      </select>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="actions">
      <button @click="cancel">Cancel</button>
      <button class="primary" :disabled="saving" @click="save">
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </div>
  </main>
</template>
