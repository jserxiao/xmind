/**
 * 主题配色 Store
 * 
 * 管理应用的主题配色方案
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ═══════════════════════════════════════════════════════════════════════════════
// 颜色语义定义
// ═══════════════════════════════════════════════════════════════════════════════

/** 主题配色方案 */
export interface ThemeColors {
  /** 品牌主色 - 用于主要按钮、选中状态、链接等 */
  primary: string;
  /** 品牌主色浅色 - 用于悬停背景、标签背景等 */
  primaryLight: string;
  /** 品牌主色深色 - 用于按下状态 */
  primaryDark: string;
  
  /** 成功色 - 用于成功提示、完成状态 */
  success: string;
  /** 成功色浅色背景 */
  successLight: string;
  
  /** 警告色 - 用于警告提示、注意事项 */
  warning: string;
  /** 警告色浅色背景 */
  warningLight: string;
  /** 警告色深色 */
  warningDark: string;
  
  /** 错误/危险色 - 用于错误提示、删除操作 */
  error: string;
  /** 错误色浅色背景 */
  errorLight: string;
  
  /** 信息色 - 用于信息提示、帮助说明 */
  info: string;
  /** 信息色浅色背景 */
  infoLight: string;
  
  /** 主要文字颜色 */
  textPrimary: string;
  /** 次要文字颜色 */
  textSecondary: string;
  /** 禁用/弱化文字颜色 */
  textMuted: string;
  /** 反色文字（深色背景上使用） */
  textInverse: string;
  
  /** 主要背景色 */
  bgPrimary: string;
  /** 次要背景色 */
  bgSecondary: string;
  /** 悬停背景色 */
  bgHover: string;
  /** 选中背景色 */
  bgSelected: string;
  
  /** 边框颜色 */
  border: string;
  /** 边框悬停颜色 */
  borderHover: string;
  /** 分割线颜色 */
  divider: string;
  
  /** 阴影颜色 */
  shadow: string;
  
  /** 节点根节点颜色 */
  nodeRoot: string;
  /** 节点分支颜色 */
  nodeBranch: string;
  /** 节点叶子颜色 */
  nodeLeaf: string;
  /** 节点选中颜色 */
  nodeSelected: string;
  /** 节点悬停颜色 */
  nodeHover: string;
  
  /** 边线颜色 */
  edge: string;
  /** 边线箭头颜色 */
  edgeArrow: string;
}

/** 主题方案 */
export interface ThemePreset {
  /** 主题 ID */
  id: string;
  /** 主题名称 */
  name: string;
  /** 主题描述 */
  description: string;
  /** 是否为深色模式 */
  isDark: boolean;
  /** 主题配色 */
  colors: ThemeColors;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 预设主题
// ═══════════════════════════════════════════════════════════════════════════════

/** 默认主题 - 清新蓝 */
const DEFAULT_THEME: ThemePreset = {
  id: 'ocean-blue',
  name: '海洋蓝',
  description: '清新专业的蓝色系配色，适合长时间阅读',
  isDark: false,
  colors: {
    primary: '#1890ff',
    primaryLight: '#e6f7ff',
    primaryDark: '#096dd9',
    success: '#52c41a',
    successLight: '#f6ffed',
    warning: '#faad14',
    warningLight: '#fffbe6',
    warningDark: '#d48806',
    error: '#ff4d4f',
    errorLight: '#fff2f0',
    info: '#1890ff',
    infoLight: '#e6f7ff',
    textPrimary: '#262626',
    textSecondary: '#595959',
    textMuted: '#8c8c8c',
    textInverse: '#ffffff',
    bgPrimary: '#ffffff',
    bgSecondary: '#fafafa',
    bgHover: '#f5f5f5',
    bgSelected: '#e6f7ff',
    border: '#d9d9d9',
    borderHover: '#40a9ff',
    divider: '#f0f0f0',
    shadow: 'rgba(0, 0, 0, 0.08)',
    nodeRoot: '#1890ff',
    nodeBranch: '#13c2c2',
    nodeLeaf: '#36cfc9',
    nodeSelected: '#1890ff',
    nodeHover: '#40a9ff',
    edge: '#b7b7b7',
    edgeArrow: '#8c8c8c',
  },
};

/** 预设主题列表 */
export const THEME_PRESETS: ThemePreset[] = [
  DEFAULT_THEME,
  {
    id: 'forest-green',
    name: '森林绿',
    description: '自然舒适的绿色系配色，护眼宜人',
    isDark: false,
    colors: {
      primary: '#52c41a',
      primaryLight: '#f6ffed',
      primaryDark: '#389e0d',
      success: '#52c41a',
      successLight: '#f6ffed',
      warning: '#faad14',
      warningLight: '#fffbe6',
      error: '#ff4d4f',
      errorLight: '#fff2f0',
      info: '#13c2c2',
      infoLight: '#e6fffb',
      textPrimary: '#262626',
      textSecondary: '#595959',
      textMuted: '#8c8c8c',
      textInverse: '#ffffff',
      bgPrimary: '#ffffff',
      bgSecondary: '#fafafa',
      bgHover: '#f6ffed',
      bgSelected: '#d9f7be',
      border: '#d9d9d9',
      borderHover: '#52c41a',
      divider: '#f0f0f0',
      shadow: 'rgba(0, 0, 0, 0.08)',
      nodeRoot: '#52c41a',
      nodeBranch: '#73d13d',
      nodeLeaf: '#95de64',
      nodeSelected: '#52c41a',
      nodeHover: '#73d13d',
      edge: '#b7eb8f',
      edgeArrow: '#52c41a',
    },
  },
  {
    id: 'sunset-orange',
    name: '日落橙',
    description: '温暖活力的橙色调配色，激发创意',
    isDark: false,
    colors: {
      primary: '#fa8c16',
      primaryLight: '#fff7e6',
      primaryDark: '#d46b08',
      success: '#52c41a',
      successLight: '#f6ffed',
      warning: '#faad14',
      warningLight: '#fffbe6',
      error: '#ff4d4f',
      errorLight: '#fff2f0',
      info: '#1890ff',
      infoLight: '#e6f7ff',
      textPrimary: '#262626',
      textSecondary: '#595959',
      textMuted: '#8c8c8c',
      textInverse: '#ffffff',
      bgPrimary: '#ffffff',
      bgSecondary: '#fafafa',
      bgHover: '#fff7e6',
      bgSelected: '#ffd591',
      border: '#d9d9d9',
      borderHover: '#fa8c16',
      divider: '#f0f0f0',
      shadow: 'rgba(0, 0, 0, 0.08)',
      nodeRoot: '#fa8c16',
      nodeBranch: '#ffa940',
      nodeLeaf: '#ffc069',
      nodeSelected: '#fa8c16',
      nodeHover: '#ffa940',
      edge: '#ffbb96',
      edgeArrow: '#fa8c16',
    },
  },
  {
    id: 'grape-purple',
    name: '葡萄紫',
    description: '优雅神秘的紫色系配色，彰显品味',
    isDark: false,
    colors: {
      primary: '#722ed1',
      primaryLight: '#f9f0ff',
      primaryDark: '#531dab',
      success: '#52c41a',
      successLight: '#f6ffed',
      warning: '#faad14',
      warningLight: '#fffbe6',
      error: '#ff4d4f',
      errorLight: '#fff2f0',
      info: '#1890ff',
      infoLight: '#e6f7ff',
      textPrimary: '#262626',
      textSecondary: '#595959',
      textMuted: '#8c8c8c',
      textInverse: '#ffffff',
      bgPrimary: '#ffffff',
      bgSecondary: '#fafafa',
      bgHover: '#f9f0ff',
      bgSelected: '#d3adf7',
      border: '#d9d9d9',
      borderHover: '#722ed1',
      divider: '#f0f0f0',
      shadow: 'rgba(0, 0, 0, 0.08)',
      nodeRoot: '#722ed1',
      nodeBranch: '#9254de',
      nodeLeaf: '#b37feb',
      nodeSelected: '#722ed1',
      nodeHover: '#9254de',
      edge: '#d3adf7',
      edgeArrow: '#722ed1',
    },
  },
  {
    id: 'dark-night',
    name: '暗夜黑',
    description: '深色模式配色，降低眼睛疲劳',
    isDark: true,
    colors: {
      primary: '#177ddc',
      primaryLight: '#111d2c',
      primaryDark: '#0e5db7',
      success: '#49aa19',
      successLight: '#162312',
      warning: '#d89614',
      warningLight: '#2b2111',
      error: '#d32029',
      errorLight: '#2a1215',
      info: '#177ddc',
      infoLight: '#111d2c',
      textPrimary: '#ffffff',
      textSecondary: '#a6a6a6',
      textMuted: '#595959',
      textInverse: '#262626',
      bgPrimary: '#141414',
      bgSecondary: '#1f1f1f',
      bgHover: '#262626',
      bgSelected: '#111d2c',
      border: '#434343',
      borderHover: '#177ddc',
      divider: '#303030',
      shadow: 'rgba(0, 0, 0, 0.45)',
      nodeRoot: '#177ddc',
      nodeBranch: '#2082a0',
      nodeLeaf: '#3c89a8',
      nodeSelected: '#177ddc',
      nodeHover: '#3c89a8',
      edge: '#434343',
      edgeArrow: '#595959',
    },
  },
  {
    id: 'ink-wash',
    name: '水墨灰',
    description: '简约中性的灰色系配色，专注内容',
    isDark: false,
    colors: {
      primary: '#595959',
      primaryLight: '#fafafa',
      primaryDark: '#262626',
      success: '#52c41a',
      successLight: '#f6ffed',
      warning: '#faad14',
      warningLight: '#fffbe6',
      error: '#ff4d4f',
      errorLight: '#fff2f0',
      info: '#8c8c8c',
      infoLight: '#fafafa',
      textPrimary: '#262626',
      textSecondary: '#595959',
      textMuted: '#8c8c8c',
      textInverse: '#ffffff',
      bgPrimary: '#ffffff',
      bgSecondary: '#fafafa',
      bgHover: '#f5f5f5',
      bgSelected: '#e8e8e8',
      border: '#d9d9d9',
      borderHover: '#595959',
      divider: '#f0f0f0',
      shadow: 'rgba(0, 0, 0, 0.06)',
      nodeRoot: '#595959',
      nodeBranch: '#8c8c8c',
      nodeLeaf: '#bfbfbf',
      nodeSelected: '#262626',
      nodeHover: '#595959',
      edge: '#d9d9d9',
      edgeArrow: '#8c8c8c',
    },
  },
  {
    id: 'rose-pink',
    name: '玫瑰粉',
    description: '浪漫柔和的粉色系配色，温柔优雅',
    isDark: false,
    colors: {
      primary: '#eb2f96',
      primaryLight: '#fff0f6',
      primaryDark: '#c41d7f',
      success: '#52c41a',
      successLight: '#f6ffed',
      warning: '#faad14',
      warningLight: '#fffbe6',
      error: '#ff4d4f',
      errorLight: '#fff2f0',
      info: '#1890ff',
      infoLight: '#e6f7ff',
      textPrimary: '#262626',
      textSecondary: '#595959',
      textMuted: '#8c8c8c',
      textInverse: '#ffffff',
      bgPrimary: '#ffffff',
      bgSecondary: '#fafafa',
      bgHover: '#fff0f6',
      bgSelected: '#ffadd2',
      border: '#d9d9d9',
      borderHover: '#eb2f96',
      divider: '#f0f0f0',
      shadow: 'rgba(0, 0, 0, 0.08)',
      nodeRoot: '#eb2f96',
      nodeBranch: '#f759ab',
      nodeLeaf: '#ff85c0',
      nodeSelected: '#eb2f96',
      nodeHover: '#f759ab',
      edge: '#ffadd2',
      edgeArrow: '#eb2f96',
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Store 定义
// ═══════════════════════════════════════════════════════════════════════════════

interface ThemeStore {
  /** 当前主题 ID */
  currentThemeId: string;
  /** 是否使用自定义配色 */
  useCustomColors: boolean;
  /** 自定义配色 */
  customColors: ThemeColors;
  
  /** 获取当前配色 */
  getCurrentColors: () => ThemeColors;
  /** 获取当前主题预设 */
  getCurrentPreset: () => ThemePreset;
  /** 切换主题 */
  setTheme: (themeId: string) => void;
  /** 更新自定义配色 */
  updateCustomColors: (colors: Partial<ThemeColors>) => void;
  /** 开启/关闭自定义配色 */
  setUseCustomColors: (use: boolean) => void;
  /** 重置为默认主题 */
  resetToDefault: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      currentThemeId: 'ocean-blue',
      useCustomColors: false,
      customColors: DEFAULT_THEME.colors,
      
      getCurrentColors: () => {
        const state = get();
        if (state.useCustomColors) {
          return state.customColors;
        }
        const preset = THEME_PRESETS.find(t => t.id === state.currentThemeId);
        return preset?.colors || DEFAULT_THEME.colors;
      },
      
      getCurrentPreset: () => {
        const state = get();
        const preset = THEME_PRESETS.find(t => t.id === state.currentThemeId);
        return preset || DEFAULT_THEME;
      },
      
      setTheme: (themeId: string) => {
        const preset = THEME_PRESETS.find(t => t.id === themeId);
        if (preset) {
          set({
            currentThemeId: themeId,
            useCustomColors: false,
          });
          // 应用主题到 CSS 变量
          applyThemeToCSS(preset.colors);
        }
      },
      
      updateCustomColors: (colors: Partial<ThemeColors>) => {
        set((state) => ({
          customColors: { ...state.customColors, ...colors },
        }));
        // 应用更新后的配色
        const state = get();
        if (state.useCustomColors) {
          applyThemeToCSS(state.customColors);
        }
      },
      
      setUseCustomColors: (use: boolean) => {
        set({ useCustomColors: use });
        const state = get();
        if (use) {
          applyThemeToCSS(state.customColors);
        } else {
          const preset = THEME_PRESETS.find(t => t.id === state.currentThemeId);
          if (preset) {
            applyThemeToCSS(preset.colors);
          }
        }
      },
      
      resetToDefault: () => {
        set({
          currentThemeId: 'ocean-blue',
          useCustomColors: false,
          customColors: DEFAULT_THEME.colors,
        });
        applyThemeToCSS(DEFAULT_THEME.colors);
      },
    }),
    {
      name: 'mindmap-theme',
      onRehydrateStorage: () => (state) => {
        // 从存储恢复时应用主题
        if (state) {
          if (state.useCustomColors) {
            applyThemeToCSS(state.customColors);
          } else {
            const preset = THEME_PRESETS.find(t => t.id === state.currentThemeId);
            if (preset) {
              applyThemeToCSS(preset.colors);
            }
          }
        }
      },
    }
  )
);

// ═══════════════════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════════════════

/** 将主题配色应用到 CSS 变量 */
export function applyThemeToCSS(colors: ThemeColors): void {
  const root = document.documentElement;
  
  // 品牌色
  root.style.setProperty('--primary-color', colors.primary);
  root.style.setProperty('--primary-light', colors.primaryLight);
  root.style.setProperty('--primary-dark', colors.primaryDark);
  
  // 功能色
  root.style.setProperty('--success-color', colors.success);
  root.style.setProperty('--success-light', colors.successLight);
  root.style.setProperty('--warning-color', colors.warning);
  root.style.setProperty('--warning-light', colors.warningLight);
  root.style.setProperty('--error-color', colors.error);
  root.style.setProperty('--error-light', colors.errorLight);
  root.style.setProperty('--info-color', colors.info);
  root.style.setProperty('--info-light', colors.infoLight);
  
  // 文字色
  root.style.setProperty('--text-primary', colors.textPrimary);
  root.style.setProperty('--text-secondary', colors.textSecondary);
  root.style.setProperty('--text-muted', colors.textMuted);
  root.style.setProperty('--text-inverse', colors.textInverse);
  
  // 背景色
  root.style.setProperty('--bg-primary', colors.bgPrimary);
  root.style.setProperty('--bg-secondary', colors.bgSecondary);
  root.style.setProperty('--bg-hover', colors.bgHover);
  root.style.setProperty('--bg-selected', colors.bgSelected);
  
  // 边框色
  root.style.setProperty('--border-color', colors.border);
  root.style.setProperty('--border-hover', colors.borderHover);
  root.style.setProperty('--divider-color', colors.divider);
  
  // 阴影
  root.style.setProperty('--shadow-color', colors.shadow);
  
  // 节点色
  root.style.setProperty('--node-root', colors.nodeRoot);
  root.style.setProperty('--node-branch', colors.nodeBranch);
  root.style.setProperty('--node-leaf', colors.nodeLeaf);
  root.style.setProperty('--node-selected', colors.nodeSelected);
  root.style.setProperty('--node-hover', colors.nodeHover);
  
  // 边线色
  root.style.setProperty('--edge-color', colors.edge);
  root.style.setProperty('--edge-arrow', colors.edgeArrow);
  
  console.log('[Theme] 主题配色已应用');
}

/** 初始化主题（应用启动时调用） */
export function initializeTheme(): void {
  const state = useThemeStore.getState();
  if (state.useCustomColors) {
    applyThemeToCSS(state.customColors);
  } else {
    const preset = THEME_PRESETS.find(t => t.id === state.currentThemeId);
    if (preset) {
      applyThemeToCSS(preset.colors);
    }
  }
}
