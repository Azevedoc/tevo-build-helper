import { useEffect } from 'react'
import { Layout } from './app/Layout'
import { useRoute } from './app/route'
import { BuildPage } from './features/build/BuildPage'
import { CharactersPage } from './features/characters/CharactersPage'
import { DataPage } from './features/data/DataPage'
import { useAppStore } from './state/app-store'

export default function App() {
  const route = useRoute()
  const ready = useAppStore(s => s.ready)
  useEffect(() => {
    void useAppStore.getState().init()
  }, [])

  return (
    <Layout>
      {!ready ? <p className="text-sm text-neutral-400">Loading…</p> : route.page === 'character' ? (
        <BuildPage characterId={route.id} />
      ) : route.page === 'characters' ? (
        <CharactersPage />
      ) : (
        <DataPage />
      )}
    </Layout>
  )
}
