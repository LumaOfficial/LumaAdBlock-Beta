import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The sandbox preview proxies host port 3000 through a rotating host name.
// Only in preview mode do we accept that host; normal local dev keeps Vite's
// default localhost allowlist.
const previewMode = process.env.BASE44_PREVIEW_MODE === '1'
const sandboxHost = process.env.BASE44_SANDBOX_HOST_DOMAIN

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: previewMode && sandboxHost ? ['.' + sandboxHost] : undefined,
  },
})
