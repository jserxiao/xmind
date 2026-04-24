/**
 * HistoryPanel - 历史记录面板组件
 * 
 * 显示操作历史列表,支持:
 * - 可视化历史记录时间线
 * - 点击跳转到指定历史状态
 * - 显示操作详情
 * - 清空历史记录
 */

import React, { useState } from 'react';
import { Button, Tooltip, Popconfirm, Tag, message } from 'antd';
import { 
  UndoOutlined, 
  RedoOutlined, 
  DeleteOutlined, 
  ClockCircleOutlined
} from '@ant-design/icons';
import { useHistoryStore } from '../store/historyStore';
import { useRoadmapStore } from '../store/roadmapStore';
import { EMOJI } from '../constants/icons';
import HistoryItem from './historyPanel/HistoryItem';
import CurrentStateIndicator from './historyPanel/CurrentStateIndicator';

interface HistoryPanelProps {
  onJumpToHistory?: (tree: any) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ onJumpToHistory }) => {
  const { 
    past, 
    future, 
    undo, 
    redo,
    clearHistory,
    canUndo,
    canRedo,
    isProcessing,
    jumpToHistory: jumpToHistoryStore
  } = useHistoryStore();

  const getMdBasePath = useRoadmapStore((state) => state.getMdBasePath);

  const [jumpingIndex, setJumpingIndex] = useState<number | null>(null);

  // 格式化时间戳
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 撤销操作
  const handleUndo = async () => {
    if (isProcessing || !canUndo()) return;
    
    const hideLoading = message.loading('正在撤销...', 0);
    
    try {
      const previousTree = await undo();
      
      if (previousTree) {
        onJumpToHistory?.(previousTree);
        message.success('已撤销操作');
      }
    } catch (error) {
      console.error('撤销失败:', error);
      message.error('撤销失败');
    } finally {
      hideLoading();
    }
  };

  // 重做操作
  const handleRedo = async () => {
    if (isProcessing || !canRedo()) return;
    
    const hideLoading = message.loading('正在重做...', 0);
    
    try {
      const nextTree = await redo();
      
      if (nextTree) {
        onJumpToHistory?.(nextTree);
        message.success('已重做操作');
      }
    } catch (error) {
      console.error('重做失败:', error);
      message.error('重做失败');
    } finally {
      hideLoading();
    }
  };

  // 跳转到指定历史状态
  const jumpToHistory = async (targetIndex: number, type: 'past' | 'future') => {
    if (isProcessing) return;
    
    setJumpingIndex(targetIndex);
    const hideLoading = message.loading('正在跳转...', 0);
    
    try {
      const mdBasePath = getMdBasePath();
      const roadmapPath = mdBasePath.split('/').pop() || '';
      
      const targetTree = await jumpToHistoryStore(targetIndex, type, roadmapPath);
      
      if (targetTree) {
        onJumpToHistory?.(targetTree);
        message.success('已跳转到该操作');
      } else {
        message.error('跳转失败');
      }
    } catch (error) {
      console.error('跳转失败:', error);
      message.error('跳转失败');
    } finally {
      hideLoading();
      setJumpingIndex(null);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
      {/* 工具栏 */}
      <div style={{ 
        padding: '16px', 
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
      }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <Tooltip title="撤销 (Ctrl+Z)">
            <Button 
              style={{ flex: 1, height: '36px', borderRadius: '6px' }}
              icon={<UndoOutlined />}
              onClick={handleUndo}
              disabled={!canUndo() || isProcessing}
            >
              撤销
            </Button>
          </Tooltip>
          <Tooltip title="重做 (Ctrl+Y)">
            <Button 
              style={{ flex: 1, height: '36px', borderRadius: '6px' }}
              icon={<RedoOutlined />}
              onClick={handleRedo}
              disabled={!canRedo() || isProcessing}
            >
              重做
            </Button>
          </Tooltip>
        </div>
        
        {/* 统计信息 */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          padding: '12px',
          background: '#fafafa',
          borderRadius: '6px',
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#1890ff' }}>{past.length}</div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>可撤销</div>
          </div>
          <div style={{ width: '1px', background: '#e8e8e8' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#52c41a' }}>{future.length}</div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>可重做</div>
          </div>
        </div>
      </div>

      {/* 历史记录列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {past.length === 0 && future.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            padding: '40px 20px',
          }}>
            <ClockCircleOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
            <div style={{ fontSize: '14px', color: '#8c8c8c', textAlign: 'center' }}>
              暂无历史记录<br />
              <span style={{ fontSize: '12px', color: '#bfbfbf' }}>操作后将在这里显示</span>
            </div>
          </div>
        ) : (
          <>
            {/* 未来记录(重做栈) */}
            {future.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, #f0f5ff 0%, #d6e4ff 100%)',
                  borderRadius: '6px',
                  border: '1px solid #adc6ff',
                }}>
                  <RedoOutlined style={{ color: '#2f54eb', fontSize: '14px' }} />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#1d39c4' }}>
                    可重做的操作
                  </span>
                  <Tag 
                    color="blue" 
                    style={{ 
                      margin: 0, 
                      marginLeft: 'auto',
                      fontSize: '11px',
                      padding: '0 6px',
                      height: '18px',
                      lineHeight: '18px',
                    }}
                  >
                    {future.length}
                  </Tag>
                </div>
                {future.slice().reverse().map((item, index) => {
                  const actualIndex = future.length - 1 - index;
                  return (
                    <HistoryItem
                      key={`future-${actualIndex}`}
                      item={item}
                      type="future"
                      isLatest={false}
                      isProcessing={isProcessing}
                      isJumping={jumpingIndex === actualIndex}
                      actualIndex={actualIndex}
                      formatTime={formatTime}
                      onJump={jumpToHistory}
                    />
                  );
                })}
              </div>
            )}

            {/* 当前状态 */}
            <CurrentStateIndicator />

            {/* 过去记录(撤销栈) */}
            {past.length > 0 && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                  borderRadius: '6px',
                  border: '1px solid #b7eb8f',
                }}>
                  <UndoOutlined style={{ color: '#52c41a', fontSize: '14px' }} />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#389e0d' }}>
                    操作历史
                  </span>
                  <Tag 
                    color="green" 
                    style={{ 
                      margin: 0, 
                      marginLeft: 'auto',
                      fontSize: '11px',
                      padding: '0 6px',
                      height: '18px',
                      lineHeight: '18px',
                    }}
                  >
                    {past.length}
                  </Tag>
                </div>
                {past.slice().reverse().map((item, index) => (
                  <HistoryItem
                    key={`past-${index}`}
                    item={item}
                    type="past"
                    isLatest={index === 0}
                    isProcessing={isProcessing}
                    isJumping={jumpingIndex === index}
                    actualIndex={index}
                    formatTime={formatTime}
                    onJump={jumpToHistory}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 底部工具栏 */}
      {(past.length > 0 || future.length > 0) && (
        <div style={{ 
          padding: '12px 16px', 
          background: '#fff',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            {EMOJI.LIGHTBULB} 点击按钮可跳转到该历史状态
          </div>
          <Popconfirm
            title="清空历史记录"
            description="确定要清空所有历史记录吗？"
            onConfirm={clearHistory}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button 
              size="small"
              danger 
              icon={<DeleteOutlined />}
              disabled={isProcessing}
              style={{ fontSize: '12px' }}
            >
              清空全部
            </Button>
          </Popconfirm>
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
