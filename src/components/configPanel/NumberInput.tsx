/**
 * NumberInput - 数字输入组件
 * 
 * 提供数字输入功能
 */

import React from 'react';
import styles from '../../styles/ConfigPanel.module.css';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * 数字输入组件
 * 支持最小值、最大值和步长设置
 */
const NumberInput: React.FC<NumberInputProps> = ({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 1000, 
  step = 1 
}) => (
  <div className={styles.configRow}>
    <span className={styles.configLabel}>{label}</span>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      className={styles.configNumberInput}
    />
  </div>
);

export default NumberInput;
