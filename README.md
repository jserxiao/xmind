# Roadmap - 交互式学习思维导图

一个基于 React + TypeScript + Vite 构建的现代化思维导图应用，支持本地文件系统存储、AI 辅助生成、知识图谱连线等功能。

## ✨ 功能特性

### 🗺️ 思维导图核心
- **树形结构可视化** - 基于 AntV G6 的高性能图形渲染
- **多种节点类型** - 支持 root、branch、leaf、link、sub 五种节点类型
- **自定义节点样式** - 可视化编辑节点外观（矩形、圆形、椭圆、文本、图标等）
- **拖拽排序** - 支持节点拖拽重新排序
- **节点展开/收起** - 支持大规模节点树的懒加载

### 📁 本地文件系统
- **File System Access API** - 直接操作本地文件夹，无需上传
- **Markdown 文件关联** - 每个节点可关联 MD 文件，支持实时编辑
- **自动保存** - 操作即时持久化到本地文件
- **多思维导图管理** - 一个工作目录下可管理多个思维导图

### 🤖 AI 辅助功能
- **智能节点生成** - 基于上下文和父节点自动生成子节点建议
- **Markdown 内容完善** - AI 自动丰富和完善 MD 文件内容
- **多模型支持** - 支持 OpenAI、Anthropic、DeepSeek 及自定义 API
- **Token 使用统计** - 实时显示 API 调用消耗

### 🔗 知识图谱
- **节点连线** - 支持节点间创建关联关系（相关、前置知识、扩展、对比）
- **书签管理** - 标记重要节点，支持备注
- **关系可视化** - 图形化展示节点间的知识关联

### ⚙️ 配置与定制
- **样式配置** - 自定义节点颜色、大小、字体等
- **快捷键配置** - 可自定义键盘快捷键
- **主题切换** - 支持亮色/暗色主题
- **水印配置** - 支持自定义水印
- **小地图** - 大型思维导图导航

### 📊 数据管理
- **完整备份/恢复** - 导出导入所有配置和数据
- **历史记录** - 支持撤销/重做操作
- **缓存优化** - 内存缓存提升加载速度

---

## 🏗️ 项目结构

```
src/
├── core/                    # 核心图形渲染模块
│   ├── GraphManager.ts      # G6 图实例管理
│   ├── NodeRenderer.ts      # 自定义节点渲染器
│   └── EventHandler.ts      # 图形事件处理
│
├── components/              # React 组件
│   ├── RoadmapGraph.tsx     # 思维导图主组件
│   ├── NodeEditorPanel.tsx  # 节点编辑面板
│   ├── ConfigPanel.tsx      # 配置面板
│   ├── HistoryPanel.tsx     # 历史记录面板
│   ├── ContextMenu.tsx      # 右键菜单
│   ├── aiGenerator/         # AI 生成相关组件
│   ├── configPanel/         # 配置面板子组件
│   ├── customNodeEditor/    # 自定义节点编辑器
│   ├── historyPanel/        # 历史面板子组件
│   └── shortcut/            # 快捷键配置组件
│
├── store/                   # Zustand 状态管理
│   ├── roadmapStore.ts      # 思维导图元数据
│   ├── configStore.ts       # 样式配置
│   ├── historyStore.ts      # 历史记录
│   ├── connectionStore.ts   # 连线数据
│   ├── bookmarkStore.ts     # 书签数据
│   ├── aiStore.ts           # AI 配置
│   ├── themeStore.ts        # 主题状态
│   ├── shortcutStore.ts     # 快捷键配置
│   ├── watermarkStore.ts    # 水印配置
│   ├── minimapStore.ts      # 小地图配置
│   ├── customNodeStore.ts   # 自定义节点
│   └── nodeEditorStore.ts   # 节点编辑器状态
│
├── utils/                   # 工具函数
│   ├── common.ts            # 通用工具（深拷贝、防抖节流等）
│   ├── fileSystem.ts        # 本地文件系统操作
│   ├── nodeUtils.ts         # 节点操作工具
│   ├── cache.ts             # 内存缓存管理
│   ├── backup.ts            # 数据备份/恢复
│   ├── performance.ts       # 性能监控
│   ├── aiPrompts.ts         # AI Prompt 构建
│   ├── treeDataUtils.ts     # 树形数据转换
│   ├── treePanelUtils.ts    # 树形面板工具
│   ├── exportMindmap.ts     # 导出功能
│   └── mdTemplates.ts       # Markdown 模板
│
├── services/                # 服务层
│   └── aiService.ts         # AI API 调用封装
│
├── data/                    # 数据层
│   └── roadmapData.ts       # 思维导图数据加载
│
├── types/                   # TypeScript 类型定义
│   ├── ai.ts                # AI 相关类型
│   ├── customNode.ts        # 自定义节点类型
│   └── treeNode.ts          # 树节点类型
│
├── constants/               # 常量定义
│   ├── index.ts             # 主常量导出
│   ├── app.ts               # 应用配置
│   ├── storage.ts           # 存储键名
│   └── icons.tsx            # 图标组件
│
├── hooks/                   # 自定义 Hooks
│   ├── useGraphInit.ts      # 图形初始化
│   ├── useNodeSave.tsx      # 节点保存逻辑
│   ├── useHistory.ts        # 历史记录 Hook
│   ├── useKeyboardShortcuts.ts # 快捷键 Hook
│   └── useSecureStorage.ts  # 安全存储 Hook
│
├── pages/                   # 页面组件
│   ├── RoadmapListPage.tsx  # 思维导图列表页
│   ├── RoadmapPage.tsx      # 思维导图编辑页
│   └── KnowledgeDetail.tsx  # 知识点详情页
│
├── styles/                  # CSS 模块样式
│   └── *.module.css
│
├── App.tsx                  # 应用入口组件
└── main.tsx                 # React 入口
```

---

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- 现代浏览器（Chrome、Edge 等，支持 File System Access API）

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 生产构建

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

---

## 📖 核心概念

### 节点类型 (RoadmapNode)

| 类型 | 说明 |
|------|------|
| `root` | 根节点，每个思维导图只有一个 |
| `branch` | 分支节点，可包含子节点 |
| `leaf` | 叶子节点，最底层，可关联 MD 文件 |
| `link` | 链接节点，指向外部 URL |
| `sub` | 子节点，从 MD 文件的二级标题自动提取 |

### 数据存储结构

```
工作目录/
├── go-learning-roadmap/           # 思维导图文件夹
│   ├── index.json                 # 节点树结构（含连线、书签）
│   ├── basic-features/            # MD 文件目录
│   │   ├── variables.md
│   │   └── functions.md
│   └── advanced-features/
│       └── goroutines.md
└── another-roadmap/
    └── index.json
```

### 状态管理架构

使用 Zustand 进行状态管理，主要 Store 包括：

- **roadmapStore**: 当前思维导图元数据、可用列表
- **configStore**: 每个思维导图的独立样式配置
- **historyStore**: 操作历史（撤销/重做）
- **connectionStore**: 节点连线关系
- **bookmarkStore**: 书签数据

### 缓存策略

三級缓存提升性能：
- **mdContentCache**: MD 文件内容缓存
- **indexJsonCache**: index.json 数据缓存
- **nodeTreeCache**: 节点树缓存

---

## 🤖 AI 功能配置

支持的 AI 服务提供商：

| 提供商 | 模型示例 |
|--------|----------|
| OpenAI | gpt-4o-mini, gpt-4o, gpt-4-turbo |
| Anthropic | claude-3-haiku, claude-3-sonnet, claude-3-opus |
| DeepSeek | deepseek-chat, deepseek-coder |
| 自定义 | 任意兼容 OpenAI API 的服务 |

在应用的 AI 配置面板中设置 API Key 和模型即可使用。

---

## ⌨️ 默认快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + Z` | 撤销 |
| `Ctrl/Cmd + Shift + Z` | 重做 |
| `Ctrl/Cmd + S` | 保存 |
| `Delete` | 删除选中节点 |
| `Enter` | 编辑节点 |
| `Esc` | 取消编辑 |

快捷键可在设置中自定义。

---

## 🔧 技术栈

| 技术 | 用途 |
|------|------|
| React 19 | UI 框架 |
| TypeScript 6 | 类型安全 |
| Vite 8 | 构建工具 |
| AntV G6 4 | 图形渲染 |
| Ant Design 6 | UI 组件库 |
| Zustand 5 | 状态管理 |
| React Router 7 | 路由管理 |
| @uiw/react-md-editor | Markdown 编辑器 |
| jsPDF / JSZip | 导出功能 |

---

## 📄 数据格式

### index.json 结构

```json
{
  "id": "go-learning-roadmap",
  "label": "Go 语言学习路线",
  "type": "root",
  "icon": "📘",
  "color": "#00ADD8",
  "description": "Go 语言从入门到精通的学习路线",
  "children": [
    {
      "id": "basic",
      "label": "基础语法",
      "type": "branch",
      "children": [
        {
          "id": "variables",
          "label": "变量与常量",
          "type": "leaf",
          "mdPath": "basic-features/variables",
          "description": "学习 Go 语言的变量声明和常量定义"
        }
      ]
    }
  ],
  "connections": [
    {
      "id": "conn_1",
      "sourceId": "goroutines",
      "targetId": "channels",
      "type": "prerequisite",
      "label": "前置知识",
      "createdAt": 1700000000000
    }
  ],
  "bookmarks": [
    {
      "nodeId": "variables",
      "nodeLabel": "变量与常量",
      "createdAt": 1700000000000,
      "note": "重要知识点"
    }
  ]
}
```

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 📝 License

MIT License
