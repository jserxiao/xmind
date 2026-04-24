/**
 * 元素属性面板组件
 * 
 * 显示和编辑选中元素的属性
 */

import React from 'react';
import { Input, InputNumber, Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { BaseElement } from '../../types/customNode';
import styles from './ElementPropertyPanel.module.css';

interface ElementPropertyPanelProps {
  element: BaseElement | undefined;
  onUpdate: (updates: Partial<BaseElement>) => void;
  onDelete: () => void;
}

const ElementPropertyPanel: React.FC<ElementPropertyPanelProps> = ({
  element,
  onUpdate,
  onDelete,
}) => {
  if (!element) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <p>选择一个元素进行编辑</p>
          <p className={styles.hint}>从左侧拖拽元素到画布</p>
        </div>
      </div>
    );
  }
  
  const typeNames: Record<string, string> = {
    rect: '矩形',
    circle: '圆形',
    ellipse: '椭圆',
    text: '文本',
    icon: '图标',
    line: '线条',
  };
  
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>{typeNames[element.type] || element.type}</h3>
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={onDelete}
          size="small"
        />
      </div>
      
      <div className={styles.content}>
        {/* 位置 */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>位置</div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>X</label>
              <InputNumber
                value={element.x}
                onChange={(v) => onUpdate({ x: v ?? 0 })}
                size="small"
                min={0}
              />
            </div>
            <div className={styles.field}>
              <label>Y</label>
              <InputNumber
                value={element.y}
                onChange={(v) => onUpdate({ y: v ?? 0 })}
                size="small"
                min={0}
              />
            </div>
          </div>
        </div>
        
        {/* 尺寸（仅部分元素） */}
        {['rect', 'circle', 'ellipse', 'line'].includes(element.type) && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>尺寸</div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>宽</label>
                <InputNumber
                  value={element.width}
                  onChange={(v) => onUpdate({ width: v ?? 0 })}
                  size="small"
                  min={1}
                />
              </div>
              <div className={styles.field}>
                <label>高</label>
                <InputNumber
                  value={element.height}
                  onChange={(v) => onUpdate({ height: v ?? 0 })}
                  size="small"
                  min={1}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* 圆角（仅矩形） */}
        {element.type === 'rect' && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>圆角</div>
            <div className={styles.field}>
              <InputNumber
                value={element.radius}
                onChange={(v) => onUpdate({ radius: v ?? 0 })}
                size="small"
                min={0}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}
        
        {/* 颜色（非文本元素） */}
        {element.type !== 'text' && element.type !== 'icon' && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>颜色</div>
            {element.type !== 'line' && (
              <div className={styles.field}>
                <label>填充</label>
                <div className={styles.colorField}>
                  <input
                    type="color"
                    value={element.fill || '#ffffff'}
                    onChange={(e) => onUpdate({ fill: e.target.value })}
                    className={styles.colorInput}
                  />
                  <Input
                    value={element.fill || '#ffffff'}
                    onChange={(e) => onUpdate({ fill: e.target.value })}
                    size="small"
                  />
                </div>
              </div>
            )}
            <div className={styles.field}>
              <label>边框</label>
              <div className={styles.colorField}>
                <input
                  type="color"
                  value={element.stroke || '#000000'}
                  onChange={(e) => onUpdate({ stroke: e.target.value })}
                  className={styles.colorInput}
                />
                <Input
                  value={element.stroke || '#000000'}
                  onChange={(e) => onUpdate({ stroke: e.target.value })}
                  size="small"
                />
              </div>
            </div>
            <div className={styles.field}>
              <label>边框宽度</label>
              <InputNumber
                value={element.strokeWidth}
                onChange={(v) => onUpdate({ strokeWidth: v ?? 1 })}
                size="small"
                min={0}
                max={10}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}
        
        {/* 文本属性 */}
        {element.type === 'text' && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>文本</div>
            <div className={styles.field}>
              <label>内容</label>
              <Input
                value={element.text || ''}
                onChange={(e) => onUpdate({ text: e.target.value })}
                size="small"
              />
            </div>
            <div className={styles.field}>
              <label>字号</label>
              <InputNumber
                value={element.fontSize || 12}
                onChange={(v) => onUpdate({ fontSize: v ?? 12 })}
                size="small"
                min={8}
                max={72}
                style={{ width: '100%' }}
              />
            </div>
            <div className={styles.field}>
              <label>颜色</label>
              <div className={styles.colorField}>
                <input
                  type="color"
                  value={element.fontColor || '#262626'}
                  onChange={(e) => onUpdate({ fontColor: e.target.value })}
                  className={styles.colorInput}
                />
                <Input
                  value={element.fontColor || '#262626'}
                  onChange={(e) => onUpdate({ fontColor: e.target.value })}
                  size="small"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* 图标属性 */}
        {element.type === 'icon' && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>图标</div>
            <div className={styles.field}>
              <label>图标</label>
              <Input
                value={element.icon || '⭐'}
                onChange={(e) => onUpdate({ icon: e.target.value })}
                size="small"
                placeholder="输入 emoji"
              />
            </div>
            <div className={styles.field}>
              <label>大小</label>
              <InputNumber
                value={element.iconSize || 16}
                onChange={(v) => onUpdate({ iconSize: v ?? 16 })}
                size="small"
                min={8}
                max={64}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}
        
        {/* 透明度 */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>其他</div>
          <div className={styles.field}>
            <label>透明度</label>
            <InputNumber
              value={element.opacity ?? 1}
              onChange={(v) => onUpdate({ opacity: v ?? 1 })}
              size="small"
              min={0}
              max={1}
              step={0.1}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElementPropertyPanel;
