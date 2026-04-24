/**
 * WatermarkConfigModal - 水印设置弹窗
 * 
 * 提供水印配置功能
 */

import React from 'react';
import { Modal, Input, message } from 'antd';
import { useWatermarkStore } from '../../store/watermarkStore';

interface WatermarkConfigModalProps {
  open: boolean;
  onClose: () => void;
}

const WatermarkConfigModal: React.FC<WatermarkConfigModalProps> = ({ open, onClose }) => {
  const watermarkConfig = useWatermarkStore((state) => state.config);
  const updateWatermarkConfig = useWatermarkStore((state) => state.updateConfig);

  const handleSave = () => {
    onClose();
    message.success('水印设置已保存');
  };

  return (
    <Modal
      title="💧 水印设置"
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText="保存"
      cancelText="取消"
    >
      <div className="watermark-config">
        <div className="watermark-config-item">
          <label className="watermark-label">
            <input
              type="checkbox"
              checked={watermarkConfig.enabled}
              onChange={(e) => updateWatermarkConfig({ enabled: e.target.checked })}
            />
            <span>启用水印</span>
          </label>
        </div>
        
        <div className="watermark-config-item">
          <label>水印内容</label>
          <Input
            value={watermarkConfig.content}
            onChange={(e) => updateWatermarkConfig({ content: e.target.value })}
            placeholder="请输入水印内容"
            disabled={!watermarkConfig.enabled}
          />
        </div>
        
        <div className="watermark-config-row">
          <div className="watermark-config-item">
            <label>字体大小</label>
            <Input
              type="number"
              value={watermarkConfig.fontSize}
              onChange={(e) => updateWatermarkConfig({ fontSize: Number(e.target.value) })}
              disabled={!watermarkConfig.enabled}
              min={8}
              max={48}
            />
          </div>
          
          <div className="watermark-config-item">
            <label>透明度</label>
            <Input
              type="number"
              value={watermarkConfig.opacity}
              onChange={(e) => updateWatermarkConfig({ opacity: Number(e.target.value) })}
              disabled={!watermarkConfig.enabled}
              min={0}
              max={1}
              step={0.05}
            />
          </div>
        </div>
        
        <div className="watermark-config-row">
          <div className="watermark-config-item">
            <label>水印颜色</label>
            <Input
              type="color"
              value={watermarkConfig.color}
              onChange={(e) => updateWatermarkConfig({ color: e.target.value })}
              disabled={!watermarkConfig.enabled}
              style={{ height: 36 }}
            />
          </div>
          
          <div className="watermark-config-item">
            <label>旋转角度</label>
            <Input
              type="number"
              value={watermarkConfig.rotate}
              onChange={(e) => updateWatermarkConfig({ rotate: Number(e.target.value) })}
              disabled={!watermarkConfig.enabled}
              min={-90}
              max={90}
            />
          </div>
        </div>
        
        <div className="watermark-config-row">
          <div className="watermark-config-item">
            <label>水平间距</label>
            <Input
              type="number"
              value={watermarkConfig.gapX}
              onChange={(e) => updateWatermarkConfig({ gapX: Number(e.target.value) })}
              disabled={!watermarkConfig.enabled}
              min={50}
              max={300}
            />
          </div>
          
          <div className="watermark-config-item">
            <label>垂直间距</label>
            <Input
              type="number"
              value={watermarkConfig.gapY}
              onChange={(e) => updateWatermarkConfig({ gapY: Number(e.target.value) })}
              disabled={!watermarkConfig.enabled}
              min={50}
              max={300}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default WatermarkConfigModal;
