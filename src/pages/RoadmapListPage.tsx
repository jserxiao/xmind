import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Form, Input, ColorPicker, message, Popconfirm } from 'antd';
import { FolderAddOutlined, FolderOpenOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRoadmapStore, type RoadmapMeta } from '../store/roadmapStore';
import {
  selectDirectory,
  scanRoadmaps,
  createRoadmap,
  deleteRoadmap,
  isFileSystemSupported,
  getDirectoryHandle,
  clearDirectoryHandle,
} from '../utils/fileSystem';
import styles from '../styles/RoadmapListPage.module.css';
import folderStyles from '../styles/FolderSelect.module.css';

const RoadmapListPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const directoryName = useRoadmapStore((state) => state.directoryName);
  const setDirectory = useRoadmapStore((state) => state.setDirectory);
  const clearDirectory = useRoadmapStore((state) => state.clearDirectory);
  const setCurrentRoadmap = useRoadmapStore((state) => state.setCurrentRoadmap);
  const availableRoadmaps = useRoadmapStore((state) => state.availableRoadmaps);
  const setAvailableRoadmaps = useRoadmapStore((state) => state.setAvailableRoadmaps);

  // 扫描文件夹获取思维导图列表
  const scanRoadmapsList = useCallback(async () => {
    if (!getDirectoryHandle()) {
      setAvailableRoadmaps([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await scanRoadmaps();
      if (result.success && result.roadmaps) {
        setAvailableRoadmaps(result.roadmaps);
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
  }, [setAvailableRoadmaps]);

  // 选择目录
  const handleSelectDirectory = async () => {
    const result = await selectDirectory();
    if (result.success && result.handle) {
      setDirectory(result.handle.name);
      // 扫描思维导图
      scanRoadmapsList();
      message.success(`已选择目录：${result.handle.name}`);
    } else if (!result.success) {
      message.error(result.message);
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
      const result = await deleteRoadmap(roadmap.id);
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

  // 更换目录
  const handleChangeDirectory = () => {
    clearDirectory();
    clearDirectoryHandle(); // 同时清除 IndexedDB 中的句柄
    setAvailableRoadmaps([]);
  };

  // 如果没有选择目录，显示选择界面
  if (!directoryName) {
    return (
      <div className={styles.roadmapListPage}>
        <div className={folderStyles.folderSelectContainer}>
          <div className={folderStyles.folderSelectCard}>
            <div className={folderStyles.folderIcon}>📁</div>
            <h2>选择思维导图文件夹</h2>
            <p className={folderStyles.folderHint}>
              请选择包含思维导图的根文件夹
            </p>
            {!isFileSystemSupported() && (
              <p className={folderStyles.folderWarning} style={{ color: '#faad14', marginBottom: 16 }}>
                ⚠️ 您的浏览器不支持文件系统访问，请使用 Chrome 或 Edge 浏览器
              </p>
            )}
            <div className={folderStyles.folderSelectButtons}>
              <button
                className={`${folderStyles.selectFolderBtn} ${folderStyles.primary}`}
                onClick={handleSelectDirectory}
                disabled={!isFileSystemSupported()}
              >
                <FolderOpenOutlined /> 选择文件夹
              </button>
            </div>
            <p className={folderStyles.folderExample}>
              提示：选择一个本地文件夹作为思维导图的存储位置
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.roadmapListPage}>
      {/* 头部 */}
      <header className={styles.roadmapListHeader}>
        <div className={styles.headerContent}>
          <h1 className={styles.mainTitle}>
            <span className={styles.titleIcon}>🧠</span>
            思维导图中心
          </h1>
          <p className={styles.subtitle}>
            当前文件夹：<code>{directoryName}</code>
            <button className={folderStyles.changeFolderBtn} onClick={handleChangeDirectory}>
              更换
            </button>
          </p>
        </div>
      </header>

      {/* 思维导图列表 */}
      <main className={styles.roadmapListContent}>
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>正在扫描思维导图...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className={styles.emptyHint}>
                <p>⚠️ {error}</p>
                <p className={styles.emptyHintSub}>您可以新建一个思维导图</p>
              </div>
            )}
            <div className={styles.roadmapGrid}>
              {/* 现有思维导图卡片 */}
              {availableRoadmaps.map((roadmap) => (
                <div
                  key={roadmap.id}
                  className={styles.roadmapCard}
                  onClick={() => handleRoadmapClick(roadmap)}
                  style={{ '--card-color': roadmap.color } as React.CSSProperties}
                >
                  {/* 删除按钮 */}
                  <Popconfirm
                    title="确认删除"
                    description={`确定要删除思维导图「${roadmap.name}」吗？此操作将删除所有相关文件且不可恢复。`}
                    onConfirm={(e?: React.MouseEvent) => e && handleDeleteRoadmap(roadmap, e)}
                    onCancel={(e?: React.MouseEvent) => e?.stopPropagation()}
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true, loading: deleting === roadmap.id }}
                  >
                    <button
                      className={styles.cardDeleteBtn}
                      onClick={(e) => e.stopPropagation()}
                      title="删除思维导图"
                    >
                      <DeleteOutlined />
                    </button>
                  </Popconfirm>

                  <div className={styles.cardIcon} style={{ backgroundColor: roadmap.color }}>
                    {roadmap.icon}
                  </div>
                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>{roadmap.name}</h3>
                    <p className={styles.cardDescription}>{roadmap.description}</p>
                  </div>
                  <div className={styles.cardAction}>
                    <span className={styles.actionText}>进入</span>
                    <span className={styles.actionArrow}>→</span>
                  </div>
                </div>
              ))}

              {/* 新增思维导图卡片 - 放在最后 */}
              <div
                className={`${styles.roadmapCard} ${styles.addCard}`}
                onClick={handleOpenCreateModal}
              >
                <div className={`${styles.cardIcon} ${styles.addIcon}`}>
                  <FolderAddOutlined />
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>新增思维导图</h3>
                  <p className={styles.cardDescription}>创建一个新的思维导图</p>
                </div>
                <div className={styles.cardAction}>
                  <span className={styles.actionText}>创建</span>
                  <span className={styles.actionArrow}>+</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* 底部 */}
      <footer className={styles.roadmapListFooter}>
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
    </div>
  );
};

export default RoadmapListPage;
