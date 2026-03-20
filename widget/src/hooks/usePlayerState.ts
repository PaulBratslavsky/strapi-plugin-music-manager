import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { fetchSongs, getStrapiMedia, getStreamURL as buildStreamURL } from '../api'
import { useSwipe } from './useSwipe'
import { useWaveSurfer } from './useWaveSurfer'
import type { Song, LoopMode } from '../types'

interface UsePlayerStateOptions {
  strapiUrl: string
  initialSong?: string
}

export function usePlayerState({ strapiUrl, initialSong }: UsePlayerStateOptions) {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loopMode, setLoopMode] = useState<LoopMode>('one')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [durations, setDurations] = useState<Record<string, number>>({})
  const [isMobile, setIsMobile] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const loopModeRef = useRef<LoopMode>(loopMode)
  const onEndedRef = useRef<() => void>(() => {})
  const isPlayingRef = useRef(false)
  const shouldAutoPlayRef = useRef(false)
  const lastScrolledRef = useRef<string | null>(null)

  const getStreamURL = useCallback(
    (documentId: string) => buildStreamURL(strapiUrl, documentId),
    [strapiUrl]
  )

  // ── Data fetching ──

  useEffect(() => {
    fetchSongs(strapiUrl).then((data) => {
      setSongs(data)
      const initial = (initialSong && data.find((s) => s.documentId === initialSong)) || data[0]
      if (initial) setCurrentSong(initial)
      setLoading(false)
    })
  }, [strapiUrl, initialSong])

  // Preload durations
  useEffect(() => {
    songs.forEach((song) => {
      if (durations[song.documentId]) return
      const audio = new Audio()
      audio.preload = 'metadata'
      audio.addEventListener('loadedmetadata', () => {
        setDurations((prev) => ({ ...prev, [song.documentId]: audio.duration }))
      })
      audio.src = getStreamURL(song.documentId)
    })
  }, [songs]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Ref syncs ──

  useEffect(() => { loopModeRef.current = loopMode }, [loopMode])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  // ── WaveSurfer ──

  const { wavesurferRef, songLoading, waveformSlotRef } = useWaveSurfer({
    audioRef,
    documentId: currentSong?.documentId,
    shouldAutoPlay: shouldAutoPlayRef,
    isPlayingRef,
    getStreamURL,
    onReady: (dur) => setDuration(dur),
    onFinish: () => onEndedRef.current(),
  })

  // ── Native audio events (always active — WaveSurfer may be detached) ──

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded = () => onEndedRef.current()
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Set audio src when song changes (needed when WaveSurfer isn't active) ──

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentSong) return
    const url = getStreamURL(currentSong.documentId)
    if (!audio.src.endsWith(`/${currentSong.documentId}/stream`)) {
      const wantAutoPlay = shouldAutoPlayRef.current
      audio.src = url
      audio.load()
      if (wantAutoPlay) {
        shouldAutoPlayRef.current = false
        audio.play().catch(() => {})
      }
    }
  }, [currentSong?.documentId, getStreamURL]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Playback controls ──

  const playNext = useCallback(() => {
    if (!currentSong || songs.length === 0) return
    const idx = songs.findIndex((s) => s.documentId === currentSong.documentId)
    shouldAutoPlayRef.current = shouldAutoPlayRef.current || isPlayingRef.current
    if (idx < songs.length - 1) {
      setCurrentSong(songs[idx + 1])
    } else if (loopModeRef.current === 'all') {
      setCurrentSong(songs[0])
    } else {
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }, [currentSong, songs])

  const playPrev = useCallback(() => {
    if (!currentSong || songs.length === 0) return
    shouldAutoPlayRef.current = shouldAutoPlayRef.current || isPlayingRef.current
    const idx = songs.findIndex((s) => s.documentId === currentSong.documentId)
    if (idx > 0) {
      setCurrentSong(songs[idx - 1])
    } else if (loopModeRef.current === 'all') {
      setCurrentSong(songs[songs.length - 1])
    }
  }, [currentSong, songs])

  const restartSong = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    setCurrentTime(0)
    if (!isPlaying) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }, [isPlaying])

  const seekTo = useCallback((fraction: number) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    const time = fraction * audio.duration
    audio.currentTime = time
    setCurrentTime(time)
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(Math.max(0, Math.min(1, fraction)))
    }
  }, [wavesurferRef])

  const cycleLoopMode = useCallback(() => {
    setLoopMode((prev) => (prev === 'one' ? 'none' : prev === 'none' ? 'all' : 'one'))
  }, [])

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [])

  const handleSongClick = useCallback(
    (song: Song) => {
      if (currentSong?.documentId === song.documentId) {
        handlePlayPause()
      } else {
        shouldAutoPlayRef.current = true
        setCurrentSong(song)
      }
    },
    [currentSong, handlePlayPause]
  )

  // Wire ended handler
  useEffect(() => {
    onEndedRef.current = () => {
      if (loopModeRef.current === 'one') {
        restartSong()
      } else {
        shouldAutoPlayRef.current = true
        playNext()
      }
    }
  }, [restartSong, playNext])

  // ── Swipe (mobile) ──

  const { swipeX, handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipe(playNext, playPrev)

  // ── Viewport detection ──

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // ── Derived values ──

  const imageUrl = useMemo(
    () => getStrapiMedia(strapiUrl, currentSong?.image?.url ?? null),
    [strapiUrl, currentSong?.image?.url]
  )

  return {
    songs, loading, currentSong, isPlaying, loopMode,
    currentTime, duration, durations, songLoading,
    isMobile, imageUrl, swipeX, strapiUrl,
    waveformSlotRef, audioRef, lastScrolledRef,
    playNext, playPrev, restartSong, seekTo, cycleLoopMode,
    handlePlayPause, handleSongClick,
    handleTouchStart, handleTouchMove, handleTouchEnd,
  }
}

export type PlayerState = ReturnType<typeof usePlayerState>
