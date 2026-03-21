import { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Typography, Flex } from '@strapi/design-system';
import { Play, Cross, ArrowLineLeft, ArrowLineRight, ArrowClockwise, ArrowsCounterClockwise } from '@strapi/icons';
import styled from 'styled-components';
import { useSongs, type Song } from '../../hooks/useSongs';

/* ── Player (top section) ── */

const PlayerContainer = styled.div`
  display: flex;
  align-items: stretch;
  gap: 16px;
  padding: 12px;
  background: ${({ theme }) => theme.colors.neutral0};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
  flex-shrink: 0;
`;

const AlbumArt = styled.div<{ $src?: string }>`
  width: 100px;
  min-height: 100px;
  border-radius: 8px;
  background: ${({ $src, theme }) =>
    $src ? `url(${$src}) center/cover no-repeat` : theme.colors.neutral200};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  align-self: stretch;
  font-size: 24px;
  color: ${({ theme }) => theme.colors.neutral500};
`;

const PlayBtn = styled.button<{ $playing?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 2px solid #ec4899;
  border-radius: 50%;
  background: transparent;
  color: #ec4899;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover {
    background: rgba(236, 72, 153, 0.08);
  }

  svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }
`;

type LoopMode = 'none' | 'all' | 'one';

const ControlBtn = styled.button<{ $loop?: LoopMode }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 2px solid ${({ $loop, theme }) =>
    $loop === 'all' ? '#ec4899' : $loop === 'one' ? '#ec4899' : theme.colors.neutral300};
  border-radius: 50%;
  background: ${({ $loop }) => $loop === 'all' ? '#ec4899' : 'transparent'};
  color: ${({ $loop, theme }) =>
    $loop === 'all' ? 'white' : $loop === 'one' ? '#ec4899' : theme.colors.neutral600};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ $loop }) => $loop ? '#db2777' : '#ec4899'};
    background: ${({ $loop }) =>
      $loop === 'all' ? '#db2777' : $loop === 'one' ? 'rgba(236, 72, 153, 0.08)' : 'transparent'};
    color: ${({ $loop }) =>
      $loop === 'all' ? 'white' : $loop === 'one' ? '#db2777' : '#ec4899'};
  }

  svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }
`;

const LoopIndicator = styled.span`
  position: absolute;
  bottom: -2px;
  right: -2px;
  font-size: 9px;
  font-weight: 700;
  color: white;
  line-height: 1;
`;

const WaveformCanvas = styled.canvas`
  width: 100%;
  height: 50px;
  display: block;
  cursor: pointer;
`;

const TimeText = styled.span`
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.neutral500};
`;

/* ── Song list (bottom section) ── */

const SongList = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
`;

const ListHeader = styled.div`
  display: grid;
  grid-template-columns: 28px 36px 1fr 24px 1fr 56px 80px;
  gap: 10px;
  align-items: center;
  padding: 6px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const HeaderLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.neutral500};
`;

const SongRow = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: grid;
  grid-template-columns: 28px 36px 1fr 24px 1fr 56px 80px;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: ${({ $active }) => ($active ? '6px' : '0')};
  background: ${({ $active }) => ($active ? '#ec4899' : 'transparent')};
  color: ${({ $active }) => ($active ? 'white' : 'inherit')};
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;

  &:hover {
    background: ${({ $active }) =>
      $active ? '#db2777' : 'rgba(0,0,0,0.03)'};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const SongThumb = styled.div<{ $src?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background: ${({ $src, theme }) =>
    $src ? `url(${$src}) center/cover no-repeat` : theme.colors.neutral200};
  flex-shrink: 0;
`;

const ArtistAvatar = styled.div<{ $src?: string }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ $src, theme }) =>
    $src ? `url(${$src}) center/cover no-repeat` : theme.colors.neutral200};
  flex-shrink: 0;
`;

const SongIndex = styled.span`
  font-size: 12px;
  color: inherit;
  opacity: 0.5;
  text-align: center;
`;

const CellText = styled.span<{ $bold?: boolean }>`
  font-size: 13px;
  font-weight: ${({ $bold }) => ($bold ? '600' : '400')};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CellMuted = styled(CellText)`
  opacity: 0.6;
  font-size: 12px;
`;

/* ── Helpers ── */

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

function drawWaveform(
  canvas: HTMLCanvasElement,
  peaks: number[],
  progress: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  // Fixed bar dimensions — downsample peaks to fit
  const barWidth = 4;
  const barGap = 1;
  const barCount = Math.floor(rect.width / (barWidth + barGap));
  const maxHeight = rect.height * 0.9;

  // Downsample peaks to match bar count
  const sampledPeaks: number[] = [];
  const ratio = peaks.length / barCount;
  for (let i = 0; i < barCount; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.floor((i + 1) * ratio);
    let max = 0;
    for (let j = start; j < end; j++) {
      if (peaks[j] > max) max = peaks[j];
    }
    sampledPeaks.push(max);
  }

  ctx.clearRect(0, 0, rect.width, rect.height);

  const activeColor = '#ec4899';   // pink
  const playedColor = '#d1d5db';   // gray (already played)

  for (let i = 0; i < barCount; i++) {
    const x = i * (barWidth + barGap);
    const barHeight = Math.max(2, sampledPeaks[i] * maxHeight);
    const y = rect.height - barHeight;
    const progressPoint = progress * barCount;

    ctx.fillStyle = i < progressPoint ? playedColor : activeColor;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 1.5);
    ctx.fill();
  }
}

/* ── Widget ── */

export function MusicPlayerWidget() {
  const { songs, loading, error } = useSongs(1, 20);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [loopMode, setLoopMode] = useState<LoopMode>('none');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const loopModeRef = useRef<LoopMode>(loopMode);
  const lastScrolledSongRef = useRef<string | null>(null);
  const onEndedRef = useRef<() => void>(() => {});

  // Keep refs in sync
  useEffect(() => { loopModeRef.current = loopMode; }, [loopMode]);

  // Auto-select first song when loaded
  useEffect(() => {
    if (!currentSong && songs.length > 0) {
      const first = songs.find((s) => s.audio?.url);
      if (first) setCurrentSong(first);
    }
  }, [songs, currentSong]);

  // Use pre-computed durations from API data
  useEffect(() => {
    const precomputed: Record<string, number> = {};
    for (const song of songs) {
      if (song.duration) {
        precomputed[song.documentId] = song.duration;
      }
    }
    if (Object.keys(precomputed).length > 0) {
      setDurations((prev) => ({ ...prev, ...precomputed }));
    }
  }, [songs]);

  const updateWaveform = useCallback(() => {
    if (!canvasRef.current || !currentSong?.peaks?.length) return;
    const progress = audioRef.current
      ? audioRef.current.currentTime / (audioRef.current.duration || 1)
      : 0;
    drawWaveform(canvasRef.current, currentSong.peaks, progress);
  }, [currentSong]);

  useEffect(() => {
    updateWaveform();
  }, [updateWaveform]);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const startAnimationLoop = useCallback((audio: HTMLAudioElement, peaks?: number[]) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const animate = () => {
      if (!audio.paused) {
        setCurrentTime(audio.currentTime);
        if (canvasRef.current && peaks?.length) {
          const progress = audio.currentTime / (audio.duration || 1);
          drawWaveform(canvasRef.current, peaks, progress);
        }
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animRef.current = requestAnimationFrame(animate);
  }, []);

  const playSong = useCallback(
    (song: Song) => {
      stopPlayback();
      if (!song.audio?.url) return;

      setCurrentSong(song);
      const audio = new Audio(song.audio.url);
      audioRef.current = audio;

      audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
      audio.addEventListener('ended', () => onEndedRef.current());

      audio.play();
      setIsPlaying(true);
      startAnimationLoop(audio, song.peaks ?? undefined);
    },
    [stopPlayback, startAnimationLoop]
  );

  const handlePlayPause = useCallback(() => {
    // If no audio element yet (auto-selected), start playback
    if (!audioRef.current) {
      if (currentSong) playSong(currentSong);
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      if (animRef.current) cancelAnimationFrame(animRef.current);
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      startAnimationLoop(audioRef.current, currentSong?.peaks ?? undefined);
    }
  }, [isPlaying, currentSong, playSong, startAnimationLoop]);

  const songsWithAudio = songs.filter((s) => s.audio?.url);

  const playNext = useCallback(() => {
    if (!currentSong || songsWithAudio.length === 0) return;
    const idx = songsWithAudio.findIndex((s) => s.documentId === currentSong.documentId);
    if (idx < songsWithAudio.length - 1) {
      playSong(songsWithAudio[idx + 1]);
    } else if (loopModeRef.current === 'all') {
      playSong(songsWithAudio[0]);
    } else {
      // 'none' — stop at end
      if (animRef.current) cancelAnimationFrame(animRef.current);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [currentSong, songsWithAudio, playSong]);

  const playPrev = useCallback(() => {
    if (!currentSong || songsWithAudio.length === 0) return;
    const idx = songsWithAudio.findIndex((s) => s.documentId === currentSong.documentId);
    if (idx > 0) {
      playSong(songsWithAudio[idx - 1]);
    } else if (loopModeRef.current === 'all') {
      playSong(songsWithAudio[songsWithAudio.length - 1]);
    }
  }, [currentSong, songsWithAudio, playSong]);

  const restartSong = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
        startAnimationLoop(audioRef.current, currentSong?.peaks ?? undefined);
      }
    }
  }, [isPlaying, currentSong, startAnimationLoop]);

  const cycleLoopMode = useCallback(() => {
    setLoopMode((prev) => {
      if (prev === 'none') return 'all';
      if (prev === 'all') return 'one';
      return 'none';
    });
  }, []);

  // Wire up the ended handler via ref to avoid stale closures
  useEffect(() => {
    onEndedRef.current = () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (loopModeRef.current === 'one') {
        restartSong();
      } else {
        playNext();
      }
    };
  }, [restartSong, playNext]);

  const handleSongClick = useCallback(
    (song: Song) => {
      if (currentSong?.documentId === song.documentId) {
        handlePlayPause();
      } else {
        playSong(song);
      }
    },
    [currentSong, handlePlayPause, playSong]
  );

  const handleWaveformClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

      // If no audio element yet (auto-selected), start playback then seek
      if (!audioRef.current && currentSong) {
        playSong(currentSong);
        // Seek after audio is ready
        const checkAudio = setInterval(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = progress * (audioRef.current.duration || 0);
            clearInterval(checkAudio);
          }
        }, 50);
        return;
      }

      if (audioRef.current) {
        audioRef.current.currentTime = progress * (audioRef.current.duration || 0);
        setCurrentTime(audioRef.current.currentTime);
        if (currentSong?.peaks?.length) {
          drawWaveform(canvasRef.current, currentSong.peaks, progress);
        }
      }
    },
    [currentSong, playSong]
  );

  useEffect(() => {
    return () => stopPlayback();
  }, [stopPlayback]);


  if (loading) {
    return (
      <Box padding={4}>
        <Typography textColor="neutral500">Loading songs...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={4}>
        <Typography textColor="danger600">Error loading songs</Typography>
      </Box>
    );
  }

  if (songsWithAudio.length === 0) {
    return (
      <Box padding={4}>
        <Typography textColor="neutral500">No songs with audio files yet</Typography>
      </Box>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Player */}
      <PlayerContainer>
        <AlbumArt $src={currentSong?.image?.url}>
          {!currentSong?.image?.url && '♪'}
        </AlbumArt>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Flex alignItems="center" gap={3}>
            <PlayBtn
              onClick={currentSong ? handlePlayPause : () => playSong(songsWithAudio[0])}
              $playing={isPlaying}
              type="button"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Cross /> : <Play />}
            </PlayBtn>

            <div style={{ minWidth: 0, flex: 1 }}>
              <Typography variant="omega" fontWeight="bold" ellipsis>
                {currentSong?.title || 'Select a song'}
              </Typography>
              {currentSong?.artist?.name && (
                <Typography variant="pi" style={{ color: '#ec4899' }} ellipsis>
                  by {currentSong.artist.name}
                </Typography>
              )}
              <TimeText>{formatTime(currentTime)}</TimeText>
            </div>

            <Flex gap={1} style={{ flexShrink: 0 }}>
              <ControlBtn onClick={playPrev} type="button" aria-label="Previous">
                <ArrowLineLeft />
              </ControlBtn>
              <ControlBtn onClick={restartSong} type="button" aria-label="Restart">
                <ArrowClockwise />
              </ControlBtn>
              <ControlBtn onClick={playNext} type="button" aria-label="Next">
                <ArrowLineRight />
              </ControlBtn>
              <ControlBtn
                $loop={loopMode !== 'none' ? loopMode : undefined}
                onClick={cycleLoopMode}
                type="button"
                aria-label={`Loop: ${loopMode}`}
                style={{ position: 'relative' }}
              >
                <ArrowsCounterClockwise />
                {loopMode === 'one' && <LoopIndicator>1</LoopIndicator>}
              </ControlBtn>
            </Flex>
          </Flex>

          {currentSong?.peaks?.length ? (
            <Box paddingTop={2}>
              <WaveformCanvas ref={canvasRef} onClick={handleWaveformClick} />
            </Box>
          ) : null}
        </div>
      </PlayerContainer>

      {/* Song list */}
      <SongList>
        <ListHeader>
          <HeaderLabel>#</HeaderLabel>
          <span />
          <HeaderLabel>Title</HeaderLabel>
          <span />
          <HeaderLabel>Artist</HeaderLabel>
          <HeaderLabel>Time</HeaderLabel>
          <HeaderLabel>Added</HeaderLabel>
        </ListHeader>
        {songsWithAudio.map((song, index) => (
          <SongRow
            key={song.documentId}
            $active={currentSong?.documentId === song.documentId}
            ref={(el: HTMLButtonElement | null) => {
              if (el && currentSong?.documentId === song.documentId && lastScrolledSongRef.current !== song.documentId) {
                lastScrolledSongRef.current = song.documentId;
                requestAnimationFrame(() => {
                  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                });
              }
            }}
            onClick={() => handleSongClick(song)}
            type="button"
          >
            <SongIndex>{index + 1}</SongIndex>
            <SongThumb $src={song.image?.url} />
            <CellText $bold={currentSong?.documentId === song.documentId}>
              {song.title || 'Untitled'}
            </CellText>
            <ArtistAvatar $src={song.artist?.image?.url} />
            <CellMuted>{song.artist?.name || '—'}</CellMuted>
            <CellMuted>{durations[song.documentId] ? formatTime(durations[song.documentId]) : '—'}</CellMuted>
            <CellMuted>{new Date(song.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</CellMuted>
          </SongRow>
        ))}
      </SongList>
    </div>
  );
}
