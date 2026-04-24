/**
 * ConfigSettingsPanel - 配置设置面板组件
 * 
 * 显示布局配置选项
 */

import React from 'react';
import { Switch } from 'antd';
import type { RoadmapConfig } from '../../store/configStore';
import NumberInput from './NumberInput';
import styles from '../../styles/ConfigPanel.module.css';

interface ConfigSettingsPanelProps {
  layout: RoadmapConfig['layout'];
  zoom: RoadmapConfig['zoom'];
  onUpdateLayout: (updates: Partial<RoadmapConfig['layout']>) => void;
  onUpdateZoom: (updates: Partial<RoadmapConfig['zoom']>) => void;
  onResetConfig: () => void;
}

/**
 * 配置设置面板组件
 * 提供布局、缩放等配置选项
 */
const ConfigSettingsPanel: React.FC<ConfigSettingsPanelProps> = ({
  layout,
  zoom,
  onUpdateLayout,
  onUpdateZoom,
  onResetConfig,
}) => {
  // 横向布局 = LR，纵向布局 = TB
  const isHorizontal = layout.direction === 'LR';
  
  const handleDirectionChange = (checked: boolean) => {
    onUpdateLayout({ direction: checked ? 'LR' : 'TB' });
  };
  
  return (
    <div className={styles.configSettingsPanel}>
      {/* 布局配置 */}
      <div className={styles.configSection}>
        <h3 className={styles.configSectionTitle}>📐 布局配置</h3>
        
        {/* 横纵布局切换 */}
        <div className={styles.configSwitchRow}>
          <span className={styles.configSwitchLabel}>布局方向</span>
          <div className={styles.configSwitchWrapper}>
            <span className={isHorizontal ? styles.active : ''}>横向</span>
            <Switch
              checked={isHorizontal}
              onChange={handleDirectionChange}
              size="small"
            />
            <span className={!isHorizontal ? styles.active : ''}>纵向</span>
          </div>
        </div>
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
      <div className={styles.configSection}>
        <h3 className={styles.configSectionTitle}>🔍 缩放配置</h3>
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
      <div className={styles.configSection}>
        <button className={styles.configResetBtn} onClick={onResetConfig}>
          🔄 重置为默认配置
        </button>
      </div>
    </div>
  );
};

export default ConfigSettingsPanel;
