# 学习思维导图组件架构说明

## 📋 概述

本项目采用面向对象的设计模式，将 G6 图的复杂逻辑封装到独立的类中，实现了代码的高内聚、低耦合。

## 🏗️ 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    RoadmapGraph 组件                         │
│  (React 组件 - 负责渲染和协调各个管理器)                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ GraphManager │ │ NodeRenderer │ │ EventHandler │
│  图实例管理   │ │  节点渲染器   │ │  事件处理器   │
└──────────────┘ └──────────────┘ └──────────────┘
        │
        ▼
┌──────────────┐
│   G6.Tree    │
│   Graph      │
└──────────────┘
```

## 📦 核心类说明

### 1. GraphManager（图管理器）

**文件位置**: `src/core/GraphManager.ts`

**职责**:
- 创建和管理 G6 TreeGraph 实例
- 提供图的初始化、销毁、缩放、布局等核心操作
- 封装所有对图实例的直接操作

**核心方法**:

| 方法 | 说明 |
|------|------|
| `initialize(data)` | 初始化图实例并渲染数据 |
| `fitView(padding)` | 适应视口 |
| `focusNode(nodeId)` | 聚焦到指定节点 |
| `zoomTo(zoom, center)` | 缩放到指定比例 |
| `zoomIn() / zoomOut()` | 放大 / 缩小 |
| `toggleCollapse(nodeId)` | 切换节点展开/收起状态 |
| `updateNode(nodeId, model)` | 更新节点数据 |
| `layout(animate)` | 重新布局 |
| `destroy()` | 销毁图实例 |

**使用示例**:

```typescript
const graphManager = new GraphManager({
  container: document.getElementById('graph'),
  width: 800,
  height: 600,
});

graphManager.initialize(treeData);
graphManager.fitView(20);
graphManager.focusNode('node-1');
```

---

### 2. NodeRenderer（节点渲染器）

**文件位置**: `src/core/NodeRenderer.ts`

**职责**:
- 注册所有自定义节点类型
- 管理节点的绘制逻辑和样式
- 处理节点的状态变化（悬停等）

**支持的节点类型**:

| 类型 | G6节点名称 | 说明 | 样式特点 |
|------|-----------|------|---------|
| `root` | `root-node` | 根节点 | 蓝色大节点，带图标 |
| `branch` | `branch-node` | 分支节点 | 浅蓝色，左侧蓝色条 |
| `leaf` | `leaf-node` | 叶子节点 | 绿色胶囊形，带详情图标 |
| `link` | `link-node` | 链接节点 | 黄色虚线边框，带链接图标 |
| `sub` | `sub-node` | 子节点 | 小尺寸浅蓝色节点 |

**使用示例**:

```typescript
const nodeRenderer = new NodeRenderer();
nodeRenderer.registerAll(); // 注册所有自定义节点
```

---

### 3. EventHandler（事件处理器）

**文件位置**: `src/core/EventHandler.ts`

**职责**:
- 处理节点的点击事件（展开/收起、查看详情）
- 处理节点的悬停事件（高亮效果）
- 管理聚焦动画队列

**核心方法**:

| 方法 | 说明 |
|------|------|
| `bindAll()` | 绑定所有事件监听器 |
| `unbindAll()` | 解绑所有事件监听器 |
| `focusNode(nodeId)` | 聚焦到指定节点（带动画） |
| `destroy()` | 销毁事件处理器 |

**事件处理流程**:

```
节点点击事件
    │
    ├─ 点击详情图标 → 触发 onNavigate 回调
    │                 └─ 导航到详情页 / 打开外部链接
    │
    ├─ 点击展开/收起按钮 → 调用 GraphManager.toggleCollapse()
    │                      └─ 更新节点状态并重新布局
    │
    └─ 点击叶子/链接节点主体 → 触发 onNavigate 回调
```

**使用示例**:

```typescript
const eventHandler = new EventHandler({
  graphManager: graphManager,
  container: containerElement,
  onNavigate: (data) => {
    // 处理导航逻辑
    navigate(`/knowledge/${data.mdPath}`);
  },
});

eventHandler.bindAll();
```

---

## 🎯 数据流

```
┌─────────────┐
│ index.md    │ 原始 Markdown 数据
└──────┬──────┘
       │ loadRoadmapData()
       ▼
┌─────────────┐
│ RoadmapNode │ 树形节点数据
└──────┬──────┘
       │ enrichWithSubNodes()
       ▼
┌─────────────┐
│ RoadmapNode │ 丰富后的数据（包含子节点）
└──────┬──────┘
       │ convertToTreeData()
       ▼
┌─────────────┐
│ NodeModel   │ G6 可用的节点模型
└──────┬──────┘
       │ GraphManager.initialize()
       ▼
┌─────────────┐
│ G6.TreeGraph│ 渲染到画布
└─────────────┘
```

## 📝 设计原则

### 1. 单一职责原则（SRP）

每个类只负责一个特定的功能：
- `GraphManager` 只负责图实例的管理
- `NodeRenderer` 只负责节点的渲染
- `EventHandler` 只负责事件的处理

### 2. 依赖注入（DI）

`EventHandler` 通过构造函数注入 `GraphManager`，而不是直接创建依赖：
```typescript
constructor(config: EventHandlerConfig) {
  this.graphManager = config.graphManager;
  this.container = config.container;
  this.onNavigate = config.onNavigate;
}
```

### 3. 封装性

- 所有类的内部状态都是 `private`
- 只暴露必要的公共方法
- 外部无法直接访问图实例，必须通过管理器操作

### 4. 生命周期管理

每个类都提供了 `destroy()` 方法，确保资源正确释放：

```typescript
useEffect(() => {
  // 创建实例
  
  return () => {
    // 销毁实例
    eventHandlerRef.current?.destroy();
    graphManagerRef.current?.destroy();
  };
}, []);
```

## 🔧 扩展指南

### 添加新的节点类型

1. 在 `NodeRenderer.ts` 中添加新的样式配置：
```typescript
const NODE_STYLES = {
  // ...
  custom: {
    size: [100, 30] as [number, number],
    fill: '#color',
    // ...
  },
};
```

2. 添加注册方法：
```typescript
private registerCustomNode(): void {
  G6.registerNode('custom-node', {
    draw(cfg: any, group: any) {
      // 绘制逻辑
    },
    setState(name: string, value: boolean, item: any) {
      // 状态处理
    },
  });
}
```

3. 在 `registerAll()` 中调用：
```typescript
registerAll(): void {
  // ...
  this.registerCustomNode();
  // ...
}
```

### 添加新的事件处理

在 `EventHandler.ts` 中添加新的绑定方法：

```typescript
private bindCustomEvent(): void {
  this.graphManager.on('custom:event', (evt: any) => {
    // 处理逻辑
  });
}
```

## 🎨 样式配置

所有节点的样式都在 `NodeRenderer.ts` 的 `NODE_STYLES` 常量中定义，方便统一修改：

```typescript
const NODE_STYLES = {
  root: {
    size: [220, 70],
    fill: '#1890ff',
    stroke: '#096dd9',
    // ...
  },
  // ...
};
```

## 📊 性能优化

1. **节点渲染优化**：使用 `G6.registerNode` 注册自定义节点，避免重复创建
2. **事件处理优化**：使用 `useCallback` 包装事件处理函数，避免不必要的重渲染
3. **动画队列**：`EventHandler` 使用队列管理聚焦动画，避免动画冲突
4. **资源清理**：组件卸载时正确销毁所有实例，避免内存泄漏

## 🧪 测试建议

```typescript
// 测试 GraphManager
const graphManager = new GraphManager({...});
expect(graphManager.isDestroyed()).toBe(false);
graphManager.destroy();
expect(graphManager.isDestroyed()).toBe(true);

// 测试 NodeRenderer
const nodeRenderer = new NodeRenderer();
expect(nodeRenderer.isRegistered()).toBe(false);
nodeRenderer.registerAll();
expect(nodeRenderer.isRegistered()).toBe(true);
```

## 📁 文件结构

```
src/
├── components/
│   └── RoadmapGraph.tsx          # 主组件（已重构）
├── core/                          # 核心类（面向对象）
│   ├── GraphManager.ts           # 图管理器
│   ├── NodeRenderer.ts           # 节点渲染器
│   ├── EventHandler.ts           # 事件处理器
│   └── index.ts                  # 统一导出
├── utils/                         # 工具函数（纯函数）
│   ├── exportMindmap.ts          # 导出功能
│   ├── treePanelUtils.ts         # 树形面板工具
│   └── index.ts                  # 统一导出
├── data/
│   └── roadmapData.ts            # 数据加载和解析
├── types/
│   └── treeNode.ts               # 类型定义
└── docs/
    └── ARCHITECTURE.md           # 架构说明文档
```

### 文件夹职责说明

| 文件夹 | 职责 | 内容类型 |
|--------|------|----------|
| `core/` | 存放核心业务类 | 面向对象的类（有状态） |
| `utils/` | 存放工具函数 | 纯函数（无副作用） |
| `components/` | 存放 React 组件 | UI 组件 |
| `data/` | 存放数据相关逻辑 | 数据加载、解析、转换 |
| `types/` | 存放类型定义 | TypeScript 类型 |

## 🔄 未来改进

1. **添加单元测试**：为核心类编写测试用例
2. **支持主题切换**：通过配置对象管理节点样式
3. **性能监控**：添加性能指标收集
4. **插件系统**：支持自定义插件扩展功能
