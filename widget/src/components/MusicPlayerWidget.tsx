import { useState } from 'react'
import { usePlayerState } from '../hooks/usePlayerState'
import { formatTime, getStrapiMedia } from '../api'
import { PlayIcon, PauseIcon, PrevIcon, NextIcon, RestartIcon, LoopIcon, ShuffleIcon, ShareIcon } from '../icons'
import { SongRow } from './SongRow'
import type { PlayerState } from '../hooks/usePlayerState'
import type { LoopMode } from '../types'

type ViewMode = 'closed' | 'minimized' | 'expanded' | 'mobile'

interface MusicPlayerWidgetProps {
  strapiUrl: string
  initialSong?: string
}

/* ── Inline icons ── */

const MusicIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '60%', height: '60%' }}>
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const MinimizeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
)

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12" y2="18" />
  </svg>
)

const DesktopIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
)

const ChevronUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
)

export function MusicPlayerWidget({ strapiUrl, initialSong }: MusicPlayerWidgetProps) {
  const [view, setView] = useState<ViewMode>('closed')
  const player = usePlayerState({ strapiUrl, initialSong })

  return (
    <>
      {/* Audio — always mounted */}
      <audio ref={player.audioRef} crossOrigin="anonymous" preload="auto" style={{ display: 'none' }} />

      {view === 'closed' && (
        <button className="smw-trigger" onClick={() => setView('minimized')} aria-label="Open music player">
          <MusicIcon />
          {player.isPlaying && <span className="smw-trigger-pulse" />}
        </button>
      )}

      {view === 'minimized' && (
        <MinimizedBar
          player={player}
          onExpand={() => setView('expanded')}
          onClose={() => setView('closed')}
        />
      )}

      {(view === 'expanded' || view === 'mobile') && (
        <>
          <button type="button" className="smw-overlay" onClick={() => setView('minimized')} aria-label="Minimize" />
          <div className={`smw-panel ${view === 'mobile' ? 'smw-panel--mobile' : 'smw-panel--expanded'}`}>
            {/* Header */}
            <div className="smw-panel-header">
              <span className="smw-panel-title">Music Player</span>
              <div className="smw-header-actions">
                <button
                  className={`smw-header-btn ${view === 'mobile' ? '' : 'smw-header-btn--active'}`}
                  onClick={() => setView('expanded')}
                  aria-label="Desktop view"
                  title="Desktop view"
                >
                  <DesktopIcon />
                </button>
                <button
                  className={`smw-header-btn ${view === 'mobile' ? 'smw-header-btn--active' : ''}`}
                  onClick={() => setView('mobile')}
                  aria-label="Mobile view"
                  title="Mobile view"
                >
                  <PhoneIcon />
                </button>
                <div className="smw-header-sep" />
                <ShareHeaderButton strapiUrl={player.strapiUrl} />
                <button className="smw-header-btn" onClick={() => setView('minimized')} aria-label="Minimize" title="Minimize">
                  <MinimizeIcon />
                </button>
                <button className="smw-header-btn" onClick={() => setView('closed')} aria-label="Close" title="Close">
                  <CloseIcon />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="smw-panel-body">
              {player.loading ? (
                <div className="smw-status">Loading songs...</div>
              ) : player.songs.length === 0 ? (
                <div className="smw-status">No songs found.</div>
              ) : view === 'expanded'
                ? <ExpandedView player={player} />
                : <MobileView player={player} />
              }
            </div>
          </div>
        </>
      )}
    </>
  )
}

/* ── Minimized Bar ── */

function MinimizedBar({ player, onExpand, onClose }: {
  player: PlayerState
  onExpand: () => void
  onClose: () => void
}) {
  const { currentSong, isPlaying, songLoading, imageUrl, currentTime, duration, seekTo, handlePlayPause } = player
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seekTo(fraction)
  }

  return (
    <div className="smw-minibar">
      {/* Seekable progress bar */}
      <div className="smw-minibar-progress" onClick={handleSeek} role="slider" tabIndex={0}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}
      >
        <div className="smw-minibar-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="smw-minibar-content">
        {/* Album art */}
        <div className="smw-minibar-art" onClick={onExpand} role="button" tabIndex={0}>
          {imageUrl ? (
            <img src={imageUrl} alt="" />
          ) : (
            <span className="smw-minibar-note">&#9834;</span>
          )}
        </div>

        {/* Song info */}
        <div className="smw-minibar-info" onClick={onExpand} role="button" tabIndex={0}>
          <span className="smw-minibar-title">{currentSong?.title ?? 'No song'}</span>
          <span className="smw-minibar-artist">{currentSong?.artist?.name ?? ''}</span>
        </div>

        {/* Timer */}
        <span className="smw-minibar-time">
          {formatTime(currentTime)}{duration > 0 ? ` / ${formatTime(duration)}` : ''}
        </span>

        {/* Controls */}
        <div className="smw-minibar-controls">
          <button onClick={player.playPrev} type="button" className="smw-minibar-btn" aria-label="Previous">
            <PrevIcon size={14} />
          </button>
          <button
            onClick={handlePlayPause}
            disabled={songLoading}
            type="button"
            className="smw-minibar-play"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {songLoading
              ? <span className="smw-spinner smw-spinner--sm" />
              : isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
          </button>
          <button onClick={player.playNext} type="button" className="smw-minibar-btn" aria-label="Next">
            <NextIcon size={14} />
          </button>
        </div>

        {/* Expand/close */}
        <button className="smw-minibar-btn" onClick={onExpand} aria-label="Expand" title="Expand">
          <ChevronUpIcon />
        </button>
        <button className="smw-minibar-btn" onClick={onClose} aria-label="Close" title="Close">
          <CloseIcon />
        </button>
      </div>

    </div>
  )
}

/* ── Expanded (Desktop) View ── */

function ExpandedView({ player }: { player: PlayerState }) {
  const {
    songs, currentSong, isPlaying, loopMode,
    currentTime, duration, durations, songLoading,
    imageUrl, waveformSlotRef, lastScrolledRef, strapiUrl,
    handlePlayPause, playPrev, playNext, restartSong,
    cycleLoopMode, handleSongClick,
  } = player

  return (
    <div className="smw-expanded">
      {/* Now playing row */}
      <div className="smw-np-row">
        <div className="smw-np-art">
          {imageUrl ? <img src={imageUrl} alt="" /> : <span className="smw-note">&#9834;</span>}
          <div className="smw-neon-overlay" />
        </div>
        <div className="smw-np-info">
          <p className="smw-np-title">{currentSong?.title ?? 'Select a song'}</p>
          {currentSong?.artist?.name && <p className="smw-np-artist">{currentSong.artist.name}</p>}
          <p className="smw-np-time">{formatTime(currentTime)}{duration > 0 && ` / ${formatTime(duration)}`}</p>
        </div>
        <div className="smw-np-transport">
          <CtrlBtn onClick={playPrev} label="Previous"><PrevIcon /></CtrlBtn>
          <CtrlBtn onClick={restartSong} label="Restart"><RestartIcon /></CtrlBtn>
          <CtrlBtn onClick={playNext} label="Next"><NextIcon /></CtrlBtn>
          <LoopButton loopMode={loopMode} onClick={cycleLoopMode} />
        </div>
      </div>

      {/* Play button + waveform */}
      <div className="smw-wave-row">
        <button
          onClick={handlePlayPause}
          disabled={songLoading}
          className="smw-play-circle"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {songLoading
            ? <span className="smw-spinner" />
            : isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className="smw-waveform-wrap">
          <div ref={waveformSlotRef} className="smw-waveform" />
          {songLoading && <div className="smw-waveform-loading"><span className="smw-spinner" /></div>}
        </div>
      </div>

      {/* Song list */}
      <div className="smw-song-list">
        {songs.map((song, index) => (
          <SongRow
            key={song.documentId}
            song={song}
            index={index}
            isActive={currentSong?.documentId === song.documentId}
            strapiUrl={strapiUrl}
            duration={durations[song.documentId]}
            onClick={() => handleSongClick(song)}
            scrollRef={lastScrolledRef}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Mobile View ── */

function MobileView({ player }: { player: PlayerState }) {
  const {
    imageUrl, currentSong, songLoading, isPlaying, loopMode,
    currentTime, duration, swipeX, waveformSlotRef,
    handleTouchStart, handleTouchMove, handleTouchEnd,
    cycleLoopMode, playPrev, playNext, handlePlayPause,
  } = player

  return (
    <div className="smw-mobile-view">
      {/* Album art */}
      <div className="smw-mobile-art-wrap">
        <div
          className="smw-mobile-art-swipe"
          style={{ transform: `translateX(${swipeX}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="smw-mobile-art">
            {imageUrl ? (
              <img src={imageUrl} alt="" />
            ) : (
              <div className="smw-mobile-art-placeholder"><span className="smw-note-lg">&#9834;</span></div>
            )}
            <div className="smw-neon-overlay" />
            <div className="smw-mobile-gradient">
              <p className="smw-mobile-title">{currentSong?.title ?? 'Select a song'}</p>
              {currentSong?.artist?.name && <p className="smw-mobile-artist">{currentSong.artist.name}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="smw-mobile-controls">
        <div className="smw-waveform-wrap smw-waveform-wrap--sm">
          <div ref={waveformSlotRef} className="smw-waveform" />
          {songLoading && <div className="smw-waveform-loading"><span className="smw-spinner" /></div>}
        </div>
        <div className="smw-timestamps">
          <span>{formatTime(currentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
        </div>
        <div className="smw-mobile-transport">
          <button onClick={cycleLoopMode} type="button" className="smw-icon-btn" aria-label="Shuffle"><ShuffleIcon size={20} /></button>
          <button onClick={playPrev} type="button" className="smw-icon-btn" aria-label="Previous"><PrevIcon size={20} /></button>
          <button
            onClick={handlePlayPause}
            disabled={songLoading}
            className="smw-mobile-play-btn"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {songLoading
              ? <span className="smw-spinner smw-spinner--white" />
              : isPlaying ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
          </button>
          <button onClick={playNext} type="button" className="smw-icon-btn" aria-label="Next"><NextIcon size={20} /></button>
          <button
            onClick={cycleLoopMode}
            type="button"
            className={`smw-icon-btn ${loopMode !== 'none' ? 'smw-icon-btn--active' : ''}`}
            aria-label={`Loop: ${loopMode}`}
          >
            <LoopIcon size={20} />
            {loopMode === 'one' && <span className="smw-loop-one">1</span>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Small sub-components ── */

function CtrlBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} type="button" aria-label={label} className="smw-ctrl-btn">
      {children}
    </button>
  )
}

function LoopButton({ loopMode, onClick }: { loopMode: LoopMode; onClick: () => void }) {
  const cls = loopMode === 'all'
    ? 'smw-ctrl-btn smw-ctrl-btn--loop-all'
    : loopMode === 'one'
      ? 'smw-ctrl-btn smw-ctrl-btn--loop-one'
      : 'smw-ctrl-btn'
  return (
    <button onClick={onClick} type="button" aria-label={`Loop: ${loopMode}`} className={cls}>
      <LoopIcon />
      {loopMode === 'one' && <span className="smw-loop-badge">1</span>}
    </button>
  )
}

function ShareHeaderButton({ strapiUrl }: { strapiUrl: string }) {
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    const url = `${strapiUrl}/api/strapi-plugin-music-manager/embed?mode=full`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      window.open(url, '_blank')
    })
  }

  return (
    <button
      className="smw-header-btn"
      onClick={handleShare}
      aria-label="Share player"
      title={copied ? 'Link copied!' : 'Share player'}
    >
      {copied
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polyline points="20 6 9 17 4 12" /></svg>
        : <ShareIcon size={16} />}
    </button>
  )
}
