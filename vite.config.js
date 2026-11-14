import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The sandbox preview proxies host port 3000 through a rotating host name.
// Only in preview mode do we accept that host; normal local dev keeps Vite's
// default localhost allowlist.
const previewMode = process.env.BASE44_PREVIEW_MODE === '1'
const sandboxHost = process.env.BASE44_SANDBOX_HOST_DOMAIN

export default defineConfig({
  plugins: [react()],
  // The packed extension ships readable code for store review; the web build
  // stays minified.
  build: { minify: process.env.LUMA_EXTENSION === '1' ? false : 'esbuild' },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: previewMode && sandboxHost ? ['.' + sandboxHost] : undefined,
  },
})
