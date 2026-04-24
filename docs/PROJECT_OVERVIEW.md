# XMind 思维导图项目文档

## 项目概述

这是一个基于 React + TypeScript + AntV G6 构建的思维导图管理应用。项目使用 File System Access API 直接操作本地文件系统，支持创建、编辑、导出思维导图，并提供丰富的节点管理功能。

### 技术栈

- **前端框架**: React 19 + TypeScript
- **图形库**: AntV G6 (树形图可视化)
- **状态管理**: Zustand (带持久化)
- **UI 组件**: Ant Design 6
- **样式方案**: CSS Modules
- **路由**: React Router DOM 7
- **构建工具**: Vite 8

---

## 目录结构

```
xmind/
├── docs/                          # 文档目录
├── public/                        # 静态资源
│   └── md/                        # Markdown 文件存储目录
├── src/
│   ├── assets/                    # 图片等资源
│   ├── components/                # React 组件
│   │   ├── configPanel/           # 配置面板子组件
│   │   ├── customNodeEditor/      # 自定义节点编辑器
│   │   ├── historyPanel/          # 历史记录面板子组件
│   │   ├── nodeEditorPanel/       # 节点编辑面板子组件
│   │   └── shortcut/              # 快捷键配置子组件
│   ├── constants/                 # 常量配置
│   ├── core/                      # 核心类（G6 封装）
│   ├── data/                      # 数据加载
│   ├── hooks/                     # 自定义 Hooks
│   ├── pages/                     # 页面组件
│   ├── store/                     # Zustand 状态管理
│   ├── styles/                    # CSS Modules 样式
│   ├── types/                     # TypeScript 类型定义
│   └── utils/                     # 工具函数
└── package.json
```

---

## 核心功能模块

### 1. 思维导图管理

| 功能 | 描述 | 相关文件 |
|------|------|----------|
| 选择工作目录 | 使用 File System Access API 选择本地文件夹 | `src/utils/fileSystem.ts` |
| 创建思维导图 | 创建新的思维导图文件夹和配置 | `src/utils/fileSystem.ts` |
| 删除思维导图 | 删除思维导图及其所有文件 | `src/utils/fileSystem.ts` |
| 扫描思维导图 | 扫描目录下的所有思维导图 | `src/utils/fileSystem.ts` |

### 2. 节点操作

| 功能 | 描述 | 相关文件 |
|------|------|----------|
| 添加节点 | 在指定节点下添加子节点 | `src/utils/nodeUtils.ts` |
| 编辑节点 | 修改节点属性和内容 | `src/utils/nodeUtils.ts` |
| 删除节点 | 删除节点及其子节点 | `src/utils/nodeUtils.ts` |
| 节点排序 | 拖拽调整子节点顺序 | `src/components/ConfigPanel.tsx` |
| 批量删除 | 一次删除多个节点 | `src/components/ConfigPanel.tsx` |

### 3. Markdown 管理

| 功能 | 描述 | 相关文件 |
|------|------|----------|
| 创建 MD 文件 | 为节点创建关联的 Markdown 文件 | `src/utils/nodeUtils.ts` |
| 编辑 MD 内容 | 编辑节点的 Markdown 内容 | `src/utils/nodeUtils.ts` |
| 提取章节 | 从 MD 文件提取 ## 标题作为子节点 | `src/data/roadmapData.ts` |
| 搜索内容 | 全文搜索 MD 文件内容 | `src/utils/nodeUtils.ts` |

### 4. 历史记录与撤销/重做

| 功能 | 描述 | 相关文件 |
|------|------|----------|
| 操作历史 | 记录每次节点操作 | `src/store/historyStore.ts` |
| 撤销 (Ctrl+Z) | 撤销上一步操作 | `src/store/historyStore.ts` |
| 重做 (Ctrl+Y) | 重做已撤销的操作 | `src/store/historyStore.ts` |
| 跳转历史 | 跳转到任意历史状态 | `src/components/HistoryPanel.tsx` |

### 5. 导出功能

| 功能 | 描述 | 相关文件 |
|------|------|----------|
| 导出 JPG | 导出思维导图为 JPG 图片 | `src/utils/exportMindmap.ts` |
| 导出 PDF | 导出思维导图为 PDF 文档 | `src/utils/exportMindmap.ts` |
| 导出备份 | 导出完整数据备份 JSON | `src/utils/backup.ts` |
| 导入备份 | 从备份 JSON 恢复数据 | `src/utils/backup.ts` |

### 6. 个性化配置

| 功能 | 描述 | 相关文件 |
|------|------|----------|
| 主题设置 | 切换明暗主题、自定义颜色 | `src/store/themeStore.ts` |
| 水印设置 | 添加自定义水印 | `src/store/watermarkStore.ts` |
| 快捷键配置 | 自定义键盘快捷键 | `src/store/shortcutStore.ts` |
| 自定义节点 | 创建自定义节点样式 | `src/store/customNodeStore.ts` |

---

## 页面组件详解

### `src/pages/RoadmapListPage.tsx` - 思维导图列表页

**功能描述**: 首页，显示所有可用的思维导图列表，支持创建和删除操作。

**主要组件/函数**:

| 名称 | 类型 | 描述 |
|------|------|------|
| `RoadmapListPage` | 组件 | 主页面组件 |
| `scanRoadmapsList` | 函数 | 扫描文件夹获取思维导图列表 |
| `handleSelectDirectory` | 函数 | 选择工作目录 |
| `handleRoadmapClick` | 函数 | 点击思维导图卡片进入编辑 |
| `handleCreate` | 函数 | 创建新思维导图 |
| `handleDeleteRoadmap` | 函数 | 删除思维导图 |

**状态管理**:
- `loading` - 加载状态
- `error` - 错误信息
- `createModalOpen` - 创建弹窗状态
- `deleting` - 删除中的 ID

---

### `src/pages/RoadmapPage.tsx` - 思维导图编辑页

**功能描述**: 思维导图编辑主页面，包含左侧配置面板和右侧画布。

**主要组件/函数**:

| 名称 | 类型 | 描述 |
|------|------|------|
| `RoadmapPage` | 组件 | 编辑页主组件 |
| `handleBackToList` | 函数 | 返回列表页 |
| `handleRoadmapChange` | 函数 | 切换思维导图 |

**子组件**:
- `RoadmapGraph` - 思维导图画布组件

---

### `src/pages/KnowledgeDetail.tsx` - 知识点详情页

**功能描述**: 显示节点关联的 Markdown 文件内容，支持渲染完整的 Markdown。

**主要组件/函数**:

| 名称 | 类型 | 描述 |
|------|------|------|
| `KnowledgeDetail` | 组件 | 详情页主组件 |
| `fetchMarkdown` | 函数 | 异步加载 Markdown 文件 |

**功能特点**:
- 使用 `marked` 库渲染 Markdown
- 支持面包屑导航
- 加载失败时显示默认内容模板

---

## 核心组件详解

### `src/components/RoadmapGraph.tsx` - 思维导图画布

**功能描述**: 核心组件，使用 G6 渲染树形思维导图，处理所有节点交互。

**主要依赖**:
- `GraphManager` - G6 图实例管理
- `NodeRenderer` - 自定义节点渲染
- `EventHandler` - 交互事件处理

**主要组件/函数**:

| 名称 | 类型 | 描述 |
|------|------|------|
| `RoadmapGraph` | 组件 | 主画布组件 |
| `convertToTreeData` | 函数 | 将节点数据转换为 G6 格式 |
| `generateSubNodeId` | 函数 | 生成子节点唯一 ID |
| `handleSaveNode` | 函数 | 保存节点（添加/编辑） |
| `handleDeleteNode` | 函数 | 删除节点 |
| `handleUndo/handleRedo` | 函数 | 撤销/重做操作 |
| `handleExportJPG/handleExportPDF` | 函数 | 导出图片/PDF |

**状态管理**:
- `rawData` - 原始节点数据
- `loading` - 加载状态
- `contextMenu` - 右键菜单状态
- `previewPanel` - 预览面板状态

---

### `src/components/ConfigPanel.tsx` - 左侧配置面板

**功能描述**: 可折叠的左侧面板，包含工具栏、节点导航、配置和历史记录。

**主要组件/函数**:

| 名称 | 类型 | 描述 |
|------|------|------|
| `ConfigPanel` | 组件 | 配置面板主组件 |
| `handleExportBackup` | 函数 | 导出数据备份 |
| `handleImportBackup` | 函数 | 导入数据备份 |
| `handleBatchDeleteConfirm` | 函数 | 批量删除确认 |
| `handleReorderConfirm` | 函数 | 节点排序确认 |

**子组件**:
- `TreeRenderer` - 节点树渲染
- `HistoryPanel` - 历史记录面板
- `MdSearchResults` - MD 内容搜索结果
- `ShortcutConfigModal` - 快捷键配置弹窗
- `ThemeConfigModal` - 主题配置弹窗
- `WatermarkConfigModal` - 水印配置弹窗
- `BookmarkManagerModal` - 书签管理弹窗
- `CustomNodeManagerModal` - 自定义节点管理弹窗

**Tab 切换**:
- `nav` - 节点导航
- `config` - 配置设置
- `history` - 历史记录

---

### `src/components/ContextMenu.tsx` - 右键菜单

**功能描述**: 节点右键菜单，提供添加、编辑、删除、预览等操作。

**Props**:

| 属性 | 类型 | 描述 |
|------|------|------|
| `x, y` | number | 菜单位置 |
| `node` | RoadmapNode \| null | 当前节点 |
| `visible` | boolean | 是否显示 |
| `onAddChild` | function | 添加子节点回调 |
| `onEdit` | function | 编辑节点回调 |
| `onDelete` | function | 删除节点回调 |
| `onPreview` | function | 预览内容回调 |
| `onToggleBookmark` | function | 切换书签回调 |

---

### `src/components/NodeEditorPanel.tsx` - 节点编辑面板

**功能描述**: 用于添加和编辑节点的模态面板，支持基础信息编辑和 Markdown 内容编辑。

**子组件**:
- `BasicInfoForm` - 基础信息表单（标题、类型、描述等）
- `ContentEditor` - Markdown 内容编辑器

**快捷键**:
- `Ctrl+S` - 保存
- `Escape` - 关闭面板

---

### `src/components/HistoryPanel.tsx` - 历史记录面板

**功能描述**: 显示操作历史时间线，支持跳转到任意历史状态。

**主要组件/函数**:

| 名称 | 类型 | 描述 |
|------|------|------|
| `HistoryPanel` | 组件 | 历史记录面板主组件 |
| `handleUndo/handleRedo` | 函数 | 撤销/重做操作 |
| `jumpToHistory` | 函数 | 跳转到指定历史状态 |

**子组件**:
- `HistoryItem` - 历史记录项
- `CurrentStateIndicator` - 当前状态指示器

---

### `src/components/SubNodePreviewPanel.tsx` - 子节点预览面板

**功能描述**: 预览 sub 类型节点对应的 Markdown 内容片段，支持全屏模式。

**主要函数**:

| 名称 | 描述 |
|------|------|
| `extractSectionContent` | 从 MD 内容中提取指定章节 |
| `toggleFullscreen` | 切换全屏模式 |

---

## Store 状态管理

### `src/store/roadmapStore.ts` - 思维导图状态

**状态**:

| 属性 | 类型 | 描述 |
|------|------|------|
| `directoryHandleIndex` | string | 目录句柄索引 |
| `directoryName` | string | 目录名称 |
| `currentRoadmapId` | string \| null | 当前思维导图 ID |
| `currentRoadmap` | RoadmapMeta \| null | 当前思维导图元数据 |
| `availableRoadmaps` | RoadmapMeta[] | 可用思维导图列表 |

**方法**:

| 方法 | 描述 |
|------|------|
| `setDirectory` | 设置目录信息 |
| `clearDirectory` | 清除目录信息 |
| `setCurrentRoadmap` | 设置当前思维导图 |
| `clearCurrentRoadmap` | 清除当前思维导图 |
| `getMdBasePath` | 获取 MD 文件基础路径 |
| `getFullMdPath` | 获取完整 MD 文件路径 |

---

### `src/store/configStore.ts` - 配置状态

**状态**:

| 属性 | 类型 | 描述 |
|------|------|------|
| `configs` | Record<string, RoadmapConfig> | 各思维导图的配置映射 |
| `panelExpanded` | boolean | 配置栏是否展开 |
| `configVersion` | number | 配置更新时间戳 |

**配置类型**:
- `nodeStyles` - 节点样式配置
- `textStyles` - 文本样式配置
- `layout` - 布局配置
- `zoom` - 缩放配置
- `colors` - 颜色配置
- `animation` - 动画配置
- `edge` - 边样式配置

---

### `src/store/historyStore.ts` - 历史记录状态

**状态**:

| 属性 | 类型 | 描述 |
|------|------|------|
| `past` | HistoryEntry[] | 历史栈（过去状态） |
| `future` | HistoryEntry[] | 未来栈（重做栈） |
| `maxHistory` | number | 最大历史记录数（默认 50） |
| `isProcessing` | boolean | 是否正在处理 |

**HistoryEntry 结构**:

```typescript
interface HistoryEntry {
  tree: RoadmapNode;        // 节点树快照
  description: string;      // 操作描述
  timestamp: number;        // 时间戳
  deletedFiles?: DeletedFileInfo[]; // 被删除的文件信息
}
```

---

### `src/store/bookmarkStore.ts` - 书签状态

**功能**: 管理节点书签，支持书签导航。

**方法**:
- `toggleBookmark` - 切换书签
- `hasBookmark` - 检查是否有书签
- `getBookmarks` - 获取书签列表

---

### `src/store/themeStore.ts` - 主题状态

**功能**: 管理应用主题，支持多主题切换和自定义颜色。

---

### `src/store/watermarkStore.ts` - 水印状态

**功能**: 管理水印配置，支持自定义内容、颜色、透明度等。

---

### `src/store/minimapStore.ts` - 小地图状态

**功能**: 管理小地图显示状态。

---

### `src/store/shortcutStore.ts` - 快捷键状态

**功能**: 管理键盘快捷键配置，支持自定义快捷键。

---

### `src/store/customNodeStore.ts` - 自定义节点状态

**功能**: 管理自定义节点样式。

---

### `src/store/nodeEditorStore.ts` - 节点编辑器状态

**功能**: 管理节点编辑面板的状态，包括当前编辑的节点、表单数据等。

---

## 核心类

### `src/core/GraphManager.ts` - 图管理器

**功能描述**: 封装 G6 TreeGraph 的创建、配置和操作。

**主要方法**:

| 方法 | 描述 |
|------|------|
| `initialize` | 初始化图实例 |
| `refresh` | 刷新图（使用最新配置） |
| `resize` | 调整画布大小 |
| `fitView` | 适应视口 |
| `focusNode` | 聚焦到指定节点 |
| `zoomIn/zoomOut/resetZoom` | 缩放操作 |
| `setData` | 更新图数据 |
| `toggleCollapse` | 切换节点展开/收起 |
| `setWatermark` | 设置水印 |
| `setMinimap` | 设置小地图 |
| `destroy` | 销毁图实例 |

---

### `src/core/EventHandler.ts` - 事件处理器

**功能描述**: 处理图的各种交互事件。

**主要方法**:

| 方法 | 描述 |
|------|------|
| `bindAll` | 绑定所有事件 |
| `unbindAll` | 解绑所有事件 |
| `focusNode` | 聚焦节点（带动画） |
| `highlightNode` | 高亮节点 |

**处理的事件**:
- `node:click` - 节点点击
- `node:mouseenter/mouseleave` - 节点悬停
- `node:contextmenu` - 节点右键菜单
- `node:dblclick` - 节点双击

---

### `src/core/NodeRenderer.ts` - 节点渲染器

**功能描述**: 注册自定义节点类型到 G6。

**节点类型**:
- `root-node` - 根节点
- `branch-node` - 分支节点
- `leaf-node` - 叶子节点
- `link-node` - 链接节点
- `sub-node` - 子节点

---

## 工具函数

### `src/utils/fileSystem.ts` - 文件系统操作

**主要函数**:

| 函数 | 描述 |
|------|------|
| `isFileSystemSupported` | 检查浏览器是否支持 File System API |
| `selectDirectory` | 选择工作目录 |
| `getDirectoryHandle` | 获取当前目录句柄 |
| `readFile` | 读取文件内容 |
| `writeFile` | 写入文件 |
| `deleteFile` | 删除文件 |
| `createDirectory` | 创建文件夹 |
| `createRoadmap` | 创建新思维导图 |
| `deleteRoadmap` | 删除思维导图 |
| `scanRoadmaps` | 扫描思维导图列表 |

**IndexedDB 持久化**:
- 使用 IndexedDB 存储目录句柄
- 支持 HMR 后恢复

---

### `src/utils/nodeUtils.ts` - 节点操作工具

**主要函数**:

| 函数 | 描述 |
|------|------|
| `findNodeInTree` | 在树中查找节点 |
| `findParentNode` | 查找父节点 |
| `findAncestorMdPath` | 查找祖先节点的 mdPath |
| `addChildNode` | 添加子节点 |
| `updateNodeInTree` | 更新节点 |
| `deleteNodeFromTree` | 删除节点 |
| `createNodeFromFormData` | 从表单数据创建节点 |
| `extractSectionContent` | 提取 MD 章节内容 |
| `updateSectionContent` | 更新 MD 章节内容 |
| `deleteSection` | 删除 MD 章节 |
| `searchMdContent` | 搜索 MD 文件内容 |
| `collectNodesWithMdPath` | 收集有 mdPath 的节点 |

---

### `src/utils/backup.ts` - 备份工具

**主要函数**:

| 函数 | 描述 |
|------|------|
| `exportAllData` | 导出所有数据 |
| `importBackupData` | 导入备份数据 |
| `downloadBackupFile` | 下载备份文件 |
| `readBackupFile` | 读取备份文件 |

---

### `src/utils/exportMindmap.ts` - 导出工具

**主要函数**:

| 函数 | 描述 |
|------|------|
| `exportToJPG` | 导出为 JPG 图片 |
| `exportToPDF` | 导出为 PDF 文档 |

---

## Hooks

### `src/hooks/useKeyboardShortcuts.ts` - 键盘快捷键

**导出**:

| Hook | 描述 |
|------|------|
| `useKeyboardShortcuts` | 通用键盘快捷键绑定 |
| `useUndoRedoShortcuts` | 撤销/重做快捷键专用 Hook |

**使用示例**:

```tsx
useKeyboardShortcuts([
  { key: 'ctrl+z', callback: handleUndo, description: '撤销' },
  { key: 'ctrl+y', callback: handleRedo, description: '重做' },
]);
```

---

### `src/hooks/useHistory.ts` - 历史记录 Hook

**功能**: 提供历史记录操作的便捷方法。

---

## 数据类型

### `src/data/roadmapData.ts` - 节点数据类型

```typescript
interface RoadmapNode {
  id: string;              // 节点 ID
  label: string;           // 节点标题
  type: 'root' | 'branch' | 'leaf' | 'link' | 'sub'; // 节点类型
  children?: RoadmapNode[]; // 子节点
  mdPath?: string;         // Markdown 文件路径
  url?: string;            // 外部链接
  description?: string;    // 描述
  headingLevel?: number;   // 标题级别
  icon?: string;           // 图标（仅 root）
  color?: string;          // 颜色（仅 root）
  customNodeId?: string;   // 自定义节点 ID
  customFill?: string;     // 自定义填充色
  customStroke?: string;   // 自定义边框色
}
```

---

### `src/types/customNode.ts` - 自定义节点类型

**功能**: 定义自定义节点的类型和样式。

---

### `src/types/treeNode.ts` - 树节点类型

**功能**: 定义树形结构的类型。

---

## 常量配置

### `src/constants/index.ts`

**配置项**:

| 常量 | 描述 |
|------|------|
| `NODE_STYLES` | 节点样式默认值 |
| `TEXT_STYLES` | 文本样式默认值 |
| `TEXT_TRUNCATE` | 文本截断配置 |
| `LAYOUT_CONFIG` | 布局配置 |
| `ZOOM_CONFIG` | 缩放配置 |
| `ANIMATION_CONFIG` | 动画配置 |
| `EDGE_STYLES` | 边样式配置 |
| `COLORS` | 颜色配置 |
| `ELEMENT_POSITIONS` | 元素位置配置 |

---

## 子组件目录

### `src/components/configPanel/`

| 文件 | 描述 |
|------|------|
| `TreeNode.tsx` | 树节点组件 |
| `TreeRenderer.tsx` | 树渲染器 |
| `SortableItem.tsx` | 可排序项（用于节点排序） |
| `MdSearchResults.tsx` | MD 搜索结果列表 |
| `ConfigSettingsPanel.tsx` | 配置设置面板 |
| `ThemeConfigModal.tsx` | 主题配置弹窗 |
| `WatermarkConfigModal.tsx` | 水印配置弹窗 |
| `BookmarkManagerModal.tsx` | 书签管理弹窗 |
| `ColorInput.tsx` | 颜色输入组件 |
| `NumberInput.tsx` | 数字输入组件 |

---

### `src/components/customNodeEditor/`

| 文件 | 描述 |
|------|------|
| `CustomNodeEditorPage.tsx` | 自定义节点编辑器页面 |
| `CustomNodeManagerModal.tsx` | 自定义节点管理弹窗 |
| `ElementCanvas.tsx` | 元素画布 |
| `ElementPropertyPanel.tsx` | 元素属性面板 |
| `ElementToolbar.tsx` | 元素工具栏 |

---

### `src/components/historyPanel/`

| 文件 | 描述 |
|------|------|
| `HistoryItem.tsx` | 历史记录项 |
| `CurrentStateIndicator.tsx` | 当前状态指示器 |

---

### `src/components/nodeEditorPanel/`

| 文件 | 描述 |
|------|------|
| `BasicInfoForm.tsx` | 基础信息表单 |
| `ContentEditor.tsx` | 内容编辑器 |

---

### `src/components/shortcut/`

| 文件 | 描述 |
|------|------|
| `ShortcutCategoryList.tsx` | 快捷键分类列表 |
| `ShortcutItem.tsx` | 快捷键项 |
| `ShortcutKey.tsx` | 快捷键显示 |
| `ShortcutKeyInput.tsx` | 快捷键输入 |

---

## 快捷键列表

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Z` / `Cmd+Z` | 撤销 |
| `Ctrl+Y` / `Cmd+Y` | 重做 |
| `Ctrl+Shift+Z` | 重做（备选） |
| `Escape` | 关闭面板/菜单 |
| `Ctrl+S` | 保存节点编辑 |

---

## 开发指南

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 类型检查

```bash
npx tsc --noEmit
```

### 代码检查

```bash
npm run lint
```

---

## 浏览器支持

- Chrome 86+
- Edge 86+
- 其他支持 File System Access API 的现代浏览器

> **注意**: File System Access API 仅在基于 Chromium 的浏览器中得到良好支持。

---

## 许可证

MIT License
