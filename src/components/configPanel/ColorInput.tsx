/**
 * ColorInput - 颜色输入组件
 * 
 * 提供颜色选择器和文本输入
 */

import React from 'react';
import styles from '../../styles/ConfigPanel.module.css';

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * 颜色输入组件
 * 支持颜色选择器和十六进制输入
 */
const ColorInput: React.FC<ColorInputProps> = ({ label, value, onChange }) => (
  <div className={styles.configRow}>
    <span className={styles.configLabel}>{label}</span>
    <div className={styles.configColorWrapper}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.configColorInput}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.configTextInput}
        placeholder="#000000"
      />
    </div>
  </div>
);

export default ColorInput;
