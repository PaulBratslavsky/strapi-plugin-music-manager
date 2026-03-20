# Strapi Plugin Music Manager

A Strapi v5 plugin for managing music with audio streaming, waveform visualization, and an embeddable player widget.

## Features

- **Song & Artist content types** — Manage your music library with songs, artists, cover art, and audio files
- **Audio streaming** — Stream audio with HTTP range request support for efficient playback
- **Waveform peaks** — Auto-generate waveform peak data from audio files (200-point resolution)
- **Custom field** — Add a "Music Manager" JSON field to any content type with built-in waveform preview
- **Admin dashboard** — Browse your library with inline playback and waveform visualization
- **Dashboard widget** — Quick-access music player on the Strapi admin homepage
- **Embeddable widget** — Drop a single `<script>` tag into any website to render a full music player

## Installation

```bash
npm install strapi-plugin-music-manager
```

Add the plugin to your Strapi config:

```js
// config/plugins.ts
export default {
  'strapi-plugin-music-manager': {
    enabled: true,
  },
};
```

Rebuild and restart Strapi:

```bash
npm run build
npm run develop
```

## Content Types

The plugin registers two collection types:

### Song

| Field    | Type     | Description                              |
| -------- | -------- | ---------------------------------------- |
| `title`  | String   | Track name                               |
| `artist` | Relation | Many-to-one relation with Artist         |
| `image`  | Media    | Cover art                                |
| `audio`  | Media    | Audio file (MP3, WAV, OGG, FLAC, etc.)  |
| `peaks`  | JSON     | Waveform peak data (auto-generated)      |

### Artist

| Field   | Type     | Description                       |
| ------- | -------- | --------------------------------- |
| `name`  | String   | Artist or band name               |
| `bio`   | Text     | Biography                         |
| `image` | Media    | Artist photo                      |
| `songs` | Relation | One-to-many relation with Song    |

## API Endpoints

All endpoints are under `/api/strapi-plugin-music-manager`.

| Method | Path                    | Description                              |
| ------ | ----------------------- | ---------------------------------------- |
| GET    | `/songs`                | List songs (populates artist + image)    |
| GET    | `/songs/:id`            | Get a single song                        |
| GET    | `/songs/:id/stream`     | Stream audio (supports range requests)   |
| GET    | `/artists`              | List artists                             |
| GET    | `/artists/:id`          | Get a single artist                      |
| POST   | `/songs/generate-peaks` | Batch generate waveform peaks            |
| GET    | `/widget.js`            | Serve the embeddable player widget       |

### Generate peaks

Generate waveform data for all songs missing peaks:

```bash
curl -X POST http://localhost:1337/api/strapi-plugin-music-manager/songs/generate-peaks
```

Force regenerate for all songs:

```bash
curl -X POST http://localhost:1337/api/strapi-plugin-music-manager/songs/generate-peaks?force=true
```

### Public access

To make songs and artists available without authentication, enable public permissions in Strapi:

**Settings > Roles > Public > strapi-plugin-music-manager**

Enable `find` and `findOne` for both Song and Artist, plus `streamAudio`, `serveWidget`, and `generatePeaks` as needed.

## Custom Field

The plugin registers a **Music Manager** custom field you can add to any content type via the Content-Type Builder. It stores a JSON value with:

```json
{
  "audioId": 12,
  "audioUrl": "/uploads/track.mp3",
  "audioName": "track.mp3",
  "peaks": [0.12, 0.45, 0.87]
}
```

The field editor includes a waveform preview with click-to-seek playback.

## Embeddable Widget

The plugin serves a self-contained JavaScript bundle that renders a floating music player on any website. The player has three view states:

- **Trigger** — A floating button in the bottom-right corner
- **Minimized** — A bar at the bottom with playback controls, seekable progress bar, and song timer
- **Expanded** — A panel with waveform visualization, song list, and full transport controls (desktop and mobile layouts)

### Basic usage

```html
<script src="https://your-strapi.com/api/strapi-plugin-music-manager/widget.js"></script>
```

The widget auto-detects the Strapi URL from the script `src` attribute.

### With initial song

```html
<script
  src="https://your-strapi.com/api/strapi-plugin-music-manager/widget.js"
  data-song="your-song-document-id"
></script>
```

### How it works

- Fetches songs from your Strapi instance via the public API
- Streams audio using the `/songs/:id/stream` endpoint
- Renders waveform visualization using [WaveSurfer.js](https://wavesurfer.xyz/)
- Music continues playing when switching between views
- Style-isolated with scoped CSS (no conflicts with the host page)
- ~77 KB gzipped

## Development

```bash
# Build plugin + widget
npm run build

# Watch plugin (admin + server)
npm run watch

# Watch widget only
npm run dev:widget

# Build widget only
npm run build:widget
```

## Requirements

- Strapi v5
- Node.js 18+
