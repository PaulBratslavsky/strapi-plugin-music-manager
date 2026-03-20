import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  index(ctx) {
    ctx.body = strapi
      .plugin('strapi-plugin-music-manager')
      .service('service')
      .getWelcomeMessage();
  },
});

export default controller;
