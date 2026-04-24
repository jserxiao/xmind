/**
 * 自定义节点管理弹窗
 * 
 * 显示所有自定义节点，支持新建、编辑、删除
 */

import React, { useState } from 'react';
import { Modal, Button, Empty, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { useCustomNodeStore } from '../../store/customNodeStore';
import type { CustomNodeConfig } from '../../types/customNode';
import CustomNodeEditorPage from './CustomNodeEditorPage';
import styles from './CustomNodeManagerModal.module.css';

interface CustomNodeManagerModalProps {
  open: boolean;
  onClose: () => void;
  onSelectNode?: (nodeId: string) => void;
  showSelect?: boolean;
}

const CustomNodeManagerModal: React.FC<CustomNodeManagerModalProps> = ({
  open,
  onClose,
  onSelectNode,
  showSelect = false,
}) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | undefined>();
  
  const deleteCustomNode = useCustomNodeStore((state) => state.deleteCustomNode);
  const duplicateCustomNode = useCustomNodeStore((state) => state.duplicateCustomNode);
  const customNodesRecord = useCustomNodeStore((state) => state.customNodes);
  const customNodes = Object.values(customNodesRecord);
  
  const handleCreate = () => {
    setEditingNodeId(undefined);
    setEditorOpen(true);
  };
  
  const handleEdit = (nodeId: string) => {
    setEditingNodeId(nodeId);
    setEditorOpen(true);
  };
  
  const handleDelete = (nodeId: string) => {
    deleteCustomNode(nodeId);
    message.success('节点已删除');
  };
  
  const handleDuplicate = (nodeId: string) => {
    const newId = duplicateCustomNode(nodeId);
    if (newId) {
      message.success('节点已复制');
    }
  };
  
  const handleSelect = (nodeId: string) => {
    onSelectNode?.(nodeId);
    onClose();
  };
  
  const handleCloseEditor = () => {
    setEditorOpen(false);
    setEditingNodeId(undefined);
  };
  
  // 渲染节点预览
  const renderNodePreview = (node: CustomNodeConfig) => {
    const scale = Math.min(80 / node.width, 50 / node.height, 1);
    
    return (
      <div
        className={styles.preview}
        style={{
          width: node.width * scale,
          height: node.height * scale,
        }}
      >
        {node.elements.map((element) => {
          const style: React.CSSProperties = {
            position: 'absolute',
            left: element.x * scale,
            top: element.y * scale,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          };
          
          switch (element.type) {
            case 'rect':
              return (
                <div
                  key={element.id}
                  style={{
                    ...style,
                    width: element.width,
                    height: element.height,
                    backgroundColor: element.fill || node.defaultFill,
                    border: `${element.strokeWidth || 1}px solid ${element.stroke || node.defaultStroke}`,
                    borderRadius: element.radius || 0,
                    opacity: element.opacity ?? 1,
                  }}
                />
              );
            case 'circle':
            case 'ellipse':
              return (
                <div
                  key={element.id}
                  style={{
                    ...style,
                    width: element.width,
                    height: element.height,
                    backgroundColor: element.fill || node.defaultFill,
                    border: `${element.strokeWidth || 1}px solid ${element.stroke || node.defaultStroke}`,
                    borderRadius: '50%',
                    opacity: element.opacity ?? 1,
                  }}
                />
              );
            case 'text':
              return (
                <div
                  key={element.id}
                  style={{
                    ...style,
                    fontSize: element.fontSize || 12,
                    color: element.fontColor || '#262626',
                    opacity: element.opacity ?? 1,
                  }}
                >
                  {element.text}
                </div>
              );
            case 'icon':
              return (
                <div
                  key={element.id}
                  style={{
                    ...style,
                    fontSize: element.iconSize || 16,
                    opacity: element.opacity ?? 1,
                  }}
                >
                  {element.icon}
                </div>
              );
            case 'line':
              return (
                <div
                  key={element.id}
                  style={{
                    ...style,
                    width: element.width,
                    height: element.strokeWidth || 1,
                    backgroundColor: element.stroke || node.defaultStroke,
                    opacity: element.opacity ?? 1,
                  }}
                />
              );
            default:
              return null;
          }
        })}
      </div>
    );
  };
  
  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        title="自定义节点管理"
        width={700}
        footer={
          <div className={styles.footer}>
            <Button onClick={onClose}>关闭</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新建节点
            </Button>
          </div>
        }
      >
        <div className={styles.content}>
          {customNodes.length === 0 ? (
            <Empty
              description="暂无自定义节点"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                创建第一个节点
              </Button>
            </Empty>
          ) : (
            <div className={styles.nodeList}>
              {customNodes.map((node) => (
                <div key={node.id} className={styles.nodeCard}>
                  <div className={styles.nodePreview}>
                    {renderNodePreview(node)}
                  </div>
                  <div className={styles.nodeInfo}>
                    <div className={styles.nodeName}>{node.name}</div>
                    <div className={styles.nodeMeta}>
                      {node.width} × {node.height} · {node.elements.length} 个元素
                    </div>
                    {node.description && (
                      <div className={styles.nodeDesc}>{node.description}</div>
                    )}
                  </div>
                  <div className={styles.nodeActions}>
                    {showSelect && (
                      <Button
                        type="primary"
                        size="small"
                        onClick={() => handleSelect(node.id)}
                      >
                        选择
                      </Button>
                    )}
                    <Button
                      icon={<EditOutlined />}
                      size="small"
                      onClick={() => handleEdit(node.id)}
                    >
                      编辑
                    </Button>
                    <Button
                      icon={<CopyOutlined />}
                      size="small"
                      onClick={() => handleDuplicate(node.id)}
                    >
                      复制
                    </Button>
                    <Popconfirm
                      title="确定删除此节点吗？"
                      onConfirm={() => handleDelete(node.id)}
                      okText="删除"
                      cancelText="取消"
                    >
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                      />
                    </Popconfirm>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
      
      <CustomNodeEditorPage
        open={editorOpen}
        onClose={handleCloseEditor}
        nodeId={editingNodeId}
      />
    </>
  );
};

export default CustomNodeManagerModal;
