import qs from 'qs'
import type { Song } from './types'

export function getStrapiMedia(strapiUrl: string, url: string | null): string | null {
  if (url == null) return null
  if (url.startsWith('data:')) return url
  if (url.startsWith('http') || url.startsWith('//')) return url
  return `${strapiUrl}${url}`
}

export function getStreamURL(strapiUrl: string, documentId: string): string {
  return `${strapiUrl}/api/strapi-plugin-music-manager/songs/${documentId}/stream`
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export async function fetchSongs(strapiUrl: string): Promise<Song[]> {
  const url = new URL('/api/strapi-plugin-music-manager/songs', strapiUrl)
  url.search = qs.stringify({
    sort: ['createdAt:desc'],
    populate: {
      artist: {
        fields: ['name'],
        populate: { image: { fields: ['url', 'alternativeText'] } },
      },
      image: { fields: ['url', 'alternativeText'] },
    },
    pagination: { pageSize: 100 },
  })

  const res = await fetch(url.href)
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}
