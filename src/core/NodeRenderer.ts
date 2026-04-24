/**
 * NodeRenderer - 自定义节点渲染器
 *
 * 负责注册和管理各种类型的自定义 G6 节点
 * 包括：根节点、分支节点、叶子节点、链接节点、子节点
 * 
 * 支持动态配置：通过 getConfig 获取最新的配置
 * 支持主题配色：通过 getThemeColors 获取主题颜色
 */

import G6 from '@antv/g6';
import { useConfigStore } from '../store/configStore';
import { useThemeStore } from '../store/themeStore';
import { useCustomNodeStore } from '../store/customNodeStore';
import type { RoadmapConfig } from '../store/configStore';
import type { ThemeColors } from '../store/themeStore';
import type { CustomNodeConfig, BaseElement } from '../types/customNode';

// ─────────────────────────────────────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────────────────────────────────────

/** 节点配置 */
interface NodeConfig {
  /** 节点宽度 */
  width: number;
  /** 节点高度 */
  height: number;
}

/** 自定义节点元素配置（从 G6 cfg 中获取） */
interface CustomNodeCfg {
  customNodeId?: string;
  customFill?: string;
  customStroke?: string;
  label?: string;
  children?: any[];
  collapsed?: boolean;
  hasBookmark?: boolean;
  size?: [number, number];
}

// ─────────────────────────────────────────────────────────────────────────────
// 配置获取器
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 获取当前思维导图的配置
 * 从 zustand store 获取最新状态
 */
function getConfig(): RoadmapConfig {
  return useConfigStore.getState().getCurrentConfig();
}

/**
 * 获取当前主题颜色
 * 从 themeStore 获取最新状态
 */
function getThemeColors(): ThemeColors {
  return useThemeStore.getState().getCurrentColors();
}

/**
 * 获取自定义节点配置
 * 从 customNodeStore 获取
 */
function getCustomNodeConfig(customNodeId: string): CustomNodeConfig | undefined {
  return useCustomNodeStore.getState().getCustomNode(customNodeId);
}

/**
 * 获取基于主题的节点样式
 * 将主题颜色应用到节点样式
 */
function getThemedNodeStyles(config: RoadmapConfig, themeColors: ThemeColors) {
  const { nodeStyles } = config;
  
  return {
    root: {
      ...nodeStyles.root,
      fill: themeColors.nodeRoot,
      stroke: themeColors.nodeRoot,
    },
    branch: {
      ...nodeStyles.branch,
      fill: themeColors.primaryLight,
      stroke: themeColors.nodeBranch,
    },
    leaf: {
      ...nodeStyles.leaf,
      fill: themeColors.bgPrimary,
      stroke: themeColors.nodeLeaf,
    },
    link: {
      ...nodeStyles.link,
      fill: themeColors.warningLight,
      stroke: themeColors.warning,
    },
    sub: {
      ...nodeStyles.sub,
      fill: themeColors.bgSecondary,
      stroke: themeColors.border,
    },
  };
}

/**
 * 获取基于主题的颜色配置
 */
function getThemedColors(themeColors: ThemeColors) {
  return {
    primary: themeColors.primary,
    primaryLight: themeColors.primaryLight,
    success: themeColors.success,
    successLight: themeColors.successLight,
    warning: themeColors.warning,
    warningLight: themeColors.warningLight,
    link: themeColors.info,
    linkLight: themeColors.infoLight,
    textPrimary: themeColors.textPrimary,
    textSuccess: themeColors.textPrimary,
    textWarning: themeColors.textPrimary,
    textLink: themeColors.textPrimary,
    borderSuccess: themeColors.success,
    borderWarning: themeColors.warning,
    borderLink: themeColors.info,
    hoverPrimary: themeColors.primaryDark,
    hoverPrimaryLight: themeColors.primaryLight,
    hoverSuccessLight: themeColors.successLight,
    hoverWarningLight: themeColors.warningLight,
    hoverLinkLight: themeColors.infoLight,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NodeRenderer 类
// ─────────────────────────────────────────────────────────────────────────────

export class NodeRenderer {
  /** 是否已注册 */
  private registered = false;

  /**
   * 注册所有自定义节点
   * 只会注册一次，避免重复注册
   */
  registerAll(): void {
    if (this.registered) {
      console.log('[NodeRenderer] 节点已注册，跳过');
      return;
    }

    this.registerRootNode();
    this.registerBranchNode();
    this.registerLeafNode();
    this.registerLinkNode();
    this.registerSubNode();

    this.registered = true;
    console.log('[NodeRenderer] 所有自定义节点注册完成');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 根节点
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 注册根节点
   * 特点：大尺寸、蓝色背景、带图标、支持多行标题
   */
  private registerRootNode(): void {
    G6.registerNode('root-node', {
      /**
       * 绘制节点
       * @param cfg 节点配置
       * @param group 图形组
       */
      draw(cfg: any, group: any) {
        const config = getConfig();
        const themeColors = getThemeColors();
        const themedNodeStyles = getThemedNodeStyles(config, themeColors);
        const { textStyles, elementPositions } = config;
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'root', themedNodeStyles);

        // 绘制主盒子
        const box = group.addShape('rect', {
          attrs: {
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: themedNodeStyles.root.radius,
            fill: themedNodeStyles.root.fill,
            stroke: themedNodeStyles.root.stroke,
            lineWidth: themedNodeStyles.root.lineWidth,
            shadowColor: themedNodeStyles.root.shadowColor,
            shadowBlur: themedNodeStyles.root.shadowBlur,
            cursor: 'pointer',
          },
          name: 'root-box',
        });

        // 绘制图标
        group.addShape('text', {
          attrs: {
            x: -w / 2 + elementPositions.icon.offsetX,
            y: 0,
            text: '📘',
            fontSize: 20,
            textBaseline: 'middle',
          },
          name: 'root-icon',
        });

        // 绘制标题（支持多行，垂直居中）
        const label = cfg.label || '';
        const lines = label.split('\n');
        const lineHeight = (i: number) => i ? (textStyles.root.fontSizeSecondary || 14) + 6 : textStyles.root.fontSize + 6;
        const totalTextHeight = lines.reduce((sum: number, _: string, i: number) => sum + lineHeight(i), 0) - 6;
        const startY = -totalTextHeight / 2 + (lines.length > 1 ? 0 : textStyles.root.fontSize / 2);
        
        lines.forEach((line: string, i: number) => {
          const currentY = lines.length === 1 ? 0 : startY + lines.slice(0, i).reduce((sum: number, _: string, j: number) => sum + lineHeight(j), 0);
          group.addShape('text', {
            attrs: {
              x: -w / 2 + 45,
              y: currentY,
              text: line,
              fontSize: i ? textStyles.root.fontSizeSecondary : textStyles.root.fontSize,
              fontWeight: i ? textStyles.root.fontWeightSecondary : textStyles.root.fontWeight,
              fill: themeColors.textInverse,
              textBaseline: 'middle',
            },
            name: `root-text-${i}`,
          });
        });

        // 绘制书签标记
        NodeRenderer.drawBookmarkMarker(group, w, h, cfg.hasBookmark);

        return box;
      },

      /**
       * 更新节点 - 关键：支持动态更新样式
       * @param cfg 节点配置
       * @param item 节点实例
       */
      update(cfg: any, item: any) {
        const config = getConfig();
        const themeColors = getThemeColors();
        const themedNodeStyles = getThemedNodeStyles(config, themeColors);
        const { textStyles, elementPositions } = config;
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'root', themedNodeStyles);
        
        console.log('[NodeRenderer] root-node update 被调用', { 
          fill: themedNodeStyles.root.fill,
          label: cfg.label 
        });
        
        const group = item.getContainer();
        
        // 更新主盒子
        const box = group.find((e: any) => e.get('name') === 'root-box');
        if (box) {
          box.attr({
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: themedNodeStyles.root.radius,
            fill: themedNodeStyles.root.fill,
            stroke: themedNodeStyles.root.stroke,
            lineWidth: themedNodeStyles.root.lineWidth,
            shadowColor: themedNodeStyles.root.shadowColor,
            shadowBlur: themedNodeStyles.root.shadowBlur,
          });
        }
        
        // 更新图标位置
        const icon = group.find((e: any) => e.get('name') === 'root-icon');
        if (icon) {
          icon.attr({
            x: -w / 2 + elementPositions.icon.offsetX,
            y: 0,
            textBaseline: 'middle',
          });
        }
        
        // 更新文本样式和位置（垂直居中）
        const label = cfg.label || '';
        const lines = label.split('\n');
        const lineHeightFn = (i: number) => i ? (textStyles.root.fontSizeSecondary || 14) + 6 : textStyles.root.fontSize + 6;
        const totalTextHeight = lines.reduce((sum: number, _: string, i: number) => sum + lineHeightFn(i), 0) - 6;
        const startY = -totalTextHeight / 2 + (lines.length > 1 ? 0 : textStyles.root.fontSize / 2);
        
        lines.forEach((_line: string, i: number) => {
          const textEl = group.find((e: any) => e.get('name') === `root-text-${i}`);
          const currentY = lines.length === 1 ? 0 : startY + lines.slice(0, i).reduce((sum: number, _: string, j: number) => sum + lineHeightFn(j), 0);
          if (textEl) {
            textEl.attr({
              x: -w / 2 + 45,
              y: currentY,
              fontSize: i ? textStyles.root.fontSizeSecondary : textStyles.root.fontSize,
              fontWeight: i ? textStyles.root.fontWeightSecondary : textStyles.root.fontWeight,
              fill: themeColors.textInverse,
              textBaseline: 'middle',
            });
          }
        });
      },

      /**
       * 设置节点状态
       * @param name 状态名称
       * @param value 状态值
       * @param item 节点实例
       */
      setState(name?: string, value?: boolean | string, item?: any) {
        if (!item) return;
        const config = getConfig();
        const themeColors = getThemeColors();
        const themedNodeStyles = getThemedNodeStyles(config, themeColors);
        const box = item.getContainer().find((e: any) => e.get('name') === 'root-box');
        
        if (name === 'hover' && box) {
          box.attr('shadowBlur', value ? 30 : themedNodeStyles.root.shadowBlur);
          box.attr('fill', value ? themeColors.primaryDark : themeColors.nodeRoot);
        }
        
        // 高亮状态（搜索跳转时使用）
        if (name === 'highlight' && box) {
          if (value) {
            box.attr('shadowColor', '#ff9800');
            box.attr('shadowBlur', 25);
            box.attr('stroke', '#ff9800');
            box.attr('lineWidth', 3);
          } else {
            box.attr('shadowColor', themedNodeStyles.root.shadowColor);
            box.attr('shadowBlur', themedNodeStyles.root.shadowBlur);
            box.attr('stroke', themedNodeStyles.root.stroke);
            box.attr('lineWidth', themedNodeStyles.root.lineWidth);
          }
        }
      },
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 分支节点
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 注册分支节点
   * 特点：中等尺寸、浅蓝色背景、左侧蓝色条、带展开/收起按钮
   */
  private registerBranchNode(): void {
    G6.registerNode('branch-node', {
      draw(cfg: any, group: any) {
        const config = getConfig();
        const themeColors = getThemeColors();
        const themedNodeStyles = getThemedNodeStyles(config, themeColors);
        const { textStyles, textTruncate, elementPositions } = config;
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'branch', themedNodeStyles);

        // 绘制主盒子
        const box = group.addShape('rect', {
          attrs: {
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: themedNodeStyles.branch.radius,
            fill: themedNodeStyles.branch.fill,
            stroke: themedNodeStyles.branch.stroke,
            lineWidth: themedNodeStyles.branch.lineWidth,
            cursor: 'pointer',
          },
          name: 'branch-box',
        });

        // 绘制展开/收起按钮（如果有子节点）- 放到最左边
        if (cfg.children?.length) {
          group.addShape('text', {
            attrs: {
              x: -w / 2 + elementPositions.toggle.offsetX,
              y: 0,
              text: cfg.collapsed ? '+' : '−',
              fontSize: textStyles.toggle.fontSize,
              fill: themeColors.primary,
              fontWeight: textStyles.toggle.fontWeight,
              cursor: 'pointer',
              textBaseline: 'middle',
            },
            name: 'toggle',
            capture: true,
          });
        }

        // 绘制标签文本
        const label = cfg.label || '';
        const maxLen = textTruncate.maxLength.branch;
        const displayText = label.length > maxLen ? label.slice(0, maxLen) + textTruncate.ellipsis : label;
        group.addShape('text', {
          attrs: {
            x: -w / 2 + (cfg.children?.length ? elementPositions.text.offsetXToggle : elementPositions.text.offsetX),
            y: 0,
            text: displayText,
            fontSize: textStyles.branch.fontSize,
            fontWeight: textStyles.branch.fontWeight,
            fill: themeColors.textPrimary,
            textBaseline: 'middle',
          },
          name: 'branch-text',
        });

        // 绘制书签标记
        NodeRenderer.drawBookmarkMarker(group, w, h, cfg.hasBookmark);

        return box;
      },

      /**
       * 更新节点
       */
      update(cfg: any, item: any) {
        const config = getConfig();
        const themeColors = getThemeColors();
        const themedNodeStyles = getThemedNodeStyles(config, themeColors);
        const { textStyles, textTruncate, elementPositions } = config;
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'branch', themedNodeStyles);
        
        const group = item.getContainer();
        
        // 更新主盒子
        const box = group.find((e: any) => e.get('name') === 'branch-box');
        if (box) {
          box.attr({
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: themedNodeStyles.branch.radius,
            fill: themedNodeStyles.branch.fill,
            stroke: themedNodeStyles.branch.stroke,
            lineWidth: themedNodeStyles.branch.lineWidth,
          });
        }
        
        // 更新展开按钮
        const toggle = group.find((e: any) => e.get('name') === 'toggle');
        if (toggle) {
          toggle.attr({
            x: -w / 2 + elementPositions.toggle.offsetX,
            y: 0,
            text: cfg.collapsed ? '+' : '−',
            fontSize: textStyles.toggle.fontSize,
            fill: themeColors.primary,
            fontWeight: textStyles.toggle.fontWeight,
          });
        }
        
        // 更新文本
        const textEl = group.find((e: any) => e.get('name') === 'branch-text');
        if (textEl) {
          const label = cfg.label || '';
          const maxLen = textTruncate.maxLength.branch;
          const displayText = label.length > maxLen ? label.slice(0, maxLen) + textTruncate.ellipsis : label;
          textEl.attr({
            x: -w / 2 + (cfg.children?.length ? elementPositions.text.offsetXToggle : elementPositions.text.offsetX),
            y: 0,
            text: displayText,
            fontSize: textStyles.branch.fontSize,
            fontWeight: textStyles.branch.fontWeight,
            fill: themeColors.textPrimary,
          });
        }
      },

      setState(name?: string, value?: boolean | string, item?: any) {
        if (!item) return;
        const config = getConfig();
        const themeColors = getThemeColors();
        const themedNodeStyles = getThemedNodeStyles(config, themeColors);
        const container = item.getContainer();
        const box = container.find((e: any) => e.get('name') === 'branch-box');

        if (name === 'hover' && box) {
          box.attr('fill', value ? themeColors.bgHover : themeColors.primaryLight);
        }
        
        // 高亮状态（搜索跳转时使用）
        if (name === 'highlight' && box) {
          if (value) {
            box.attr('shadowColor', '#ff9800');
            box.attr('shadowBlur', 20);
            box.attr('stroke', '#ff9800');
            box.attr('lineWidth', 2);
          } else {
            box.attr('shadowColor', 'transparent');
            box.attr('shadowBlur', 0);
            box.attr('stroke', themedNodeStyles.branch.stroke);
            box.attr('lineWidth', themedNodeStyles.branch.lineWidth);
          }
        }
      },
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 叶子节点
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 注册叶子节点
   * 特点：圆角胶囊形、绿色系、带详情图标、可选展开按钮
   */
  private registerLeafNode(): void {
    G6.registerNode('leaf-node', {
      draw(cfg: any, group: any) {
        const config = getConfig();
        const themeColors = getThemeColors();
        const themedNodeStyles = getThemedNodeStyles(config, themeColors);
        const { textStyles, textTruncate, elementPositions } = config;
        const label = cfg.label || '';
        
        // 检查是否有自定义节点配置
        if (cfg.customNodeId) {
          const customNodeConfig = getCustomNodeConfig(cfg.customNodeId);
          if (customNodeConfig) {
            // 使用自定义节点配置渲染
            const mainShape = NodeRenderer.drawCustomNodeElements(group, customNodeConfig, cfg, label);
            
            // 绘制书签标记
            NodeRenderer.drawBookmarkMarker(group, customNodeConfig.width, customNodeConfig.height, cfg.hasBookmark);
            
            return mainShape;
          }
        }
        
        // 默认渲染逻辑
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'leaf', themedNodeStyles);

        // 应用自定义节点颜色（如果存在）
        const customFill = cfg.customFill || themedNodeStyles.leaf.fill;
        const customStroke = cfg.customStroke || themedNodeStyles.leaf.stroke;

        // 绘制主盒子
        const box = group.addShape('rect', {
          attrs: {
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: themedNodeStyles.leaf.radius,
            fill: customFill,
            stroke: customStroke,
            lineWidth: themedNodeStyles.leaf.lineWidth,
            cursor: 'pointer',
          },
          name: 'leaf-box',
        });

        // 绘制展开/收起按钮（如果有子节点）
        if (cfg.children?.length) {
          group.addShape('text', {
            attrs: {
              x: -w / 2 + elementPositions.toggle.offsetX,
              y: 0,
              text: cfg.collapsed ? '+' : '−',
              fontSize: textStyles.toggle.fontSize,
              fill: themeColors.success,
              fontWeight: textStyles.toggle.fontWeight,
              cursor: 'pointer',
              textBaseline: 'middle',
            },
            name: 'toggle',
            capture: true,
          });
        }

        // 绘制标签文本
        const maxLen = textTruncate.maxLength.leaf;
        const displayText = label.length > maxLen ? label.slice(0, maxLen) + textTruncate.ellipsis : label;
        group.addShape('text', {
          attrs: {
            x: -w / 2 + (cfg.children?.length ? elementPositions.text.offsetXToggle : elementPositions.text.offsetX),
            y: 0,
            text: displayText,
            fontSize: textStyles.leaf.fontSize,
            fill: themeColors.textPrimary,
            textBaseline: 'middle',
          },
          name: 'leaf-text',
        });

        // 绘制详情图标
        group.addShape('text', {
          attrs: {
            x: w / 2 + elementPositions.icon.offsetDetail,
            y: 0,
            text: '📖',
            fontSize: textStyles.icon.fontSize,
            cursor: 'pointer',
            textBaseline: 'middle',
          },
          name: 'detail-icon',
          capture: true,
        });

        // 绘制书签标记
        NodeRenderer.drawBookmarkMarker(group, w, h, cfg.hasBookmark);

        return box;
      },

      update(cfg: any, item: any) {
        const config = getConfig();
        const themeColors = getThemeColors();
        const themedNodeStyles = getThemedNodeStyles(config, themeColors);
        const { textStyles, textTruncate, elementPositions } = config;
        const label = cfg.label || '';
        
        // 检查是否有自定义节点配置
        if (cfg.customNodeId) {
          const customNodeConfig = getCustomNodeConfig(cfg.customNodeId);
          if (customNodeConfig) {
            // 使用自定义节点配置更新
            const group = item.getContainer();
            NodeRenderer.updateCustomNodeElements(group, customNodeConfig, cfg, label);
            return;
          }
        }
        
        // 默认更新逻辑
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'leaf', themedNodeStyles);
        
        // 应用自定义节点颜色（如果存在）
        const customFill = cfg.customFill || themedNodeStyles.leaf.fill;
        const customStroke = cfg.customStroke || themedNodeStyles.leaf.stroke;
        
        const group = item.getContainer();
        
        const box = group.find((e: any) => e.get('name') === 'leaf-box');
        if (box) {
          box.attr({
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: themedNodeStyles.leaf.radius,
            fill: customFill,
            stroke: customStroke,
            lineWidth: themedNodeStyles.leaf.lineWidth,
          });
        }
        
        const toggle = group.find((e: any) => e.get('name') === 'toggle');
        if (toggle) {
          toggle.attr({
            x: -w / 2 + elementPositions.toggle.offsetX,
            y: 0,
            text: cfg.collapsed ? '+' : '−',
            fontSize: textStyles.toggle.fontSize,
            fill: themeColors.success,
            fontWeight: textStyles.toggle.fontWeight,
          });
        }
        
        const textEl = group.find((e: any) => e.get('name') === 'leaf-text');
        if (textEl) {
          const label = cfg.label || '';
          const maxLen = textTruncate.maxLength.leaf;
          const displayText = label.length > maxLen ? label.slice(0, maxLen) + textTruncate.ellipsis : label;
          textEl.attr({
            x: -w / 2 + (cfg.children?.length ? elementPositions.text.offsetXToggle : elementPositions.text.offsetX),
            y: 0,
            text: displayText,
            fontSize: textStyles.leaf.fontSize,
            fill: themeColors.textPrimary,
          });
        }
        
        const detailIcon = group.find((e: any) => e.get('name') === 'detail-icon');
        if (detailIcon) {
          detailIcon.attr({
            x: w / 2 + elementPositions.icon.offsetDetail,
            y: 0,
            fontSize: textStyles.icon.fontSize,
          });
        }
      },

      setState(name?: string, value?: boolean | string, item?: any) {
        if (!item) return;
        const config = getConfig();
        const themeColors = getThemeColors();
        const themedNodeStyles = getThemedNodeStyles(config, themeColors);
        
        // 获取节点配置
        const cfg = item.getModel();
        
        // 检查是否使用自定义节点
        if (cfg.customNodeId) {
          const customNodeConfig = getCustomNodeConfig(cfg.customNodeId);
          if (customNodeConfig) {
            // 自定义节点的状态处理
            const box = item.getContainer().find((e: any) => e.get('name') === 'custom-main-box');
            const customFill = cfg.customFill || customNodeConfig.defaultFill || themeColors.bgPrimary;
            const customStroke = cfg.customStroke || customNodeConfig.defaultStroke || themeColors.nodeLeaf;
            
            if (name === 'hover' && box) {
              box.attr('fill', value ? themeColors.bgHover : customFill);
              box.attr('stroke', value ? themeColors.success : customStroke);
            }
            
            if (name === 'highlight' && box) {
              if (value) {
                box.attr('shadowColor', '#ff9800');
                box.attr('shadowBlur', 15);
                box.attr('stroke', '#ff9800');
                box.attr('lineWidth', 2);
              } else {
                box.attr('shadowColor', 'transparent');
                box.attr('shadowBlur', 0);
                box.attr('stroke', customStroke);
                box.attr('lineWidth', 1);
              }
            }
            return;
          }
        }
        
        // 默认状态处理
        const box = item.getContainer().find((e: any) => e.get('name') === 'leaf-box');
        
        // 获取节点的自定义颜色
        const customFill = cfg.customFill || themeColors.bgPrimary;
        const customStroke = cfg.customStroke || themeColors.nodeLeaf;
        
        if (name === 'hover' && box) {
          box.attr('fill', value ? themeColors.bgHover : customFill);
          box.attr('stroke', value ? themeColors.success : customStroke);
        }
        
        if (name === 'highlight' && box) {
          if (value) {
            box.attr('shadowColor', '#ff9800');
            box.attr('shadowBlur', 15);
            box.attr('stroke', '#ff9800');
            box.attr('lineWidth', 2);
          } else {
            box.attr('shadowColor', 'transparent');
            box.attr('shadowBlur', 0);
            box.attr('stroke', customStroke);
            box.attr('lineWidth', themedNodeStyles.leaf.lineWidth);
          }
        }
      },
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 链接节点
  // ───────────────────────────────────────────────────────────────────────────

  private registerLinkNode(): void {
    G6.registerNode('link-node', {
      draw(cfg: any, group: any) {
        const config = getConfig();
        const themeColors = getThemeColors();
        const themedNodeStyles = getThemedNodeStyles(config, themeColors);
        const { textStyles, textTruncate, elementPositions } = config;
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'link', themedNodeStyles);

        const box = group.addShape('rect', {
          attrs: {
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: themedNodeStyles.link.radius,
            fill: themedNodeStyles.link.fill,
            stroke: themedNodeStyles.link.stroke,
            lineWidth: themedNodeStyles.link.lineWidth,
            lineDash: themedNodeStyles.link.lineDash,
            cursor: 'pointer',
          },
          name: 'link-box',
        });

        if (cfg.children?.length) {
          group.addShape('text', {
            attrs: {
              x: -w / 2 + elementPositions.toggle.offsetXLink,
              y: 0,
              text: cfg.collapsed ? '+' : '−',
              fontSize: textStyles.toggle.fontSizeLink,
              fill: themeColors.warning,
              fontWeight: textStyles.toggle.fontWeight,
              cursor: 'pointer',
              textBaseline: 'middle',
            },
            name: 'toggle',
            capture: true,
          });
        }

        group.addShape('text', {
          attrs: {
            x: -w / 2 + (cfg.children?.length ? elementPositions.icon.offsetXToggle : elementPositions.icon.offsetXLink),
            y: 0,
            text: '🔗',
            fontSize: textStyles.icon.fontSizeLinkIcon,
            textBaseline: 'middle',
          },
          name: 'link-icon',
        });

        const label = cfg.label || '';
        const maxLen = textTruncate.maxLength.link;
        const displayText = label.length > maxLen ? label.slice(0, maxLen - 2) + textTruncate.ellipsis : label;
        group.addShape('text', {
          attrs: {
            x: -w / 2 + (cfg.children?.length ? elementPositions.text.offsetXLinkToggle : elementPositions.text.offsetXLink),
            y: 0,
            text: displayText,
            fontSize: textStyles.link.fontSize,
            fill: themeColors.textPrimary,
            textBaseline: 'middle',
          },
          name: 'link-text',
        });

        group.addShape('text', {
          attrs: {
            x: w / 2 + elementPositions.icon.offsetDetailLink,
            y: 0,
            text: '📖',
            fontSize: textStyles.icon.fontSizeLink,
            cursor: 'pointer',
            textBaseline: 'middle',
          },
          name: 'detail-icon',
          capture: true,
        });

        NodeRenderer.drawBookmarkMarker(group, w, h, cfg.hasBookmark);

        return box;
      },

      update(cfg: any, item: any) {
        const config = getConfig();
        const themeColors = getThemeColors();
        const themedNodeStyles = getThemedNodeStyles(config, themeColors);
        const { textStyles, textTruncate, elementPositions } = config;
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'link', themedNodeStyles);
        
        const group = item.getContainer();
        
        const box = group.find((e: any) => e.get('name') === 'link-box');
        if (box) {
          box.attr({
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: themedNodeStyles.link.radius,
            fill: themedNodeStyles.link.fill,
            stroke: themedNodeStyles.link.stroke,
            lineWidth: themedNodeStyles.link.lineWidth,
            lineDash: themedNodeStyles.link.lineDash,
          });
        }
        
        const toggle = group.find((e: any) => e.get('name') === 'toggle');
        if (toggle) {
          toggle.attr({
            x: -w / 2 + elementPositions.toggle.offsetXLink,
            y: 0,
            text: cfg.collapsed ? '+' : '−',
            fontSize: textStyles.toggle.fontSizeLink,
            fill: themeColors.warning,
            fontWeight: textStyles.toggle.fontWeight,
          });
        }
        
        const linkIcon = group.find((e: any) => e.get('name') === 'link-icon');
        if (linkIcon) {
          linkIcon.attr({
            x: -w / 2 + (cfg.children?.length ? elementPositions.icon.offsetXToggle : elementPositions.icon.offsetXLink),
            y: 0,
            fontSize: textStyles.icon.fontSizeLinkIcon,
          });
        }
        
        const textEl = group.find((e: any) => e.get('name') === 'link-text');
        if (textEl) {
          const label = cfg.label || '';
          const maxLen = textTruncate.maxLength.link;
          const displayText = label.length > maxLen ? label.slice(0, maxLen - 2) + textTruncate.ellipsis : label;
          textEl.attr({
            x: -w / 2 + (cfg.children?.length ? elementPositions.text.offsetXLinkToggle : elementPositions.text.offsetXLink),
            y: 0,
            text: displayText,
            fontSize: textStyles.link.fontSize,
            fill: themeColors.textPrimary,
          });
        }
        
        const detailIcon = group.find((e: any) => e.get('name') === 'detail-icon');
        if (detailIcon) {
          detailIcon.attr({
            x: w / 2 + elementPositions.icon.offsetDetailLink,
            y: 0,
            fontSize: textStyles.icon.fontSizeLink,
          });
        }
      },

      setState(name?: string, value?: boolean | string, item?: any) {
        if (!item) return;
        const config = getConfig();
        const themeColors = getThemeColors();
        const themedNodeStyles = getThemedNodeStyles(config, themeColors);
        const box = item.getContainer().find((e: any) => e.get('name') === 'link-box');
        
        if (name === 'hover' && box) {
          box.attr('fill', value ? themeColors.bgHover : themeColors.warningLight);
          box.attr('stroke', value ? themeColors.warningDark : themeColors.warning);
        }
        
        if (name === 'highlight' && box) {
          if (value) {
            box.attr('shadowColor', '#ff9800');
            box.attr('shadowBlur', 15);
            box.attr('stroke', '#ff9800');
            box.attr('lineWidth', 2);
          } else {
            box.attr('shadowColor', 'transparent');
            box.attr('shadowBlur', 0);
            box.attr('stroke', themedNodeStyles.link.stroke);
            box.attr('lineWidth', themedNodeStyles.link.lineWidth);
          }
        }
      },
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 子节点
  // ───────────────────────────────────────────────────────────────────────────

  private registerSubNode(): void {
    G6.registerNode('sub-node', {
      draw(cfg: any, group: any) {
        const config = getConfig();
        const themeColors = getThemeColors();
        const themedNodeStyles = getThemedNodeStyles(config, themeColors);
        const { textStyles, textTruncate } = config;
        const label = cfg.label || '';
        
        // 检查是否有自定义节点配置
        if (cfg.customNodeId) {
          const customNodeConfig = getCustomNodeConfig(cfg.customNodeId);
          if (customNodeConfig) {
            // 使用自定义节点配置渲染
            const mainShape = NodeRenderer.drawCustomNodeElements(group, customNodeConfig, cfg, label);
            
            // 绘制书签标记
            NodeRenderer.drawBookmarkMarker(group, customNodeConfig.width, customNodeConfig.height, cfg.hasBookmark);
            
            return mainShape;
          }
        }
        
        // 默认渲染逻辑
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'sub', themedNodeStyles);

        // 应用自定义节点颜色（如果存在）
        const customFill = cfg.customFill || themedNodeStyles.sub.fill;
        const customStroke = cfg.customStroke || themedNodeStyles.sub.stroke;

        const box = group.addShape('rect', {
          attrs: {
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: themedNodeStyles.sub.radius,
            fill: customFill,
            stroke: customStroke,
            lineWidth: themedNodeStyles.sub.lineWidth,
            cursor: 'default',
          },
          name: 'sub-box',
        });

        const maxLen = textTruncate.maxLength.sub;
        const displayText = label.length > maxLen ? label.slice(0, maxLen - 2) + textTruncate.ellipsisDouble : label;
        group.addShape('text', {
          attrs: {
            x: -w / 2 + 17,
            y: 0,
            text: displayText,
            fontSize: textStyles.sub.fontSize,
            fill: themeColors.textSecondary,
            textBaseline: 'middle',
          },
          name: 'sub-text',
        });

        NodeRenderer.drawBookmarkMarker(group, w, h, cfg.hasBookmark);

        return box;
      },

      update(cfg: any, item: any) {
        const config = getConfig();
        const themeColors = getThemeColors();
        const themedNodeStyles = getThemedNodeStyles(config, themeColors);
        const { textStyles, textTruncate } = config;
        const label = cfg.label || '';
        
        // 检查是否有自定义节点配置
        if (cfg.customNodeId) {
          const customNodeConfig = getCustomNodeConfig(cfg.customNodeId);
          if (customNodeConfig) {
            // 使用自定义节点配置更新
            const group = item.getContainer();
            NodeRenderer.updateCustomNodeElements(group, customNodeConfig, cfg, label);
            return;
          }
        }
        
        // 默认更新逻辑
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'sub', themedNodeStyles);
        
        // 应用自定义节点颜色（如果存在）
        const customFill = cfg.customFill || themedNodeStyles.sub.fill;
        const customStroke = cfg.customStroke || themedNodeStyles.sub.stroke;
        
        const group = item.getContainer();
        
        const box = group.find((e: any) => e.get('name') === 'sub-box');
        if (box) {
          box.attr({
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: themedNodeStyles.sub.radius,
            fill: customFill,
            stroke: customStroke,
            lineWidth: themedNodeStyles.sub.lineWidth,
          });
        }
        
        const textEl = group.find((e: any) => e.get('name') === 'sub-text');
        if (textEl) {
          const maxLen = textTruncate.maxLength.sub;
          const displayText = label.length > maxLen ? label.slice(0, maxLen - 2) + textTruncate.ellipsisDouble : label;
          textEl.attr({
            x: -w / 2 + 17,
            y: 0,
            text: displayText,
            fontSize: textStyles.sub.fontSize,
            fill: themeColors.textSecondary,
          });
        }
      },

      setState(name?: string, value?: boolean | string, item?: any) {
        if (!item) return;
        const config = getConfig();
        const themeColors = getThemeColors();
        const themedNodeStyles = getThemedNodeStyles(config, themeColors);
        
        // 获取节点配置
        const cfg = item.getModel();
        
        // 检查是否使用自定义节点
        if (cfg.customNodeId) {
          const customNodeConfig = getCustomNodeConfig(cfg.customNodeId);
          if (customNodeConfig) {
            // 自定义节点的状态处理
            const box = item.getContainer().find((e: any) => e.get('name') === 'custom-main-box');
            const customFill = cfg.customFill || customNodeConfig.defaultFill || themeColors.bgSecondary;
            const customStroke = cfg.customStroke || customNodeConfig.defaultStroke || themeColors.border;
            
            if (name === 'hover' && box) {
              box.attr('fill', value ? themeColors.bgHover : customFill);
              box.attr('stroke', value ? themeColors.info : customStroke);
            }
            
            if (name === 'highlight' && box) {
              if (value) {
                box.attr('shadowColor', '#ff9800');
                box.attr('shadowBlur', 15);
                box.attr('stroke', '#ff9800');
                box.attr('lineWidth', 2);
              } else {
                box.attr('shadowColor', 'transparent');
                box.attr('shadowBlur', 0);
                box.attr('stroke', customStroke);
                box.attr('lineWidth', 1);
              }
            }
            return;
          }
        }
        
        // 默认状态处理
        const box = item.getContainer().find((e: any) => e.get('name') === 'sub-box');
        
        // 获取节点的自定义颜色
        const customFill = cfg.customFill || themeColors.bgSecondary;
        const customStroke = cfg.customStroke || themeColors.border;
        
        if (name === 'hover' && box) {
          box.attr('fill', value ? themeColors.bgHover : customFill);
          box.attr('stroke', value ? themeColors.info : customStroke);
        }
        
        if (name === 'highlight' && box) {
          if (value) {
            box.attr('shadowColor', '#ff9800');
            box.attr('shadowBlur', 15);
            box.attr('stroke', '#ff9800');
            box.attr('lineWidth', 2);
          } else {
            box.attr('shadowColor', 'transparent');
            box.attr('shadowBlur', 0);
            box.attr('stroke', customStroke);
            box.attr('lineWidth', themedNodeStyles.sub.lineWidth);
          }
        }
      },
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 工具方法
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 获取节点尺寸
   * @param cfg 节点配置
   * @param type 节点类型
   * @param nodeStyles 节点样式配置
   * @returns 节点尺寸
   */
  private static getNodeSize(cfg: any, type: 'root' | 'branch' | 'leaf' | 'link' | 'sub', nodeStyles: any): NodeConfig {
    const defaultSize = nodeStyles[type].size;
    const width = cfg.size?.[0] || defaultSize[0];
    const height = cfg.size?.[1] || defaultSize[1];
    return { width, height };
  }

  /**
   * 绘制书签标记（左上角）
   * @param group 图形组
   * @param w 节点宽度
   * @param h 节点高度
   * @param hasBookmark 是否有书签
   */
  private static drawBookmarkMarker(group: any, w: number, h: number, hasBookmark: boolean): void {
    if (!hasBookmark) return;
    
    // 书签图标位置（右上角）
    const iconX = w / 2 - 18;
    const iconY = -h / 2 + 6;
    
    // 绘制书签图标（更美观的样式）
    // 主体 - 圆角矩形背景
    group.addShape('rect', {
      attrs: {
        x: iconX - 2,
        y: iconY - 2,
        width: 20,
        height: 22,
        radius: 3,
        fill: '#FFB74D',
        shadowColor: 'rgba(255, 152, 0, 0.4)',
        shadowBlur: 4,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
      },
      name: 'bookmark-bg',
    });
    
    // 书签主体
    group.addShape('path', {
      attrs: {
        path: [
          ['M', iconX + 2, iconY + 1],
          ['L', iconX + 14, iconY + 1],
          ['L', iconX + 14, iconY + 16],
          ['L', iconX + 8, iconY + 12],
          ['L', iconX + 2, iconY + 16],
          ['Z'],
        ],
        fill: '#FF6F00',
        shadowColor: 'rgba(0, 0, 0, 0.15)',
        shadowBlur: 2,
        shadowOffsetX: 0,
        shadowOffsetY: 1,
      },
      name: 'bookmark-body',
    });
    
    // 书签上的小星星装饰
    group.addShape('circle', {
      attrs: {
        x: iconX + 8,
        y: iconY + 7,
        r: 2,
        fill: '#FFF',
        opacity: 0.9,
      },
      name: 'bookmark-star',
    });
  }

  /**
   * 绘制自定义节点元素
   * 根据自定义节点配置动态绘制元素
   * @param group 图形组
   * @param customNodeConfig 自定义节点配置
   * @param cfg 节点数据（包含自定义颜色覆盖）
   * @param label 节点标签
   * @returns 绘制的主形状（用于返回）
   */
  private static drawCustomNodeElements(
    group: any,
    customNodeConfig: CustomNodeConfig,
    cfg: CustomNodeCfg,
    label: string
  ): any {
    const { width: w, height: h, elements } = customNodeConfig;
    
    // 使用自定义颜色覆盖或默认颜色
    const fill = cfg.customFill || customNodeConfig.defaultFill || '#e6f7ff';
    const stroke = cfg.customStroke || customNodeConfig.defaultStroke || '#1890ff';
    
    let mainShape: any = null;
    
    // 先绘制背景元素（rect, circle, ellipse, line），再绘制前景元素（text, icon）
    // 这样确保文字不会被背景覆盖
    const backgroundElements = elements.filter(e => ['rect', 'circle', 'ellipse', 'line'].includes(e.type));
    const foregroundElements = elements.filter(e => ['text', 'icon'].includes(e.type));
    
    // 绘制背景元素
    backgroundElements.forEach((element) => {
      const index = elements.indexOf(element);
      const elementName = `custom-element-${index}`;
      
      // 应用颜色覆盖到背景元素（通常是第一个元素）
      const elementFill = index === 0 && element.type === 'rect' ? fill : element.fill;
      const elementStroke = index === 0 ? stroke : element.stroke;
      
      switch (element.type) {
        case 'rect':
          const rect = group.addShape('rect', {
            attrs: {
              x: element.x - w / 2,
              y: element.y - h / 2,
              width: element.width || 60,
              height: element.height || 30,
              radius: element.radius || 4,
              fill: elementFill || '#e6f7ff',
              stroke: elementStroke || '#1890ff',
              lineWidth: element.strokeWidth || 1,
              opacity: element.opacity ?? 1,
              cursor: 'pointer',
            },
            name: index === 0 ? 'custom-main-box' : elementName,
          });
          if (index === 0) mainShape = rect;
          break;
          
        case 'circle':
          const circleR = (element.width || 30) / 2;
          group.addShape('circle', {
            attrs: {
              x: element.x - w / 2 + circleR,
              y: element.y - h / 2 + circleR,
              r: circleR,
              fill: element.fill || '#f6ffed',
              stroke: element.stroke || '#52c41a',
              lineWidth: element.strokeWidth || 1,
              opacity: element.opacity ?? 1,
            },
            name: elementName,
          });
          break;
          
        case 'ellipse':
          group.addShape('ellipse', {
            attrs: {
              x: element.x - w / 2 + (element.width || 50) / 2,
              y: element.y - h / 2 + (element.height || 25) / 2,
              rx: (element.width || 50) / 2,
              ry: (element.height || 25) / 2,
              fill: element.fill || '#fffbe6',
              stroke: element.stroke || '#faad14',
              lineWidth: element.strokeWidth || 1,
              opacity: element.opacity ?? 1,
            },
            name: elementName,
          });
          break;
          
        case 'line':
          group.addShape('line', {
            attrs: {
              x1: element.x - w / 2,
              y1: element.y - h / 2,
              x2: element.x - w / 2 + (element.width || 40),
              y2: element.y - h / 2,
              stroke: element.stroke || '#d9d9d9',
              lineWidth: element.strokeWidth || 1,
              opacity: element.opacity ?? 1,
            },
            name: elementName,
          });
          break;
      }
    });
    
    // 绘制前景元素（文字和图标）
    foregroundElements.forEach((element) => {
      const index = elements.indexOf(element);
      const elementName = `custom-element-${index}`;
      
      switch (element.type) {
        case 'text':
          // 如果文本内容是 '{label}'，则使用节点的实际标签
          const textContent = element.text === '{label}' ? label : (element.text || '文本');
          // 文字坐标：element.x 和 element.y 是相对于节点左上角的位置
          // G6 中节点中心在原点，所以需要减去宽高的一半
          // CSS 的 top 是文字顶部位置，而 G6 的 textBaseline: 'middle' 时 y 是文字中心位置
          // 所以 y 需要加上 fontSize/2 来对齐
          const textFontSize = element.fontSize || 12;
          const textX = element.x - w / 2;
          const textY = element.y - h / 2 + textFontSize / 2;
          
          console.log('[NodeRenderer] 绘制文本', {
            elementName,
            textContent,
            textFontSize,
            textX,
            textY,
            elementX: element.x,
            elementY: element.y,
            nodeW: w,
            nodeH: h,
            fontColor: element.fontColor || '#262626'
          });
          
          group.addShape('text', {
            attrs: {
              x: textX,
              y: textY,
              text: textContent,
              fontSize: textFontSize,
              fill: element.fontColor || '#262626',
              opacity: element.opacity ?? 1,
              textBaseline: 'middle',
            },
            name: elementName,
          });
          break;
          
        case 'icon':
          // 图标坐标：element.x 和 element.y 是相对于节点左上角的位置
          // G6 中节点中心在原点，所以需要减去宽高的一半
          // CSS 的 top 是图标顶部位置，而 G6 的 textBaseline: 'middle' 时 y 是图标中心位置
          // 所以 y 需要加上 iconSize/2 来对齐
          const iconFontSize = element.iconSize || 16;
          group.addShape('text', {
            attrs: {
              x: element.x - w / 2,
              y: element.y - h / 2 + iconFontSize / 2,
              text: element.icon || '⭐',
              fontSize: iconFontSize,
              opacity: element.opacity ?? 1,
              textBaseline: 'middle',
            },
            name: elementName,
          });
          break;
      }
    });
    
    // 如果没有找到主形状，创建一个透明的容器作为主形状
    if (!mainShape) {
      mainShape = group.addShape('rect', {
        attrs: {
          x: -w / 2,
          y: -h / 2,
          width: w,
          height: h,
          fill: 'transparent',
          stroke: 'transparent',
          cursor: 'pointer',
        },
        name: 'custom-main-box',
      });
    }
    
    return mainShape;
  }

  /**
   * 更新自定义节点元素
   * @param group 图形组
   * @param customNodeConfig 自定义节点配置
   * @param cfg 节点数据
   * @param label 节点标签
   */
  private static updateCustomNodeElements(
    group: any,
    customNodeConfig: CustomNodeConfig,
    cfg: CustomNodeCfg,
    label: string
  ): void {
    const { width: w, height: h, elements } = customNodeConfig;
    
    // 使用自定义颜色覆盖或默认颜色
    const fill = cfg.customFill || customNodeConfig.defaultFill || '#e6f7ff';
    const stroke = cfg.customStroke || customNodeConfig.defaultStroke || '#1890ff';
    
    // 更新所有元素
    elements.forEach((element, index) => {
      const elementName = index === 0 && element.type === 'rect' ? 'custom-main-box' : `custom-element-${index}`;
      const shape = group.find((e: any) => e.get('name') === elementName);
      
      if (!shape) return;
      
      // 应用颜色覆盖到背景元素
      const elementFill = index === 0 && element.type === 'rect' ? fill : element.fill;
      const elementStroke = index === 0 ? stroke : element.stroke;
      
      switch (element.type) {
        case 'rect':
          shape.attr({
            x: element.x - w / 2,
            y: element.y - h / 2,
            width: element.width || 60,
            height: element.height || 30,
            radius: element.radius || 4,
            fill: elementFill || '#e6f7ff',
            stroke: elementStroke || '#1890ff',
            lineWidth: element.strokeWidth || 1,
          });
          break;
          
        case 'circle':
          const circleR = (element.width || 30) / 2;
          shape.attr({
            x: element.x - w / 2 + circleR,
            y: element.y - h / 2 + circleR,
            r: circleR,
            fill: element.fill || '#f6ffed',
            stroke: element.stroke || '#52c41a',
            lineWidth: element.strokeWidth || 1,
          });
          break;
          
        case 'ellipse':
          shape.attr({
            x: element.x - w / 2 + (element.width || 50) / 2,
            y: element.y - h / 2 + (element.height || 25) / 2,
            rx: (element.width || 50) / 2,
            ry: (element.height || 25) / 2,
            fill: element.fill || '#fffbe6',
            stroke: element.stroke || '#faad14',
            lineWidth: element.strokeWidth || 1,
          });
          break;
          
        case 'text':
          const textContent = element.text === '{label}' ? label : (element.text || '文本');
          const textFontSize = element.fontSize || 12;
          shape.attr({
            x: element.x - w / 2,
            y: element.y - h / 2 + textFontSize / 2,
            text: textContent,
            fontSize: textFontSize,
            fill: element.fontColor || '#262626',
          });
          break;
          
        case 'icon':
          const iconFontSize = element.iconSize || 16;
          shape.attr({
            x: element.x - w / 2,
            y: element.y - h / 2 + iconFontSize / 2,
            text: element.icon || '⭐',
            fontSize: iconFontSize,
          });
          break;
          
        case 'line':
          shape.attr({
            x1: element.x - w / 2,
            y1: element.y - h / 2,
            x2: element.x - w / 2 + (element.width || 40),
            y2: element.y - h / 2,
            stroke: element.stroke || '#d9d9d9',
            lineWidth: element.strokeWidth || 1,
          });
          break;
      }
    });
  }

  /**
   * 检查是否已注册
   * @returns 是否已注册
   */
  isRegistered(): boolean {
    return this.registered;
  }
}
