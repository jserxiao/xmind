/**
 * ReconnectDirectoryModal - 重新连接目录弹窗
 * 
 * 当目录句柄丢失时显示，让用户重新选择工作目录
 */

import React from 'react';
import { Modal, Button, message } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import { selectDirectory, scanRoadmaps } from '../utils/fileSystem';
import { useRoadmapStore } from '../store/roadmapStore';

interface ReconnectDirectoryModalProps {
  /** 是否显示弹窗 */
  open: boolean;
  /** 当前思维导图 ID */
  roadmapId?: string;
  /** 连接成功回调 */
  onConnected: () => void;
  /** 返回首页回调 */
  onBackToHome: () => void;
}

const ReconnectDirectoryModal: React.FC<ReconnectDirectoryModalProps> = ({
  open,
  roadmapId,
  onConnected,
  onBackToHome,
}) => {
  const [isSelecting, setIsSelecting] = React.useState(false);

  const setCurrentRoadmap = useRoadmapStore((state) => state.setCurrentRoadmap);
  const setDirectory = useRoadmapStore((state) => state.setDirectory);
  const setAvailableRoadmaps = useRoadmapStore((state) => state.setAvailableRoadmaps);

  const handleSelectDirectory = async () => {
    setIsSelecting(true);
    try {
      const result = await selectDirectory();
      if (result.success && result.handle) {
        // 设置目录名称
        setDirectory(result.handle.name);
        
        // 扫描思维导图
        const scanResult = await scanRoadmaps();
        if (scanResult.success && scanResult.roadmaps) {
          setAvailableRoadmaps(scanResult.roadmaps);
          
          // 尝试找到当前 roadmapId 对应的思维导图
          if (roadmapId) {
            const roadmap = scanResult.roadmaps.find(r => r.id === roadmapId);
            if (roadmap) {
              setCurrentRoadmap(roadmap);
            }
          }
        }
        
        message.success('目录已重新连接');
        onConnected();
      } else if (!result.success) {
        message.error(result.message || '选择目录失败');
      }
    } catch (err) {
      console.error('[ReconnectDirectoryModal] 选择目录失败:', err);
      message.error('选择目录失败');
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={null}
      footer={null}
      closable={false}
      centered
      width={400}
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <FolderOpenOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
        <h3 style={{ marginBottom: 8 }}>需要重新选择目录</h3>
        <p style={{ color: '#666', marginBottom: 24 }}>
          浏览器无法自动恢复目录访问权限，<br />
          请重新选择工作目录以继续使用。
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button onClick={onBackToHome}>
            返回首页
          </Button>
          <Button 
            type="primary" 
            onClick={handleSelectDirectory}
            loading={isSelecting}
            icon={<FolderOpenOutlined />}
          >
            选择目录
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReconnectDirectoryModal;
