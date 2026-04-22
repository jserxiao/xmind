# 项目结构说明

## 📂 目录组织

### `core/` - 核心业务类
存放面向对象的类，包含状态和行为。

- `GraphManager.ts` - G6 图实例管理器
- `NodeRenderer.ts` - 自定义节点渲染器
- `EventHandler.ts` - 用户交互事件处理器

**特点**：
- 有状态（stateful）
- 需要实例化
- 封装复杂业务逻辑

### `utils/` - 工具函数
存放纯函数，无副作用，可复用。

- `exportMindmap.ts` - 导出图片和 PDF 的函数
- `treePanelUtils.ts` - 树形面板的辅助函数

**特点**：
- 无状态（stateless）
- 纯函数，输入相同则输出相同
- 无副作用

### `components/` - React 组件
存放 UI 组件。

- `RoadmapGraph.tsx` - 学习思维导图主组件

### `data/` - 数据层
存放数据加载、解析和转换逻辑。

- `roadmapData.ts` - 思维导图数据的加载和解析

### `types/` - 类型定义
存放 TypeScript 类型定义。

- `treeNode.ts` - 树节点类型

## 📦 导入示例

```typescript
// 从 core 导入类
import { GraphManager, NodeRenderer, EventHandler } from '@/core';
import type { NodeModel } from '@/core';

// 从 utils 导入函数
import { exportToJPG, exportToPDF } from '@/utils';
import { getNodeIcon, getNodeColor } from '@/utils';
```

## 🎯 设计原则

1. **关注点分离**：core 存放类，utils 存放函数
2. **单一职责**：每个文件只负责一个功能
3. **易于测试**：纯函数易于单元测试
4. **高复用性**：工具函数可在多个项目中复用
