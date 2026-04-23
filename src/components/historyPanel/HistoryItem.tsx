/**
 * HistoryItem - 历史记录项组件
 * 
 * 显示单个历史记录操作
 */

import React from 'react';
import { Button, Tag, Tooltip } from 'antd';
import { 
  ClockCircleOutlined,
  RollbackOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteFilled,
  SortAscendingOutlined,
  FileTextOutlined
} from '@ant-design/icons';

interface HistoryItemProps {
  item: {
    description: string;
    timestamp: number;
    deletedFiles?: { path: string; content: string }[];
  };
  type: 'past' | 'future';
  isLatest: boolean;
  isProcessing: boolean;
  isJumping: boolean;
  actualIndex: number;
  formatTime: (timestamp: number) => string;
  onJump: (index: number, type: 'past' | 'future') => void;
}

// 获取操作图标和颜色
const getOperationInfo = (description: string) => {
  if (description.includes('添加') || description.includes('创建')) {
    return { 
      icon: <PlusOutlined />, 
      color: '#52c41a',
      bgColor: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
      borderColor: '#b7eb8f'
    };
  }
  if (description.includes('删除')) {
    return { 
      icon: <DeleteFilled />, 
      color: '#ff4d4f',
      bgColor: 'linear-gradient(135deg, #fff2f0 0%, #ffccc7 100%)',
      borderColor: '#ffa39e'
    };
  }
  if (description.includes('编辑') || description.includes('更新') || description.includes('保存')) {
    return { 
      icon: <EditOutlined />, 
      color: '#1890ff',
      bgColor: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
      borderColor: '#91d5ff'
    };
  }
  if (description.includes('排序')) {
    return { 
      icon: <SortAscendingOutlined />, 
      color: '#fa8c16',
      bgColor: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)',
      borderColor: '#ffc069'
    };
  }
  return { 
    icon: <FileTextOutlined />, 
    color: '#722ed1',
    bgColor: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)',
    borderColor: '#d3adf7'
  };
};

/**
 * 历史记录项组件
 * 显示时间线和操作卡片
 */
const HistoryItem: React.FC<HistoryItemProps> = ({
  item,
  type,
  isLatest,
  isProcessing,
  isJumping,
  actualIndex,
  formatTime,
  onJump,
}) => {
  const opInfo = getOperationInfo(item.description.replace('重做: ', ''));

  return (
    <div
      style={{
        position: 'relative',
        marginBottom: '16px',
        opacity: type === 'future' ? 0.7 : 1,
        transition: 'all 0.3s ease',
      }}
    >
      {/* 时间线节点 */}
      <div
        style={{
          position: 'absolute',
          left: '20px',
          top: '20px',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: isLatest && type === 'past' ? opInfo.bgColor : '#fff',
          border: `2px solid ${isLatest && type === 'past' ? opInfo.borderColor : '#d9d9d9'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isLatest && type === 'past' ? opInfo.color : '#8c8c8c',
          fontSize: '14px',
          zIndex: 2,
          boxShadow: isLatest && type === 'past' ? `0 2px 8px ${opInfo.color}40` : '0 2px 4px rgba(0,0,0,0.08)',
        }}
      >
        {opInfo.icon}
      </div>

      {/* 时间线 */}
      <div
        style={{
          position: 'absolute',
          left: '35px',
          top: '52px',
          width: '2px',
          height: 'calc(100% + 16px)',
          background: 'linear-gradient(to bottom, #d9d9d9, transparent)',
        }}
      />

      {/* 内容卡片 */}
      <div
        style={{
          marginLeft: '60px',
          padding: '12px 16px',
          background: isLatest && type === 'past' ? opInfo.bgColor : '#fff',
          border: `1px solid ${isLatest && type === 'past' ? opInfo.borderColor : '#f0f0f0'}`,
          borderRadius: '8px',
          boxShadow: isLatest && type === 'past' 
            ? `0 4px 12px ${opInfo.color}20` 
            : '0 2px 8px rgba(0,0,0,0.06)',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!isJumping && !isProcessing) {
            e.currentTarget.style.transform = 'translateX(4px)';
            e.currentTarget.style.boxShadow = isLatest && type === 'past'
              ? `0 6px 16px ${opInfo.color}30`
              : '0 4px 12px rgba(0,0,0,0.1)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.boxShadow = isLatest && type === 'past'
            ? `0 4px 12px ${opInfo.color}20`
            : '0 2px 8px rgba(0,0,0,0.06)';
        }}
      >
        {/* 顶部信息 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '13px',
              fontWeight: 500,
              color: opInfo.color,
            }}>
              {item.description.replace('重做: ', '')}
            </span>
            {isLatest && type === 'past' && (
              <Tag 
                color="green"
                style={{ 
                  margin: 0,
                  fontSize: '11px',
                  padding: '0 6px',
                  height: '18px',
                  lineHeight: '18px',
                }}
              >
                最新
              </Tag>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8c8c8c', fontSize: '12px' }}>
            <ClockCircleOutlined style={{ fontSize: '12px' }} />
            <span>{formatTime(item.timestamp)}</span>
          </div>
        </div>

        {/* 底部信息 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {item.deletedFiles && item.deletedFiles.length > 0 && (
              <Tooltip title={`涉及 ${item.deletedFiles.length} 个文件`}>
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  color: '#8c8c8c',
                  fontSize: '12px',
                }}>
                  <FileTextOutlined style={{ fontSize: '12px' }} />
                  {item.deletedFiles.length} 文件
                </span>
              </Tooltip>
            )}
          </div>
          
          <Button
            type="primary"
            size="small"
            icon={<RollbackOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onJump(actualIndex, type);
            }}
            disabled={isProcessing}
            loading={isJumping}
            style={{
              fontSize: '12px',
              height: '24px',
              borderRadius: '4px',
            }}
          >
            回到此操作
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HistoryItem;
