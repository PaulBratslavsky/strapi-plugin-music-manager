import type { Core } from '@strapi/strapi';

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  // Generate peaks for any existing songs that are missing them
  try {
    const result = await strapi
      .plugin('strapi-plugin-music-manager')
      .service('peaks')
      .generateMissingPeaks();

    if (result.generated > 0) {
      strapi.log.info(`[music-manager] Bootstrap: generated peaks for ${result.generated}/${result.processed} songs`);
    }
  } catch (err) {
    strapi.log.error(`[music-manager] Bootstrap peaks generation failed: ${err}`);
  }
};

export default bootstrap;
