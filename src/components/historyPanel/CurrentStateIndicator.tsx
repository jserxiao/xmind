/**
 * CurrentStateIndicator - 当前状态指示器组件
 * 
 * 显示当前所在的历史状态
 */

import React from 'react';
import { CheckCircleOutlined } from '@ant-design/icons';

/**
 * 当前状态指示器组件
 * 高亮显示当前所在的历史状态
 */
const CurrentStateIndicator: React.FC = () => {
  return (
    <div style={{ 
      marginBottom: '24px',
      padding: '16px',
      background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
      border: '2px solid #1890ff',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(24, 144, 255, 0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: '#1890ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '20px',
        boxShadow: '0 2px 8px rgba(24, 144, 255, 0.4)',
      }}>
        <CheckCircleOutlined />
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0050b3' }}>
          当前状态
        </div>
        <div style={{ fontSize: '12px', color: '#1890ff', marginTop: '2px' }}>
          这是你当前看到的内容
        </div>
      </div>
    </div>
  );
};

export default CurrentStateIndicator;
