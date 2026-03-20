import { useState, useEffect, useRef, useCallback } from "react";
import { Field, Box, Typography, Button, Flex } from "@strapi/design-system";
import { Plus, Trash, Play, Cross } from "@strapi/icons";
import styled from "styled-components";

interface MusicPlayerData {
  audioId?: number;
  audioUrl?: string;
  audioName?: string;
  peaks?: number[];
}

interface MusicPlayerFieldProps {
  name: string;
  onChange: (event: {
    target: { name: string; value: MusicPlayerData; type: string };
  }) => void;
  value?: MusicPlayerData;
  intlLabel?: { defaultMessage: string };
  required?: boolean;
  attribute?: { type: string; customField: string };
  disabled?: boolean;
  error?: string;
  description?: { defaultMessage: string };
}

const FieldColumn = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spaces[3]};
`;

const Container = styled.div`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.neutral0};
`;

const PlayerSection = styled.div`
  width: 100%;
  padding: ${({ theme }) => theme.spaces[4]};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[3]};
`;

const WaveformContainer = styled.div`
  flex: 1;
  cursor: pointer;
  position: relative;
`;

const WaveformCanvas = styled.canvas`
  width: 100%;
  height: 60px;
  display: block;
`;

const TimeDisplay = styled.div`
  font-size: ${({ theme }) => theme.fontSizes[1]};
  color: ${({ theme }) => theme.colors.neutral600};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;

const TrackInfo = styled.div`
  width: 100%;
  padding: ${({ theme }) => `${theme.spaces[3]} ${theme.spaces[4]}`};
  background: ${({ theme }) => theme.colors.neutral100};
  border-top: 1px solid ${({ theme }) => theme.colors.neutral200};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const EmptyState = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => `${theme.spaces[8]} ${theme.spaces[4]}`};
  gap: ${({ theme }) => theme.spaces[3]};
  color: ${({ theme }) => theme.colors.neutral500};
`;

const PlayButton = styled.button`
  background: ${({ theme }) => theme.colors.primary600};
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.primary700};
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.neutral300};
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }
`;

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const generateFallbackPeaks = (count: number): number[] => {
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    peaks.push(0.2 + Math.random() * 0.6);
  }
  return peaks;
};

const MusicPlayerField = ({
  name,
  onChange,
  value,
  intlLabel,
  required = false,
  disabled = false,
  error,
  description,
}: MusicPlayerFieldProps) => {
  const [data, setData] = useState<MusicPlayerData>(value ?? {});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (value) setData(value);
  }, [value]);

  const updateValue = useCallback(
    (newData: MusicPlayerData) => {
      setData(newData);
      onChange({
        target: { name, value: newData, type: "json" },
      });
    },
    [name, onChange]
  );

  // Draw waveform on canvas
  const drawWaveform = useCallback(
    (progress: number = 0) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const peaks = data.peaks?.length ? data.peaks : generateFallbackPeaks(100);
      const barCount = peaks.length;
      const barWidth = rect.width / barCount * 0.7;
      const barGap = rect.width / barCount * 0.3;
      const maxHeight = rect.height * 0.9;

      ctx.clearRect(0, 0, rect.width, rect.height);

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + barGap);
        const barHeight = Math.max(2, peaks[i] * maxHeight);
        const y = rect.height - barHeight;

        const progressPoint = progress * barCount;

        if (i < progressPoint) {
          ctx.fillStyle = "#7b79ff";
        } else {
          ctx.fillStyle = "#d0d0e0";
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    },
    [data.peaks]
  );

  // Animate waveform during playback
  useEffect(() => {
    const animate = () => {
      if (audioRef.current && !audioRef.current.paused) {
        const progress = audioRef.current.currentTime / (audioRef.current.duration || 1);
        setCurrentTime(audioRef.current.currentTime);
        drawWaveform(progress);
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, drawWaveform]);

  // Draw initial waveform when data changes
  useEffect(() => {
    drawWaveform(0);
  }, [drawWaveform]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (audioRef.current && !audioRef.current.paused) {
        const progress = audioRef.current.currentTime / (audioRef.current.duration || 1);
        drawWaveform(progress);
      } else {
        drawWaveform(0);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawWaveform]);

  const handleSelectAudio = () => {
    // Open Strapi media library modal
    // We use the window.strapi approach to open the media library
    const mediaLibDialog = document.createElement("input");
    mediaLibDialog.type = "file";
    mediaLibDialog.accept = "audio/*";
    mediaLibDialog.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append("files", file);

        const response = await fetch("/upload", {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${JSON.parse(sessionStorage.getItem("jwtToken") || localStorage.getItem("jwtToken") || '""')}`,
          },
        });

        const uploaded = await response.json();
        if (uploaded && uploaded[0]) {
          const audioFile = uploaded[0];

          // Try to generate peaks
          let peaks: number[] | undefined;
          try {
            const peaksResponse = await fetch(
              `/strapi-plugin-music-manager/peaks/${audioFile.id}`,
              {
                headers: {
                  Authorization: `Bearer ${JSON.parse(sessionStorage.getItem("jwtToken") || localStorage.getItem("jwtToken") || '""')}`,
                },
              }
            );
            if (peaksResponse.ok) {
              const peaksData = await peaksResponse.json();
              peaks = peaksData.peaks;
            }
          } catch {
            // Peaks generation is optional
          }

          updateValue({
            audioId: audioFile.id,
            audioUrl: audioFile.url,
            audioName: audioFile.name,
            peaks,
          });
        }
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    mediaLibDialog.click();
  };

  const handleRemoveAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    updateValue({});
  };

  const handlePlayPause = () => {
    if (!audioRef.current && data.audioUrl) {
      const audio = new Audio(data.audioUrl);
      audio.addEventListener("loadedmetadata", () => {
        setDuration(audio.duration);
      });
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentTime(0);
        drawWaveform(0);
      });
      audioRef.current = audio;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = clickX / rect.width;

    audioRef.current.currentTime = progress * (audioRef.current.duration || 0);
    setCurrentTime(audioRef.current.currentTime);
    drawWaveform(progress);
  };

  const hasAudio = Boolean(data.audioId && data.audioUrl);

  return (
    <Field.Root
      name={name}
      error={error}
      hint={description?.defaultMessage}
      required={required}
    >
      <Field.Label>
        {intlLabel?.defaultMessage ?? "Music Manager"}
      </Field.Label>

      <FieldColumn>
        <Container>
          {hasAudio ? (
            <>
              <PlayerSection>
                <PlayButton
                  onClick={handlePlayPause}
                  disabled={disabled}
                  type="button"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Cross /> : <Play />}
                </PlayButton>

                <WaveformContainer>
                  <WaveformCanvas
                    ref={canvasRef}
                    onClick={handleWaveformClick}
                  />
                </WaveformContainer>

                <TimeDisplay>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </TimeDisplay>
              </PlayerSection>

              <TrackInfo>
                <Typography variant="omega" fontWeight="bold">
                  {data.audioName || "Unknown Track"}
                </Typography>
                <Button
                  variant="danger-light"
                  size="S"
                  startIcon={<Trash />}
                  onClick={handleRemoveAudio}
                  disabled={disabled}
                >
                  Remove
                </Button>
              </TrackInfo>
            </>
          ) : (
            <EmptyState>
              <MusicIcon />
              <Typography variant="omega" textColor="neutral500">
                No audio file selected
              </Typography>
              <Button
                variant="secondary"
                startIcon={<Plus />}
                onClick={handleSelectAudio}
                disabled={disabled}
                loading={isLoading}
              >
                Upload Audio
              </Button>
            </EmptyState>
          )}
        </Container>
      </FieldColumn>

      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

const MusicIconSvg = styled.svg`
  width: 48px;
  height: 48px;
  color: ${({ theme }) => theme.colors.neutral400};
`;

const MusicIcon = () => (
  <MusicIconSvg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </MusicIconSvg>
);

export { MusicPlayerField };
