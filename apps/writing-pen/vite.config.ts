import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const APP_BASE = '/apps/writing-pen/'
const BUILD_SHA = process.env.GITHUB_SHA || process.env.SOURCE_VERSION || 'local'

export default defineConfig({
  base: APP_BASE,
  define: {
    __BUILD_SHA__: JSON.stringify(BUILD_SHA),
  },
  plugins: [
    react(),
    {
      name: 'inject-build-sha',
      transformIndexHtml(html) {
        return html.replace(
          '</head>',
          `  <meta name="app-version" content="${BUILD_SHA}" />\n  </head>`,
        )
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 5174,
  },
})
