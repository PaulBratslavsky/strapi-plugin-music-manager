import { useRef, useEffect } from 'react'
import { formatTime, getStrapiMedia } from '../api'
import type { Song } from '../types'

interface SongRowProps {
  song: Song
  index: number
  isActive: boolean
  strapiUrl: string
  duration?: number
  onClick: () => void
  scrollRef: React.RefObject<string | null>
}

export function SongRow({ song, index, isActive, strapiUrl, duration, onClick, scrollRef }: SongRowProps) {
  const rowRef = useRef<HTMLButtonElement>(null)
  const thumbUrl = getStrapiMedia(strapiUrl, song.image?.url ?? null)

  useEffect(() => {
    if (isActive && rowRef.current && scrollRef.current !== song.documentId) {
      scrollRef.current = song.documentId
      requestAnimationFrame(() => {
        rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
  }, [isActive, song.documentId, scrollRef])

  return (
    <button
      ref={rowRef}
      type="button"
      onClick={onClick}
      className={`smw-song-row ${isActive ? 'smw-song-row--active' : ''}`}
    >
      <div className="smw-song-thumb">
        {thumbUrl ? <img src={thumbUrl} alt="" /> : <span className="smw-song-thumb-note">&#9834;</span>}
      </div>
      <div className="smw-song-meta">
        <span className={`smw-song-title ${isActive ? 'smw-song-title--active' : ''}`}>
          {song.title || 'Untitled'}
        </span>
        <span className="smw-song-artist">{song.artist?.name || '\u2014'}</span>
      </div>
      <span className="smw-song-duration">{duration ? formatTime(duration) : ''}</span>
    </button>
  )
}
