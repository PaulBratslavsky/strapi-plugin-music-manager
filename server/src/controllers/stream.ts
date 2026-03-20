import path from 'node:path';
import fs from 'node:fs';

const MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.webm': 'audio/webm',
};

const stream = ({ strapi }) => ({
  /**
   * Stream audio by song documentId.
   * GET /songs/:id/stream
   * Matches the reference frontend: `${strapiBase}/api/songs/${documentId}/stream`
   */
  async streamAudio(ctx) {
    const { id } = ctx.params;

    const entry = await strapi.documents('plugin::strapi-plugin-music-manager.song').findOne({
      documentId: id,
      populate: { audio: true },
    });

    if (!entry?.audio?.url) {
      ctx.status = 404;
      ctx.body = { error: 'Song or audio file not found' };
      return;
    }

    const uploadsDir = path.join(strapi.dirs.static.public, 'uploads');
    const fileName = path.basename(entry.audio.url);
    const filePath = path.join(uploadsDir, fileName);

    if (!fs.existsSync(filePath)) {
      ctx.status = 404;
      ctx.body = { error: 'Audio file not found on disk' };
      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = path.extname(fileName).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const range = ctx.request.headers.range;

    ctx.set('Content-Type', contentType);
    ctx.set('Accept-Ranges', 'bytes');
    ctx.set('Content-Disposition', 'inline');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = Number.parseInt(parts[0], 10);
      const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      ctx.status = 206;
      ctx.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      ctx.set('Content-Length', String(chunkSize));
      ctx.body = fs.createReadStream(filePath, { start, end });
    } else {
      ctx.set('Content-Length', String(fileSize));
      ctx.body = fs.createReadStream(filePath);
    }
  },

  /**
   * Batch generate waveform peaks for all songs missing them.
   * POST /songs/generate-peaks?force=true
   */
  async generatePeaks(ctx) {
    try {
      const force = ctx.query.force === 'true';
      const result = await strapi
        .plugin('strapi-plugin-music-manager')
        .service('peaks')
        .generateMissingPeaks(force);

      ctx.body = {
        message: 'Peak generation complete',
        ...result,
      };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: `Peak generation failed: ${err}` };
    }
  },
});

export default stream;
