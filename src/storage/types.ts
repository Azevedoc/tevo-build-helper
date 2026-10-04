export interface Character {
  /** `${battleTag ?? 'local'}/${hero}` */
  id: string
  className: string
  level: number | null
  battleTag?: string
  importedAt: string
  imported: Record<string, number>
  unknownNames: string[]
  adjustments: Record<string, number>
}

export interface Build {
  id: string
  characterId: string
  name: string
  goals: string[]
  active: boolean
}
