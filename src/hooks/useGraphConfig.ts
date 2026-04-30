/**
 * useGraphConfig — G6 图配置变化监听 Hook
 *
 * 职责：
 *   - 监听 configStore 变化 → refresh() 重绘节点
 *   - 监听 watermarkStore 变化 → setWatermark()
 *   - 监听 minimapStore 变化 → setMinimap()
 *   - 监听 themeStore 变化 → 逐节点 updateItem + layout()
 *   - 监听 connectionStore 变化 → setConnectionMode()
 *
 * 从 useGraphInit 中拆分出来，实现职责单一原则。
 */

import { useEffect } from 'react';
import { useConfigStore } from '../store/configStore';
import { useWatermarkStore } from '../store/watermarkStore';
import { useMinimapStore } from '../store/minimapStore';
import { useThemeStore } from '../store/themeStore';
import { useConnectionStore } from '../store/connectionStore';
import type { GraphManager } from '../core/GraphManager';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface UseGraphConfigOptions {
  /** G6 图管理器实例 ref */
  graphManagerRef: React.RefObject<GraphManager | null>;
  /** 数据是否正在加载 */
  loading: boolean;
  /** 当前思维导图 ID */
  currentRoadmapId: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook 实现
// ═══════════════════════════════════════════════════════════════════════════════

export function useGraphConfig({
  graphManagerRef,
  loading,
  currentRoadmapId,
}: UseGraphConfigOptions): void {

  // ── Store 选择器 ──

  // configVersion 是 configStore 中的递增计数器，
  // 当面板修改配置时 +1，触发本 effect 重新执行 refresh()
  const configVersion = useConfigStore((state) => state.configVersion);
  const getCurrentConfig = useConfigStore((state) => state.getCurrentConfig);
  const currentConfig = getCurrentConfig();

  // 将嵌套对象序列化为 JSON 字符串作为 effect 依赖。
  const colorsJson = JSON.stringify(currentConfig.colors);
  const layoutJson = JSON.stringify(currentConfig.layout);
  const nodeStylesJson = JSON.stringify(currentConfig.nodeStyles);
  const textStylesJson = JSON.stringify(currentConfig.textStyles);

  const watermarkConfig = useWatermarkStore((state) => state.config);
  const minimapConfig = useMinimapStore((state) => state.config);

  const currentThemeId = useThemeStore((state) => state.currentThemeId);
  const themeColors = useThemeStore((state) => state.getCurrentColors());

  const connectionMode = useConnectionStore((state) => state.connectionMode);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 配置变化监听 — 节点样式/布局/颜色变化时刷新画布
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (graphManagerRef.current && !loading) {
      graphManagerRef.current.refresh();
    }
  }, [colorsJson, layoutJson, nodeStylesJson, textStylesJson, loading, currentRoadmapId, configVersion]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 水印配置变化监听
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!graphManagerRef.current || loading) return;
    graphManagerRef.current.setWatermark(watermarkConfig);
  }, [watermarkConfig, loading]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 小地图配置变化监听
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!graphManagerRef.current || loading) return;
    graphManagerRef.current.setMinimap(minimapConfig);
  }, [minimapConfig, loading]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 主题变化监听
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!graphManagerRef.current || loading) return;
    const graph = graphManagerRef.current.getGraph();
    if (!graph) return;
    graph.getNodes().forEach((node) => {
      graph.updateItem(node, {});
    });
    graph.layout();
  }, [currentThemeId, themeColors, loading]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 连线模式变化监听
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!graphManagerRef.current || loading) return;
    graphManagerRef.current.setConnectionMode(connectionMode);
  }, [connectionMode, loading]);
}
