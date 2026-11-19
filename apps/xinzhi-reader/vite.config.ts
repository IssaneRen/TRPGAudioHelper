import { cpSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const APP_BASE = '/apps/xinzhi-reader/'
const BUILD_SHA = process.env.GITHUB_SHA || process.env.SOURCE_VERSION || 'local'

/**
 * pdf.js 的 worker 与 CJK CMap 不进 Git，构建时从 node_modules 复制到产物里。
 * worker 重命名为 .js：默认 Nginx mime.types 没有 .mjs 映射，
 * 模块 worker 要求 JS MIME，.js 在任何静态服务器上都能正确返回。
 */
function copyPdfjsAssets(): Plugin {
  return {
    name: 'copy-pdfjs-assets',
    closeBundle() {
      const outDir = fileURLToPath(new URL('./dist/pdfjs/', import.meta.url))
      cpSync(new URL('./node_modules/pdfjs-dist/cmaps', import.meta.url), `${outDir}cmaps`, {
        recursive: true,
      })
      cpSync(
        new URL('./node_modules/pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url),
        `${outDir}pdf.worker.min.js`,
      )
      console.log('[xinzhi-reader] pdfjs assets -> dist/pdfjs/')
    },
  }
}

export default defineConfig({
  base: APP_BASE,
  define: {
    __BUILD_SHA__: JSON.stringify(BUILD_SHA),
  },
  plugins: [
    react(),
    copyPdfjsAssets(),
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
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
