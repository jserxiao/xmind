/**
 * BookmarkManagerModal - 书签管理弹窗
 * 
 * 提供书签查看、定位、删除功能
 */

import React from 'react';
import { Modal, message } from 'antd';
import { useBookmarkStore } from '../../store/bookmarkStore';
import styles from '../../styles/BookmarkManagerModal.module.css';

interface BookmarkManagerModalProps {
  open: boolean;
  onClose: () => void;
  onFocusNode: (nodeId: string) => void;
}

const BookmarkManagerModal: React.FC<BookmarkManagerModalProps> = ({
  open,
  onClose,
  onFocusNode,
}) => {
  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const currentRoadmapId = useBookmarkStore((state) => state.currentRoadmapId);
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark);

  // 获取当前思维导图的书签列表
  const currentBookmarks = currentRoadmapId ? (bookmarks[currentRoadmapId] || []) : [];

  return (
    <Modal
      title={
        <span>
          🔖 书签管理
          <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>
            ({currentBookmarks.length} 个书签)
          </span>
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      {currentBookmarks.length === 0 ? (
        <div className={styles.bookmarkEmpty}>
          <div className={styles.bookmarkEmptyIcon}>📭</div>
          <p className={styles.bookmarkEmptyText}>暂无书签</p>
          <p className={styles.bookmarkEmptyHint}>右键点击节点可添加书签</p>
        </div>
      ) : (
        <div className={styles.bookmarkList}>
          {currentBookmarks.map((bookmark, index) => (
            <div key={bookmark.nodeId} className={styles.bookmarkItem}>
              <div className={styles.bookmarkInfo}>
                <span className={styles.bookmarkIndex}>{index + 1}</span>
                <div className={styles.bookmarkContent}>
                  <div className={styles.bookmarkLabel}>{bookmark.nodeLabel}</div>
                  <div className={styles.bookmarkMeta}>
                    <span className={styles.bookmarkId}>ID: {bookmark.nodeId.slice(0, 20)}...</span>
                    {bookmark.note && (
                      <span className={styles.bookmarkNote}>备注: {bookmark.note}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.bookmarkActions}>
                <button
                  className={styles.bookmarkActionBtn}
                  onClick={() => {
                    onFocusNode(bookmark.nodeId);
                    onClose();
                  }}
                  title="定位到节点"
                >
                  📍
                </button>
                <button
                  className={`${styles.bookmarkActionBtn} ${styles.bookmarkActionDelete}`}
                  onClick={() => {
                    removeBookmark(bookmark.nodeId);
                    message.success('已删除书签');
                  }}
                  title="删除书签"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default BookmarkManagerModal;
