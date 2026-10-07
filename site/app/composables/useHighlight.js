// Syntax colors for the code view, loaded on first use so the other pages stay light.
const LANGUAGES = {
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  qml: 'javascript',
  json: 'json',
  jsonc: 'json',
  md: 'markdown',
  mdx: 'markdown',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  yaml: 'yaml',
  yml: 'yaml',
  css: 'css',
  scss: 'scss',
  html: 'xml',
  xml: 'xml',
  svg: 'xml',
  vue: 'xml',
  py: 'python',
  go: 'go',
  toml: 'ini',
  ini: 'ini',
}

let loading

export function languageOf(path) {
  return LANGUAGES[path.split('.').pop().toLowerCase()]
}

async function load() {
  loading ??= Promise.all([
    import('highlight.js/lib/core'),
    import('highlight.js/lib/languages/typescript'),
    import('highlight.js/lib/languages/javascript'),
    import('highlight.js/lib/languages/json'),
    import('highlight.js/lib/languages/markdown'),
    import('highlight.js/lib/languages/bash'),
    import('highlight.js/lib/languages/yaml'),
    import('highlight.js/lib/languages/css'),
    import('highlight.js/lib/languages/scss'),
    import('highlight.js/lib/languages/xml'),
    import('highlight.js/lib/languages/python'),
    import('highlight.js/lib/languages/go'),
    import('highlight.js/lib/languages/ini'),
  ]).then(([{ default: hljs }, ...modules]) => {
    const names = ['typescript', 'javascript', 'json', 'markdown', 'bash', 'yaml', 'css', 'scss', 'xml', 'python', 'go', 'ini']
    modules.forEach((module, i) => hljs.registerLanguage(names[i], module.default))
    return hljs
  })
  return loading
}

// The text as highlighted HTML, or null for a language it does not know.
export function useHighlight() {
  async function highlight(text, path) {
    const language = languageOf(path)
    if (!language) return null
    const hljs = await load()
    return hljs.highlight(text, { language, ignoreIllegals: true }).value
  }

  return { highlight }
}
