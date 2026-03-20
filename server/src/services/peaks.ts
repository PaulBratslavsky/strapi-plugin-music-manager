import path from 'node:path';
import fs from 'node:fs';

const NUM_PEAKS = 1000;

function isRemoteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export interface AudioAnalysis {
  peaks: number[];
  duration: number;
}

async function analyzeAudioBuffer(buffer: Buffer): Promise<AudioAnalysis> {
  const { default: decode } = await import('audio-decode');

  const audioBuffer = await decode(buffer);
  const channelData = audioBuffer.getChannelData(0);
  const samples = channelData.length;
  const duration = audioBuffer.duration;

  if (samples === 0) return { peaks: Array(NUM_PEAKS).fill(0), duration };

  const samplesPerPeak = Math.max(1, Math.floor(samples / NUM_PEAKS));

  const rmsValues: number[] = [];
  for (let i = 0; i < NUM_PEAKS; i++) {
    let sumOfSquares = 0;
    const start = i * samplesPerPeak;
    const end = Math.min(start + samplesPerPeak, samples);
    const count = end - start;

    for (let j = start; j < end; j++) {
      sumOfSquares += channelData[j] * channelData[j];
    }

    rmsValues.push(Math.sqrt(sumOfSquares / count));
  }

  const maxRms = Math.max(...rmsValues);
  if (maxRms === 0) return { peaks: Array(NUM_PEAKS).fill(0), duration };

  const peaks = rmsValues.map((v) => Math.round((v / maxRms) * 1000) / 1000);
  return { peaks, duration: Math.round(duration * 100) / 100 };
}

/**
 * Resolve an audio URL to a Buffer — works for both local files and remote URLs.
 */
async function resolveAudioBuffer(audioUrl: string, strapi: any): Promise<Buffer | null> {
  if (isRemoteUrl(audioUrl)) {
    try {
      return await fetchBuffer(audioUrl);
    } catch (err) {
      strapi.log.error(`[peaks] Failed to download remote audio: ${err}`);
      return null;
    }
  }

  const uploadsDir = path.join(strapi.dirs.static.public, 'uploads');
  const fileName = path.basename(audioUrl);
  const filePath = path.join(uploadsDir, fileName);

  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

interface SongWithAudio {
  documentId: string;
  title?: string;
  peaks?: unknown;
  duration?: number | null;
  audio?: {
    url: string;
  } | null;
}

const peaks = ({ strapi }) => ({
  async computePeaksFromFile(filePath: string): Promise<AudioAnalysis> {
    const buffer = fs.readFileSync(filePath);
    return analyzeAudioBuffer(buffer);
  },

  async computePeaksFromUrl(audioUrl: string): Promise<AudioAnalysis> {
    const buffer = await resolveAudioBuffer(audioUrl, strapi);
    if (!buffer) throw new Error(`Could not resolve audio: ${audioUrl}`);
    return analyzeAudioBuffer(buffer);
  },

  async computePeaksForSong(documentId: string): Promise<AudioAnalysis | null> {
    const entry = await strapi.documents('plugin::strapi-plugin-music-manager.song').findOne({
      documentId,
      populate: { audio: true },
    });

    if (!entry?.audio?.url) return null;

    const buffer = await resolveAudioBuffer(entry.audio.url, strapi);
    if (!buffer) return null;

    return analyzeAudioBuffer(buffer);
  },

  async generateMissingPeaks(force = false) {
    const findOptions: any = {
      populate: { audio: true },
      status: 'published',
    };

    if (!force) {
      findOptions.filters = {
        $or: [{ peaks: { $null: true } }, { peaks: { $eq: null } }],
      };
    }

    const songs: SongWithAudio[] = await strapi
      .documents('plugin::strapi-plugin-music-manager.song')
      .findMany(findOptions) as SongWithAudio[];

    let generated = 0;

    for (const song of songs) {
      if (!song.audio?.url) continue;

      try {
        const buffer = await resolveAudioBuffer(song.audio.url, strapi);
        if (!buffer) {
          strapi.log.warn(`[peaks] Could not resolve audio for "${song.title}": ${song.audio.url}`);
          continue;
        }

        const analysis = await analyzeAudioBuffer(buffer);

        await strapi.db.query('plugin::strapi-plugin-music-manager.song').updateMany({
          where: { documentId: song.documentId },
          data: { peaks: analysis.peaks, duration: analysis.duration },
        });

        generated++;
        strapi.log.info(`[peaks] Generated peaks + duration for "${song.title}" (${analysis.duration}s)`);
      } catch (err) {
        strapi.log.error(`[peaks] Failed to generate peaks for "${song.title}": ${err}`);
      }
    }

    return { processed: songs.length, generated };
  },
});

export default peaks;
