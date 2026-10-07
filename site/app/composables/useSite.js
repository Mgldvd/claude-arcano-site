import site from '~/data/site.json'

// The catalog the pages draw: written by scripts/catalog.mjs before each build.
export function useSite() {
  return site
}
