/**
 * ThemeConfigModal - 主题设置弹窗
 * 
 * 提供主题切换和自定义颜色配置功能
 */

import React, { useState } from 'react';
import { Modal, message } from 'antd';
import { useThemeStore, THEME_PRESETS } from '../../store/themeStore';
import type { ThemeColors, ThemePreset } from '../../store/themeStore';
import styles from '../../styles/ThemeConfigModal.module.css';

interface ThemeConfigModalProps {
  open: boolean;
  onClose: () => void;
}

/** 颜色字段显示名称映射 */
const COLOR_LABELS: Record<keyof ThemeColors, string> = {
  primary: '品牌主色',
  primaryLight: '主色浅色',
  primaryDark: '主色深色',
  success: '成功色',
  successLight: '成功浅色',
  warning: '警告色',
  warningLight: '警告浅色',
  warningDark: '警告深色',
  error: '错误色',
  errorLight: '错误浅色',
  info: '信息色',
  infoLight: '信息浅色',
  textPrimary: '主要文字',
  textSecondary: '次要文字',
  textMuted: '弱化文字',
  textInverse: '反色文字',
  bgPrimary: '主要背景',
  bgSecondary: '次要背景',
  bgHover: '悬停背景',
  bgSelected: '选中背景',
  border: '边框颜色',
  borderHover: '边框悬停',
  divider: '分割线',
  shadow: '阴影颜色',
  nodeRoot: '根节点',
  nodeBranch: '分支节点',
  nodeLeaf: '叶子节点',
  nodeSelected: '选中节点',
  nodeHover: '悬停节点',
  edge: '边线颜色',
  edgeArrow: '边线箭头',
};

/** 颜色分组 */
const COLOR_GROUPS = [
  {
    title: '🎨 品牌色系',
    keys: ['primary', 'primaryLight', 'primaryDark'] as (keyof ThemeColors)[],
  },
  {
    title: '✅ 状态色系',
    keys: ['success', 'successLight', 'warning', 'warningLight', 'warningDark', 'error', 'errorLight', 'info', 'infoLight'] as (keyof ThemeColors)[],
  },
  {
    title: '📝 文字色系',
    keys: ['textPrimary', 'textSecondary', 'textMuted', 'textInverse'] as (keyof ThemeColors)[],
  },
  {
    title: '🖼️ 背景色系',
    keys: ['bgPrimary', 'bgSecondary', 'bgHover', 'bgSelected'] as (keyof ThemeColors)[],
  },
  {
    title: '🔗 边框与线条',
    keys: ['border', 'borderHover', 'divider', 'shadow'] as (keyof ThemeColors)[],
  },
  {
    title: '🧩 节点颜色',
    keys: ['nodeRoot', 'nodeBranch', 'nodeLeaf', 'nodeSelected', 'nodeHover'] as (keyof ThemeColors)[],
  },
];

const ThemeConfigModal: React.FC<ThemeConfigModalProps> = ({ open, onClose }) => {
  const currentThemeId = useThemeStore((state) => state.currentThemeId);
  const useCustomColors = useThemeStore((state) => state.useCustomColors);
  const getCurrentColors = useThemeStore((state) => state.getCurrentColors);
  const setTheme = useThemeStore((state) => state.setTheme);
  const updateCustomColors = useThemeStore((state) => state.updateCustomColors);
  const setUseCustomColors = useThemeStore((state) => state.setUseCustomColors);
  const resetToDefault = useThemeStore((state) => state.resetToDefault);

  const currentColors = getCurrentColors();

  // 编辑中的颜色（用于自定义模式）
  const [editingColors, setEditingColors] = useState<ThemeColors>(currentColors);

  // 切换预设主题
  const handlePresetClick = (preset: ThemePreset) => {
    setTheme(preset.id);
    setUseCustomColors(false);
    message.success(`已应用「${preset.name}」主题`);
  };

  // 启用自定义模式
  const handleEnableCustom = () => {
    setUseCustomColors(true);
    setEditingColors(currentColors);
  };

  // 更新自定义颜色
  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    const newColors = { ...editingColors, [key]: value };
    setEditingColors(newColors);
    updateCustomColors({ [key]: value });
  };

  // 重置为默认
  const handleReset = () => {
    resetToDefault();
    setEditingColors(getCurrentColors());
    message.success('已重置为默认主题');
  };

  // 渲染颜色输入项
  const renderColorInput = (key: keyof ThemeColors, colors: ThemeColors) => (
    <div key={key} className={styles.themeColorItem}>
      <label className={styles.themeColorLabel}>{COLOR_LABELS[key]}</label>
      <div className={styles.themeColorInputWrapper}>
        <input
          type="color"
          value={colors[key]}
          onChange={(e) => handleColorChange(key, e.target.value)}
          disabled={!useCustomColors}
          className={styles.themeColorPicker}
        />
        <input
          type="text"
          value={colors[key]}
          onChange={(e) => handleColorChange(key, e.target.value)}
          disabled={!useCustomColors}
          className={styles.themeColorText}
        />
      </div>
    </div>
  );

  return (
    <Modal
      title="🎨 主题设置"
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
    >
      <div className={styles.themeConfig}>
        {/* 预设主题 */}
        <div className={styles.themeSection}>
          <h4 className={styles.themeSectionTitle}>推荐主题</h4>
          <div className={styles.themePresets}>
            {THEME_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className={`${styles.themePresetCard} ${currentThemeId === preset.id && !useCustomColors ? styles.active : ''}`}
                onClick={() => handlePresetClick(preset)}
              >
                <div className={styles.themePresetColors}>
                  <div
                    className={`${styles.themePresetColor} ${styles.primary}`}
                    style={{ backgroundColor: preset.colors.primary }}
                  />
                  <div
                    className={`${styles.themePresetColor} ${styles.secondary}`}
                    style={{ backgroundColor: preset.colors.nodeRoot }}
                  />
                  <div
                    className={`${styles.themePresetColor} ${styles.accent}`}
                    style={{ backgroundColor: preset.colors.success }}
                  />
                </div>
                <div className={styles.themePresetName}>{preset.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 自定义主题 */}
        <div className={styles.themeSection}>
          <div className={styles.themeSectionHeader}>
            <h4 className={styles.themeSectionTitle}>自定义主题</h4>
            <div className={styles.themeSectionActions}>
              {!useCustomColors ? (
                <button className={styles.themeActionBtn} onClick={handleEnableCustom}>
                  启用自定义
                </button>
              ) : (
                <button className={`${styles.themeActionBtn} ${styles.secondary}`} onClick={handleReset}>
                  重置为默认
                </button>
              )}
            </div>
          </div>

          {useCustomColors && (
            <div className={styles.themeColorGroups}>
              {COLOR_GROUPS.map((group) => (
                <div key={group.title} className={styles.themeColorGroup}>
                  <h5 className={styles.themeGroupTitle}>{group.title}</h5>
                  <div className={styles.themeColorItems}>
                    {group.keys.map((key) => renderColorInput(key, editingColors))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!useCustomColors && (
            <div className={styles.themeCustomHint}>
              <p>💡 点击「启用自定义」可手动配置所有颜色</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ThemeConfigModal;
