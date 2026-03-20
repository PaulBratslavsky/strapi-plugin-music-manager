export default {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/artists',
      handler: 'artist.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/artists/:id',
      handler: 'artist.findOne',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/songs',
      handler: 'song.find',
      config: {
        policies: [],
        middlewares: ['plugin::strapi-plugin-music-manager.safe-populate'],
      },
    },
    {
      method: 'GET',
      path: '/songs/:id',
      handler: 'song.findOne',
      config: {
        policies: [],
        middlewares: ['plugin::strapi-plugin-music-manager.safe-populate'],
      },
    },
    {
      method: 'GET',
      path: '/songs/:id/stream',
      handler: 'stream.streamAudio',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/songs/generate-peaks',
      handler: 'stream.generatePeaks',
      config: {
        policies: [],
      },
    },
  ],
};
