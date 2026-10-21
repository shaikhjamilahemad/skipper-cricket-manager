import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Android app opens the game from file:///android_asset/. Chrome-based WebViews refuse
// module scripts (and "crossorigin" stylesheets) from file:// pages, so after the build we
// turn them into plain deferred tags. The bundle is a single script with no imports, so this is safe.
function fileFriendlyHtml() {
  return {
    name: 'file-friendly-html',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
        .replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/g, '<link rel="stylesheet" href="$1">');
    },
  };
}

export default defineConfig({
  plugins: [react(), fileFriendlyHtml()],
  base: './',
  build: {
    target: 'es2019',
    assetsInlineLimit: 200000, // fonts are inlined into the CSS: no extra files to fetch
    chunkSizeWarningLimit: 2000,
  },
});
