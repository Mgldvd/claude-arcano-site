// The project's files as the pane lists them: paths relative to the session's directory,
// from `git ls-files` (so .gitignore holds) or, outside a repository, a walk of the folder.
export type Index = {
  paths: string[] // every listed file, sorted
  isGit: boolean
  isTruncated: boolean // the walk stopped at its cap
}

// What was last attached of each file, so an unchanged one is not sent twice.
export type Sent = {
  session: string // the session id it was sent in: /clear starts a new one
  at: Record<string, number> // path → the mtime it had when sent
}

declare module 'claude-code' {
  interface PluginState {
    'files-panel': {
      index: Index | null
      query: string
      expanded: string[] // folders unfolded in the tree
      selected: string[] // files the chat gets with the next message
      sizes: Record<string, number> // bytes of each selected file, for the token estimate
      sent: Sent
      isContents: boolean // attach the files' text (else their paths alone)
      isOpen: boolean
      isLoading: boolean
    }
  }
}
