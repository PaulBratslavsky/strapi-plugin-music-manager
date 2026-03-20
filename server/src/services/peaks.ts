import path from 'node:path';
import fs from 'node:fs';

const NUM_PEAKS = 200;

async function computePeaksFromBuffer(buffer: Buffer): Promise<number[]> {
  const { default: decode } = await import('audio-decode');

  const audioBuffer = await decode(buffer);
  const channelData = audioBuffer.getChannelData(0);
  const samples = channelData.length;

  if (samples === 0) return Array(NUM_PEAKS).fill(0);

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
  if (maxRms === 0) return Array(NUM_PEAKS).fill(0);

  return rmsValues.map((v) => Math.round((v / maxRms) * 1000) / 1000);
}

interface SongWithAudio {
  documentId: string;
  title?: string;
  peaks?: unknown;
  audio?: {
    url: string;
  } | null;
}

const peaks = ({ strapi }) => ({
  async computePeaksFromFile(filePath: string): Promise<number[]> {
    const buffer = fs.readFileSync(filePath);
    return computePeaksFromBuffer(buffer);
  },

  async computePeaksForSong(documentId: string): Promise<number[] | null> {
    const entry = await strapi.documents('plugin::strapi-plugin-music-manager.song').findOne({
      documentId,
      populate: { audio: true },
    });

    if (!entry?.audio?.url) return null;

    const uploadsDir = path.join(strapi.dirs.static.public, 'uploads');
    const fileName = path.basename(entry.audio.url);
    const filePath = path.join(uploadsDir, fileName);

    if (!fs.existsSync(filePath)) return null;

    const buffer = fs.readFileSync(filePath);
    return computePeaksFromBuffer(buffer);
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

      const uploadsDir = path.join(strapi.dirs.static.public, 'uploads');
      const fileName = path.basename(song.audio.url);
      const filePath = path.join(uploadsDir, fileName);

      if (!fs.existsSync(filePath)) {
        strapi.log.warn(`[peaks] Audio file not found for "${song.title}": ${filePath}`);
        continue;
      }

      try {
        const buffer = fs.readFileSync(filePath);
        const peaksData = await computePeaksFromBuffer(buffer);

        await strapi.db.query('plugin::strapi-plugin-music-manager.song').updateMany({
          where: { documentId: song.documentId },
          data: { peaks: peaksData },
        });

        generated++;
        strapi.log.info(`[peaks] Generated peaks for "${song.title}"`);
      } catch (err) {
        strapi.log.error(`[peaks] Failed to generate peaks for "${song.title}": ${err}`);
      }
    }

    return { processed: songs.length, generated };
  },
});

export default peaks;
