import { useState, useRef, useCallback } from 'react'

export function useSwipe(onNext: () => void, onPrev: () => void) {
  const [swipeX, setSwipeX] = useState(0)
  const swipeXRef = useRef(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    setSwipeX(0)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const deltaX = e.touches[0].clientX - touchStartRef.current.x
    swipeXRef.current = deltaX
    setSwipeX(deltaX)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current) return
    const delta = swipeXRef.current
    if (delta < -50) onNext()
    else if (delta > 50) onPrev()
    swipeXRef.current = 0
    setSwipeX(0)
    touchStartRef.current = null
  }, [onNext, onPrev])

  return { swipeX, handleTouchStart, handleTouchMove, handleTouchEnd }
}
