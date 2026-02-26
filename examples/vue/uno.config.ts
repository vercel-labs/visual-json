import { defineConfig, presetIcons, presetWind4 } from "unocss";

export default defineConfig({
  presets: [
    presetWind4(),
    presetIcons({
      scale: 1.2,
    }),
  ],
});
