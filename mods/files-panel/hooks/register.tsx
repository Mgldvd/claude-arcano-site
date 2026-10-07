// Files Panel: the project's files as an editor's sidebar, and the ones the chat should see.
//   A side pane with the session's folder as a tree (folders first, single-folder chains
//   compacted, .gitignore respected in a repository). Tick a file, or a folder for every file
//   in it, and each message you send carries them as context: a file's text the first time and
//   whenever it changes, its name alone while it stays as it was. "contents" off sends the
//   paths only, for Claude to read itself. A filter finds a file by any part of its path.
//   The picks are kept per project across sessions; /files-panel opens or closes the pane.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Index, Sent } from '../types'
import { baseName, buildTree, colorOf, compose, dirName, filesUnder, isBinary, parents, search, SKIP, tokens, visibleRows } from './tree'
import type { Picked, TreeNode } from './tree'

const PANE = 'files-panel'
const TITLE = 'Files'
const ACCENT = 'claude' // the theme's own accent, so the pane follows the CLI's theme
const MAX_FILES = 5_000 // a walk outside a repository stops here
const MAX_FOLDER_PICK = 60 // a folder with more files is picked file by file
const MAX_FILE_BYTES = 90_000 // past this a file is named, not attached
const MAX_TOTAL_CHARS = 180_000 // what one message attaches in all (the engine reads 200,000)
const GIT_TIMEOUT = 15_000

// Held by the host, so the pane survives a hot reload of this file.
const index = atom({ plugin: 'files-panel', key: 'index' } as const, null as Index | null)
const query = atom({ plugin: 'files-panel', key: 'query' } as const, '')
const expanded = atom({ plugin: 'files-panel', key: 'expanded' } as const, [] as string[])
const selected = atom({ plugin: 'files-panel', key: 'selected' } as const, [] as string[])
const sizes = atom({ plugin: 'files-panel', key: 'sizes' } as const, {} as Record<string, number>)
const sent = atom({ plugin: 'files-panel', key: 'sent' } as const, { session: '', at: {} } as Sent)
const isContents = atom({ plugin: 'files-panel', key: 'isContents' } as const, true)
const isOpen = atom({ plugin: 'files-panel', key: 'isOpen' } as const, false)
const isLoading = atom({ plugin: 'files-panel', key: 'isLoading' } as const, false)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await $.command.register({ name: 'files-panel', description: 'Open or close the project files side pane' }).catch(() => {})
    const project = await $.session.cwd()
    const kept = (key: string) => $.store.get(`${key}:${project}`).catch(() => undefined)
    const picks = await kept('selected')
    if (Array.isArray(picks)) await update($, selected, () => picks.filter((p): p is string => typeof p === 'string'))
    const folders = await kept('expanded')
    if (Array.isArray(folders)) await update($, expanded, () => folders.filter((p): p is string => typeof p === 'string'))
    const mode = await $.store.get('isContents').catch(() => undefined)
    if (typeof mode === 'boolean') await update($, isContents, () => mode)
    void reload($).catch(() => {})
    const isClosedByHand = (await $.store.get('isClosedByHand').catch(() => undefined)) === true
    if (!isClosedByHand) await open($).catch(() => {})
    return r
  })

  // A file Claude created or deleted shows up in the tree; a picked one that changed is resent.
  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (!e.agentId && (await read($, isOpen))) await reload($).catch(() => {})
    return r
  })

  // The summary keeps no file's text: after a compaction every picked file is attached again.
  on('session.compact', async ($, e, next) => {
    const r = await next(e)
    if (!e.agentId) await update($, sent, s => ({ ...s, at: {} }))
    return r
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind !== 'composer' && e.origin.kind !== 'bridge') return next(e)
    const picks = await read($, selected)
    if (picks.length === 0) return next(e)
    const blocks = await gather($, picks).catch(() => [] as string[])
    if (blocks.length === 0) return next(e)
    return next({ ...e, context: [...(e.context ?? []), ...blocks] })
  })

  on('command.run', { command: 'files-panel' }, async $ => {
    if (await read($, isOpen)) {
      await $.ui.close({ id: PANE })
      return { text: 'Files pane closed. /files-panel opens it again' }
    }
    void reload($).catch(() => {})
    await open($, true)
    return { text: 'Files pane open' }
  })

  on('ui.close', async ($, e, next) => {
    const r = await next(e)
    if (e.id !== PANE) return r
    await update($, isOpen, () => false)
    if (e.origin.kind !== 'unload') await $.store.set('isClosedByHand', true).catch(() => {}) // a reload is not the person closing it
    return r
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Text, Button } = elements
    const Input = 'Input' in elements ? elements.Input : undefined // the mobile app draws no text field
    const idx = await read($, index)
    const q = await read($, query)
    const picks = await read($, selected)
    const bytes = await read($, sizes)
    const was = await read($, sent)
    const withText = await read($, isContents)
    const loading = await read($, isLoading)
    const open = new Set(await read($, expanded))
    const width = Math.max(10, e.props.bodyColumns - 2) // inside the side padding
    const project = baseName(await $.session.cwd()) || '/'

    const picked = new Set(picks)
    const total = picks.reduce((n, p) => n + (bytes[p] ?? 0), 0)
    const right = picks.length > 0 ? `${picks.length} in context${withText ? ` · ~${tokens(total)} tok` : ''}` : idx ? `${idx.paths.length} files` : ''

    const pick = (paths: string[], isOn: boolean) => void setPicked($, paths, isOn)
    const toggleFolder = (path: string) => void update($, expanded, l => (l.includes(path) ? l.filter(x => x !== path) : [...l, path])).then(() => keep($, 'expanded'))
    const pickFolder = (node: TreeNode) => {
      const files = filesUnder(node)
      const isAll = files.every(f => picked.has(f))
      if (!isAll && files.length > MAX_FOLDER_PICK) {
        $.ui.toast(`${node.name} has ${files.length} files: open it and pick the ones you need`)
        return
      }
      pick(files, !isAll)
    }
    const reveal = (path: string) =>
      void update($, expanded, l => [...new Set([...l, ...parents(path)])])
        .then(() => update($, query, () => ''))
        .then(() => keep($, 'expanded'))

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text wrap="truncate-end">
            <Text color={ACCENT}>{'✦ '}</Text>
            <Text bold>{TITLE}</Text>
          </Text>
          <Text dimColor wrap="truncate-start">
            {right}
          </Text>
        </Box>
        <Text dimColor>{'─'.repeat(width)}</Text>
        {Input && (
          <Input
            key="filter"
            placeholder="Find a file by any part of its path…"
            value={q}
            onInput={(value: string) => void update($, query, () => value)}
            onSubmit={(value: string) => {
              void update($, query, () => value)
              const only = idx ? search(idx.paths, value) : []
              if (only.length === 1) pick(only, !picked.has(only[0]!)) // Enter on a single match ticks it
            }}
          />
        )}
        <Box flexDirection="row" columnGap={3} flexWrap="wrap" marginBottom={1}>
          <Button
            key="contents"
            plain
            dimColor={!withText}
            label={`${withText ? '☑' : '☐'} contents`}
            onPress={() => void update($, isContents, v => !v).then(v => $.store.set('isContents', v).catch(() => {}))}
          />
          <Button key="reload" plain dimColor label={loading ? '◌ reading…' : '↻ reload'} onPress={() => void reload($).catch(() => {})} />
          <Button key="collapse" plain dimColor label="⊟ collapse" onPress={() => void update($, expanded, () => []).then(() => keep($, 'expanded'))} />
          {picks.length > 0 && <Button key="clear" plain dimColor label="✕ clear" onPress={() => pick(picks, false)} />}
        </Box>

        {picks.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text dimColor bold>
              IN CONTEXT
            </Text>
            {picks.map(p => {
              const isSent = was.at[p] !== undefined
              return (
                <Box key={`ctx:${p}`} flexDirection="row" justifyContent="space-between">
                  <Box flexDirection="row" flexShrink={1}>
                    <Button key={`unpick:${p}`} plain dimColor label="✕" onPress={() => pick([p], false)} />
                    <Text wrap="truncate-end">
                      <Text color={colorOf(p) ?? ACCENT}>{' ● '}</Text>
                      <Text bold>{baseName(p)}</Text>
                      <Text dimColor>{dirName(p) ? `  ${dirName(p)}` : ''}</Text>
                    </Text>
                  </Box>
                  <Text dimColor wrap="truncate-end">
                    {!withText ? 'path' : isSent ? '✓ sent' : `↑ next · ${tokens(bytes[p] ?? 0)}`}
                  </Text>
                </Box>
              )
            })}
          </Box>
        )}

        {!idx ? (
          <Text dimColor>Reading the files…</Text>
        ) : q.trim() !== '' ? (
          matches()
        ) : (
          tree()
        )}

        <Box marginTop={1} flexDirection="column">
          <Text dimColor wrap="truncate-end">
            <Text color={ACCENT}>{'☑ '}</Text>
            {'ticked files go with your next message'}
          </Text>
          <Text dimColor wrap="truncate-end">
            <Text color={ACCENT}>{'✓ '}</Text>
            {'sent once, then again only when it changes'}
          </Text>
          {idx?.isTruncated && <Text color="warning" wrap="truncate-end">{`Only the first ${MAX_FILES} files are listed`}</Text>}
        </Box>
      </Box>
    )

    function matches() {
      const hits = search(idx!.paths, q)
      if (hits.length === 0) {
        return (
          <Box flexDirection="column" alignItems="center" marginY={1}>
            <Text dimColor>{`Nothing matches “${q.trim()}”`}</Text>
          </Box>
        )
      }
      return (
        <Box flexDirection="column">
          {hits.map(p => (
            <Box key={`hit:${p}`} flexDirection="row">
              <Button key={`box:${p}`} plain dimColor={!picked.has(p)} label={picked.has(p) ? '☑' : '☐'} onPress={() => pick([p], !picked.has(p))} />
              <Text color={colorOf(p)} dimColor={!colorOf(p)}>
                {' ● '}
              </Text>
              <Button key={`file:${p}`} plain label={baseName(p)} onPress={() => pick([p], !picked.has(p))} />
              <Text dimColor wrap="truncate-start">
                {dirName(p) ? `  ${dirName(p)}` : ''}
              </Text>
              {dirName(p) !== '' && <Button key={`reveal:${p}`} plain dimColor label=" ⌖" onPress={() => reveal(p)} />}
            </Box>
          ))}
        </Box>
      )
    }

    function tree() {
      const root = buildTree(idx!.paths)
      const rows = visibleRows(root, open)
      return (
        <Box flexDirection="column">
          <Text wrap="truncate-end">
            <Text color={ACCENT}>{'▾ '}</Text>
            <Text bold>{project.toUpperCase()}</Text>
            {idx!.isGit && <Text dimColor>{'  git'}</Text>}
          </Text>
          {rows.length === 0 && <Text dimColor>{'  (no files)'}</Text>}
          {rows.map(({ node, depth }) => {
            const guide = '│ '.repeat(depth)
            if (node.kind === 'dir') {
              const files = filesUnder(node)
              const count = files.filter(f => picked.has(f)).length
              const mark = count === 0 ? '☐' : count === files.length ? '☑' : '▣'
              const isUnfolded = open.has(node.path)
              return (
                <Box key={`row:${node.path}`} flexDirection="row">
                  <Text dimColor>{`  ${guide}`}</Text>
                  <Button key={`box:${node.path}/`} plain dimColor={count === 0} label={mark} onPress={() => pickFolder(node)} />
                  <Text color={ACCENT}>{isUnfolded ? ' ▾ ' : ' ▸ '}</Text>
                  <Button key={`dir:${node.path}`} plain label={node.name} onPress={() => toggleFolder(node.path)} />
                  <Text dimColor wrap="truncate-end">
                    {count > 0 ? `  ${count}/${files.length}` : ''}
                  </Text>
                </Box>
              )
            }
            const isPicked = picked.has(node.path)
            return (
              <Box key={`row:${node.path}`} flexDirection="row">
                <Text dimColor>{`  ${guide}`}</Text>
                <Button key={`box:${node.path}`} plain dimColor={!isPicked} label={isPicked ? '☑' : '☐'} onPress={() => pick([node.path], !isPicked)} />
                <Text color={colorOf(node.path)} dimColor={!colorOf(node.path)}>
                  {'   ● '}
                </Text>
                <Button key={`file:${node.path}`} plain dimColor={!isPicked && picks.length > 0} label={node.name} onPress={() => pick([node.path], !isPicked)} />
              </Box>
            )
          })}
        </Box>
      )
    }
  })
}

async function open($: EngineInterface, isAsked = false) {
  await $.ui.open(isAsked ? { id: PANE, title: TITLE, focus: true, columns: 44 } : { id: PANE, title: TITLE, columns: 44 })
  await update($, isOpen, () => true)
  if (isAsked) await $.store.set('isClosedByHand', false).catch(() => {})
}

async function setPicked($: EngineInterface, paths: string[], isOn: boolean) {
  const drop = new Set(paths)
  await update($, selected, l => (isOn ? [...new Set([...l, ...paths])] : l.filter(p => !drop.has(p))))
  await keep($, 'selected')
  await measure($)
}

// The picks and the open folders, kept for this project.
async function keep($: EngineInterface, key: 'selected' | 'expanded') {
  const project = await $.session.cwd()
  const value = key === 'selected' ? await read($, selected) : await read($, expanded)
  await $.store.set(`${key}:${project}`, value).catch(() => {})
}

// The size of each picked file, for the estimate the header shows, and the status line.
async function measure($: EngineInterface) {
  const picks = await read($, selected)
  const root = await $.session.cwd()
  const next: Record<string, number> = {}
  for (const p of picks) {
    const st = await $.fs.stat(`${root}/${p}`).catch(() => undefined)
    if (st?.kind === 'file') next[p] = st.size
  }
  await update($, sizes, () => next)
  $.ui.status(picks.length > 0 ? `📎 ${picks.length} file${picks.length === 1 ? '' : 's'} in context` : undefined)
}

async function reload($: EngineInterface) {
  await update($, isLoading, () => true)
  try {
    const next = (await fromGit($)) ?? (await walk($))
    await update($, index, () => next)
    if (!next.isTruncated) {
      const known = new Set(next.paths)
      const picks = await read($, selected)
      if (picks.some(p => !known.has(p))) {
        await update($, selected, l => l.filter(p => known.has(p))) // deleted or now ignored
        await keep($, 'selected')
      }
    }
    await measure($)
  } finally {
    await update($, isLoading, () => false)
  }
}

// In a repository: the tracked files and the untracked ones .gitignore lets through.
async function fromGit($: EngineInterface): Promise<Index | undefined> {
  const r = await $.process.run(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], { timeoutMs: GIT_TIMEOUT }).catch(() => undefined)
  if (!r || r.exitCode !== 0) return undefined
  const paths = [...new Set(r.stdout.split('\u0000').filter(Boolean))]
  const present: string[] = []
  const root = await $.session.cwd()
  for (const p of paths) if (!(await isGone($, `${root}/${p}`, paths.length))) present.push(p)
  return { paths: present.sort(), isGit: true, isTruncated: r.isStdoutTruncated }
}

// A tracked file deleted from the working tree is still in the index; a large repository is
// not checked file by file.
async function isGone($: EngineInterface, path: string, count: number) {
  if (count > 2_000) return false
  return !(await $.fs.exists(path).catch(() => true))
}

// Outside a repository: the folder walked, minus the usual build and dependency folders.
async function walk($: EngineInterface): Promise<Index> {
  const paths: string[] = []
  const seen = new Set<string>()
  let isTruncated = false
  const root = await $.session.cwd()
  const visit = async (dir: string) => {
    const entries = await $.fs.list(dir === '' ? root : `${root}/${dir}`).catch(() => [])
    for (const entry of entries) {
      if (paths.length >= MAX_FILES) {
        isTruncated = true
        return
      }
      const path = dir === '' ? entry.name : `${dir}/${entry.name}`
      let kind = entry.kind
      if (entry.isLink) {
        const st = await $.fs.stat(`${root}/${path}`, { resolve: true }).catch(() => undefined)
        if (!st?.realPath) continue
        if (st.kind === 'dir') {
          if (seen.has(st.realPath)) continue // a link back up the tree
          seen.add(st.realPath)
        }
        kind = st.kind
      }
      if (kind === 'dir' && !SKIP.has(entry.name)) await visit(path)
      else if (kind === 'file') paths.push(path)
    }
  }
  await visit('')
  return { paths: paths.sort(), isGit: false, isTruncated }
}

// What the next message carries of the picked files: each one's text when it is new to this
// conversation or changed since it was sent, its name alone otherwise.
async function gather($: EngineInterface, picks: string[]): Promise<string[]> {
  const session = await $.session.id()
  const root = await $.session.cwd()
  const before = await read($, sent)
  const at = before.session === session ? { ...before.at } : {} // /clear started a new conversation
  const withText = await read($, isContents)
  const picked: Picked[] = []
  let budget = MAX_TOTAL_CHARS
  for (const path of picks) {
    if (!withText) {
      picked.push({ path, note: 'path' })
      continue
    }
    const st = await $.fs.stat(`${root}/${path}`).catch(() => undefined)
    if (!st || st.kind !== 'file') {
      picked.push({ path, note: 'missing' })
      continue
    }
    if (at[path] === st.mtimeMs) {
      picked.push({ path, note: 'unchanged' })
      continue
    }
    if (st.size > MAX_FILE_BYTES || st.size > budget) {
      picked.push({ path, note: 'large' })
      continue
    }
    const text = await $.fs.read(`${root}/${path}`).catch(() => undefined)
    if (text === undefined) picked.push({ path, note: 'missing' })
    else if (isBinary(text)) picked.push({ path, note: 'binary' })
    else {
      picked.push({ path, text })
      budget -= text.length
      at[path] = st.mtimeMs
    }
  }
  await update($, sent, () => ({ session, at }))
  return compose(picked)
}
