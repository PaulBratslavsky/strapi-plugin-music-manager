import { useState, useRef, useEffect, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'

interface UseWaveSurferOptions {
  audioRef: React.RefObject<HTMLAudioElement | null>
  documentId: string | undefined
  shouldAutoPlay: React.MutableRefObject<boolean>
  isPlayingRef: React.MutableRefObject<boolean>
  getStreamURL: (documentId: string) => string
  onReady: (duration: number) => void
  onFinish: () => void
}

export function useWaveSurfer({
  audioRef,
  documentId,
  shouldAutoPlay,
  isPlayingRef,
  getStreamURL,
  onReady,
  onFinish,
}: UseWaveSurferOptions) {
  const [songLoading, setSongLoading] = useState(false)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  // The actual container element that WaveSurfer renders into
  const waveElRef = useRef<HTMLDivElement | null>(null)
  // Track current documentId to detect song changes
  const currentDocIdRef = useRef<string | undefined>(undefined)
  // Track if we need to init
  const needsInitRef = useRef(false)

  const initWaveSurfer = useCallback(() => {
    const container = waveElRef.current
    const audio = audioRef.current
    const docId = currentDocIdRef.current
    if (!container || !audio || !docId) return

    // Auto-play only if explicitly requested (song click, next/prev)
    // or if the audio was already playing (e.g. user played in minimized then expanded)
    const wasPlaying = !audio.paused
    const autoPlay = shouldAutoPlay.current || wasPlaying
    shouldAutoPlay.current = false

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy()
      wavesurferRef.current = null
    }

    setSongLoading(true)
    needsInitRef.current = false

    const ws = WaveSurfer.create({
      container,
      height: 80,
      waveColor: 'rgb(236 72 153)',
      progressColor: 'rgb(164 162 161)',
      barWidth: 4,
      barGap: 1,
      barRadius: 1,
      barMinHeight: 1,
      cursorWidth: 0,
      interact: false,
      barAlign: 'bottom' as const,
      url: getStreamURL(docId),
      media: audio,
    })

    // WaveSurfer's internal click/drag handlers don't fire reliably
    // (shadow DOM event retargeting issue), so we implement seek manually
    const wrapper = ws.getWrapper()
    if (wrapper) {
      let isDragging = false

      wrapper.addEventListener('pointerdown', (e: PointerEvent) => {
        isDragging = true
        wrapper.setPointerCapture(e.pointerId)
        seekToPointer(e)
      })

      wrapper.addEventListener('pointermove', (e: PointerEvent) => {
        if (isDragging) seekToPointer(e)
      })

      wrapper.addEventListener('pointerup', () => {
        isDragging = false
      })

      function seekToPointer(e: PointerEvent) {
        const rect = wrapper.getBoundingClientRect()
        const relativeX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        ws.seekTo(relativeX)
      }

      wrapper.style.cursor = 'pointer'
    }
    // Native audio events handle play/pause/timeupdate state — WaveSurfer
    // only handles 'ready' (for autoplay + duration) and 'finish'.
    // This avoids stale values when WaveSurfer is alive but DOM-detached.
    ws.on('ready', () => {
      console.log('[MusicWidget] ws ready, duration:', ws.getDuration())
      setSongLoading(false)
      onReady(ws.getDuration())
      if (autoPlay) {
        ws.play().catch(() => {})
      }
    })
    ws.on('finish', onFinish)

    wavesurferRef.current = ws
  }, [audioRef, getStreamURL, shouldAutoPlay, isPlayingRef, onReady, onFinish])

  // When documentId changes, re-init or mark for lazy init
  useEffect(() => {
    currentDocIdRef.current = documentId
    if (waveElRef.current && audioRef.current && documentId) {
      initWaveSurfer()
    } else {
      needsInitRef.current = true
    }
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy()
        wavesurferRef.current = null
      }
    }
  }, [documentId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Callback ref for the waveform slot — when a view mounts and provides a container,
  // we move our waveform element into it (or init if first time)
  const waveformSlotRef = useCallback((slotEl: HTMLDivElement | null) => {
    if (!slotEl) return

    // Create persistent waveform element if needed
    if (!waveElRef.current) {
      waveElRef.current = document.createElement('div')
      waveElRef.current.style.width = '100%'
      waveElRef.current.style.height = '100%'
    }

    // Move waveform element into this slot
    slotEl.innerHTML = ''
    slotEl.appendChild(waveElRef.current)

    // Init WaveSurfer if it hasn't been initialized yet
    if (needsInitRef.current || (!wavesurferRef.current && currentDocIdRef.current)) {
      initWaveSurfer()
    }
  }, [initWaveSurfer])

  return { wavesurferRef, songLoading, waveformSlotRef }
}
