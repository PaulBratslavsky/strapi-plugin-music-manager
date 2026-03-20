import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/embed-entry.tsx'),
      name: 'StrapiMusicEmbed',
      fileName: () => 'embed.js',
      formats: ['iife'],
    },
    outDir: resolve(__dirname, '../dist/widget'),
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: 'terser',
  },
})
