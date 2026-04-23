/**
 * ConfigSettingsPanel - 配置设置面板组件
 * 
 * 显示颜色和布局配置选项
 */

import React from 'react';
import type { RoadmapConfig } from '../../store/configStore';
import ColorInput from './ColorInput';
import NumberInput from './NumberInput';

interface ConfigSettingsPanelProps {
  colors: RoadmapConfig['colors'];
  layout: RoadmapConfig['layout'];
  zoom: RoadmapConfig['zoom'];
  onUpdateColors: (updates: Partial<RoadmapConfig['colors']>) => void;
  onUpdateLayout: (updates: Partial<RoadmapConfig['layout']>) => void;
  onUpdateZoom: (updates: Partial<RoadmapConfig['zoom']>) => void;
  onResetConfig: () => void;
}

/**
 * 配置设置面板组件
 * 提供颜色、布局、缩放等配置选项
 */
const ConfigSettingsPanel: React.FC<ConfigSettingsPanelProps> = ({
  colors,
  layout,
  zoom,
  onUpdateColors,
  onUpdateLayout,
  onUpdateZoom,
  onResetConfig,
}) => {
  return (
    <div className="config-settings-panel">
      {/* 颜色配置 */}
      <div className="config-section">
        <h3 className="config-section-title">🎨 颜色配置</h3>
        <ColorInput
          label="主色调"
          value={colors.primary}
          onChange={(v) => onUpdateColors({ primary: v })}
        />
        <ColorInput
          label="主色深"
          value={colors.primaryDark}
          onChange={(v) => onUpdateColors({ primaryDark: v })}
        />
        <ColorInput
          label="主色浅"
          value={colors.primaryLight}
          onChange={(v) => onUpdateColors({ primaryLight: v })}
        />
        <ColorInput
          label="成功色"
          value={colors.success}
          onChange={(v) => onUpdateColors({ success: v })}
        />
        <ColorInput
          label="警告色"
          value={colors.warning}
          onChange={(v) => onUpdateColors({ warning: v })}
        />
        <ColorInput
          label="链接色"
          value={colors.link}
          onChange={(v) => onUpdateColors({ link: v })}
        />
      </div>
      
      {/* 布局配置 */}
      <div className="config-section">
        <h3 className="config-section-title">📐 布局配置</h3>
        <NumberInput
          label="水平间距"
          value={layout.hGap}
          onChange={(v) => onUpdateLayout({ hGap: v })}
          min={50}
          max={500}
          step={10}
        />
        <NumberInput
          label="垂直间距"
          value={layout.vGap}
          onChange={(v) => onUpdateLayout({ vGap: v })}
          min={20}
          max={200}
          step={5}
        />
        <NumberInput
          label="节点宽度"
          value={layout.nodeWidth}
          onChange={(v) => onUpdateLayout({ nodeWidth: v })}
          min={80}
          max={300}
          step={10}
        />
        <NumberInput
          label="节点高度"
          value={layout.nodeHeight}
          onChange={(v) => onUpdateLayout({ nodeHeight: v })}
          min={30}
          max={100}
          step={5}
        />
      </div>
      
      {/* 缩放配置 */}
      <div className="config-section">
        <h3 className="config-section-title">🔍 缩放配置</h3>
        <NumberInput
          label="最小缩放"
          value={zoom.minZoom}
          onChange={(v) => onUpdateZoom({ minZoom: v })}
          min={0.1}
          max={0.5}
          step={0.1}
        />
        <NumberInput
          label="最大缩放"
          value={zoom.maxZoom}
          onChange={(v) => onUpdateZoom({ maxZoom: v })}
          min={1}
          max={5}
          step={0.5}
        />
        <NumberInput
          label="缩放灵敏度"
          value={zoom.sensitivity}
          onChange={(v) => onUpdateZoom({ sensitivity: v })}
          min={0.1}
          max={10}
          step={0.1}
        />
      </div>
      
      {/* 重置按钮 */}
      <div className="config-section">
        <button className="config-reset-btn" onClick={onResetConfig}>
          🔄 重置为默认配置
        </button>
      </div>
    </div>
  );
};

export default ConfigSettingsPanel;
