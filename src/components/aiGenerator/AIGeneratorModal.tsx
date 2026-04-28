/**
 * AI 生成器主弹窗组件
 * 
 * 提供 AI 辅助生成子节点的界面
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Input, Slider, Button, message, Spin, Alert } from 'antd';
import { ThunderboltOutlined, SettingOutlined } from '@ant-design/icons';
import { useAIStore } from '../../store/aiStore';
import { getAIService } from '../../services/aiService';
import AIPreviewList from './AIPreviewList';
import AIConfigPanel from './AIConfigPanel';
import type { RoadmapNode } from '../../data/roadmapData';
import type { GeneratedNode, AIGenerateRequest } from '../../types/ai';

// ═══════════════════════════════════════════════════════════════════════════════
// Props 类型
// ═══════════════════════════════════════════════════════════════════════════════

interface AIGeneratorModalProps {
  /** 是否显示 */
  visible: boolean;
  /** 目标父节点 */
  node: RoadmapNode | null;
  /** 祖先节点路径 */
  context: string[];
  /** 思维导图主题 */
  roadmapTheme: string;
  /** 现有子节点（避免生成重复内容） */
  existingChildren?: Array<{ label: string; type: string }>;
  /** 关闭回调 */
  onClose: () => void;
  /** 应用生成的节点 */
  onApply: (nodes: GeneratedNode[]) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════════════════════════════════════

const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({
  visible,
  node,
  context,
  roadmapTheme,
  existingChildren,
  onClose,
  onApply,
}) => {
  const { config, isConfigured, isGenerating, setGenerating, setError, setTokenUsage } = useAIStore();
  
  const [count, setCount] = useState<number | 'auto'>(3);
  const [userPrompt, setUserPrompt] = useState('');
  const [generatedNodes, setGeneratedNodes] = useState<GeneratedNode[]>([]);
  const [showConfig, setShowConfig] = useState(false);

  // 重置状态
  useEffect(() => {
    if (!visible) {
      setGeneratedNodes([]);
      setUserPrompt('');
    }
  }, [visible]);

  // 初始化 AI 服务
  useEffect(() => {
    if (config) {
      getAIService(config);
    }
  }, [config]);

  // 生成节点
  const handleGenerate = useCallback(async () => {
    if (!node || !config) {
      message.warning('请先配置 AI 服务');
      setShowConfig(true);
      return;
    }

    setGenerating(true);
    setGeneratedNodes([]);
    setError(null);

    try {
      const service = getAIService();
      if (!service) {
        message.error('AI 服务未初始化');
        return;
      }

      const request: AIGenerateRequest = {
        parentNode: {
          id: node.id,
          label: node.label,
          type: node.type,
          description: node.description,
          mdPath: node.mdPath,
        },
        context,
        existingChildren,
        userPrompt: userPrompt.trim() || undefined,
        count: count === 'auto' ? undefined : count,
        roadmapTheme,
      };

      const response = await service.generateNodes(request);

      if (response.success && response.nodes.length > 0) {
        setGeneratedNodes(response.nodes);
        if (response.usage) {
          setTokenUsage({
            prompt: response.usage.promptTokens,
            completion: response.usage.completionTokens,
            total: response.usage.totalTokens,
          });
        }
        message.success(`已生成 ${response.nodes.length} 个节点`);
      } else {
        message.error(response.error || '生成失败，请重试');
        setError(response.error || '生成失败');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '生成过程出错';
      message.error(errorMsg);
      setError(errorMsg);
    } finally {
      setGenerating(false);
    }
  }, [node, config, count, userPrompt, context, roadmapTheme, setGenerating, setError, setTokenUsage]);

  // 应用选中的节点
  const handleApply = useCallback((selectedNodes: GeneratedNode[]) => {
    if (selectedNodes.length === 0) {
      message.warning('请至少选择一个节点');
      return;
    }
    onApply(selectedNodes);
    handleClose();
  }, [onApply]);

  // 关闭弹窗
  const handleClose = () => {
    // 取消正在进行的 AI 请求
    getAIService()?.cancel();
    setGeneratedNodes([]);
    setUserPrompt('');
    onClose();
  };

  return (
    <>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThunderboltOutlined style={{ color: '#1890ff' }} />
            <span>AI 生成子节点</span>
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              style={{ marginLeft: 'auto', color: '#999' }}
              onClick={() => setShowConfig(true)}
            >
              配置
            </Button>
          </div>
        }
        open={visible}
        onCancel={handleClose}
        footer={null}
        width={520}
        destroyOnHidden
      >
        {/* 未配置提示 */}
        {!isConfigured && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <Alert
              message="请先配置 AI 服务"
              description="需要配置 API 密钥才能使用 AI 生成功能"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Button type="primary" onClick={() => setShowConfig(true)}>
              前往配置
            </Button>
          </div>
        )}

        {/* 生成界面 */}
        {isConfigured && (
          <div style={{ padding: '8px 0' }}>
            {/* 父节点信息 */}
            <div style={{ marginBottom: 16, padding: '10px 12px', background: '#f5f5f5', borderRadius: 6 }}>
              <span style={{ color: '#666', fontSize: 12 }}>父节点：</span>
              <strong>{node?.label}</strong>
              {context.length > 0 && (
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  路径：{context.join(' → ')} → {node?.label}
                </div>
              )}
            </div>

            {/* 生成数量 */}
            <div style={{ marginBottom: 16 }}>
              {count !== 'auto' && (
                <>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 13 }}>
                    生成数量：<span style={{ color: '#1890ff' }}>{count} 个</span>
                  </label>
                  <Slider
                    min={1}
                    max={10}
                    value={count}
                    onChange={setCount}
                    marks={{ 1: '1', 3: '3', 5: '5', 10: '10' }}
                    disabled={isGenerating}
                  />
                </>
              )}
              <div style={{ marginTop: count !== 'auto' ? 8 : 0 }}>
                <Button
                  type={count === 'auto' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setCount(count === 'auto' ? 3 : 'auto')}
                  disabled={isGenerating}
                >
                  {count === 'auto' ? '✏️ 手动指定数量' : '🤖 自动决定数量'}
                </Button>
                {count === 'auto' && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                    AI 将根据上下文自动决定合适的节点数量
                  </span>
                )}
              </div>
            </div>

            {/* 自定义要求 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 13 }}>
                额外要求（可选）
              </label>
              <Input.TextArea
                placeholder="例如：重点关注实战应用、包含代码示例、面向初学者..."
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                rows={2}
                disabled={isGenerating}
              />
            </div>

            {/* 生成按钮 */}
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={isGenerating}
              onClick={handleGenerate}
              block
              style={{ marginBottom: 16, height: 40 }}
            >
              {isGenerating ? 'AI 正在思考...' : '开始生成'}
            </Button>

            {/* 生成中状态 */}
            {isGenerating && (
              <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                <Spin />
                <div style={{ marginTop: 12 }}>AI 正在分析并生成节点...</div>
              </div>
            )}

            {/* 生成结果预览 */}
            {!isGenerating && generatedNodes.length > 0 && (
              <AIPreviewList
                nodes={generatedNodes}
                onApply={handleApply}
                onRegenerate={handleGenerate}
                parentHasMd={!!node?.mdPath}
              />
            )}
          </div>
        )}
      </Modal>

      {/* AI 配置弹窗 */}
      <AIConfigPanel
        visible={showConfig}
        onClose={() => setShowConfig(false)}
      />
    </>
  );
};

export default AIGeneratorModal;
