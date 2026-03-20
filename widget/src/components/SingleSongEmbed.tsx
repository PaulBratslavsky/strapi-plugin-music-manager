import { useState, useRef, useCallback, useEffect } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { fetchSongs, getStrapiMedia, getStreamURL, formatTime } from '../api'
import { PlayIcon, PauseIcon } from '../icons'
import type { Song } from '../types'

interface SingleSongEmbedProps {
  strapiUrl: string
  songId?: string
}

export function SingleSongEmbed({ strapiUrl, songId }: SingleSongEmbedProps) {
  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [songLoading, setSongLoading] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const waveformRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)

  // Fetch song
  useEffect(() => {
    fetchSongs(strapiUrl).then((songs) => {
      const found = songId ? songs.find((s) => s.documentId === songId) : songs[0]
      if (found) {
        setSong(found)
        if (found.duration) setDuration(found.duration)
      }
      setLoading(false)
    })
  }, [strapiUrl, songId])

  // Init WaveSurfer when song + DOM ready
  useEffect(() => {
    if (!song || !audioRef.current || !waveformRef.current) return

    const audio = audioRef.current

    if (wsRef.current) {
      wsRef.current.destroy()
      wsRef.current = null
    }

    const hasPeaks = song.peaks && song.peaks.length > 0
    const songDuration = song.duration || 0

    // Set audio src for streaming
    audio.src = getStreamURL(strapiUrl, song.documentId)
    if (songDuration > 0) setDuration(songDuration)

    setSongLoading(!hasPeaks)

    // Same config as the main widget — media + peaks for uniform rendering
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      height: 48,
      waveColor: 'rgb(236 72 153)',
      progressColor: 'rgb(164 162 161)',
      barWidth: 4,
      barGap: 1,
      barRadius: 1,
      barMinHeight: 1,
      cursorWidth: 0,
      dragToSeek: true,
      barAlign: 'bottom' as const,
      peaks: hasPeaks ? [song.peaks!] : undefined,
      duration: hasPeaks && songDuration > 0 ? songDuration : undefined,
      url: hasPeaks ? undefined : getStreamURL(strapiUrl, song.documentId),
      media: audio,
    })

    ws.on('play', () => setIsPlaying(true))
    ws.on('pause', () => setIsPlaying(false))
    ws.on('timeupdate', (time) => setCurrentTime(time))
    ws.on('ready', () => {
      setSongLoading(false)
      setDuration(ws.getDuration())
    })

    wsRef.current = ws

    return () => {
      ws.destroy()
      wsRef.current = null
    }
  }, [song, strapiUrl])

  const handlePlayPause = useCallback(() => {
    wsRef.current?.playPause()
  }, [])

  if (loading) {
    return <div className="sse-root sse-loading">Loading...</div>
  }

  if (!song) {
    return <div className="sse-root sse-loading">Song not found</div>
  }

  const imageUrl = getStrapiMedia(strapiUrl, song.image?.url ?? null)
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="sse-root">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="none" style={{ display: 'none' }} />

      {/* Cover art */}
      <div className="sse-art">
        {imageUrl ? (
          <img src={imageUrl} alt="" />
        ) : (
          <div className="sse-art-placeholder">&#9834;</div>
        )}
      </div>

      {/* Info + waveform */}
      <div className="sse-body">
        {/* Top row: info + play button */}
        <div className="sse-top">
          <div className="sse-info">
            <span className="sse-title">{song.title}</span>
            {song.artist?.name && (
              <span className="sse-artist">{song.artist.name}</span>
            )}
          </div>
          <button
            onClick={handlePlayPause}
            disabled={songLoading}
            className="sse-play"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {songLoading ? (
              <span className="sse-spinner" />
            ) : isPlaying ? (
              <PauseIcon size={16} />
            ) : (
              <PlayIcon size={16} />
            )}
          </button>
        </div>

        {/* Waveform */}
        <div className="sse-waveform-wrap">
          <div ref={waveformRef} className="sse-waveform" />
        </div>

        {/* Time */}
        <div className="sse-time">
          <span>{formatTime(currentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
        </div>
      </div>
    </div>
  )
}
