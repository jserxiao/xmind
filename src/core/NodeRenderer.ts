/**
 * NodeRenderer - 自定义节点渲染器
 *
 * 负责注册和管理各种类型的自定义 G6 节点
 * 包括：根节点、分支节点、叶子节点、链接节点、子节点
 * 
 * 支持动态配置：通过 getConfig 获取最新的配置
 */

import G6 from '@antv/g6';
import { useConfigStore } from '../store/configStore';
import type { RoadmapConfig } from '../store/configStore';

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
        const { nodeStyles, textStyles, elementPositions } = config;
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'root', nodeStyles);

        // 绘制主盒子
        const box = group.addShape('rect', {
          attrs: {
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: nodeStyles.root.radius,
            fill: nodeStyles.root.fill,
            stroke: nodeStyles.root.stroke,
            lineWidth: nodeStyles.root.lineWidth,
            shadowColor: nodeStyles.root.shadowColor,
            shadowBlur: nodeStyles.root.shadowBlur,
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
              fill: textStyles.root.fill,
              textBaseline: 'middle',
            },
            name: `root-text-${i}`,
          });
        });

        return box;
      },

      /**
       * 更新节点 - 关键：支持动态更新样式
       * @param cfg 节点配置
       * @param item 节点实例
       */
      update(cfg: any, item: any) {
        const config = getConfig();
        const { nodeStyles, textStyles, elementPositions } = config;
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'root', nodeStyles);
        
        console.log('[NodeRenderer] root-node update 被调用', { 
          fill: nodeStyles.root.fill,
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
            radius: nodeStyles.root.radius,
            fill: nodeStyles.root.fill,
            stroke: nodeStyles.root.stroke,
            lineWidth: nodeStyles.root.lineWidth,
            shadowColor: nodeStyles.root.shadowColor,
            shadowBlur: nodeStyles.root.shadowBlur,
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
        const lineHeight = (i: number) => i ? (textStyles.root.fontSizeSecondary || 14) + 6 : textStyles.root.fontSize + 6;
        const totalTextHeight = lines.reduce((sum: number, _: string, i: number) => sum + lineHeight(i), 0) - 6;
        const startY = -totalTextHeight / 2 + (lines.length > 1 ? 0 : textStyles.root.fontSize / 2);
        
        lines.forEach((_line: string, i: number) => {
          const textEl = group.find((e: any) => e.get('name') === `root-text-${i}`);
          const currentY = lines.length === 1 ? 0 : startY + lines.slice(0, i).reduce((sum: number, _: string, j: number) => sum + lineHeight(j), 0);
          if (textEl) {
            textEl.attr({
              x: -w / 2 + 45,
              y: currentY,
              fontSize: i ? textStyles.root.fontSizeSecondary : textStyles.root.fontSize,
              fontWeight: i ? textStyles.root.fontWeightSecondary : textStyles.root.fontWeight,
              fill: textStyles.root.fill,
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
        if (name !== 'hover' || !item) return;
        const config = getConfig();
        const { nodeStyles, colors } = config;
        const box = item.getContainer().find((e: any) => e.get('name') === 'root-box');
        if (box) {
          box.attr('shadowBlur', value ? 30 : nodeStyles.root.shadowBlur);
          box.attr('fill', value ? colors.hoverPrimary : colors.primary);
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
        const { nodeStyles, textStyles, textTruncate, colors, elementPositions } = config;
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'branch', nodeStyles);

        // 绘制主盒子
        const box = group.addShape('rect', {
          attrs: {
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: nodeStyles.branch.radius,
            fill: nodeStyles.branch.fill,
            stroke: nodeStyles.branch.stroke,
            lineWidth: nodeStyles.branch.lineWidth,
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
              fill: colors.primary,
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
            fill: textStyles.branch.fill,
            textBaseline: 'middle',
          },
          name: 'branch-text',
        });

        return box;
      },

      /**
       * 更新节点
       */
      update(cfg: any, item: any) {
        const config = getConfig();
        const { nodeStyles, textStyles, textTruncate, colors, elementPositions } = config;
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'branch', nodeStyles);
        
        const group = item.getContainer();
        
        // 更新主盒子
        const box = group.find((e: any) => e.get('name') === 'branch-box');
        if (box) {
          box.attr({
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: nodeStyles.branch.radius,
            fill: nodeStyles.branch.fill,
            stroke: nodeStyles.branch.stroke,
            lineWidth: nodeStyles.branch.lineWidth,
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
            fill: colors.primary,
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
            fill: textStyles.branch.fill,
          });
        }
      },

      setState(name?: string, value?: boolean | string, item?: any) {
        if (name !== 'hover' || !item) return;
        const config = getConfig();
        const { colors } = config;
        const container = item.getContainer();
        const box = container.find((e: any) => e.get('name') === 'branch-box');

        if (box) {
          box.attr('fill', value ? colors.hoverPrimaryLight : colors.primaryLight);
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
        const { nodeStyles, textStyles, textTruncate, colors, elementPositions } = config;
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'leaf', nodeStyles);

        // 绘制主盒子
        const box = group.addShape('rect', {
          attrs: {
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: nodeStyles.leaf.radius,
            fill: nodeStyles.leaf.fill,
            stroke: nodeStyles.leaf.stroke,
            lineWidth: nodeStyles.leaf.lineWidth,
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
              fill: colors.success,
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
        const maxLen = textTruncate.maxLength.leaf;
        const displayText = label.length > maxLen ? label.slice(0, maxLen) + textTruncate.ellipsis : label;
        group.addShape('text', {
          attrs: {
            x: -w / 2 + (cfg.children?.length ? elementPositions.text.offsetXToggle : elementPositions.text.offsetX),
            y: 0,
            text: displayText,
            fontSize: textStyles.leaf.fontSize,
            fill: textStyles.leaf.fill,
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

        return box;
      },

      /**
       * 更新节点
       */
      update(cfg: any, item: any) {
        const config = getConfig();
        const { nodeStyles, textStyles, textTruncate, colors, elementPositions } = config;
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'leaf', nodeStyles);
        
        const group = item.getContainer();
        
        // 更新主盒子
        const box = group.find((e: any) => e.get('name') === 'leaf-box');
        if (box) {
          box.attr({
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: nodeStyles.leaf.radius,
            fill: nodeStyles.leaf.fill,
            stroke: nodeStyles.leaf.stroke,
            lineWidth: nodeStyles.leaf.lineWidth,
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
            fill: colors.success,
            fontWeight: textStyles.toggle.fontWeight,
          });
        }
        
        // 更新文本
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
            fill: textStyles.leaf.fill,
          });
        }
        
        // 更新详情图标
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
        if (name !== 'hover' || !item) return;
        const config = getConfig();
        const { colors } = config;
        const box = item.getContainer().find((e: any) => e.get('name') === 'leaf-box');
        if (box) {
          box.attr('fill', value ? colors.hoverSuccessLight : colors.successLight);
          box.attr('stroke', value ? colors.success : colors.borderSuccess);
        }
      },
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 链接节点
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 注册链接节点
   * 特点：虚线边框、黄色系、带链接图标、支持长文本截断
   */
  private registerLinkNode(): void {
    G6.registerNode('link-node', {
      draw(cfg: any, group: any) {
        const config = getConfig();
        const { nodeStyles, textStyles, textTruncate, colors, elementPositions } = config;
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'link', nodeStyles);

        // 绘制主盒子
        const box = group.addShape('rect', {
          attrs: {
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: nodeStyles.link.radius,
            fill: nodeStyles.link.fill,
            stroke: nodeStyles.link.stroke,
            lineWidth: nodeStyles.link.lineWidth,
            lineDash: nodeStyles.link.lineDash,
            cursor: 'pointer',
          },
          name: 'link-box',
        });

        // 绘制展开/收起按钮
        if (cfg.children?.length) {
          group.addShape('text', {
            attrs: {
              x: -w / 2 + elementPositions.toggle.offsetXLink,
              y: 0,
              text: cfg.collapsed ? '+' : '−',
              fontSize: textStyles.toggle.fontSizeLink,
              fill: colors.warning,
              fontWeight: textStyles.toggle.fontWeight,
              cursor: 'pointer',
              textBaseline: 'middle',
            },
            name: 'toggle',
            capture: true,
          });
        }

        // 绘制链接图标
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

        // 绘制标签文本
        const label = cfg.label || '';
        const maxLen = textTruncate.maxLength.link;
        const displayText = label.length > maxLen ? label.slice(0, maxLen - 2) + textTruncate.ellipsis : label;
        group.addShape('text', {
          attrs: {
            x: -w / 2 + (cfg.children?.length ? elementPositions.text.offsetXLinkToggle : elementPositions.text.offsetXLink),
            y: 0,
            text: displayText,
            fontSize: textStyles.link.fontSize,
            fill: textStyles.link.fill,
            textBaseline: 'middle',
          },
          name: 'link-text',
        });

        // 绘制详情图标
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

        return box;
      },

      /**
       * 更新节点
       */
      update(cfg: any, item: any) {
        const config = getConfig();
        const { nodeStyles, textStyles, textTruncate, colors, elementPositions } = config;
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'link', nodeStyles);
        
        const group = item.getContainer();
        
        // 更新主盒子
        const box = group.find((e: any) => e.get('name') === 'link-box');
        if (box) {
          box.attr({
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: nodeStyles.link.radius,
            fill: nodeStyles.link.fill,
            stroke: nodeStyles.link.stroke,
            lineWidth: nodeStyles.link.lineWidth,
            lineDash: nodeStyles.link.lineDash,
          });
        }
        
        // 更新展开按钮
        const toggle = group.find((e: any) => e.get('name') === 'toggle');
        if (toggle) {
          toggle.attr({
            x: -w / 2 + elementPositions.toggle.offsetXLink,
            y: 0,
            text: cfg.collapsed ? '+' : '−',
            fontSize: textStyles.toggle.fontSizeLink,
            fill: colors.warning,
            fontWeight: textStyles.toggle.fontWeight,
          });
        }
        
        // 更新链接图标
        const linkIcon = group.find((e: any) => e.get('name') === 'link-icon');
        if (linkIcon) {
          linkIcon.attr({
            x: -w / 2 + (cfg.children?.length ? elementPositions.icon.offsetXToggle : elementPositions.icon.offsetXLink),
            y: 0,
            fontSize: textStyles.icon.fontSizeLinkIcon,
          });
        }
        
        // 更新文本
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
            fill: textStyles.link.fill,
          });
        }
        
        // 更新详情图标
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
        if (name !== 'hover' || !item) return;
        const config = getConfig();
        const { colors } = config;
        const box = item.getContainer().find((e: any) => e.get('name') === 'link-box');
        if (box) {
          box.attr('fill', value ? colors.hoverWarningLight : colors.warningLight);
          box.attr('stroke', value ? '#ffc53d' : colors.borderWarning);
        }
      },
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 子节点
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 注册子节点
   * 特点：小尺寸、浅蓝色、支持长文本截断
   */
  private registerSubNode(): void {
    G6.registerNode('sub-node', {
      draw(cfg: any, group: any) {
        const config = getConfig();
        const { nodeStyles, textStyles, textTruncate } = config;
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'sub', nodeStyles);

        // 绘制主盒子
        const box = group.addShape('rect', {
          attrs: {
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: nodeStyles.sub.radius,
            fill: nodeStyles.sub.fill,
            stroke: nodeStyles.sub.stroke,
            lineWidth: nodeStyles.sub.lineWidth,
            cursor: 'default',
          },
          name: 'sub-box',
        });

        // 绘制标签文本
        const label = cfg.label || '';
        const maxLen = textTruncate.maxLength.sub;
        const displayText = label.length > maxLen ? label.slice(0, maxLen - 2) + textTruncate.ellipsisDouble : label;
        group.addShape('text', {
          attrs: {
            x: -w / 2 + 17,
            y: 0,
            text: displayText,
            fontSize: textStyles.sub.fontSize,
            fill: textStyles.sub.fill,
            textBaseline: 'middle',
          },
          name: 'sub-text',
        });

        return box;
      },

      /**
       * 更新节点
       */
      update(cfg: any, item: any) {
        const config = getConfig();
        const { nodeStyles, textStyles, textTruncate } = config;
        const { width: w, height: h } = NodeRenderer.getNodeSize(cfg, 'sub', nodeStyles);
        
        const group = item.getContainer();
        
        // 更新主盒子
        const box = group.find((e: any) => e.get('name') === 'sub-box');
        if (box) {
          box.attr({
            x: -w / 2,
            y: -h / 2,
            width: w,
            height: h,
            radius: nodeStyles.sub.radius,
            fill: nodeStyles.sub.fill,
            stroke: nodeStyles.sub.stroke,
            lineWidth: nodeStyles.sub.lineWidth,
          });
        }
        
        // 更新文本
        const textEl = group.find((e: any) => e.get('name') === 'sub-text');
        if (textEl) {
          const label = cfg.label || '';
          const maxLen = textTruncate.maxLength.sub;
          const displayText = label.length > maxLen ? label.slice(0, maxLen - 2) + textTruncate.ellipsisDouble : label;
          textEl.attr({
            x: -w / 2 + 17,
            y: 0,
            text: displayText,
            fontSize: textStyles.sub.fontSize,
            fill: textStyles.sub.fill,
          });
        }
      },

      setState(name?: string, value?: boolean | string, item?: any) {
        if (name !== 'hover' || !item) return;
        const config = getConfig();
        const { colors } = config;
        const box = item.getContainer().find((e: any) => e.get('name') === 'sub-box');
        if (box) {
          box.attr('fill', value ? colors.hoverLinkLight : colors.linkLight);
          box.attr('stroke', value ? colors.link : colors.borderLink);
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
   * 检查是否已注册
   * @returns 是否已注册
   */
  isRegistered(): boolean {
    return this.registered;
  }
}
