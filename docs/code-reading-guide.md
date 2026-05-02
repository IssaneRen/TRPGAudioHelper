# 项目代码阅读指南

> 面向新接手代码的人，说明项目入口、推荐阅读顺序，以及 Live2D 和音频播放两块重点实现。

## 当前文档情况

项目已经有文档目录 `docs/`，主要分为：

- `docs/business.md`：业务目标、功能范围、用户场景。
- `docs/tech-decisions.md`：技术选型和关键技术决策记录。
- `docs/dev-log.md`：按日期记录的开发过程。
- `docs/reports/`：专项调研和阶段报告，例如 Live2D、Web Audio、音效合成、任务网络设计等。
- `docs/superpowers/`：部分功能的设计规格和实施计划。

这份文档补充的是“如何读代码”，更偏代码入口和实现链路。

## 项目整体结构

这是一个 Vite + React 19 + TypeScript 的纯前端单页应用。核心功能是 TRPG 主持辅助，包含四个 Tab：

- 个人介绍：个人主页、资料编辑、模组库、Live2D 背景。
- 模组工具：线索关系图、任务关系网、节点图片、导入导出。
- 音效键盘：键盘触发音效、自定义上传音频、默认合成音效。
- 博客杂谈：静态 demo 博客列表和 Markdown 渲染。

数据层没有使用 Redux、Zustand 这类全局状态库。当前做法是每个功能用自定义 hook 管自己的 `useState`，并同步到 `localStorage`。

## 入口代码阅读顺序

建议按下面顺序读：

1. `index.html`
   - 浏览器入口。
   - 包含 `#root` 容器。
   - 额外加载 `/lib/live2dcubismcore.min.js`，这是 Live2D Cubism Core SDK。

2. `src/main.tsx`
   - React 应用挂载入口。
   - `ReactDOM.createRoot(...).render(...)` 把 `<App />` 挂载到页面。
   - 外层包了 `BrowserRouter` 和 `ThemeProvider`。

3. `src/App.tsx`
   - 路由入口。
   - 使用 `React.lazy` 懒加载四个功能页。
   - `/`、`/module-tool`、`/soundboard`、`/blog` 都套在 `TabLayout` 里。
   - 全局 `Toaster` 也在这里挂载。

4. `src/components/TabLayout.tsx`
   - 全局页面壳。
   - 定义顶部导航、移动端底部导航、主题切换按钮、页面切换动画。
   - 内部用 `<Outlet />` 渲染当前路由页面。

5. `src/types/index.ts`
   - 全局业务类型。
   - 先理解 `ProfileData`、`ModuleClueData`、`ClueNode`、`ClueEdge`、`ModuleTaskData`、`BlogPost`。

6. `src/stores/*`
   - `use-profile-store.ts`：个人资料和模组列表。
   - `use-clue-store.ts`：线索图数据、发现状态、节点边 CRUD。
   - `use-task-store.ts`：任务关系网数据。
   - `use-soundboard-store.ts`：按键和音频数据映射。

7. `src/pages/*`
   - `ProfileTab/index.tsx`：个人主页和 Live2D 使用位置。
   - `ModuleToolTab/index.tsx`：React Flow 线索图主逻辑，是当前最复杂的页面。
   - `SoundboardTab/index.tsx`：音效键盘主逻辑。
   - `BlogTab/index.tsx`：博客 demo 数据和 Markdown 渲染。

## 理解方式

可以把项目理解成“四个小应用共享一个导航壳”：

```text
index.html
  -> src/main.tsx
    -> src/App.tsx
      -> src/components/TabLayout.tsx
        -> src/pages/ProfileTab
        -> src/pages/ModuleToolTab
        -> src/pages/SoundboardTab
        -> src/pages/BlogTab
```

页面内部的共同模式是：

```text
类型定义 src/types
  -> store hook 读取 localStorage 并维护状态
  -> 页面组件调用 store
  -> UI 组件触发 handler
  -> handler 更新 React 状态和 localStorage
```

`ModuleToolTab` 需要额外注意：它有两份状态。

- React Flow 当前画布状态：`nodes` / `edges`。
- 持久化业务状态：`useClueStore()` 里的 `clueData`。

新增节点、连线、触发关系、导入导出时，通常需要同时更新这两份状态。

## Live2D 实现技术栈

相关文件：

- `index.html`
- `src/pages/ProfileTab/index.tsx`
- `src/pages/ProfileTab/Live2DBackground.tsx`
- `public/lib/live2dcubismcore.min.js`
- `public/live2d/Hiyori/**`

### 技术栈

- `pixi.js@7.4.3`：WebGL/Canvas 渲染引擎。
- `pixi-live2d-display@0.5.0-beta`：把 Live2D Cubism 模型接到 PixiJS 舞台中。
- Live2D Cubism Core：通过 `public/lib/live2dcubismcore.min.js` 暴露 `window.Live2DCubismCore`。
- React lazy/Suspense：`ProfileTab` 中懒加载 Live2D 组件，避免首屏同步加载大依赖。
- Framer Motion：Live2D 所在 Hero 层参与滚动视差和透明度变化。

### 加载链路

1. `index.html` 使用脚本标签加载 Cubism Core：

```html
<script src="/lib/live2dcubismcore.min.js" async></script>
```

2. `ProfileTab/index.tsx` 懒加载 `Live2DBackground`：

```tsx
const Live2DBackground = lazy(() =>
  import("./Live2DBackground").then((m) => ({ default: m.Live2DBackground }))
);
```

3. Hero 区域传入本地模型路径：

```tsx
<Live2DBackground
  modelPath="/live2d/Hiyori/Hiyori.model3.json"
  opacity={0.4}
  className="h-full w-full"
/>
```

4. `Live2DBackground.tsx` 初始化 PixiJS：

```tsx
const app = new PIXI.Application({
  view: canvas,
  width,
  height,
  backgroundAlpha: 0,
  antialias: true,
  autoDensity: true,
  resolution: window.devicePixelRatio || 1,
});
```

5. 等待 Cubism Core 加载完成后，通过 `Live2DModel.from(modelPath, { autoInteract: true })` 创建模型，并加入 `app.stage`。

### 关键实现点

- `window.PIXI = PIXI`：`pixi-live2d-display` 需要全局 `PIXI`，用于注册 ticker 自动更新。
- `waitForCubismCore()`：因为 Cubism Core 是 async script，组件内部会轮询等待 `window.Live2DCubismCore` 存在。
- `waitForNonZeroSize()`：等父容器有非零尺寸后才初始化，避免 canvas 宽高为 0。
- `fitModelToContainer()`：根据容器高度缩放模型，并把模型 anchor 设为中心。
- `model.on("hit", hitHandler)`：点击不同 hit area 触发动作或表情，例如 Body 触发 `tap_body`。
- cleanup 中销毁模型和 Pixi app，避免 WebGL 资源泄漏。
- `ProfileTab` 里使用 `useReducedMotion()`，用户开启减少动效时不渲染 Live2D 背景。

### 常见风险

- `pixi-live2d-display@0.5.0-beta` 依赖 PixiJS v7，不能随意升级到 PixiJS v8。
- Live2D 模型资源比较多，路径必须保持相对 `public/` 正确。
- WebGL 和 Live2D 在移动端可能有性能压力，所以当前只作为低透明度背景层。

## 音频播放实现技术栈

相关文件：

- `src/pages/SoundboardTab/index.tsx`
- `src/hooks/use-audio-manager.ts`
- `src/hooks/use-keyboard-listener.ts`
- `src/stores/use-soundboard-store.ts`
- `src/pages/SoundboardTab/Keyboard3D.tsx`
- `src/pages/SoundboardTab/Key3D.tsx`
- `src/pages/SoundboardTab/keyboard-layout.ts`
- `src/pages/SoundboardTab/sound-synthesis.ts`

### 技术栈

- Web Audio API：核心播放能力，使用 `AudioContext`、`AudioBuffer`、`AudioBufferSourceNode`。
- OfflineAudioContext：生成默认音效时离线渲染音频。
- FileReader：读取用户上传的音频文件为 base64 data URL。
- localStorage：保存按键到音频的映射，包含 base64 音频数据。
- React hook：封装音频管理和键盘监听。
- CSS 3D Transform + Framer Motion：实现 3D 键盘外观和按下动画。

### 播放链路

1. `SoundboardTab/index.tsx` 创建音频管理器：

```tsx
const audioManager = useAudioManager();
```

2. 用户自定义音频从 `localStorage` 读取后预加载：

```tsx
await audioManager.preload(mapping.key, mapping.audioData);
```

3. 没有绑定自定义音效的按键，生成默认音效：

```tsx
const audioData = await generateDefaultSound(config.freq, config.type, config.duration);
await audioManager.preload(`default-${key}`, audioData);
```

4. 用户按键或点击虚拟键盘后触发：

```tsx
audioManager.play(key);
// 或
audioManager.play(`default-${key}`);
```

5. Enter 键调用：

```tsx
audioManager.stopAll();
```

### `useAudioManager` 做了什么

`use-audio-manager.ts` 是实际音频播放核心：

- 维护全局单例 `AudioContext`。
- `preload(key, audioData)`：
  - 如果是 base64 data URL，用 `atob` 转成二进制。
  - 如果是 URL，用 `fetch` 获取二进制。
  - 调用 `ctx.decodeAudioData(arrayBuffer)` 解码成 `AudioBuffer`。
  - 存进 `bufferCache`。
- `play(key)`：
  - 从 `bufferCache` 取出 `AudioBuffer`。
  - 创建新的 `AudioBufferSourceNode`。
  - 连接到 `ctx.destination`。
  - `source.start(0)` 立即播放。
  - 把 source 放进 `activeSources`，方便停止。
- `stopAll()`：
  - 遍历 `activeSources` 调用 `.stop()`。
  - 清空正在播放列表。

这种方式比直接用 `<audio>` 标签更适合音效键盘，因为音效触发延迟低，可以同时叠加播放多个声音，也能统一停止。

### 默认音效生成

当前页面实际使用的是 `use-audio-manager.ts` 中的 `generateDefaultSound()`：

- 使用 `OfflineAudioContext` 离线创建一个短音频。
- 创建 `OscillatorNode`，设置频率和波形。
- 创建 `GainNode` 做 attack/release 包络，避免爆音。
- 离线渲染成 `AudioBuffer`。
- 转成 WAV，再转成 data URL。
- 预加载到 `AudioContext` 中备用。

`SoundboardTab/index.tsx` 里有一个 `DEFAULT_SOUNDS` 表，给每个按键配置了不同的频率、波形和持续时间。

### 上传音频

用户上传音效时：

1. `FileReader.readAsDataURL(file)` 把音频转成 base64。
2. `audioManager.preload(key, audioData)` 尝试解码，失败则提示“音频解码失败”。
3. 解码成功后，`soundStore.setMapping(key, audioData, file.name)` 保存到 `localStorage`。

导入导出配置时，当前 JSON 包含音频 data URL，所以可以迁移完整音频数据。但这也意味着 JSON 文件会变大，`localStorage` 容量也可能成为限制。

### 键盘监听

`use-keyboard-listener.ts` 负责监听物理键盘：

- 忽略 `ctrl`、`alt`、`meta` 组合键。
- 忽略长按重复事件。
- 忽略输入框、文本域、contenteditable 中的按键。
- 空格映射成 `Space`，回车映射成 `Enter`，字母统一转小写。
- 空格和回车会 `preventDefault()`，避免页面滚动或表单提交。

### 3D 键盘 UI

`Keyboard3D.tsx` 和 `Key3D.tsx` 负责视觉：

- `keyboard-layout.ts` 定义 QWERTY 三排字母和 `Space` / `Enter`。
- `Keyboard3D` 按行渲染按键。
- `Key3D` 使用 Framer Motion 做按下、hover 动画。
- `src/index.css` 中的 `.keyboard-3d-container`、`.keyboard-body`、`.key-3d` 等类使用 `perspective`、`rotateX`、阴影、响应式尺寸实现 3D 效果。

### `sound-synthesis.ts` 的状态

`src/pages/SoundboardTab/sound-synthesis.ts` 里已经写了更复杂的 TRPG 氛围音效合成器，例如风声、暴雨、雷鸣、翻书、钟声、剑击、魔法等。

但当前 `SoundboardTab/index.tsx` 没有 import 它，而是使用 `generateDefaultSound()`。所以它目前更像是预留实现或调研产物。如果要提升默认音效质量，可以把默认音效加载逻辑从 `generateDefaultSound()` 切换到 `synthesizeSound(key)`。

## 后续阅读重点

如果目标是改功能，建议优先读：

- 改个人主页或 Live2D：`ProfileTab/index.tsx`、`Live2DBackground.tsx`。
- 改线索图：`ModuleToolTab/index.tsx`、`ClueNode.tsx`、`AnimatedEdge.tsx`、`use-clue-store.ts`。
- 改音效键盘：`SoundboardTab/index.tsx`、`use-audio-manager.ts`、`use-soundboard-store.ts`、`keyboard-layout.ts`。
- 改导入导出：`utils/json-io.ts` 和各 store 的 localStorage 读写。
