/**
 * 元素工具栏组件
 * 
 * 显示可拖拽的基础元素模板
 */

import React from 'react';
import { Tooltip } from 'antd';
import type { BaseElementType } from '../../types/customNode';
import { ELEMENT_TEMPLATES } from '../../types/customNode';
import styles from './ElementToolbar.module.css';

interface ElementToolbarProps {
  onAddElement: (type: BaseElementType, x: number, y: number) => void;
}

const ElementToolbar: React.FC<ElementToolbarProps> = ({ onAddElement }) => {
  const handleDragStart = (e: React.DragEvent, type: BaseElementType) => {
    e.dataTransfer.setData('elementType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };
  
  const handleClick = (type: BaseElementType) => {
    // 点击时在画布中心添加元素
    onAddElement(type, 20, 20);
  };
  
  return (
    <div className={styles.toolbar}>
      <div className={styles.title}>元素</div>
      <div className={styles.elementList}>
        {ELEMENT_TEMPLATES.map((template) => (
          <Tooltip key={template.type} title={template.name} placement="right">
            <div
              className={styles.elementItem}
              draggable
              onDragStart={(e) => handleDragStart(e, template.type)}
              onClick={() => handleClick(template.type)}
            >
              <span className={styles.elementIcon}>{template.icon}</span>
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};

export default ElementToolbar;
