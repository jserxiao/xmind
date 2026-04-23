/**
 * ColorInput - 颜色输入组件
 * 
 * 提供颜色选择器和文本输入
 */

import React from 'react';

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
  <div className="config-row">
    <span className="config-label">{label}</span>
    <div className="config-color-wrapper">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="config-color-input"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="config-text-input"
        placeholder="#000000"
      />
    </div>
  </div>
);

export default ColorInput;
