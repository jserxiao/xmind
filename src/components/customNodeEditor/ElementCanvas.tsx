/**
 * 元素画布组件
 * 
 * 显示和编辑自定义节点的元素
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import type { BaseElement, BaseElementType } from '../../types/customNode';
import styles from './ElementCanvas.module.css';

interface ElementCanvasProps {
  width: number;
  height: number;
  elements: BaseElement[];
  selectedElementId: string | null;
  defaultFill: string;
  defaultStroke: string;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<BaseElement>) => void;
  onAddElement: (type: BaseElementType, x: number, y: number) => void;
}

const ElementCanvas: React.FC<ElementCanvasProps> = ({
  width,
  height,
  elements,
  selectedElementId,
  defaultFill,
  defaultStroke,
  onSelectElement,
  onUpdateElement,
  onAddElement,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragElementId, setDragElementId] = useState<string | null>(null);
  
  // ── 拖拽放置 ──
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('elementType') as BaseElementType;
    if (!type || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    onAddElement(type, x, y);
  };
  
  // ── 元素拖拽移动 ──
  const handleElementMouseDown = (e: React.MouseEvent, element: BaseElement) => {
    e.stopPropagation();
    onSelectElement(element.id);
    
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    
    setDragOffset({
      x: e.clientX - canvasRect.left - element.x,
      y: e.clientY - canvasRect.top - element.y,
    });
    setDragElementId(element.id);
    setIsDragging(true);
  };
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragElementId || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(width - 10, e.clientX - rect.left - dragOffset.x));
    const y = Math.max(0, Math.min(height - 10, e.clientY - rect.top - dragOffset.y));
    
    onUpdateElement(dragElementId, { x: Math.round(x), y: Math.round(y) });
  }, [isDragging, dragElementId, dragOffset, width, height, onUpdateElement]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragElementId(null);
  }, []);
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // ── 点击空白处取消选择 ──
  const handleCanvasClick = (e: React.MouseEvent) => {
    // 只有直接点击画布时才取消选择（不是点击元素后冒泡）
    if (e.target === e.currentTarget) {
      onSelectElement(null);
    }
  };
  
  // ── 渲染单个元素 ──
  const renderElement = (element: BaseElement) => {
    const isSelected = element.id === selectedElementId;
    const commonStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      cursor: isDragging && dragElementId === element.id ? 'grabbing' : 'grab',
    };
    
    switch (element.type) {
      case 'rect':
        return (
          <div
            key={element.id}
            className={`${styles.element} ${isSelected ? styles.selected : ''}`}
            style={{
              ...commonStyle,
              width: element.width,
              height: element.height,
              backgroundColor: element.fill || defaultFill,
              border: `${element.strokeWidth || 1}px solid ${element.stroke || defaultStroke}`,
              borderRadius: element.radius || 0,
              opacity: element.opacity ?? 1,
            }}
            onMouseDown={(e) => handleElementMouseDown(e, element)}
          />
        );
        
      case 'circle':
        return (
          <div
            key={element.id}
            className={`${styles.element} ${isSelected ? styles.selected : ''}`}
            style={{
              ...commonStyle,
              width: element.width,
              height: element.height,
              backgroundColor: element.fill || defaultFill,
              border: `${element.strokeWidth || 1}px solid ${element.stroke || defaultStroke}`,
              borderRadius: '50%',
              opacity: element.opacity ?? 1,
            }}
            onMouseDown={(e) => handleElementMouseDown(e, element)}
          />
        );
        
      case 'ellipse':
        return (
          <div
            key={element.id}
            className={`${styles.element} ${isSelected ? styles.selected : ''}`}
            style={{
              ...commonStyle,
              width: element.width,
              height: element.height,
              backgroundColor: element.fill || defaultFill,
              border: `${element.strokeWidth || 1}px solid ${element.stroke || defaultStroke}`,
              borderRadius: '50%',
              opacity: element.opacity ?? 1,
            }}
            onMouseDown={(e) => handleElementMouseDown(e, element)}
          />
        );
        
      case 'text':
        return (
          <div
            key={element.id}
            className={`${styles.element} ${isSelected ? styles.selected : ''}`}
            style={{
              ...commonStyle,
              fontSize: element.fontSize || 12,
              color: element.fontColor || '#262626',
              opacity: element.opacity ?? 1,
              whiteSpace: 'nowrap',
            }}
            onMouseDown={(e) => handleElementMouseDown(e, element)}
          >
            {element.text || '文本'}
          </div>
        );
        
      case 'icon':
        return (
          <div
            key={element.id}
            className={`${styles.element} ${isSelected ? styles.selected : ''}`}
            style={{
              ...commonStyle,
              fontSize: element.iconSize || 16,
              opacity: element.opacity ?? 1,
            }}
            onMouseDown={(e) => handleElementMouseDown(e, element)}
          >
            {element.icon || '⭐'}
          </div>
        );
        
      case 'line':
        return (
          <div
            key={element.id}
            className={`${styles.element} ${isSelected ? styles.selected : ''}`}
            style={{
              ...commonStyle,
              width: element.width,
              height: element.strokeWidth || 1,
              backgroundColor: element.stroke || defaultStroke,
              opacity: element.opacity ?? 1,
            }}
            onMouseDown={(e) => handleElementMouseDown(e, element)}
          />
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className={styles.canvasContainer}>
      <div
        ref={canvasRef}
        className={styles.canvas}
        style={{
          width,
          height,
          backgroundColor: defaultFill,
          borderColor: defaultStroke,
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleCanvasClick}
      >
        {elements.map(renderElement)}
        
        {/* 尺寸提示 */}
        <div className={styles.sizeHint}>
          {width} × {height}
        </div>
      </div>
    </div>
  );
};

export default ElementCanvas;
