export interface StrapiMedia {
  id: number
  url: string
  alternativeText?: string | null
}

export interface Artist {
  id: number
  documentId: string
  name: string
  image?: StrapiMedia | null
}

export interface Song {
  id: number
  documentId: string
  title: string
  createdAt: string
  image?: StrapiMedia | null
  artist?: Artist | null
  peaks?: number[] | null
}

export type LoopMode = 'none' | 'all' | 'one'
