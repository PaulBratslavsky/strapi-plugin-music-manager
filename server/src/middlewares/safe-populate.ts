/**
 * Route middleware that sets default population for public song endpoints.
 * Always populates artist + image, never populates audio.
 */

const populate = {
  artist: {
    fields: ['name'],
    populate: {
      image: {
        fields: ['url', 'alternativeText'],
      },
    },
  },
  image: {
    fields: ['url', 'alternativeText'],
  },
};

export default (config, { strapi }) => {
  return async (ctx, next) => {
    ctx.query.populate = populate;
    await next();
  };
};
