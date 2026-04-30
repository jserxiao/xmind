/**
 * AI 配置面板
 * 
 * 配置 AI 服务的 API 密钥和其他参数
 */

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, message, Divider, Alert } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { useAIStore } from '../../store/aiStore';
import { getAIService, AIService } from '../../services/aiService';
import { AI_PROVIDER_NAMES, AI_MODELS, AI_DEFAULT_CONFIGS } from '../../types/ai';
import type { AIProvider, AIConfig } from '../../types/ai';

// ═══════════════════════════════════════════════════════════════════════════════
// Props 类型
// ═══════════════════════════════════════════════════════════════════════════════

interface AIConfigPanelProps {
  visible: boolean;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 组件
// ═══════════════════════════════════════════════════════════════════════════════

const AIConfigPanel: React.FC<AIConfigPanelProps> = ({ visible, onClose }) => {
  // 使用精细 selector 避免全量订阅触发重渲染
  const config = useAIStore((state) => state.config);
  const setConfig = useAIStore((state) => state.setConfig);
  const clearConfig = useAIStore((state) => state.clearConfig);
  const [form] = Form.useForm();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 当前选中的提供商
  const provider = Form.useWatch('provider', form);

  // 初始化表单
  useEffect(() => {
    if (visible && config) {
      form.setFieldsValue(config);
    } else if (visible) {
      form.setFieldsValue({
        provider: 'openai',
        model: AI_DEFAULT_CONFIGS.openai.model,
        maxTokens: 2000,
        temperature: 0.7,
      });
    }
    setTestResult(null);
  }, [visible, config, form]);

  // 切换提供商时更新默认值
  useEffect(() => {
    if (provider && AI_DEFAULT_CONFIGS[provider as AIProvider]) {
      const defaults = AI_DEFAULT_CONFIGS[provider as AIProvider];
      form.setFieldsValue({
        model: defaults.model,
        maxTokens: defaults.maxTokens,
        temperature: defaults.temperature,
      });
    }
  }, [provider, form]);

  // 保存配置
  const handleSave = () => {
    form.validateFields().then((values) => {
      const newConfig: AIConfig = {
        provider: values.provider,
        apiKey: values.apiKey,
        baseUrl: values.baseUrl || undefined,
        model: values.model,
        maxTokens: values.maxTokens || 2000,
        temperature: values.temperature ?? 0.7,
      };

      setConfig(newConfig);
      getAIService(newConfig);
      message.success('配置已保存');
      onClose();
    });
  };

  // 测试连接
  const handleTest = async () => {
    try {
      const values = await form.validateFields();
      const testConfig: AIConfig = {
        provider: values.provider,
        apiKey: values.apiKey,
        baseUrl: values.baseUrl || undefined,
        model: values.model,
        maxTokens: values.maxTokens || 2000,
        temperature: values.temperature ?? 0.7,
      };

      setTesting(true);
      setTestResult(null);

      // 创建临时服务实例测试
      const testService = new AIService(testConfig);
      const result = await testService.testConnection();

      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '测试失败',
      });
    } finally {
      setTesting(false);
    }
  };

  // 清除配置
  const handleClear = () => {
    Modal.confirm({
      title: '清除配置',
      content: '确定要清除 AI 配置吗？清除后将无法使用 AI 生成功能。',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        clearConfig();
        form.resetFields();
        message.success('配置已清除');
      },
    });
  };

  return (
    <Modal
      title={
        <span>
          <ThunderboltOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          AI 服务配置
        </span>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={480}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
      >
        {/* 服务提供商 */}
        <Form.Item
          name="provider"
          label="服务提供商"
          rules={[{ required: true, message: '请选择服务提供商' }]}
        >
          <Select>
            {(Object.keys(AI_PROVIDER_NAMES) as AIProvider[]).map((key) => (
              <Select.Option key={key} value={key}>
                {AI_PROVIDER_NAMES[key]}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* API 密钥 */}
        <Form.Item
          name="apiKey"
          label="API 密钥"
          rules={[{ required: true, message: '请输入 API 密钥' }]}
        >
          <Input.Password
            placeholder={provider === 'openai' ? 'sk-...' : '请输入 API 密钥'}
          />
        </Form.Item>

        {/* 自定义 API 地址 */}
        {provider === 'custom' && (
          <Form.Item
            name="baseUrl"
            label="API 地址"
            rules={[{ required: true, message: '请输入 API 地址' }]}
          >
            <Input placeholder="https://api.example.com/v1/chat/completions" />
          </Form.Item>
        )}

        {/* 模型选择 */}
        <Form.Item
          name="model"
          label="模型"
          rules={[{ required: true, message: '请选择模型' }]}
        >
          <Select>
            {(AI_MODELS[provider as AIProvider] || []).map((model) => (
              <Select.Option key={model} value={model}>
                {model}
              </Select.Option>
            ))}
            {provider === 'custom' && (
              <Select.Option value="custom">自定义模型</Select.Option>
            )}
          </Select>
        </Form.Item>

        {/* 高级设置 */}
        <Divider style={{ margin: '12px 0' }}>高级设置</Divider>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item
            name="maxTokens"
            label="最大 Token"
            style={{ flex: 1 }}
          >
            <Select>
              <Select.Option value={1000}>1000</Select.Option>
              <Select.Option value={2000}>2000</Select.Option>
              <Select.Option value={4000}>4000</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="temperature"
            label="创造性"
            style={{ flex: 1 }}
          >
            <Select>
              <Select.Option value={0.3}>低 (0.3)</Select.Option>
              <Select.Option value={0.7}>中 (0.7)</Select.Option>
              <Select.Option value={1.0}>高 (1.0)</Select.Option>
            </Select>
          </Form.Item>
        </div>

        {/* 测试结果 */}
        {testResult && (
          <Alert
            message={testResult.success ? '连接成功' : '连接失败'}
            description={testResult.message}
            type={testResult.success ? 'success' : 'error'}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={handleTest} loading={testing} style={{ flex: 1 }}>
            测试连接
          </Button>
          <Button type="primary" onClick={handleSave} style={{ flex: 1 }}>
            保存配置
          </Button>
        </div>

        {/* 清除配置 */}
        {config && (
          <Button
            type="text"
            danger
            block
            style={{ marginTop: 8 }}
            onClick={handleClear}
          >
            清除配置
          </Button>
        )}
      </Form>

      {/* 帮助信息 */}
      <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 6, fontSize: 12, color: '#666' }}>
        <strong>提示：</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
          <li>推荐使用 DeepSeek（国产，价格低）或 GPT-4o-mini</li>
          <li>API 密钥使用 AES-256 加密后存储在本地浏览器中</li>
          <li>密钥不会上传到任何服务器，仅在本地使用</li>
          <li>每次生成成本约 0.01 元，非常便宜</li>
        </ul>
      </div>
    </Modal>
  );
};

export default AIConfigPanel;
