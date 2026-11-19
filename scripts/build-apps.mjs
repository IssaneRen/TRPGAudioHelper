#!/usr/bin/env node
// 构建 apps/ 下的独立子应用，并把产物复制进根 dist/apps/<name>/。
// 主站全量部署（deploy.yml / deploy-direct.sh）因此始终携带子应用，
// 后续主站再发布也不会丢掉 /apps/ 下的页面。
//
// 子应用保留各自的 npm 锁文件与工具链，不进入 pnpm workspace；
// 新增子应用只需在 apps/ 放一个带 package.json + 构建 script 的目录。
import { cpSync, existsSync, readdirSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appsDir = path.join(repoRoot, 'apps')
const rootDist = path.join(repoRoot, 'dist')

if (!existsSync(appsDir)) {
  console.log('[build-apps] apps/ 不存在，跳过')
  process.exit(0)
}

const apps = readdirSync(appsDir).filter((name) => {
  const dir = path.join(appsDir, name)
  return statSync(dir).isDirectory() && existsSync(path.join(dir, 'package.json'))
})

if (!apps.length) {
  console.log('[build-apps] 没有可构建的子应用')
  process.exit(0)
}

for (const name of apps) {
  const appDir = path.join(appsDir, name)
  console.log(`[build-apps] === ${name} ===`)
  execSync('npm ci --no-audit --no-fund', { cwd: appDir, stdio: 'inherit' })
  execSync('npm run build', { cwd: appDir, stdio: 'inherit' })
  const appDist = path.join(appDir, 'dist')
  if (!existsSync(path.join(appDist, 'index.html'))) {
    throw new Error(`[build-apps] ${name} 构建产物缺少 index.html`)
  }
  cpSync(appDist, path.join(rootDist, 'apps', name), { recursive: true })
  console.log(`[build-apps] ${name} -> dist/apps/${name}/`)
}

console.log(`[build-apps] 完成：${apps.join(', ')}`)
