import { describe, expect, test } from 'claude-code/testing'

import { buildTree, compose, filesUnder, search, visibleRows } from '../hooks/tree'

const PANE = { component: 'Pane', requestId: 'files-panel', props: { title: 'Files', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 200 }, view: {} } }
const CWD = '/work/app'

// The project on disk: path → text (mtime 1 unless a test touches it).
const FILES: Record<string, string> = {
  'README.md': '# app\n',
  'package.json': '{ "name": "app" }\n',
  'src/main.ts': 'export const main = 1\n',
  'src/ui/view.tsx': 'export const View = () => null\n',
  'src/ui/theme.ts': 'export const theme = {}\n',
  'docs/guide/intro.md': 'Hello\n',
  'node_modules/lib/index.js': 'module.exports = 1\n',
  'logo.png': 'PNG\u0000\u0001binary',
}

type World = { submits: any[]; toasts: string[]; status: (string | undefined)[]; store: Record<string, unknown>; files: Record<string, string>; mtimes: Record<string, number>; session: { id: string } }

function engine(on: any, opts: { git?: string[]; store?: Record<string, unknown> } = {}): World {
  const files = { ...FILES }
  const mtimes: Record<string, number> = {}
  const store = opts.store ?? {}
  const world: World = { submits: [], toasts: [], status: [], store, files, mtimes, session: { id: 's1' } }
  const norm = (p: string | undefined) => (!p || p === '.' || p === CWD ? '' : p.replace(`${CWD}/`, '').replace(/^\.\//, ''))
  const isDir = (p: string) => Object.keys(files).some(f => f.startsWith(`${p}/`))
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: CWD }))
  on('session.id', () => ({ value: world.session.id }))
  on('command.register', () => ({ value: undefined }))
  on('store.get', (_$: any, e: any) => ({ value: store[e.key] }))
  on('store.set', (_$: any, e: any) => ((store[e.key] = e.value), { value: undefined }))
  on('ui.open', () => ({ value: undefined }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.toast', (_$: any, e: any) => (world.toasts.push(e.text), { value: undefined }))
  on('ui.status', (_$: any, e: any) => (world.status.push(e.text), { value: undefined }))
  on('process.run', () => {
    if (!opts.git) return { value: { exitCode: 128, stdout: '', stderr: 'not a git repository', isStdoutTruncated: false, isStderrTruncated: false } }
    return { value: { exitCode: 0, stdout: `${opts.git.join('\u0000')}\u0000`, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('fs.exists', (_$: any, e: any) => ({ value: norm(e.path) in files || isDir(norm(e.path)) }))
  on('fs.read', (_$: any, e: any) => {
    const p = norm(e.path)
    if (!(p in files)) throw new Error(`ENOENT ${p}`)
    return { value: files[p] }
  })
  on('fs.stat', (_$: any, e: any) => {
    const p = norm(e.path)
    if (p in files) return { value: { kind: 'file', size: files[p]!.length, mtimeMs: mtimes[p] ?? 1, isLink: false } }
    if (isDir(p)) return { value: { kind: 'dir', size: 0, mtimeMs: 0, isLink: false } }
    throw new Error(`ENOENT ${p}`)
  })
  on('fs.list', (_$: any, e: any) => {
    const dir = norm(e.path)
    const names = new Set(
      Object.keys(files)
        .filter(f => dir === '' || f.startsWith(`${dir}/`))
        .map(f => (dir === '' ? f : f.slice(dir.length + 1)).split('/')[0]!),
    )
    const at = (n: string) => (dir === '' ? n : `${dir}/${n}`)
    return { value: [...names].map(n => ({ name: n, kind: at(n) in files ? 'file' : 'dir', size: 0, mtimeMs: 0, isLink: false })) }
  })
  on('prompt.submit', (_$: any, e: any) => (world.submits.push(e), { text: e.text, context: e.context }))
  return world
}

const wait = (ms: number) => new Promise(done => (globalThis as any).setTimeout(done, ms))
const settle = () => wait(40) // the first read of the files runs in the background

async function started($: any, on: any, opts?: Parameters<typeof engine>[1]) {
  const world = engine(on, opts)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: CWD } as any)
  await settle()
  return world
}
const mount = ($: any) => $.ui.mount({ plugin: 'files-panel', surface: 'terminal', ...PANE } as any)
const has = async (pane: any, type: string, text: RegExp) => (await pane.find({ type, text })) !== undefined
const typed = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } }) as any

describe('files-panel', () => {
  test('helpers', () => {
    const root = buildTree(['b.ts', 'a/x/y/deep.ts', 'a/x/y/other.ts', 'src/z.ts', 'src/lib/k.ts', 'A.md'])
    expect(root.children.map(n => `${n.kind}:${n.name}`)).toEqual(['dir:a/x/y', 'dir:src', 'file:A.md', 'file:b.ts'])
    expect(visibleRows(root, new Set()).length).toBe(4)
    const open = visibleRows(root, new Set(['src']))
    expect(open.map(r => `${r.depth}:${r.node.name}`)).toEqual(['0:a/x/y', '0:src', '1:lib', '1:z.ts', '0:A.md', '0:b.ts'])
    expect(filesUnder(root.children[0]!)).toEqual(['a/x/y/deep.ts', 'a/x/y/other.ts'])
    expect(search(['src/ui/view.tsx', 'docs/view-notes/a.md', 'view.tsx'], 'view')).toEqual(['view.tsx', 'src/ui/view.tsx', 'docs/view-notes/a.md'])
    expect(search(['a/b.ts'], '  ')).toEqual([])

    const blocks = compose([{ path: 'a.ts', text: 'x' }, { path: 'b.ts', note: 'unchanged' }, { path: 'c.png', note: 'binary' }])
    expect(blocks.length).toBe(2)
    expect(blocks[0]).toContain('- a.ts (attached below)')
    expect(blocks[0]).toContain('- b.ts (unchanged')
    expect(blocks[1]).toBe('<file path="a.ts">\nx\n</file>')
    expect(compose([])).toEqual([])
  })

  test('lists the folder as a tree, skipping dependencies, and unfolds a folder', async ($, on) => {
    await started($, on)
    const pane = await mount($)
    expect(await has(pane, 'Text', /^APP$/)).toBe(true)
    expect(await pane.find({ type: 'Button', key: 'dir:src' })).toBeDefined()
    expect(await pane.find({ type: 'Button', key: 'dir:docs/guide' })).toBeDefined() // a chain of one folder, compacted
    expect(await pane.find({ type: 'Button', key: 'dir:node_modules' })).toBeUndefined()
    expect(await pane.find({ type: 'Button', key: 'file:src/main.ts' })).toBeUndefined()
    await pane.press({ key: 'dir:src' })
    expect(await pane.find({ type: 'Button', key: 'file:src/main.ts' })).toBeDefined()
    expect(await pane.find({ type: 'Button', key: 'dir:src/ui' })).toBeDefined()
    await pane.unmount()
  })

  test('a ticked file goes with the next message, then only again when it changes', async ($, on) => {
    const world = await started($, on)
    const pane = await mount($)
    await pane.press({ key: 'box:README.md' })
    expect(await has(pane, 'Text', /IN CONTEXT/)).toBe(true)
    expect(await has(pane, 'Text', /↑ next/)).toBe(true)
    expect(world.status.at(-1)).toBe('📎 1 file in context')

    await $.prompt.submit(typed('explain it'))
    const first = world.submits.at(-1)
    expect(first.text).toBe('explain it')
    expect(first.context[0]).toContain('- README.md (attached below)')
    expect(first.context[1]).toBe('<file path="README.md">\n# app\n</file>')
    expect(await has(pane, 'Text', /✓ sent/)).toBe(true)

    await $.prompt.submit(typed('and again'))
    expect(world.submits.at(-1).context).toEqual([expect.stringContaining('README.md (unchanged')])

    world.files['README.md'] = '# app v2\n'
    world.mtimes['README.md'] = 2
    await $.prompt.submit(typed('it changed'))
    expect(world.submits.at(-1).context[1]).toContain('# app v2')

    world.session.id = 's2' // /clear: a new conversation gets the text again
    await $.prompt.submit(typed('fresh'))
    expect(world.submits.at(-1).context[1]).toContain('# app v2')

    await $.prompt.submit({ text: 'from a plugin', wait: false, origin: { kind: 'plugin', name: 'x' } } as any)
    expect(world.submits.at(-1).context).toBeUndefined()
    await pane.unmount()
  })

  test('a binary file is named, not attached; contents off sends paths only', async ($, on) => {
    const world = await started($, on)
    const pane = await mount($)
    await pane.press({ key: 'box:logo.png' })
    await pane.press({ key: 'box:package.json' })
    await $.prompt.submit(typed('look'))
    const ctx = world.submits.at(-1).context
    expect(ctx[0]).toContain('- logo.png (a binary file, not attached)')
    expect(ctx.length).toBe(2)

    await pane.press({ key: 'contents' })
    world.mtimes['package.json'] = 5
    await $.prompt.submit(typed('paths'))
    const only = world.submits.at(-1).context
    expect(only.length).toBe(1)
    expect(only[0]).toContain('read them as needed')
    expect(world.store.isContents).toBe(false)

    await pane.press({ key: 'clear' })
    await $.prompt.submit(typed('nothing'))
    expect(world.submits.at(-1).context).toBeUndefined()
    expect(world.status.at(-1)).toBeUndefined()
    await pane.unmount()
  })

  test('in a repository: git lists the files, a folder box ticks every file in it', async ($, on) => {
    const world = await started($, on, { git: ['src/main.ts', 'src/ui/view.tsx', 'src/ui/theme.ts', 'README.md', 'gone.ts'] })
    const pane = await mount($)
    expect(await has(pane, 'Text', /git/)).toBe(true)
    expect(await pane.find({ type: 'Button', key: 'file:gone.ts' })).toBeUndefined() // deleted from the working tree
    expect(await pane.find({ type: 'Button', key: 'file:package.json' })).toBeUndefined() // not in git's list
    await pane.press({ key: 'box:src/' })
    expect(world.store[`selected:${CWD}`]).toEqual(['src/ui/theme.ts', 'src/ui/view.tsx', 'src/main.ts']) // in the tree's order
    await pane.press({ key: 'dir:src' })
    expect(await pane.find({ type: 'Button', key: 'box:src/ui/', text: '☑' })).toBeDefined()
    await pane.press({ key: 'dir:src/ui' })
    await pane.press({ key: 'box:src/ui/theme.ts' })
    expect(await pane.find({ type: 'Button', key: 'box:src/', text: '▣' })).toBeDefined() // some, not all
    await pane.unmount()
  })

  test('finds a file by its path and ticks the single match on Enter', async ($, on) => {
    const world = await started($, on)
    const pane = await mount($)
    await pane.input({ key: 'filter', text: 'ui', kind: 'change' })
    expect(await pane.find({ type: 'Button', key: 'file:src/ui/view.tsx' })).toBeDefined()
    expect(await pane.find({ type: 'Button', key: 'file:README.md' })).toBeUndefined()
    await pane.input({ key: 'filter', text: 'theme' })
    expect(world.store[`selected:${CWD}`]).toEqual(['src/ui/theme.ts'])
    await pane.input({ key: 'filter', text: 'zzz', kind: 'change' })
    expect(await has(pane, 'Text', /Nothing matches/)).toBe(true)
    await pane.input({ key: 'filter', text: 'view', kind: 'change' })
    await pane.press({ key: 'reveal:src/ui/view.tsx' }) // shows it in the tree
    expect(await pane.find({ type: 'Button', key: 'file:src/ui/view.tsx' })).toBeDefined()
    expect(await pane.find({ type: 'Button', key: 'dir:src' })).toBeDefined()
    await pane.unmount()
  })

  test('keeps the picks per project and stays closed once closed by hand', async ($, on) => {
    const store: Record<string, unknown> = { [`selected:${CWD}`]: ['src/main.ts', 'deleted.ts'], isClosedByHand: true }
    const world = await started($, on, { store })
    expect(world.store[`selected:${CWD}`]).toEqual(['src/main.ts']) // one gone is dropped
    expect(world.status.at(-1)).toBe('📎 1 file in context')
    await $.prompt.submit(typed('go'))
    expect(world.submits.at(-1).context[1]).toContain('export const main')
    expect((await $.command.run({ command: 'files-panel' } as any)).text).toMatch(/open/)
    expect(world.store.isClosedByHand).toBe(false)
  })
})
