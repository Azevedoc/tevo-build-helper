import { useEffect, useState } from 'react'

export type Route = { page: 'characters' } | { page: 'character'; id: string } | { page: 'data' }

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '')
  if (path === '/data') return { page: 'data' }
  const m = /^\/character\/(.+)$/.exec(path)
  if (m) return { page: 'character', id: decodeURIComponent(m[1]) }
  return { page: 'characters' }
}

export function toHash(r: Route): string {
  switch (r.page) {
    case 'characters':
      return '#/'
    case 'data':
      return '#/data'
    case 'character':
      return `#/character/${encodeURIComponent(r.id)}`
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
