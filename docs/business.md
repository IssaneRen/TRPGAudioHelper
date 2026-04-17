# 业务文档

> 记录三个 Tab 的核心业务逻辑、组件结构和代码位置索引。随开发进展持续更新。

---

## TAB1 - 个人介绍与模组链接 (ProfileTab)

### 业务说明

- 展示个人介绍信息
- 管理模组列表（已备、待备、已带）
- 维护免责声明和跑团要求
- 支持 JSON 导入导出

### 关键代码位置

| 功能 | 文件路径 | 说明 |
|------|----------|------|
| 页面入口 | `src/pages/ProfileTab/index.tsx` | 已创建骨架 |
| 数据类型 | — | 待定义 |
| 数据导出 | — | 待实现 |

---

## TAB2 - 模组工具页面 (ModuleToolTab)

### 业务说明

- DAG 有向无环图可视化线索网络（React Flow）
- 节点 = 线索，边 = 关联关系（可标注）
- 已获取线索置灰处理
- 支持拖拽、缩放、自定义模组上传
- 支持 JSON 导入导出

### 关键代码位置

| 功能 | 文件路径 | 说明 |
|------|----------|------|
| 页面入口 | `src/pages/ModuleToolTab/index.tsx` | 已创建骨架 |
| DAG 图组件 | — | 待实现（React Flow） |
| 节点/边类型 | — | 待定义 |

---

## TAB3 - 博客与杂谈 (BlogTab)

### 业务说明

- 文章展示与更新
- 支持博客和杂谈内容类型
- Markdown 渲染（react-markdown 或 MDX）

### 关键代码位置

| 功能 | 文件路径 | 说明 |
|------|----------|------|
| 页面入口 | `src/pages/BlogTab/index.tsx` | 已创建骨架 |

---

## 共享模块

| 功能 | 文件路径 | 说明 |
|------|----------|------|
| 路由配置 | `src/App.tsx` | React Router v7 Declarative 模式 |
| Tab 布局 | `src/components/TabLayout.tsx` | 桌面顶部 + 移动端底部导航 |
| 工具函数 (cn) | `src/lib/utils.ts` | clsx + tailwind-merge |
| 全局样式 | `src/index.css` | Tailwind CSS 4 + Shadcn/ui 主题变量 |
| localStorage | `src/stores/` | 待实现 |
| JSON 导入导出 | `src/utils/` | 待实现 |
| 类型定义 | `src/types/` | 待定义 |
