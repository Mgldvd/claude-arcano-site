// The pane's data, as plain functions: what the listing, the plugin CLI, the SKILL.md files on
// disk and the skillOverrides setting say, folded into one list of skills, on and off.
import type { Catalog, DiskSkill, Known, PluginRow, Shown, SkillEntry } from '../types'

// Theme keys, not raw colors: each source's color follows the CLI's theme, light or dark.
const PALETTE = ['suggestion', 'autoAccept', 'ide', 'success', 'warning', 'bashBorder', 'planMode', 'claude', 'permission', 'merged']
const PLACES: Record<string, string> = {
  userSettings: 'personal',
  projectSettings: 'project',
  localSettings: 'local',
  policySettings: 'managed',
  syncedSkills: 'anthropic-skills',
  'built-in': 'claude code',
  bundled: 'claude code',
  mcp: 'mcp',
  plugin: 'plugin',
}
const FIRST = ['personal', 'project', 'local'] // your own skills lead, the rest by name
export const LAST = 'claude code' // and Claude Code's own close the list
// A skill ships with Claude Code when its listing says built-in or bundled, or its slash command is built in.
const CLAUDE_SOURCES = new Set(['built-in', 'bundled', 'builtin'])
// The skills claude.ai syncs on their own, outside any plugin, arrive under this namespace.
export const SYNCED_SKILLS = 'anthropic-skills'
// skillOverrides values that take a skill out of the model's listing.
const HIDING = new Set(['off', 'user-invocable-only'])

type Listing = {
  totalSkills: number
  includedSkills: number
  tokens: number
  skillFrontmatter: { name: string; source: string; pluginName?: string; tokens: number }[]
}

export type Sources = {
  listing: Listing | undefined
  commands: { name: string; description: string; source: string }[]
  plugins?: PluginRow[]
  disk?: DiskSkill[]
  overrides?: Record<string, string>
  known?: Known
}

export function toPlugins(json: unknown): PluginRow[] {
  if (!Array.isArray(json)) return []
  return json
    .filter((p): p is { id: string; enabled?: boolean; scope?: string; installPath?: string } => typeof p?.id === 'string')
    .map(p => ({
      id: p.id,
      name: p.id.split('@')[0]!,
      enabled: p.enabled !== false,
      isSynced: p.scope === 'synced' || p.id.endsWith('@synced'),
      ...(typeof p.installPath === 'string' ? { installPath: p.installPath } : {}),
    }))
}

// Every skill the session lists, then the ones it does not because they are off: a disabled
// plugin's (from disk) and the ones skillOverrides hides (from disk or from what was seen before).
export function toCatalog({ listing, commands, plugins = [], disk = [], overrides = {}, known = {} }: Sources): Catalog {
  const lines = new Map(commands.map(c => [c.name, c]))
  const byName = new Map(plugins.map(p => [p.name, p]))
  const byId = new Map(plugins.map(p => [p.id, p]))
  const paths = new Map(disk.map(d => [d.name, d.path]))
  const skills: SkillEntry[] = []
  const seen = new Set<string>()
  const add = (s: SkillEntry) => {
    if (seen.has(s.name)) return
    seen.add(s.name)
    skills.push(s)
  }

  for (const f of listing?.skillFrontmatter ?? []) {
    const at = f.name.indexOf(':')
    const command = lines.get(f.name)
    const isClaude = CLAUDE_SOURCES.has(f.source) || command?.source === 'builtin'
    const group = at > 0 ? f.name.slice(0, at) : isClaude ? LAST : (f.pluginName ?? PLACES[f.source] ?? f.source)
    const plugin = byName.get(group) ?? (f.pluginName ? byName.get(f.pluginName) : undefined)
    const isSynced = f.source === 'syncedSkills' || group === SYNCED_SKILLS || plugin?.isSynced === true
    const path = paths.get(f.name)
    add({
      name: f.name,
      short: at > 0 ? f.name.slice(at + 1) : f.name,
      group,
      kind: isClaude ? 'claude' : isSynced ? 'synced' : 'installed',
      description: oneLine(command?.description ?? ''),
      tokens: f.tokens,
      ...(plugin ? { plugin: plugin.id } : {}),
      ...(path ? { path } : {}),
      ...(overrides[f.name] ? { override: overrides[f.name] } : {}),
      isOff: false,
      canSwitch: !plugin,
    })
  }

  for (const d of disk) {
    const plugin = d.plugin ? byId.get(d.plugin) : undefined
    const isHidden = HIDING.has(overrides[d.name] ?? '')
    if (plugin ? plugin.enabled : !isHidden) continue // on, and listed (or past the listing's budget)
    const at = d.name.indexOf(':')
    add({
      name: d.name,
      short: at > 0 ? d.name.slice(at + 1) : d.name,
      group: at > 0 ? d.name.slice(0, at) : 'personal',
      kind: plugin?.isSynced || d.isSynced ? 'synced' : 'installed',
      description: oneLine(d.description),
      tokens: 0,
      ...(plugin ? { plugin: plugin.id } : {}),
      path: d.path,
      ...(overrides[d.name] ? { override: overrides[d.name] } : {}),
      isOff: true,
      canSwitch: !plugin,
    })
  }

  for (const [name, value] of Object.entries(overrides)) {
    if (!HIDING.has(value) || seen.has(name)) continue
    const was = known[name]
    const at = name.indexOf(':')
    add({
      name,
      short: at > 0 ? name.slice(at + 1) : name,
      group: was?.group ?? (at > 0 ? name.slice(0, at) : 'personal'),
      kind: was?.kind ?? 'installed',
      description: was?.description ?? '',
      tokens: 0,
      override: value,
      isOff: true,
      canSwitch: true,
    })
  }

  return {
    skills,
    total: listing?.totalSkills ?? 0,
    included: listing?.includedSkills ?? 0,
    tokens: listing?.tokens ?? 0,
  }
}

// What the pane lists: the shown skills by group, each group with its plugin when it is one,
// plus a disabled plugin that has no skill to show (so it can still be switched back on).
export function sections(skills: SkillEntry[], rows: PluginRow[], show: Shown, q: string) {
  const byName = new Map(rows.map(p => [p.name, p]))
  const list = grouped(filter(skills.filter(s => show[s.kind]), q)).map(([name, skills]) => ({ name, skills, plugin: byName.get(name) }))
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  for (const p of rows) {
    if (p.enabled || list.some(g => g.name === p.name)) continue
    if (!show[p.isSynced ? 'synced' : 'installed']) continue
    if (!words.every(w => p.name.toLowerCase().includes(w))) continue
    list.push({ name: p.name, skills: [], plugin: p })
  }
  return list.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))
}

// Every word of the query must appear in the name, the description or the group.
export function filter(skills: SkillEntry[], q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return skills
  return skills.filter(s => {
    const hay = `${s.name} ${s.group} ${s.description}`.toLowerCase()
    return words.every(w => hay.includes(w))
  })
}

// Groups in display order: your own first, then by name, Anthropic's last; within each,
// the skills that are on by name, then the ones that are off.
export function grouped(skills: SkillEntry[]): [string, SkillEntry[]][] {
  const by = new Map<string, SkillEntry[]>()
  for (const s of skills) by.set(s.group, [...(by.get(s.group) ?? []), s])
  return [...by.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([g, list]) => [g, list.sort((x, y) => Number(x.isOff) - Number(y.isOff) || x.short.localeCompare(y.short))])
}

// Anthropic's own skills close the list: the ones claude.ai syncs, then Claude Code's.
function rank(group: string) {
  if (FIRST.includes(group)) return FIRST.indexOf(group)
  if (group === SYNCED_SKILLS) return FIRST.length + 1
  if (group === LAST) return FIRST.length + 2
  return FIRST.length
}

// What the pane keeps of each skill it has seen on, merged into what it kept before.
export function remember(known: Known, skills: SkillEntry[]): Known {
  const next = { ...known }
  for (const s of skills) if (!s.isOff && s.description !== '') next[s.name] = { description: s.description, group: s.group, kind: s.kind }
  return next
}

// A SKILL.md's frontmatter `name` and `description`: plain, quoted, or a folded block.
export function frontmatter(text: string): { name?: string; description?: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!m) return {}
  const lines = m[1]!.split(/\r?\n/)
  const out: { name?: string; description?: string } = {}
  for (let i = 0; i < lines.length; i++) {
    const kv = /^(name|description):\s*(.*)$/.exec(lines[i]!)
    if (!kv) continue
    const key = kv[1] as 'name' | 'description'
    let value = kv[2]!.trim()
    if (/^[>|][-+]?$/.test(value)) {
      const block: string[] = []
      while (i + 1 < lines.length && /^\s+\S|^\s*$/.test(lines[i + 1]!)) block.push(lines[++i]!.trim())
      value = block.join(' ')
    } else if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      try {
        value = JSON.parse(value) as string
      } catch {
        value = value.slice(1, -1)
      }
    } else if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
      value = value.slice(1, -1).replaceAll("''", "'")
    }
    out[key] = oneLine(value)
  }
  return out
}

export function hue(group: string) {
  let h = 0
  for (const ch of group) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]!
}

export function tokens(n: number) {
  if (n >= 10_000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}k`
  return String(n)
}

// The CLI's --json output, read from its last JSON value (a warning line may come first).
export function lastJson(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    for (const line of trimmed.split('\n').reverse()) {
      try {
        return JSON.parse(line)
      } catch {}
    }
    return undefined
  }
}

export function oneLine(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}
