/**
 * 自定义节点编辑器页面
 * 
 * 支持拖拽基础元素到画布中组合成自定义节点
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Input, Button, message, Popconfirm } from 'antd';
import { SaveOutlined, DeleteOutlined, CopyOutlined, ClearOutlined } from '@ant-design/icons';
import { useCustomNodeStore } from '../../store/customNodeStore';
import type { BaseElement, BaseElementType } from '../../types/customNode';
import { ELEMENT_TEMPLATES } from '../../types/customNode';
import ElementCanvas from './ElementCanvas';
import ElementToolbar from './ElementToolbar';
import ElementPropertyPanel from './ElementPropertyPanel';
import styles from './CustomNodeEditorPage.module.css';

interface CustomNodeEditorPageProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 编辑的节点 ID（可选，新建时为空） */
  nodeId?: string;
  /** 保存成功回调 */
  onSave?: (nodeId: string) => void;
}

const CustomNodeEditorPage: React.FC<CustomNodeEditorPageProps> = ({
  open,
  onClose,
  nodeId,
  onSave,
}) => {
  // ── 状态 ──
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [width, setWidth] = useState(120);
  const [height, setHeight] = useState(60);
  const [elements, setElements] = useState<BaseElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [defaultFill, setDefaultFill] = useState('#e6f7ff');
  const [defaultStroke, setDefaultStroke] = useState('#1890ff');
  
  // ── Store ──
  const addCustomNode = useCustomNodeStore((state) => state.addCustomNode);
  const updateCustomNode = useCustomNodeStore((state) => state.updateCustomNode);
  const duplicateCustomNode = useCustomNodeStore((state) => state.duplicateCustomNode);
  const customNodes = useCustomNodeStore((state) => state.customNodes);
  
  // ── 加载已有节点数据 ──
  useEffect(() => {
    if (open && nodeId) {
      const node = customNodes[nodeId];
      if (node) {
        setName(node.name);
        setDescription(node.description || '');
        setWidth(node.width);
        setHeight(node.height);
        setElements(node.elements);
        setDefaultFill(node.defaultFill || '#e6f7ff');
        setDefaultStroke(node.defaultStroke || '#1890ff');
      }
    } else if (open && !nodeId) {
      // 新建模式，重置状态
      setName('');
      setDescription('');
      setWidth(120);
      setHeight(60);
      setElements([]);
      setSelectedElementId(null);
      setDefaultFill('#e6f7ff');
      setDefaultStroke('#1890ff');
    }
  }, [open, nodeId, customNodes]);
  
  // ── 选中的元素 ──
  const selectedElement = elements.find((e) => e.id === selectedElementId);
  
  // ── 生成元素 ID ──
  const generateElementId = useCallback(() => {
    return `element-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }, []);
  
  // ── 添加元素 ──
  const handleAddElement = useCallback((type: BaseElementType, x: number, y: number) => {
    const template = ELEMENT_TEMPLATES.find((t) => t.type === type);
    if (!template) return;
    
    const newElement: BaseElement = {
      id: generateElementId(),
      type,
      x,
      y,
      ...template.defaultProps,
    };
    
    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
  }, [generateElementId]);
  
  // ── 更新元素 ──
  const handleUpdateElement = useCallback((elementId: string, updates: Partial<BaseElement>) => {
    setElements((prev) =>
      prev.map((e) => (e.id === elementId ? { ...e, ...updates } : e))
    );
  }, []);
  
  // ── 删除选中元素 ──
  const handleDeleteSelected = useCallback(() => {
    if (!selectedElementId) return;
    setElements((prev) => prev.filter((e) => e.id !== selectedElementId));
    setSelectedElementId(null);
  }, [selectedElementId]);
  
  // ── 清空所有元素 ──
  const handleClearAll = useCallback(() => {
    setElements([]);
    setSelectedElementId(null);
  }, []);
  
  // ── 保存节点 ──
  const handleSave = useCallback(() => {
    if (!name.trim()) {
      message.warning('请输入节点名称');
      return;
    }
    
    if (elements.length === 0) {
      message.warning('请至少添加一个元素');
      return;
    }
    
    if (nodeId) {
      // 更新
      updateCustomNode(nodeId, {
        name: name.trim(),
        description: description.trim(),
        width,
        height,
        elements,
        defaultFill,
        defaultStroke,
      });
      message.success('节点已更新');
      onSave?.(nodeId);
    } else {
      // 新建
      const newId = addCustomNode({
        name: name.trim(),
        description: description.trim(),
        width,
        height,
        elements,
        defaultFill,
        defaultStroke,
      });
      message.success('节点已创建');
      onSave?.(newId);
    }
    
    onClose();
  }, [name, elements, nodeId, description, width, height, defaultFill, defaultStroke, updateCustomNode, addCustomNode, onSave, onClose]);
  
  // ── 复制节点 ──
  const handleDuplicate = useCallback(() => {
    if (!nodeId) return;
    const newId = duplicateCustomNode(nodeId);
    if (newId) {
      message.success('节点已复制');
      onClose();
    }
  }, [nodeId, duplicateCustomNode, onClose]);
  
  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1000}
      footer={null}
      title={
        <div className={styles.modalTitle}>
          <span>{nodeId ? '编辑自定义节点' : '创建自定义节点'}</span>
        </div>
      }
      className={styles.modal}
    >
      <div className={styles.container}>
        {/* 左侧：元素工具栏 */}
        <div className={styles.toolbar}>
          <ElementToolbar onAddElement={handleAddElement} />
        </div>
        
        {/* 中间：画布 */}
        <div className={styles.canvasArea}>
          {/* 顶部设置 */}
          <div className={styles.topSettings}>
            <div className={styles.settingRow}>
              <label>名称：</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入节点名称"
                style={{ width: 150 }}
              />
            </div>
            <div className={styles.settingRow}>
              <label>尺寸：</label>
              <Input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                style={{ width: 60 }}
                min={40}
                max={300}
              />
              <span>×</span>
              <Input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                style={{ width: 60 }}
                min={20}
                max={200}
              />
            </div>
            <div className={styles.settingRow}>
              <label>填充：</label>
              <input
                type="color"
                value={defaultFill}
                onChange={(e) => setDefaultFill(e.target.value)}
                className={styles.colorInput}
              />
              <label style={{ marginLeft: 12 }}>边框：</label>
              <input
                type="color"
                value={defaultStroke}
                onChange={(e) => setDefaultStroke(e.target.value)}
                className={styles.colorInput}
              />
            </div>
          </div>
          
          {/* 画布 */}
          <ElementCanvas
            width={width}
            height={height}
            elements={elements}
            selectedElementId={selectedElementId}
            defaultFill={defaultFill}
            defaultStroke={defaultStroke}
            onSelectElement={setSelectedElementId}
            onUpdateElement={handleUpdateElement}
            onAddElement={handleAddElement}
          />
          
          {/* 底部操作栏 */}
          <div className={styles.actions}>
            <div className={styles.leftActions}>
              <Popconfirm
                title="确定清空所有元素吗？"
                onConfirm={handleClearAll}
                okText="确定"
                cancelText="取消"
              >
                <Button icon={<ClearOutlined />} danger>
                  清空
                </Button>
              </Popconfirm>
              {selectedElementId && (
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  onClick={handleDeleteSelected}
                >
                  删除选中
                </Button>
              )}
              {nodeId && (
                <Button icon={<CopyOutlined />} onClick={handleDuplicate}>
                  复制节点
                </Button>
              )}
            </div>
            <div className={styles.rightActions}>
              <Button onClick={onClose}>取消</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                保存节点
              </Button>
            </div>
          </div>
        </div>
        
        {/* 右侧：属性面板 */}
        <div className={styles.propertyPanel}>
          <ElementPropertyPanel
            element={selectedElement}
            onUpdate={(updates) => {
              if (selectedElementId) {
                handleUpdateElement(selectedElementId, updates);
              }
            }}
            onDelete={() => handleDeleteSelected()}
          />
        </div>
      </div>
    </Modal>
  );
};

export default CustomNodeEditorPage;
