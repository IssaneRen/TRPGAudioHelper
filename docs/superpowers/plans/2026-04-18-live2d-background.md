# Live2D 背景层角色展示 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 ProfileTab Hero 区域添加 Live2D 角色背景，支持鼠标追踪和点击互动。

**Architecture:** 新建 `Live2DBackground` React 组件封装 PixiJS + pixi-live2d-display。组件懒加载，作为 Hero 背景层绝对定位。Cubism 4 Core SDK 通过 script 标签引入，模型临时使用 CDN 地址后续可替换为本地资源。

**Tech Stack:** pixi.js@7, pixi-live2d-display@0.5.0-beta, Cubism 4 Core SDK (CDN), React 19, Framer Motion, TypeScript

---

### Task 1: 安装依赖 + 引入 Cubism Core SDK

**Files:**
- Modify: `package.json`
- Modify: `index.html`

- [ ] **Step 1: 安装 pixi.js 和 pixi-live2d-display**

```bash
export PATH="/c/nvm4w/nodejs:$PATH"
npx pnpm add pixi.js@7.4.3 pixi-live2d-display@0.5.0-beta
```

- [ ] **Step 2: 在 index.html 中引入 Cubism 4 Core SDK**

在 `index.html` 的 `<head>` 中，`<script type="module" src="/src/main.tsx">` 之前添加：

```html
<script src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"></script>
```

- [ ] **Step 3: 验证安装**

```bash
export PATH="/c/nvm4w/nodejs:$PATH"
npx pnpm build
```

Expected: 构建成功（新依赖不会影响现有代码）

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml index.html
git commit -m "[chore: master: 安装pixi.js和pixi-live2d-display依赖]"
```

---

### Task 2: 创建 Live2DBackground 组件

**Files:**
- Create: `src/pages/ProfileTab/Live2DBackground.tsx`

- [ ] **Step 1: 创建 Live2DBackground 组件**

```tsx
import { useEffect, useRef, useCallback } from "react";
import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display/cubism4";

// pixi-live2d-display 要求 window.PIXI 存在以注册 Ticker 自动更新
(window as unknown as Record<string, unknown>).PIXI = PIXI;

interface Live2DBackgroundProps {
  modelPath: string;
  opacity?: number;
  className?: string;
}

export function Live2DBackground({
  modelPath,
  opacity = 0.4,
  className = "",
}: Live2DBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<InstanceType<typeof Live2DModel> | null>(null);

  const handleResize = useCallback(() => {
    const app = appRef.current;
    const model = modelRef.current;
    const canvas = canvasRef.current;
    if (!app || !model || !canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const { width, height } = parent.getBoundingClientRect();
    app.renderer.resize(width, height);

    // 模型居中，缩放适配容器高度
    const scale = height / (model.height || 1) * 0.8;
    model.scale.set(scale, scale);
    model.x = width / 2;
    model.y = height / 2;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const { width, height } = parent.getBoundingClientRect();

    const app = new PIXI.Application({
      view: canvas,
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    appRef.current = app;

    let destroyed = false;

    Live2DModel.from(modelPath, { autoInteract: true })
      .then((model) => {
        if (destroyed) {
          model.destroy();
          return;
        }
        modelRef.current = model;
        app.stage.addChild(model);

        // 初始定位
        const scale = height / (model.height || 1) * 0.8;
        model.scale.set(scale, scale);
        model.anchor.set(0.5, 0.5);
        model.x = width / 2;
        model.y = height / 2;

        // 点击互动：触发随机动作
        model.on("hit", (hitAreas: string[]) => {
          if (hitAreas.includes("Body")) {
            model.motion("tap_body");
          } else if (hitAreas.includes("Head")) {
            model.expression();
          } else {
            model.motion("idle");
          }
        });
      })
      .catch((err) => {
        console.warn("[Live2D] 模型加载失败，静默降级:", err);
      });

    window.addEventListener("resize", handleResize);

    return () => {
      destroyed = true;
      window.removeEventListener("resize", handleResize);
      if (modelRef.current) {
        modelRef.current.destroy();
        modelRef.current = null;
      }
      app.destroy(false, { children: true });
      appRef.current = null;
    };
  }, [modelPath, handleResize]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        opacity,
        willChange: "transform",
        transform: "translateZ(0)",
        pointerEvents: "auto",
      }}
    />
  );
}
```

- [ ] **Step 2: 验证构建**

```bash
export PATH="/c/nvm4w/nodejs:$PATH"
npx pnpm build
```

Expected: 构建成功（组件未被引用，tree-shaking 不会包含）

- [ ] **Step 3: Commit**

```bash
git add src/pages/ProfileTab/Live2DBackground.tsx
git commit -m "[feat: master: 创建Live2DBackground组件]"
```

---

### Task 3: 集成到 ProfileTab Hero 区域

**Files:**
- Modify: `src/pages/ProfileTab/index.tsx`

- [ ] **Step 1: 在 ProfileTab 中懒加载 Live2DBackground**

在文件顶部 import 区域添加：

```tsx
import { lazy, Suspense } from "react";
import { useReducedMotion } from "framer-motion";
```

注意：`useReducedMotion` 已在文件中导入，`useState` 和 `useRef` 也已导入。只需添加 `lazy` 和 `Suspense`：

```tsx
import { useState, useRef, lazy, Suspense } from "react";
```

在 import 区域末尾添加懒加载：

```tsx
const Live2DBackground = lazy(() =>
  import("./Live2DBackground").then((m) => ({ default: m.Live2DBackground }))
);
```

- [ ] **Step 2: 在 Hero section 中插入 Live2D Canvas**

找到 Hero section 中的装饰层（oklch 渐变背景 div），在其后、`<motion.div style={{ y: heroY ... }}>` 之前插入：

```tsx
        {/* Live2D 角色背景层 */}
        {!shouldReduceMotion && (
          <Suspense fallback={null}>
            <motion.div
              style={{ y: heroY, opacity: heroOpacity }}
              className="absolute inset-0 z-[1]"
            >
              <Live2DBackground
                modelPath="https://cdn.jsdelivr.net/gh/Live2D/CubismWebSamples@develop/Samples/Resources/Hiyori/Hiyori.model3.json"
                opacity={0.4}
                className="h-full w-full"
              />
            </motion.div>
          </Suspense>
        )}
```

- [ ] **Step 3: 验证构建**

```bash
export PATH="/c/nvm4w/nodejs:$PATH"
npx pnpm build
```

Expected: 构建成功

- [ ] **Step 4: 启动 dev server 手动验证**

```bash
export PATH="/c/nvm4w/nodejs:$PATH"
npx pnpm dev
```

在浏览器打开 http://localhost:5173，检查：
1. Hero 区域出现 Hiyori 角色（半透明背景层）
2. 鼠标移动时角色眼球/头部跟随
3. 点击角色触发动作/表情
4. 向下滚动时角色跟随视差淡出
5. 文字和按钮不被遮挡，可正常点击

- [ ] **Step 5: Commit**

```bash
git add src/pages/ProfileTab/index.tsx
git commit -m "[feat: master: 集成Live2D角色到Hero背景层]"
```

---

### Task 4: 更新文档和 dev-log

**Files:**
- Modify: `docs/dev-log.md`
- Modify: `docs/business.md`
- Modify: `docs/tech-decisions.md`

- [ ] **Step 1: 更新 dev-log**

在 `docs/dev-log.md` 的 `2026-04-18` 表格末尾追加：

```markdown
| — | 团队负责人 | master | **Live2D背景层**: 安装pixi.js@7+pixi-live2d-display@0.5.0-beta、创建Live2DBackground组件(鼠标追踪+点击互动+视差联动)、集成到Hero背景层、Hiyori临时模型(CDN) | Live2DBackground.tsx, ProfileTab/index.tsx, index.html, package.json |
```

- [ ] **Step 2: 更新 business.md**

在 TAB1 关键代码位置表格中新增一行：

```markdown
| Live2D 背景 | `src/pages/ProfileTab/Live2DBackground.tsx` | PixiJS + pixi-live2d-display 封装，鼠标追踪 + 点击互动 |
```

- [ ] **Step 3: 更新 tech-decisions.md**

在模板之前新增 TD-016：

```markdown
## TD-016: Live2D Web 渲染 — pixi-live2d-display

- **日期**：2026-04-18
- **状态**：已确定

### 背景

用户希望在 ProfileTab Hero 区域展示 Live2D 角色立绘作为背景，支持鼠标追踪和点击互动。

### 决策

选择 **pixi-live2d-display@0.5.0-beta** + **pixi.js@7.4.3**。Cubism 4 完整支持、内置鼠标追踪和 hit detection、社区最成熟的 Web Live2D 方案。Cubism 4 Core SDK 通过 CDN script 标签引入。

备选方案 oh-my-live2d 更轻量但社区小、CubismSdkForWeb 官方 SDK 集成成本过高。

### 后续关注

- pixi-live2d-display 最后更新 2023 年底，PixiJS v8 不兼容，需关注社区 fork
- Live2D 模型替换为用户自有资源
- 移动端 WebGL 性能表现
```

- [ ] **Step 4: Commit**

```bash
git add docs/dev-log.md docs/business.md docs/tech-decisions.md
git commit -m "[docs: master: Live2D集成文档更新]"
```

---

### Task 5: 专家审查 + 修复

**Files:**
- 可能修改: `src/pages/ProfileTab/Live2DBackground.tsx`
- 可能修改: `src/pages/ProfileTab/index.tsx`

- [ ] **Step 1: 派遣技术专家审查**

使用 Agent tool 派遣 `superpowers:code-reviewer` 审查以下文件：
- `src/pages/ProfileTab/Live2DBackground.tsx` — WebGL 生命周期管理、内存泄漏风险、resize 处理
- `src/pages/ProfileTab/index.tsx` — 懒加载集成、视差联动、z-index 层级
- `index.html` — CDN 脚本安全性

重点关注：
- PixiJS Application 销毁是否完整（WebGL context 释放）
- resize 时 canvas 尺寸是否正确同步
- 模型加载失败的降级是否可靠
- pointer-events 是否影响上层按钮点击

- [ ] **Step 2: 根据专家反馈修复问题**

- [ ] **Step 3: 最终构建验证**

```bash
export PATH="/c/nvm4w/nodejs:$PATH"
npx pnpm build
```

- [ ] **Step 4: Commit 修复**

```bash
git add -A
git commit -m "[fix: master: 修复Live2D专家审查反馈]"
```
