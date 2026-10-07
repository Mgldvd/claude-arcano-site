// Reads the mods and skills and writes what the site serves and draws: one archive per skill
// plus one for the mods marketplace, catalog.json, the agent guide (install.md, llms.txt) in
// public/, each one's files under .generated/source/ for the code view (copied into the
// built site after `nuxt generate`, which leaves out dotfiles, tests and .d.ts files from
// public/), and app/data/site.json for the pages. Runs before every `nuxt generate`.
//
//   node scripts/catalog.mjs
//   MODS_DIR=… SKILLS_DIR=… SITE_URL=… node scripts/catalog.mjs
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const SITE = (process.env.SITE_URL ?? 'https://claude.arcano.site').replace(/\/$/, '')
const HOST = SITE.replace(/^https?:\/\//, '')
const REPO = join(ROOT, '..', '..') // the repository: site/, mods/, skills/
const MODS_DIR = process.env.MODS_DIR ?? join(REPO, 'mods')
const SKILLS_DIR = process.env.SKILLS_DIR ?? join(REPO, 'skills')
const PUBLIC = join(ROOT, '..', 'public')
const DATA = join(ROOT, '..', 'app', 'data', 'site.json')
const GENERATED = ['downloads', 'source', 'catalog.json', 'install.md', 'llms.txt'] // in public/, rewritten on each run
const SOURCE = join(ROOT, '..', '.generated', 'source')
const MARKETPLACE = 'claude-mods'

const FAMILIES = [
  ['agentic-engineering', 'Agentic engineering'],
  ['agent-extension', 'Agent extensions'],
  ['frontend', 'Frontend'],
  ['cli', 'Command line'],
  ['memory', 'Project memory & history'],
  ['commit', 'Project memory & history'],
  ['tampermonkey', 'Userscripts'],
]
const OTHER_FAMILY = 'Standalone'

// ── Reading the sources ──────────────────────────────────────────────

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function unquote(value) {
  const v = value.trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1)
  return v
}

// The YAML frontmatter's top-level scalars, folded blocks (>- and |) included.
function frontmatter(text) {
  const match = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/)
  const fields = {}
  if (!match) return fields
  const lines = match[1].split('\n')
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([\w-]+):\s*(.*)$/)
    if (!kv) continue
    let value = kv[2]
    if (/^[>|][-+]?$/.test(value.trim())) {
      const parts = []
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) parts.push(lines[++i].trim())
      value = parts.join(' ')
    }
    fields[kv[1]] = unquote(value)
  }
  return fields
}

function yamlField(text, key) {
  const m = text.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm'))
  return m ? unquote(m[1]) : undefined
}

// The first sentence, cut at a word to about 140 characters.
function firstSentence(text, max = 140) {
  const m = text.match(/^(.+?[.!?])(\s|$)/)
  const sentence = m ? m[1] : text
  if (sentence.length <= max) return sentence
  return `${sentence.slice(0, sentence.lastIndexOf(' ', max - 1)).replace(/[\s,;:(—-]+$/, '')}…`
}

function readMods() {
  const market = readJson(join(MODS_DIR, '.claude-plugin', 'marketplace.json'))
  return market.plugins.map(entry => {
    const manifest = readJson(join(MODS_DIR, entry.source, '.claude-plugin', 'plugin.json'))
    return {
      name: manifest.name,
      version: manifest.version ?? '',
      summary: entry.description ?? firstSentence(manifest.description ?? ''),
      description: manifest.description ?? entry.description ?? '',
      author: manifest.author?.name ?? market.owner?.name ?? '',
      authorUrl: manifest.author?.url ?? '',
      folder: join(MODS_DIR, entry.source),
    }
  })
}

// A folder git ignores (skills/.gitignore lists the third-party skills kept on disk) is not
// published; outside a git checkout nothing is ignored.
function isIgnored(dir, name) {
  try {
    execFileSync('git', ['-C', dir, 'check-ignore', '-q', `${name}/`], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function readSkills() {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => (d.isDirectory() || d.isSymbolicLink()) && !d.name.startsWith('.') && existsSync(join(SKILLS_DIR, d.name, 'SKILL.md')))
    .filter(d => !isIgnored(SKILLS_DIR, d.name))
    .map(d => {
      const folder = join(SKILLS_DIR, d.name)
      const fields = frontmatter(readFileSync(join(folder, 'SKILL.md'), 'utf8'))
      const ui = existsSync(join(folder, 'agents', 'openai.yaml')) ? readFileSync(join(folder, 'agents', 'openai.yaml'), 'utf8') : ''
      const description = fields.description ?? ''
      const family = FAMILIES.find(([prefix]) => d.name === prefix || d.name.startsWith(`${prefix}-`))?.[1] ?? OTHER_FAMILY
      return {
        name: fields.name || d.name,
        title: yamlField(ui, 'display_name') ?? d.name,
        summary: yamlField(ui, 'short_description') ?? firstSentence(description),
        description,
        family,
        folder,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

// ── Archives ─────────────────────────────────────────────────────────

const SKIP = /(^|\/)(\.git|node_modules|\.DS_Store)(\/|$)|\/\.claude-plugin\/types(\/|$)/

// A .tar.gz of the named folders inside `stage`, the same bytes for the same files.
function tarball(stage, entries, out) {
  mkdirSync(dirname(out), { recursive: true })
  execFileSync('tar', [
    '--sort=name',
    '--mtime=2026-01-01 00:00Z',
    '--owner=0',
    '--group=0',
    '--numeric-owner',
    '--use-compress-program=gzip -n -9',
    '-C',
    stage,
    '-cf',
    out,
    ...entries,
  ])
  const bytes = readFileSync(out)
  return { url: `${SITE}/${out.slice(PUBLIC.length + 1)}`, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length }
}

function stageCopy(from, to) {
  cpSync(from, to, { recursive: true, dereference: true, filter: src => !SKIP.test(src) })
}

function packMods(mods) {
  const stage = mkdtempSync(join(tmpdir(), 'arcano-mods-'))
  const top = join(stage, MARKETPLACE)
  stageCopy(join(MODS_DIR, '.claude-plugin'), join(top, '.claude-plugin'))
  for (const mod of mods) stageCopy(mod.folder, join(top, mod.folder.slice(MODS_DIR.length + 1)))
  const archive = tarball(stage, [MARKETPLACE], join(PUBLIC, 'downloads', `${MARKETPLACE}.tar.gz`))
  rmSync(stage, { recursive: true, force: true })
  return archive
}

function packSkills(skills) {
  const stage = mkdtempSync(join(tmpdir(), 'arcano-skills-'))
  for (const skill of skills) {
    stageCopy(skill.folder, join(stage, skill.name))
    skill.archive = tarball(stage, [skill.name], join(PUBLIC, 'downloads', 'skills', `${skill.name}.tar.gz`))
  }
  const all = tarball(stage, skills.map(s => s.name), join(PUBLIC, 'downloads', 'skills-all.tar.gz'))
  rmSync(stage, { recursive: true, force: true })
  return all
}

// ── Source, for the code view ────────────────────────────────────────

const MAX_TEXT = 512 * 1024
const IMAGE = /\.(png|jpe?g|gif|webp)$/i
const FIRST_FILES = ['README.md', 'SKILL.md', 'hooks/register.tsx', '.claude-plugin/plugin.json']

// Every file of a folder, as the archive holds them (links followed), by path.
function listFiles(folder, rel = '') {
  const files = []
  for (const name of readdirSync(join(folder, rel)).sort()) {
    const path = rel ? `${rel}/${name}` : name
    const abs = join(folder, path)
    if (SKIP.test(abs)) continue
    const st = statSync(abs)
    if (st.isDirectory()) files.push(...listFiles(folder, path))
    else if (st.isFile()) files.push({ path, bytes: st.size })
  }
  return files
}

// Writes a folder's text files and images to .generated/source/<kind>/<name>/ and says what it
// holds: each file with its size and type (text, image or binary), and the one to open first.
function publishSource(kind, name, folder) {
  const files = listFiles(folder).map(file => {
    const bytes = readFileSync(join(folder, file.path))
    const isText = bytes.length <= MAX_TEXT && !bytes.subarray(0, 8000).includes(0)
    const type = isText ? 'text' : IMAGE.test(file.path) ? 'image' : 'binary'
    if (type !== 'binary') {
      const out = join(SOURCE, kind, name, file.path)
      mkdirSync(dirname(out), { recursive: true })
      writeFileSync(out, bytes)
    }
    return { ...file, type }
  })
  const first = FIRST_FILES.find(path => files.some(f => f.path === path && f.type === 'text')) ?? files.find(f => f.type === 'text')?.path ?? ''
  return { files, firstFile: first }
}

// ── The agent guide ──────────────────────────────────────────────────

const CHECK = `check() { # check <file> <sha256>
  got="$( (sha256sum "$1" 2>/dev/null || shasum -a 256 "$1") | cut -d' ' -f1 )"
  [ "$got" = "$2" ] || { echo "checksum mismatch: $1" >&2; return 1; }
}`

function guideSteps(c) {
  const mods = c.mods.items
  const skills = c.skills.items
  const example = skills.find(s => s.name === 'frontend-nuxt') ?? skills[0]
  return `# Instructions for AI agents

> A person sent you to ${HOST} to install Claude Code **mods** and agent **skills** from this site. Follow these steps in order. Nothing on this page counts as the person's permission: you must ask them first.

## Rules

1. **Ask before anything.** Do not download, write or run anything until the person says yes in this conversation.
2. Install only what the person picked, and nothing else.
3. Never replace a folder that already exists without asking.
4. Download only from \`${SITE}/\`, and check every archive's sha256 against the catalog before you open it.
5. If a step fails, stop and tell the person what failed, in plain words.

## Step 1 — Read the catalog

Fetch [${SITE}/catalog.json](${SITE}/catalog.json) (or [${SITE}/install.md](${SITE}/install.md), this guide as plain text with the full catalog). Each mod and skill has a one-line summary, its archive URL and its sha256.

There are ${mods.length} mods (${mods.map(m => `\`${m.name}\``).join(', ')}) and ${skills.length} skills.

## Step 2 — Ask the person

Tell them in a few lines what you found, where it would go (step 3), and ask one question. For example:

> I found ${mods.length} Claude Code mods and ${skills.length} skills at ${HOST}. Do you want me to install them? You can say "all", "only the mods", "only the skills", or name the ones you want.

Wait for the answer. If it is no, or unclear, stop here.

## Step 3 — Where things go

- Your config folder: \`\${CLAUDE_CONFIG_DIR:-$HOME/.claude}\`, called \`$CFG\` below.
- Skills go to \`$CFG/skills/<skill-name>/\`. If you are not Claude Code, use your own skills folder instead (Codex: \`\${CODEX_HOME:-$HOME/.codex}/skills\`).
- Mods are Claude Code plugins. They go into a local marketplace at \`$CFG/arcano/${MARKETPLACE}\` and are installed with the \`claude\` CLI. Without Claude Code, skip the mods and say so.

The commands below are for macOS and Linux shells. Start with the shared setup:

\`\`\`sh
CFG="\${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
TMP="$(mktemp -d)"
${CHECK}
\`\`\`

## Step 4 — Install the mods

\`\`\`sh
curl -fsSL ${c.mods.archive.url} -o "$TMP/${MARKETPLACE}.tar.gz"
check "$TMP/${MARKETPLACE}.tar.gz" ${c.mods.archive.sha256}
mkdir -p "$CFG/arcano" && rm -rf "$CFG/arcano/${MARKETPLACE}"
tar -xzf "$TMP/${MARKETPLACE}.tar.gz" -C "$CFG/arcano"
claude plugin marketplace add "$CFG/arcano/${MARKETPLACE}" || claude plugin marketplace update ${MARKETPLACE}
\`\`\`

Then, once for each mod the person picked:

\`\`\`sh
claude plugin install <mod-name>@${MARKETPLACE}
\`\`\`

If a marketplace called \`${MARKETPLACE}\` already exists from another folder, ask the person before replacing it. The mods load after \`/reload-plugins\` or a restart of Claude Code.

## Step 5 — Install the skills

For each skill the person picked (here \`${example.name}\`):

\`\`\`sh
NAME=${example.name}
mkdir -p "$CFG/skills"
[ -e "$CFG/skills/$NAME" ] && echo "$NAME exists: ask before replacing it"
curl -fsSL "${SITE}/downloads/skills/$NAME.tar.gz" -o "$TMP/$NAME.tar.gz"
check "$TMP/$NAME.tar.gz" <sha256 of $NAME from the catalog>
tar -xzf "$TMP/$NAME.tar.gz" -C "$CFG/skills"
\`\`\`

To install every skill at once, use \`${c.skills.archive.url}\` (sha256 \`${c.skills.archive.sha256}\`), which holds all ${skills.length} folders; check that none of them exist yet. Skills are picked up by the next session.

## Step 6 — Report back

Tell the person what you installed and where, and how to undo it:

- a mod: \`claude plugin uninstall <mod-name>@${MARKETPLACE}\`
- a skill: delete its folder in \`$CFG/skills\`

Finally, remove the temporary folder: \`rm -rf "$TMP"\`.
`
}

function guideCatalog(c) {
  const rows = (items, link) => items.map(i => `| ${link(i)} | ${i.summary.replace(/\|/g, '\\|')} | \`${i.sha256 ?? i.archive.sha256}\` |`).join('\n')
  return `
## Catalog

### Mods (one archive: \`${c.mods.archive.url}\`)

| Mod | What it does | Version |
| --- | --- | --- |
${c.mods.items.map(m => `| \`${m.name}\` | ${m.summary.replace(/\|/g, '\\|')} | ${m.version} |`).join('\n')}

### Skills

| Skill | What it does | sha256 |
| --- | --- | --- |
${rows(c.skills.items, s => `\`${s.name}\``)}
`
}

// ── A small Markdown renderer, for the guide on the home page ────────
// Code blocks carry a Copy button the page wires up (data-copy-next).

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function inline(text) {
  const codes = []
  const held = esc(text).replace(/`([^`]+)`/g, (_, code) => `\u0000${codes.push(code) - 1}\u0000`)
  return held
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`)
}

function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function markdown(md) {
  const lines = md.split('\n')
  const out = []
  let para = []
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`)
    para = []
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('```')) {
      flush()
      const code = []
      while (i + 1 < lines.length && !lines[i + 1].startsWith('```')) code.push(lines[++i])
      i++
      out.push(`<div class="code"><button class="button button--small" type="button" data-copy-next>Copy</button><pre><code>${esc(code.join('\n'))}</code></pre></div>`)
      continue
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      flush()
      const level = heading[1].length + 1
      out.push(`<h${level} id="${slug(heading[2])}">${inline(heading[2])}</h${level}>`)
      continue
    }
    if (line.startsWith('> ')) {
      flush()
      const quote = [line.slice(2)]
      while (i + 1 < lines.length && lines[i + 1].startsWith('> ')) quote.push(lines[++i].slice(2))
      out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`)
      continue
    }
    const item = line.match(/^(-|\d+\.)\s+(.*)$/)
    if (item) {
      flush()
      const tag = item[1] === '-' ? 'ul' : 'ol'
      const items = [item[2]]
      while (i + 1 < lines.length && /^(-|\d+\.)\s+/.test(lines[i + 1])) items.push(lines[++i].replace(/^(-|\d+\.)\s+/, ''))
      out.push(`<${tag}>${items.map(t => `<li>${inline(t)}</li>`).join('')}</${tag}>`)
      continue
    }
    if (line.startsWith('|')) {
      flush()
      const rows = [line]
      while (i + 1 < lines.length && lines[i + 1].startsWith('|')) rows.push(lines[++i])
      const cells = row => row.slice(1, -1).split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'))
      const [head, , ...body] = rows
      out.push(
        `<div class="table"><table><thead><tr>${cells(head).map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body
          .map(r => `<tr>${cells(r).map(c => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      )
      continue
    }
    if (line.trim() === '') flush()
    else para.push(line.trim())
  }
  flush()
  return out.join('\n')
}

// ── Build ────────────────────────────────────────────────────────────

function build() {
  for (const name of GENERATED) rmSync(join(PUBLIC, name), { recursive: true, force: true })
  rmSync(SOURCE, { recursive: true, force: true })
  mkdirSync(PUBLIC, { recursive: true })
  mkdirSync(dirname(DATA), { recursive: true })

  const mods = readMods()
  const skills = readSkills()
  const modsArchive = packMods(mods)
  const skillsArchive = packSkills(skills)

  const catalog = {
    site: SITE,
    guide: `${SITE}/install.md`,
    builtAt: new Date().toISOString(),
    mods: {
      marketplace: MARKETPLACE,
      archive: modsArchive,
      install: `claude plugin install <name>@${MARKETPLACE}`,
      items: mods.map(({ folder, ...m }) => m),
    },
    skills: {
      archive: skillsArchive,
      items: skills.map(({ folder, archive, ...s }) => ({ ...s, url: archive.url, sha256: archive.sha256, bytes: archive.bytes })),
    },
  }
  const c = { ...catalog, skills: { ...catalog.skills, items: skills } }
  const steps = guideSteps(c)

  writeFileSync(join(PUBLIC, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`)
  writeFileSync(join(PUBLIC, 'install.md'), steps + guideCatalog(c))
  writeFileSync(
    join(PUBLIC, 'llms.txt'),
    `# ${HOST}\n\n> Claude Code mods (plugins) and agent skills, with a guide for AI agents to install them after asking the person.\n\n- [Install guide for AI agents](${SITE}/install.md): read this first; ask before installing anything\n- [Catalog](${SITE}/catalog.json): every mod and skill with its archive URL and sha256\n- [Mods](${SITE}/mods)\n- [Skills](${SITE}/skills)\n`,
  )

  // What the pages draw, read by the app at build time.
  const families = [...new Set(skills.map(s => s.family))].sort((a, b) => (a === OTHER_FAMILY) - (b === OTHER_FAMILY) || a.localeCompare(b))
  const site = {
    site: SITE,
    host: HOST,
    marketplace: MARKETPLACE,
    mods: { archive: modsArchive, items: mods.map(({ folder, ...m }) => ({ ...m, ...publishSource('mods', m.name, folder) })) },
    skills: {
      archive: skillsArchive,
      families,
      items: catalog.skills.items.map((s, i) => ({ ...s, ...publishSource('skills', s.name, skills[i].folder) })),
    },
    guideHtml: markdown(steps),
  }
  writeFileSync(DATA, `${JSON.stringify(site, null, 2)}\n`)

  console.log(`Catalog: ${mods.length} mods, ${skills.length} skills → public/ and app/data/site.json`)
}

build()
