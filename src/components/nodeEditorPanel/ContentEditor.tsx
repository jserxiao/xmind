/**
 * ContentEditor - 内容编辑器组件
 * 
 * 提供 Markdown 内容编辑功能
 */

import React, { useRef, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Button, Dropdown, message } from 'antd';
import type { MenuProps } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useNodeEditorStore } from '../../store/nodeEditorStore';
import { 
  MD_TEMPLATES, 
  MD_SNIPPETS, 
  getTemplateContent, 
  getSnippetContent 
} from '../../utils/mdTemplates';

/**
 * 内容编辑器组件
 * 提供 Markdown 编辑、模板应用、样式片段插入等功能
 */
const ContentEditor: React.FC = () => {
  const { formData, setMdContent } = useNodeEditorStore();
  
  // 是否是 sub 节点
  const isSubNode = formData.type === 'sub';

  // 应用默认模板
  const applyTemplate = useCallback((templateKey: string) => {
    const title = formData.label || '标题';
    const content = getTemplateContent(templateKey, title);
    if (content) {
      setMdContent(content);
      message.success('已应用模板');
    }
  }, [formData.label, setMdContent]);
  
  // 取消模板
  const cancelTemplate = useCallback(() => {
    setMdContent('');
    message.info('已取消模板');
  }, [setMdContent]);

  // 插入样式片段
  const insertSnippet = useCallback((snippetKey: string) => {
    const content = getSnippetContent(snippetKey);
    if (content) {
      const currentContent = formData.mdContent || '';
      setMdContent(currentContent + '\n' + content);
    }
  }, [formData.mdContent, setMdContent]);

  // 处理模板菜单点击
  const handleTemplateClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'cancel') {
      cancelTemplate();
    } else {
      applyTemplate(e.key);
    }
  };
  
  // 模板菜单项
  const templateMenuItems: MenuProps['items'] = [
    ...MD_TEMPLATES.map(t => ({
      key: t.key,
      label: t.label,
    })),
    { type: 'divider' },
    {
      key: 'cancel',
      label: '❌ 取消模板',
      danger: true,
    },
  ];

  // 样式片段菜单项
  const snippetMenuItems: MenuProps['items'] = MD_SNIPPETS.map(s => ({
    key: s.key,
    label: s.label,
  }));
  
  // 处理样式片段菜单点击
  const handleSnippetClick: MenuProps['onClick'] = (e) => {
    insertSnippet(e.key);
  };

  // 导入 MD 文件
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImportMd = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.name.endsWith('.md') && file.type !== 'text/markdown') {
      message.error('请选择 Markdown 文件（.md）');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setMdContent(content);
        message.success(`已导入文件：${file.name}`);
      }
    };
    reader.onerror = () => {
      message.error('文件读取失败');
    };
    reader.readAsText(file);
    
    // 清除 input 值，允许重复选择同一文件
    e.target.value = '';
  };

  return (
    <div className="editor-md-area">
      <div className="md-editor-header">
        <span className="md-editor-title">
          {isSubNode ? '章节内容' : 'Markdown 内容'}
        </span>
        <div className="md-editor-actions">
          <Dropdown 
            menu={{ items: templateMenuItems, onClick: handleTemplateClick }} 
            trigger={['click']}
          >
            <Button size="small" type="primary" ghost>
              📋 使用模板
            </Button>
          </Dropdown>
          <Dropdown 
            menu={{ items: snippetMenuItems, onClick: handleSnippetClick }} 
            trigger={['click']}
          >
            <Button size="small">
              ✨ 插入样式
            </Button>
          </Dropdown>
          <Button size="small" onClick={handleImportMd}>
            <UploadOutlined /> 导入MD
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,text/markdown"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>
      
      <div className="md-editor-container" data-color-mode="light">
        <MDEditor
          value={formData.mdContent || ''}
          onChange={(val) => setMdContent(val || '')}
          height={400}
          preview="live"
          hideToolbar={false}
        />
      </div>
    </div>
  );
};

export default ContentEditor;
