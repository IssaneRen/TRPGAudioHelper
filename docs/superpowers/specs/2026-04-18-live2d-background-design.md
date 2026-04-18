# Live2D 背景层角色展示 — 设计文档

**日期**: 2026-04-18
**状态**: 已确认

---

## 目标

在 ProfileTab Hero 区域添加 Live2D 角色作为背景层展示，支持鼠标追踪和点击互动，提升页面视觉表现力。临时使用 Hiyori 官方示例模型，后续替换为用户自有资源。

## 技术方案

**核心库**: `pixi-live2d-display` + `pixi.js`

选择理由：Cubism 4 完整支持、内置鼠标追踪和点击命中检测、社区成熟、文档丰富。

## 架构

### 新增文件

| 文件 | 职责 |
|------|------|
| `src/pages/ProfileTab/Live2DBackground.tsx` | Live2D 渲染组件，管理 PixiJS Application 生命周期 |
| `public/live2d/hiyori/` | Hiyori 模型资源（.model3.json + .moc3 + textures + motions） |

### 修改文件

| 文件 | 变更 |
|------|------|
| `src/pages/ProfileTab/index.tsx` | Hero 区域插入 `<Live2DBackground />` 组件 |
| `package.json` | 新增 `pixi.js`、`pixi-live2d-display` 依赖 |

## 组件设计: Live2DBackground

### Props

```typescript
interface Live2DBackgroundProps {
  modelPath: string;        // .model3.json 路径
  opacity?: number;         // 角色透明度，默认 0.4
  className?: string;       // 额外样式类
}
```

### 行为

1. **初始化**: 组件挂载时创建 PixiJS Application（transparent 背景），加载 Live2D 模型
2. **鼠标追踪**: 监听 `pointermove` 事件，角色眼球/头部跟随鼠标
3. **点击互动**: 监听模型 `hit` 事件，触发随机动作或表情
4. **视差联动**: Canvas 容器与 Hero 共享 Framer Motion 的 `heroY` / `heroOpacity` MotionValue，滚动时同步移动和淡出
5. **销毁**: 组件卸载时销毁 PixiJS Application 和 WebGL context，防止内存泄漏

### 布局

```
Hero Section (relative)
├── 渐变背景层 (absolute, z-0)
├── oklch 装饰层 (absolute, z-0)
├── Live2D Canvas (absolute, z-[1], opacity 0.4, pointer-events-none*)
│   └── * 点击交互区域通过 JS 事件委托处理，不阻塞按钮点击
└── 文字/按钮层 (relative, z-10)
```

Canvas 使用 `absolute inset-0` 填满 Hero 区域，角色居中显示。

### 性能策略

- **懒加载**: `React.lazy(() => import('./Live2DBackground'))` + Suspense
- **减弱动效**: `useReducedMotion()` 为 true 时不渲染组件
- **Canvas GPU 加速**: `will-change: transform` + `transform: translateZ(0)`
- **模型按需加载**: 模型文件从 `public/` 目录通过 HTTP 请求加载，不打入 bundle

### 错误处理

- 模型加载失败时静默降级（不显示 Live2D，不影响页面其他内容）
- Console 输出 warning 供开发者排查

## 资源管理

### 临时资源: Hiyori 模型

```
public/live2d/hiyori/
├── hiyori.model3.json
├── hiyori.moc3
├── hiyori.physics3.json
├── textures/
│   └── texture_00.png
└── motions/
    ├── idle_01.motion3.json
    └── tap_body_01.motion3.json (等)
```

### 替换指南

用户后续替换模型时，只需：
1. 将自有模型文件放入 `public/live2d/<model-name>/`
2. 修改 `Live2DBackground` 的 `modelPath` prop 指向新的 `.model3.json`

## 依赖变更

```
pixi.js             — PixiJS WebGL 渲染引擎
pixi-live2d-display — Live2D Cubism 4 渲染器
```

## 不做的事

- 不做模型切换 UI（后续需求再加）
- 不做语音/口型同步
- 不做跨 Tab 持久化（仅 ProfileTab 显示）
- 不做移动端触控手势（基础点击即可）
