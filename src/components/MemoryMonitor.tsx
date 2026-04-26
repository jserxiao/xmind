/**
 * MemoryMonitor - 内存使用监控组件
 * 
 * 在画布右上角显示实时内存使用情况：
 * - 类似电量的进度条显示内存占用比例
 * - 显示已用内存 / 总内存数值
 * - 根据使用率变化颜色（绿->黄->红）
 */

import React, { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

interface MemoryInfo {
  /** 已用内存（MB） */
  usedMB: number;
  /** 总内存（MB） */
  totalMB: number;
  /** 使用比例（0-100） */
  percentage: number;
  /** 是否支持内存 API */
  supported: boolean;
}

interface MemoryMonitorProps {
  /** 更新间隔（毫秒），默认 2000 */
  updateInterval?: number;
  /** 是否显示详细信息 */
  showDetails?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 内存监控组件
// ═══════════════════════════════════════════════════════════════════════════════

const MemoryMonitor: React.FC<MemoryMonitorProps> = ({
  updateInterval = 2000,
  showDetails = false,
}) => {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo>({
    usedMB: 0,
    totalMB: 0,
    percentage: 0,
    supported: false,
  });

  const [isExpanded, setIsExpanded] = useState(showDetails);

  /**
   * 获取内存信息
   */
  const getMemoryInfo = useCallback((): MemoryInfo => {
    // Chrome 支持 performance.memory
    const perfMemory = (performance as any).memory;
    
    if (perfMemory) {
      const usedMB = perfMemory.usedJSHeapSize / 1024 / 1024;
      const totalMB = perfMemory.jsHeapSizeLimit / 1024 / 1024;
      const percentage = Math.min(100, (usedMB / totalMB) * 100);
      
      return {
        usedMB: Math.round(usedMB * 10) / 10,
        totalMB: Math.round(totalMB),
        percentage: Math.round(percentage),
        supported: true,
      };
    }
    
    // 不支持时返回模拟数据
    // 使用 performance.memory 的 polyfill 方式估算
    if ((window as any).performance && (window as any).performance.memory === undefined) {
      // 尝试通过其他方式估算（粗略）
      const estimated = estimateMemoryUsage();
      return {
        usedMB: estimated,
        totalMB: 2048, // 假设 2GB 限制
        percentage: Math.min(100, (estimated / 2048) * 100),
        supported: false,
      };
    }
    
    return {
      usedMB: 0,
      totalMB: 0,
      percentage: 0,
      supported: false,
    };
  }, []);

  /**
   * 粗略估算内存使用（当浏览器不支持 performance.memory 时）
   */
  const estimateMemoryUsage = (): number => {
    // 这是一个非常粗略的估算
    // 基于 DOM 节点数量和其他因素
    const domNodes = document.getElementsByTagName('*').length;
    const estimatedMB = domNodes * 0.01; // 假设每个节点约 10KB
    return Math.round(estimatedMB * 10) / 10;
  };

  /**
   * 更新内存信息
   */
  const updateMemoryInfo = useCallback(() => {
    const info = getMemoryInfo();
    setMemoryInfo(info);
  }, [getMemoryInfo]);

  // 定时更新
  useEffect(() => {
    updateMemoryInfo();
    
    const interval = setInterval(updateMemoryInfo, updateInterval);
    
    return () => clearInterval(interval);
  }, [updateInterval, updateMemoryInfo]);

  /**
   * 根据使用率获取颜色
   */
  const getColorByPercentage = (percentage: number): string => {
    if (percentage < 50) return '#52c41a'; // 绿色
    if (percentage < 70) return '#faad14'; // 黄色
    if (percentage < 85) return '#fa8c16'; // 橙色
    return '#ff4d4f'; // 红色
  };

  /**
   * 获取状态图标
   */
  const getStatusIcon = (percentage: number): string => {
    if (percentage < 50) return '🟢';
    if (percentage < 70) return '🟡';
    if (percentage < 85) return '🟠';
    return '🔴';
  };

  const barColor = getColorByPercentage(memoryInfo.percentage);
  const statusIcon = getStatusIcon(memoryInfo.percentage);

  return (
    <div
      style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        padding: isExpanded ? '12px 16px' : '8px 12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        minWidth: isExpanded ? '180px' : 'auto',
      }}
      onClick={() => setIsExpanded(!isExpanded)}
      title="点击展开/收起内存详情"
    >
      {/* 简洁模式 */}
      {!isExpanded && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>{statusIcon}</span>
          
          {/* 电量条 */}
          <div
            style={{
              width: '32px',
              height: '14px',
              backgroundColor: '#f0f0f0',
              borderRadius: '3px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${memoryInfo.percentage}%`,
                height: '100%',
                backgroundColor: barColor,
                transition: 'width 0.3s ease, background-color 0.3s ease',
                borderRadius: '3px',
              }}
            />
            {/* 电量条头部的凸起 */}
            <div
              style={{
                position: 'absolute',
                right: '-2px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '3px',
                height: '6px',
                backgroundColor: '#e0e0e0',
                borderRadius: '0 1px 1px 0',
              }}
            />
          </div>
          
          <span style={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#333',
          }}>
            {memoryInfo.usedMB} MB
          </span>
        </div>
      )}

      {/* 展开模式 */}
      {isExpanded && (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>
              📊 内存使用
            </span>
            {!memoryInfo.supported && (
              <span style={{
                fontSize: '10px',
                color: '#999',
                backgroundColor: '#f5f5f5',
                padding: '2px 6px',
                borderRadius: '4px',
              }}>
                估算值
              </span>
            )}
          </div>
          
          {/* 大电量条 */}
          <div style={{ marginBottom: '8px' }}>
            <div
              style={{
                width: '100%',
                height: '20px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  width: `${memoryInfo.percentage}%`,
                  height: '100%',
                  backgroundColor: barColor,
                  transition: 'width 0.3s ease, background-color 0.3s ease',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {memoryInfo.percentage > 20 && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#fff',
                    textShadow: '0 1px 1px rgba(0,0,0,0.2)',
                  }}>
                    {memoryInfo.percentage}%
                  </span>
                )}
              </div>
              {memoryInfo.percentage <= 20 && (
                <span style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#666',
                }}>
                  {memoryInfo.percentage}%
                </span>
              )}
            </div>
          </div>
          
          {/* 详细数据 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#666',
          }}>
            <span>已用: <strong style={{ color: barColor }}>{memoryInfo.usedMB} MB</strong></span>
            <span>限制: <strong>{memoryInfo.totalMB} MB</strong></span>
          </div>
          
          {/* 提示 */}
          <div style={{
            marginTop: '8px',
            fontSize: '10px',
            color: '#999',
            textAlign: 'center',
          }}>
            点击收起
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryMonitor;
