// The pane's data, as plain functions: a list of paths folded into an editor's tree, the rows
// it shows with some folders open, a quick search, and what the chat reads of the picked files.

export type TreeNode = {
  name: string // what the row shows: `hooks`, or `src/app` for a compacted chain of folders
  path: string // relative to the project, `src/app/main.ts`; '' for the root
  kind: 'dir' | 'file'
  children: TreeNode[]
}

export type Row = { node: TreeNode; depth: number }

// One picked file as the hook found it when the prompt went out.
export type Picked = {
  path: string
  text?: string // its contents, when attached now
  note?: 'unchanged' | 'missing' | 'binary' | 'large' | 'path' // why its contents are not attached
}

// Folders a walk never enters (a repository's .gitignore says this on its own).
export const SKIP = new Set(['.git', 'node_modules', '.venv', 'venv', '__pycache__', '.next', '.nuxt', '.turbo', '.cache', 'target', 'dist', 'build', '.gradle', '.idea'])

// File kinds by the theme's keys, so the colors follow the CLI's theme, light or dark.
const KINDS: [string, string][] = [
  ['ide', 'ts tsx mts cts'],
  ['warning', 'js jsx mjs cjs'],
  ['autoAccept', 'json jsonc yaml yml toml ini env lock xml'],
  ['permission', 'md mdx txt rst'],
  ['planMode', 'py rs go java kt swift c h cc cpp hpp cs qml dart scala'],
  ['bashBorder', 'html htm css scss sass less vue svelte'],
  ['success', 'sh zsh bash fish ps1'],
  ['claude', 'sql lua rb php'],
]
const COLORS: Record<string, string> = Object.fromEntries(KINDS.flatMap(([key, exts]) => exts.split(' ').map(ext => [ext, key])))

// The tree of a list of file paths: folders first, then files, each by name; a folder holding
// one folder and nothing else shows as one row (`src/app`), as an editor's compact folders do.
export function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: '', path: '', kind: 'dir', children: [] }
  const dirs = new Map<string, TreeNode>([['', root]])
  for (const path of paths) {
    const parts = path.split('/')
    let parent = root
    for (let i = 0; i < parts.length - 1; i++) {
      const at = parts.slice(0, i + 1).join('/')
      let dir = dirs.get(at)
      if (!dir) {
        dir = { name: parts[i]!, path: at, kind: 'dir', children: [] }
        dirs.set(at, dir)
        parent.children.push(dir)
      }
      parent = dir
    }
    parent.children.push({ name: parts.at(-1)!, path, kind: 'file', children: [] })
  }
  return compact(sort(root))
}

function sort(node: TreeNode): TreeNode {
  node.children.sort((a, b) => (a.kind === b.kind ? byName(a.name, b.name) : a.kind === 'dir' ? -1 : 1))
  for (const child of node.children) if (child.kind === 'dir') sort(child)
  return node
}

function compact(node: TreeNode): TreeNode {
  node.children = node.children.map(child => {
    if (child.kind !== 'dir') return child
    let merged = child
    while (merged.children.length === 1 && merged.children[0]!.kind === 'dir') {
      const only = merged.children[0]!
      merged = { ...only, name: `${merged.name}/${only.name}` }
    }
    return compact(merged)
  })
  return node
}

// The rows the tree shows: every child of an open folder, depth first.
export function visibleRows(root: TreeNode, expanded: Set<string>): Row[] {
  const rows: Row[] = []
  const visit = (node: TreeNode, depth: number) => {
    for (const child of node.children) {
      rows.push({ node: child, depth })
      if (child.kind === 'dir' && expanded.has(child.path)) visit(child, depth + 1)
    }
  }
  visit(root, 0)
  return rows
}

// Every file under a folder (or the file itself).
export function filesUnder(node: TreeNode): string[] {
  if (node.kind === 'file') return [node.path]
  return node.children.flatMap(filesUnder)
}

// Quick open: every word in the path, the ones whose name matches first, shorter paths before longer.
export function search(paths: string[], q: string, limit = 60): string[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const hits = paths.filter(p => {
    const hay = p.toLowerCase()
    return words.every(w => hay.includes(w))
  })
  const inName = (p: string) => words.some(w => baseName(p).toLowerCase().includes(w))
  return hits.sort((a, b) => Number(inName(b)) - Number(inName(a)) || a.length - b.length || a.localeCompare(b)).slice(0, limit)
}

// The folders that lead to a path, so the tree can unfold down to it.
export function parents(path: string): string[] {
  const parts = path.split('/')
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'))
}

// What the chat reads beside the prompt: one block naming every picked file and why some carry
// no text, then one block per file attached now (each block is read whole up to 100,000 characters).
export function compose(picked: Picked[]): string[] {
  if (picked.length === 0) return []
  const attached = picked.filter(p => p.text !== undefined)
  const line = (p: Picked) => {
    if (p.text !== undefined) return `- ${p.path} (attached below)`
    if (p.note === 'unchanged') return `- ${p.path} (unchanged since it was attached earlier in this conversation)`
    if (p.note === 'missing') return `- ${p.path} (no longer exists)`
    if (p.note === 'binary') return `- ${p.path} (a binary file, not attached)`
    if (p.note === 'large') return `- ${p.path} (too large to attach: read the parts you need)`
    return `- ${p.path}`
  }
  const isPathsOnly = picked.every(p => p.note === 'path')
  const head = [
    isPathsOnly
      ? 'The user picked these files in the Files pane as the context of this message; read them as needed:'
      : 'The user picked these files in the Files pane as the context of this message:',
    ...picked.map(line),
  ].join('\n')
  return [head, ...attached.map(p => `<file path="${p.path}">\n${p.text}${p.text!.endsWith('\n') ? '' : '\n'}</file>`)]
}

export function isBinary(text: string) {
  return text.slice(0, 8000).includes('\u0000')
}

export function colorOf(path: string) {
  const name = baseName(path)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? COLORS[name.slice(dot + 1).toLowerCase()] : undefined
}

export function baseName(path: string) {
  return path.slice(path.lastIndexOf('/') + 1)
}

export function dirName(path: string) {
  const at = path.lastIndexOf('/')
  return at < 0 ? '' : path.slice(0, at)
}

// Roughly what a text costs the context: four bytes a token.
export function tokens(bytes: number) {
  const n = Math.ceil(bytes / 4)
  if (n >= 10_000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}k`
  return String(n)
}

function byName(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
}
