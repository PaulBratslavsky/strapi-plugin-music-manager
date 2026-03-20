import type { Core } from "@strapi/strapi";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  // Register the custom field for admin UI
  strapi.customFields.register({
    name: "music-manager",
    plugin: "strapi-plugin-music-manager",
    type: "json",
    inputSize: {
      default: 12,
      isResizable: true,
    },
  });

  // Document service middleware: auto-generate peaks after song create/update
  strapi.documents.use(async (context, next) => {
    const result = await next();

    if (context.uid !== 'plugin::strapi-plugin-music-manager.song') return result;
    if (!['create', 'update', 'publish'].includes(context.action)) return result;

    if (!result || typeof result !== 'object' || Array.isArray(result)) return result;
    const doc = result as Record<string, any>;
    if (!doc.documentId) return result;

    // Skip if peaks already exist
    if (doc.peaks && Array.isArray(doc.peaks) && doc.peaks.length > 0) {
      return result;
    }

    // Fetch the entry with audio populated
    const entry = await strapi.documents('plugin::strapi-plugin-music-manager.song').findOne({
      documentId: doc.documentId,
      populate: { audio: true },
    });

    if (!entry?.audio?.url) return result;

    try {
      const peaks = await strapi
        .plugin('strapi-plugin-music-manager')
        .service('peaks')
        .computePeaksFromUrl(entry.audio.url);

      await strapi.db.query('plugin::strapi-plugin-music-manager.song').updateMany({
        where: { documentId: doc.documentId },
        data: { peaks },
      });

      strapi.log.info(`[music-manager] Generated peaks for "${entry.title}"`);
    } catch (err) {
      strapi.log.error(`[music-manager] Failed to generate peaks: ${err}`);
    }

    return result;
  });
};

export default register;
