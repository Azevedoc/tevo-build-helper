import type { ReactNode } from 'react'
import { useAppStore } from '../state/app-store'
import { EVOHELPER_URL, WIKI_URL } from './config'
import { toHash } from './route'

export function Layout({ children }: { children: ReactNode }) {
  const { ready, persistent } = useAppStore()
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center gap-6 border-b border-neutral-800 px-4 py-3">
        <h1 className="text-lg font-semibold">TEvo Build Helper</h1>
        <nav className="flex gap-4 text-sm text-neutral-400">
          <a className="hover:text-neutral-100" href={toHash({ page: 'characters' })}>Characters</a>
          <a className="hover:text-neutral-100" href={toHash({ page: 'data' })}>Data</a>
        </nav>
      </header>
      {ready && !persistent && (
        <div className="bg-amber-900/60 px-4 py-2 text-sm text-amber-100">
          Storage unavailable — nothing will be saved after you close this tab.
        </div>
      )}
      <main className="mx-auto max-w-6xl p-4">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pt-2 pb-6 text-xs text-neutral-500">
        Thanks to the{' '}
        <a className="text-sky-400/80 hover:underline" href={WIKI_URL} target="_blank" rel="noreferrer">
          Twilight's Eve Evo Wiki
        </a>{' '}
        and{' '}
        <a className="text-sky-400/80 hover:underline" href={EVOHELPER_URL} target="_blank" rel="noreferrer">
          EvoHelper
        </a>{' '}
        for their work. This app wouldn't exist without them.
      </footer>
    </div>
  )
}
