import { getTranslation } from "./utils/getTranslation";
import { PLUGIN_ID } from "./pluginId";
import { Initializer } from "./components/Initializer";
import { PluginIcon } from "./components/PluginIcon";
import { MusicNotes } from "@strapi/icons";
import { MusicPlayerWidget } from "./components/MusicPlayerWidget";

export default {
  register(app: any) {
    // Register the custom field
    app.customFields.register({
      name: "music-manager",
      pluginId: PLUGIN_ID,
      type: "json",
      intlLabel: {
        id: getTranslation("music-manager.label"),
        defaultMessage: "Music Manager",
      },
      intlDescription: {
        id: getTranslation("music-manager.description"),
        defaultMessage: "Upload and manage music with waveform visualization",
      },
      icon: MusicNotes,
      components: {
        Input: async () =>
          import("./components/custom-field/MusicPlayerField").then((m) => ({
            default: m.MusicPlayerField,
          })),
      },
    });

    // Register the admin menu link
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Music Manager",
      },
      Component: async () => {
        const { App } = await import("./pages/App");
        return App;
      },
    });

    // Register the dashboard widget
    app.widgets.register({
      icon: MusicNotes,
      title: {
        id: `${PLUGIN_ID}.music-player-widget.title`,
        defaultMessage: "Music Player",
      },
      component: () => Promise.resolve(MusicPlayerWidget),
      pluginId: PLUGIN_ID,
      id: "music-player-widget",
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(
            `./translations/${locale}.json`
          );
          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};
