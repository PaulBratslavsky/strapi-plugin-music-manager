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

let widgetCache: string | null = null;
let embedCache: string | null = null;

/**
 * Check if a URL is a remote (absolute) URL vs a local relative path.
 */
function isRemoteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

const stream = ({ strapi }) => ({
  /**
   * Stream audio by song documentId.
   * GET /songs/:id/stream
   *
   * - Local uploads: streams from disk with range request support
   * - Remote uploads (Strapi Cloud, S3, etc.): redirects to the media URL
   */
  async streamAudio(ctx) {
    const { id } = ctx.params;

    const entry = await strapi.documents('plugin::strapi-plugin-music-manager.song').findOne({
      documentId: id,
      populate: { audio: true },
      status: 'published',
    });

    if (!entry?.audio?.url) {
      ctx.status = 404;
      ctx.body = { error: 'Song or audio file not found' };
      return;
    }

    const audioUrl = entry.audio.url;

    // Remote file (Strapi Cloud, S3, etc.) — redirect
    if (isRemoteUrl(audioUrl)) {
      ctx.set('Access-Control-Allow-Origin', '*');
      ctx.redirect(audioUrl);
      return;
    }

    // Local file — stream from disk
    const uploadsDir = path.join(strapi.dirs.static.public, 'uploads');
    const fileName = path.basename(audioUrl);
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
   * Serve the embeddable widget JavaScript bundle.
   * GET /widget.js
   */
  async serveWidget(ctx) {
    const pluginRoot = path.resolve(__dirname, '..', '..');
    const widgetPath = path.join(pluginRoot, 'dist', 'widget', 'widget.js');

    if (!fs.existsSync(widgetPath)) {
      ctx.status = 404;
      ctx.type = 'application/javascript';
      ctx.body = '// Widget not built. Run: npm run build:widget';
      return;
    }

    if (!widgetCache || process.env.NODE_ENV === 'development') {
      try {
        widgetCache = fs.readFileSync(widgetPath, 'utf-8');
      } catch (error) {
        strapi.log.error('Failed to read widget file:', error);
        ctx.status = 500;
        ctx.type = 'application/javascript';
        ctx.body = '// Error loading widget';
        return;
      }
    }

    ctx.type = 'application/javascript';
    ctx.set('Cache-Control', process.env.NODE_ENV === 'development' ? 'no-cache' : 'public, max-age=3600');
    ctx.set('Access-Control-Allow-Origin', '*');
    ctx.body = widgetCache;
  },

  /**
   * Serve an embeddable HTML page with the music player widget.
   * GET /embed?song=documentId&theme=dark
   */
  async serveEmbed(ctx) {
    const { song, theme, mode } = ctx.query;
    const songId = song ? String(song) : null;
    const songAttr = songId ? ` data-song="${songId.replace(/"/g, '&quot;')}"` : '';
    const themeAttr = theme === 'dark' ? ' data-theme="dark"' : '';
    const themeClass = theme === 'dark' ? 'dark' : '';

    // Build script URLs from the current request
    const proto = ctx.request.headers['x-forwarded-proto'] || ctx.protocol;
    const host = ctx.request.headers['x-forwarded-host'] || ctx.request.host;
    const baseUrl = `${proto}://${host}`;

    // mode=full uses the full widget, default uses the single-song embed
    const isFullMode = mode === 'full';
    const scriptUrl = isFullMode
      ? `${baseUrl}/api/strapi-plugin-music-manager/widget.js`
      : `${baseUrl}/api/strapi-plugin-music-manager/embed.js`;

    // Fetch song metadata for OG tags
    let ogTitle = 'Music Player';
    let ogDescription = 'Listen now';
    let ogImage = '';

    if (songId) {
      try {
        const entry = await strapi.documents('plugin::strapi-plugin-music-manager.song').findOne({
          documentId: songId,
          populate: { artist: true, image: true },
          status: 'published',
        });
        if (entry) {
          ogTitle = entry.title || 'Music Player';
          const artistName = (entry as any).artist?.name;
          if (artistName) ogDescription = `by ${artistName}`;
          const imageUrl = (entry as any).image?.url;
          if (imageUrl) {
            ogImage = imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;
          }
        }
      } catch {
        // Fallback to defaults
      }
    }

    const ogImageTag = ogImage ? `\n<meta property="og:image" content="${ogImage}"/>` : '';

    ctx.type = 'text/html';
    ctx.set('Access-Control-Allow-Origin', '*');
    ctx.set('Content-Security-Policy', 'frame-ancestors *');
    ctx.set('X-Frame-Options', 'ALLOWALL');
    ctx.body = `<!DOCTYPE html>
<html lang="en" class="${themeClass}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${ogTitle}</title>
<meta property="og:title" content="${ogTitle}"/>
<meta property="og:description" content="${ogDescription}"/>
<meta property="og:type" content="music.song"/>${ogImageTag}
<meta property="og:url" content="${baseUrl}/api/strapi-plugin-music-manager/embed?song=${songId || ''}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${ogTitle}"/>
<meta name="twitter:description" content="${ogDescription}"/>${ogImageTag ? ogImageTag.replace('og:image', 'twitter:image') : ''}
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;font-family:system-ui,sans-serif}
body{background:transparent}
</style>
</head>
<body>
<script src="${scriptUrl}"${songAttr}${themeAttr}></script>
</body>
</html>`;
  },

  /**
   * Serve the single-song embed JavaScript bundle.
   * GET /embed.js
   */
  async serveEmbedJs(ctx) {
    const pluginRoot = path.resolve(__dirname, '..', '..');
    const embedPath = path.join(pluginRoot, 'dist', 'widget', 'embed.js');

    if (!fs.existsSync(embedPath)) {
      ctx.status = 404;
      ctx.type = 'application/javascript';
      ctx.body = '// Embed not built. Run: npm run build:embed';
      return;
    }

    if (!embedCache || process.env.NODE_ENV === 'development') {
      try {
        embedCache = fs.readFileSync(embedPath, 'utf-8');
      } catch (error) {
        strapi.log.error('Failed to read embed file:', error);
        ctx.status = 500;
        ctx.type = 'application/javascript';
        ctx.body = '// Error loading embed';
        return;
      }
    }

    ctx.type = 'application/javascript';
    ctx.set('Cache-Control', process.env.NODE_ENV === 'development' ? 'no-cache' : 'public, max-age=3600');
    ctx.set('Access-Control-Allow-Origin', '*');
    ctx.body = embedCache;
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
