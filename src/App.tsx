import { useEffect } from 'react'
import { Layout } from './app/Layout'
import { useRoute } from './app/route'
import { CharactersPage } from './features/characters/CharactersPage'
import { useAppStore } from './state/app-store'

export default function App() {
  const route = useRoute()
  const ready = useAppStore(s => s.ready)
  useEffect(() => {
    void useAppStore.getState().init()
  }, [])

  return (
    <Layout>
      {!ready ? <p className="text-sm text-neutral-400">Loading…</p> : route.page === 'characters' ? <CharactersPage /> : null}
    </Layout>
  )
}
