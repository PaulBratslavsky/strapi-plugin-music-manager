import { useState, useRef, useCallback } from 'react';
import {
  Main,
  Box,
  Typography,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Flex,
  Button,
  Pagination,
  SearchForm,
  Searchbar,
  Badge,
} from '@strapi/design-system';
import { Play, Cross } from '@strapi/icons';
import { Layouts } from '@strapi/strapi/admin';
import styled from 'styled-components';
import { useSongs, type Song } from '../hooks/useSongs';

const PAGE_SIZE = 10;

const PlayBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary600};
  color: white;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.primary700};
  }

  svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }
`;

const StopBtn = styled(PlayBtn)`
  background: ${({ theme }) => theme.colors.danger600};

  &:hover {
    background: ${({ theme }) => theme.colors.danger700};
  }
`;

const MiniWaveform = styled.canvas`
  width: 120px;
  height: 28px;
  display: block;
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const TruncatedText = styled(Typography)`
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function drawMiniWaveform(canvas: HTMLCanvasElement, peaks: number[], progress = 0) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const barCount = peaks.length;
  const barWidth = (rect.width / barCount) * 0.7;
  const barGap = (rect.width / barCount) * 0.3;
  const maxHeight = rect.height * 0.9;

  ctx.clearRect(0, 0, rect.width, rect.height);

  for (let i = 0; i < barCount; i++) {
    const x = i * (barWidth + barGap);
    const barHeight = Math.max(1, peaks[i] * maxHeight);
    const y = rect.height - barHeight;
    const progressPoint = progress * barCount;

    ctx.fillStyle = i < progressPoint ? '#7b79ff' : '#d0d0e0';
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 1);
    ctx.fill();
  }
}

interface MiniPlayerProps {
  song: Song;
  isPlaying: boolean;
  progress: number;
  onPlayPause: (song: Song) => void;
}

function MiniPlayer({ song, isPlaying, progress, onPlayPause }: MiniPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const peaks = song.peaks?.length ? song.peaks : [];

  // Draw waveform
  const drawRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (node) {
        (canvasRef as any).current = node;
        if (peaks.length > 0) {
          requestAnimationFrame(() => drawMiniWaveform(node, peaks, progress));
        }
      }
    },
    [peaks, progress]
  );

  return (
    <Flex gap={2} alignItems="center">
      {isPlaying ? (
        <StopBtn onClick={() => onPlayPause(song)} type="button" aria-label="Stop">
          <Cross />
        </StopBtn>
      ) : (
        <PlayBtn
          onClick={() => onPlayPause(song)}
          type="button"
          aria-label="Play"
          disabled={!song.audio?.url}
        >
          <Play />
        </PlayBtn>
      )}
      {peaks.length > 0 && <MiniWaveform ref={drawRef} />}
    </Flex>
  );
}

const HomePage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { songs, loading, pagination } = useSongs(page, PAGE_SIZE);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const filteredSongs = search.trim()
    ? songs.filter(
        (s) =>
          s.title?.toLowerCase().includes(search.toLowerCase()) ||
          s.artist?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : songs;

  const handlePlayPause = (song: Song) => {
    // Stop current
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }

    if (playingSongId === song.documentId) {
      setPlayingSongId(null);
      setPlayProgress(0);
      return;
    }

    if (!song.audio?.url) return;

    const audio = new Audio(song.audio.url);
    audioRef.current = audio;
    setPlayingSongId(song.documentId);
    setPlayProgress(0);

    const animate = () => {
      if (audio && !audio.paused) {
        setPlayProgress(audio.currentTime / (audio.duration || 1));
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    audio.addEventListener('ended', () => {
      setPlayingSongId(null);
      setPlayProgress(0);
    });

    audio.play();
    animFrameRef.current = requestAnimationFrame(animate);
  };

  return (
    <Main>
      <Layouts.Header
        title="Music Manager"
        subtitle={`${pagination.total} songs in your library`}
      />
      <Layouts.Content>
        <Box paddingBottom={4}>
          <SearchForm>
            <Searchbar
              name="search"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearch(e.target.value);
              }}
              onClear={() => setSearch('')}
              placeholder="Search songs or artists..."
              clearLabel="Clear search"
            >
              Search
            </Searchbar>
          </SearchForm>
        </Box>

        <Table colCount={6} rowCount={filteredSongs.length + 1}>
          <Thead>
            <Tr>
              <Th>
                <Typography variant="sigma">Player</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Title</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Artist</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Audio</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Peaks</Typography>
              </Th>
              <Th>
                <Typography variant="sigma">Created</Typography>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading && (
              <Tr>
                <Td colSpan={6}>
                  <Box padding={4}>
                    <Typography textColor="neutral600">Loading songs...</Typography>
                  </Box>
                </Td>
              </Tr>
            )}
            {!loading && filteredSongs.length === 0 && (
              <Tr>
                <Td colSpan={6}>
                  <Box padding={4}>
                    <Typography textColor="neutral500">
                      {search
                        ? 'No songs match your search'
                        : 'No songs yet — create songs in the Content Manager'}
                    </Typography>
                  </Box>
                </Td>
              </Tr>
            )}
            {filteredSongs.map((song) => (
              <Tr key={song.documentId}>
                <Td>
                  <MiniPlayer
                    song={song}
                    isPlaying={playingSongId === song.documentId}
                    progress={playingSongId === song.documentId ? playProgress : 0}
                    onPlayPause={handlePlayPause}
                  />
                </Td>
                <Td>
                  <Typography textColor="neutral800" fontWeight="bold">
                    {song.title || 'Untitled'}
                  </Typography>
                </Td>
                <Td>
                  <Typography textColor="neutral600">
                    {song.artist?.name || '—'}
                  </Typography>
                </Td>
                <Td>
                  {song.audio?.url ? (
                    <Badge active>Uploaded</Badge>
                  ) : (
                    <Badge>No audio</Badge>
                  )}
                </Td>
                <Td>
                  {song.peaks?.length ? (
                    <Badge active>{song.peaks.length} peaks</Badge>
                  ) : (
                    <Badge>None</Badge>
                  )}
                </Td>
                <Td>
                  <Typography textColor="neutral600">
                    {formatDate(song.createdAt)}
                  </Typography>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>

        {pagination.pageCount > 1 && (
          <Box paddingTop={4}>
            <Flex justifyContent="center">
              <Pagination
                pageCount={pagination.pageCount}
                activePage={page}
                onPageChange={setPage}
              />
            </Flex>
          </Box>
        )}
      </Layouts.Content>
    </Main>
  );
};

export { HomePage };
