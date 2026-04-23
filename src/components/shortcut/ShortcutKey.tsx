/**
 * ShortcutKey - 快捷键按键组件
 * 
 * 渲染逼真的按键效果
 */

import React from 'react';
import { Typography } from 'antd';
import { formatShortcut } from '../../store/shortcutStore';

const { Text } = Typography;

interface ShortcutKeyProps {
  /** 快捷键字符串 (如 'ctrl+z') */
  shortcutKey: string;
  /** 是否可编辑 */
  editable?: boolean;
  /** 点击回调 */
  onClick?: () => void;
}

/**
 * 快捷键按键组件
 * 提供逼真的3D按键效果
 */
const ShortcutKey: React.FC<ShortcutKeyProps> = ({ 
  shortcutKey, 
  editable = false,
  onClick 
}) => {
  // 将快捷键拆分为多个按键
  const keys = shortcutKey.split('+');
  
  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px',
        cursor: editable ? 'pointer' : 'default'
      }}
      onClick={editable ? onClick : undefined}
    >
      {keys.map((k, index) => (
        <React.Fragment key={index}>
          <kbd
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '32px',
              height: '32px',
              padding: '4px 10px',
              fontSize: '13px',
              fontFamily: 'SFMono-Regular,Consolas,Liberation Mono,Menlo,monospace',
              lineHeight: '20px',
              color: '#24292f',
              verticalAlign: 'middle',
              backgroundColor: '#f6f8fa',
              border: '1px solid rgba(27,31,36,0.15)',
              borderRadius: '6px',
              boxShadow: '0 1px 0 rgba(27,31,36,0.04), inset 0 -1px 0 rgba(27,31,36,0.1)',
              transition: 'all 0.15s ease',
              cursor: editable ? 'pointer' : 'default',
            }}
            onMouseEnter={(e) => {
              if (!editable) return;
              const target = e.currentTarget;
              target.style.backgroundColor = '#f3f4f6';
              target.style.borderColor = 'rgba(27,31,36,0.3)';
              target.style.transform = 'translateY(-1px)';
              target.style.boxShadow = '0 2px 0 rgba(27,31,36,0.15), inset 0 -1px 0 rgba(27,31,36,0.1)';
            }}
            onMouseLeave={(e) => {
              if (!editable) return;
              const target = e.currentTarget;
              target.style.backgroundColor = '#f6f8fa';
              target.style.borderColor = 'rgba(27,31,36,0.15)';
              target.style.transform = 'translateY(0)';
              target.style.boxShadow = '0 1px 0 rgba(27,31,36,0.04), inset 0 -1px 0 rgba(27,31,36,0.1)';
            }}
            onMouseDown={(e) => {
              if (!editable) return;
              const target = e.currentTarget;
              target.style.transform = 'translateY(1px)';
              target.style.boxShadow = 'inset 0 2px 0 rgba(27,31,36,0.1)';
            }}
            onMouseUp={(e) => {
              if (!editable) return;
              const target = e.currentTarget;
              target.style.transform = 'translateY(-1px)';
              target.style.boxShadow = '0 2px 0 rgba(27,31,36,0.15), inset 0 -1px 0 rgba(27,31,36,0.1)';
            }}
          >
            {formatShortcut(k)}
          </kbd>
          {index < keys.length - 1 && (
            <Text type="secondary" style={{ fontSize: '14px', fontWeight: 'bold' }}>+</Text>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ShortcutKey;
