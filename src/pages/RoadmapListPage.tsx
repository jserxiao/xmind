import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Form, Input, ColorPicker, message, Button, Popconfirm } from 'antd';
import { FolderAddOutlined, FolderOpenOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRoadmapStore, type RoadmapMeta } from '../store/roadmapStore';
import { createRoadmap, deleteRoadmap, scanRoadmaps } from '../utils/nodeUtils';

const RoadmapListPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  
  // 文件夹选择弹窗状态
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderForm] = Form.useForm();
  const [deleting, setDeleting] = useState<string | null>(null);
  
  const rootPath = useRoadmapStore((state) => state.rootPath);
  const setRootPath = useRoadmapStore((state) => state.setRootPath);
  const absolutePath = useRoadmapStore((state) => state.absolutePath);
  const setAbsolutePath = useRoadmapStore((state) => state.setAbsolutePath);
  const setCurrentRoadmap = useRoadmapStore((state) => state.setCurrentRoadmap);
  const availableRoadmaps = useRoadmapStore((state) => state.availableRoadmaps);
  const setAvailableRoadmaps = useRoadmapStore((state) => state.setAvailableRoadmaps);

  // 扫描文件夹获取思维导图列表
  const scanRoadmapsList = useCallback(async () => {
    if (!rootPath) {
      setAvailableRoadmaps([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await scanRoadmaps(rootPath);
      if (result.success && result.roadmaps) {
        setAvailableRoadmaps(result.roadmaps);
        if (result.absolutePath) {
          setAbsolutePath(result.absolutePath);
        }
      } else {
        setError(result.message || '扫描失败');
        setAvailableRoadmaps([]);
      }
    } catch (err) {
      setError('扫描思维导图失败');
      setAvailableRoadmaps([]);
    } finally {
      setLoading(false);
    }
  }, [rootPath, setAvailableRoadmaps]);

  // 当 rootPath 变化时扫描
  useEffect(() => {
    scanRoadmapsList();
  }, [scanRoadmapsList]);

  // 打开文件夹选择弹窗
  const handleOpenFolderModal = () => {
    folderForm.resetFields();
    folderForm.setFieldsValue({
      folderPath: rootPath || '',
    });
    setFolderModalOpen(true);
  };

  // 处理文件夹选择确认
  const handleFolderConfirm = async (values: { folderPath: string }) => {
    const path = values.folderPath?.trim();
    if (!path) {
      message.warning('请输入文件夹路径');
      return;
    }
    
    // 标准化路径：移除开头的斜杠
    const normalizedPath = path.replace(/^\/+/, '');
    
    // 验证路径是否存在
    try {
      // 即使返回 404，也允许用户设置路径（可能文件夹存在但没有 index.html）
      setRootPath(normalizedPath);
      setFolderModalOpen(false);
      message.success(`已设置根文件夹：${normalizedPath}`);
    } catch {
      // 网络错误，仍然允许设置
      setRootPath(normalizedPath);
      setFolderModalOpen(false);
    }
  };

  // 使用浏览器文件夹选择 API（如果支持）
  const handleBrowseFolder = async () => {
    // 检查浏览器是否支持 showDirectoryPicker
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        // 获取文件夹名称
        const folderName = dirHandle.name;
        // 这里我们只能获取文件夹名称，无法获取完整路径
        // 用户需要手动输入完整路径
        folderForm.setFieldsValue({
          folderPath: folderName,
        });
        message.info(`已选择文件夹：${folderName}，请确认路径是否正确`);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('选择文件夹失败:', err);
        }
      }
    } else {
      message.info('您的浏览器不支持文件夹选择，请手动输入完整路径');
    }
  };

  // 处理思维导图点击
  const handleRoadmapClick = (roadmap: RoadmapMeta) => {
    setCurrentRoadmap(roadmap);
    navigate(`/roadmap/${roadmap.id}`);
  };

  // 打开创建弹窗
  const handleOpenCreateModal = () => {
    createForm.resetFields();
    createForm.setFieldsValue({
      icon: '📚',
      color: '#1890ff',
    });
    setCreateModalOpen(true);
  };

  // 处理创建思维导图
  const handleCreate = async (values: any) => {
    setCreating(true);
    try {
      const folderName = values.folderName || `mindmap-${Date.now()}`;
      
      const result = await createRoadmap({
        folderName,
        name: values.name || folderName,
        description: values.description,
        icon: values.icon || '📚',
        color: typeof values.color === 'string' ? values.color : values.color?.toHexString?.() || '#1890ff',
        rootPath, // 传递当前根路径
      });
      
      if (result.success && result.roadmap) {
        message.success('思维导图创建成功');
        setCreateModalOpen(false);
        // 重新扫描列表
        scanRoadmapsList();
      } else {
        message.error(result.message || '创建失败');
      }
    } catch (err) {
      message.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  // 处理删除思维导图
  const handleDeleteRoadmap = async (roadmap: RoadmapMeta, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发卡片点击
    
    setDeleting(roadmap.id);
    try {
      const result = await deleteRoadmap(roadmap.id, rootPath);
      if (result.success) {
        message.success(`思维导图「${roadmap.name}」已删除`);
        // 从列表中移除
        setAvailableRoadmaps(availableRoadmaps.filter(r => r.id !== roadmap.id));
      } else {
        message.error(result.message || '删除失败');
      }
    } catch (err) {
      message.error('删除失败');
    } finally {
      setDeleting(null);
    }
  };

  // 如果没有选择根文件夹，显示选择界面
  if (!rootPath) {
    return (
      <div className="roadmap-list-page">
        <div className="folder-select-container">
          <div className="folder-select-card">
            <div className="folder-icon">📁</div>
            <h2>选择思维导图文件夹</h2>
            <p className="folder-hint">
              请选择包含思维导图的根文件夹
            </p>
            <div className="folder-select-buttons">
              <button className="select-folder-btn primary" onClick={handleBrowseFolder}>
                <FolderOpenOutlined /> 浏览文件夹
              </button>
              <button className="select-folder-btn" onClick={handleOpenFolderModal}>
                输入完整路径
              </button>
            </div>
            <p className="folder-example">
              示例：<code>md</code> 或 <code>public/md</code> 或 <code>d:/my/project/public/md</code>
            </p>
          </div>
        </div>
        
        {/* 文件夹路径输入弹窗 */}
        <Modal
          title="📁 设置根文件夹路径"
          open={folderModalOpen}
          onCancel={() => setFolderModalOpen(false)}
          onOk={() => folderForm.submit()}
          okText="确认"
          cancelText="取消"
        >
          <Form
            form={folderForm}
            layout="vertical"
            onFinish={handleFolderConfirm}
          >
            <Form.Item
              name="folderPath"
              label="文件夹路径"
              rules={[{ required: true, message: '请输入文件夹路径' }]}
            >
              <Input 
                placeholder="例如：md 或 public/md 或 d:/my/project/public/md" 
                size="large"
              />
            </Form.Item>
            <p className="form-hint" style={{ color: '#666', fontSize: 12 }}>
              支持相对路径（如 md、public/md）或绝对路径（如 d:/my/project/public/md）
            </p>
          </Form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="roadmap-list-page">
      {/* 头部 */}
      <header className="roadmap-list-header">
        <div className="header-content">
          <h1 className="main-title">
            <span className="title-icon">🧠</span>
            思维导图中心
          </h1>
          <p className="subtitle">
            当前文件夹：<code title={absolutePath || rootPath}>{absolutePath || rootPath}</code>
            <button className="change-folder-btn" onClick={handleOpenFolderModal}>
              更换
            </button>
          </p>
        </div>
      </header>

      {/* 思维导图列表 */}
      <main className="roadmap-list-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>正在扫描思维导图...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="empty-hint">
                <p>⚠️ {error}</p>
                <p className="empty-hint-sub">您可以新建一个思维导图</p>
              </div>
            )}
            <div className="roadmap-grid">
              {/* 现有思维导图卡片 */}
              {availableRoadmaps.map((roadmap) => (
                <div
                  key={roadmap.id}
                  className="roadmap-card"
                  onClick={() => handleRoadmapClick(roadmap)}
                  style={{ '--card-color': roadmap.color } as React.CSSProperties}
                >
                  {/* 删除按钮 */}
                  <Popconfirm
                    title="确认删除"
                    description={`确定要删除思维导图「${roadmap.name}」吗？此操作将删除所有相关文件且不可恢复。`}
                    onConfirm={(e) => handleDeleteRoadmap(roadmap, e as unknown as React.MouseEvent)}
                    onCancel={(e) => e?.stopPropagation()}
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true, loading: deleting === roadmap.id }}
                  >
                    <button 
                      className="card-delete-btn"
                      onClick={(e) => e.stopPropagation()}
                      title="删除思维导图"
                    >
                      <DeleteOutlined />
                    </button>
                  </Popconfirm>
                  
                  <div className="card-icon" style={{ backgroundColor: roadmap.color }}>
                    {roadmap.icon}
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">{roadmap.name}</h3>
                    <p className="card-description">{roadmap.description}</p>
                  </div>
                  <div className="card-action">
                    <span className="action-text">进入</span>
                    <span className="action-arrow">→</span>
                  </div>
                </div>
              ))}
              
              {/* 新增思维导图卡片 - 放在最后 */}
              <div 
                className="roadmap-card add-card"
                onClick={handleOpenCreateModal}
              >
                <div className="card-icon add-icon">
                  <FolderAddOutlined />
                </div>
                <div className="card-content">
                  <h3 className="card-title">新增思维导图</h3>
                  <p className="card-description">创建一个新的思维导图</p>
                </div>
                <div className="card-action">
                  <span className="action-text">创建</span>
                  <span className="action-arrow">+</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* 底部 */}
      <footer className="roadmap-list-footer">
        <p>💡 提示：点击思维导图卡片进入对应的配置页面</p>
      </footer>

      {/* 创建思维导图弹窗 */}
      <Modal
        title="新增思维导图"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="folderName"
            label="文件夹名称"
            rules={[
              { required: true, message: '请输入文件夹名称' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: '只能包含字母、数字、下划线和连字符' }
            ]}
          >
            <Input placeholder="例如：my-mindmap" />
          </Form.Item>
          
          <Form.Item
            name="name"
            label="显示名称"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="例如：我的学习计划" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="思维导图的简要描述" rows={2} />
          </Form.Item>
          
          <Form.Item
            name="icon"
            label="图标"
          >
            <Input placeholder="例如：📚、🧠、💡" />
          </Form.Item>
          
          <Form.Item
            name="color"
            label="颜色"
          >
            <ColorPicker format="hex" />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* 文件夹路径输入弹窗 */}
      <Modal
        title="📁 设置根文件夹路径"
        open={folderModalOpen}
        onCancel={() => setFolderModalOpen(false)}
        onOk={() => folderForm.submit()}
        okText="确认"
        cancelText="取消"
      >
        <Form
          form={folderForm}
          layout="vertical"
          onFinish={handleFolderConfirm}
        >
          <Form.Item
            name="folderPath"
            label="文件夹路径"
            rules={[{ required: true, message: '请输入文件夹路径' }]}
          >
            <Input 
              placeholder="例如：md 或 public/md 或 d:/my/project/public/md" 
              size="large"
            />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Button onClick={handleBrowseFolder} icon={<FolderOpenOutlined />}>
              浏览文件夹
            </Button>
          </div>
          <p className="form-hint" style={{ color: '#666', fontSize: 12 }}>
            支持相对路径（如 md、public/md）或绝对路径（如 d:/my/project/public/md）
          </p>
        </Form>
      </Modal>
    </div>
  );
};

export default RoadmapListPage;
