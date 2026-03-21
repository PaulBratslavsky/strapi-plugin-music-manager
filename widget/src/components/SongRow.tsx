import { useRef, useEffect, useState } from 'react'
import { formatTime, getStrapiMedia } from '../api'
import { ShareIcon } from '../icons'
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
  const rowRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const thumbUrl = getStrapiMedia(strapiUrl, song.image?.url ?? null)

  useEffect(() => {
    if (isActive && rowRef.current && scrollRef.current !== song.documentId) {
      scrollRef.current = song.documentId
      requestAnimationFrame(() => {
        rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
  }, [isActive, song.documentId, scrollRef])

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${strapiUrl}/api/strapi-plugin-music-manager/embed?song=${song.documentId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      window.open(url, '_blank')
    })
  }

  return (
    <div
      ref={rowRef}
      className={`smw-song-row ${isActive ? 'smw-song-row--active' : ''}`}
    >
      <button
        type="button"
        onClick={onClick}
        className="smw-song-row-main"
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
      <button
        type="button"
        className="smw-song-share"
        onClick={handleShare}
        aria-label="Share song"
        title={copied ? 'Link copied!' : 'Share song'}
      >
        {copied
          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          : <ShareIcon size={12} />}
      </button>
    </div>
  )
}
