/**
 * TextDiffModal - 文本差异对比弹窗组件
 * 
 * 用于展示修改前后的文本差异，支持：
 * - 并排对比显示
 * - 差异高亮标记
 * - 行号显示
 */

import React, { useMemo } from 'react';
import { Modal, Button } from 'antd';
import styles from './TextDiffModal.module.css';

interface TextDiffModalProps {
  /** 是否显示弹窗 */
  visible: boolean;
  /** 原始文本 */
  originalText: string;
  /** 修改后的文本 */
  modifiedText: string;
  /** 原始文本标题 */
  originalTitle?: string;
  /** 修改后文本标题 */
  modifiedTitle?: string;
  /** 关闭回调 */
  onCancel: () => void;
  /** 确认应用修改的回调 */
  onConfirm: () => void;
  /** 确认按钮文本 */
  confirmText?: string;
  /** 取消按钮文本 */
  cancelText?: string;
  /** 弹窗标题 */
  title?: string;
  /** 弹窗宽度 */
  width?: number;
}

interface DiffLine {
  originalLineNumber: number | null;
  modifiedLineNumber: number | null;
  originalContent: string;
  modifiedContent: string;
  type: 'unchanged' | 'added' | 'removed' | 'modified';
}

/**
 * 简单的行级差异计算
 */
function computeDiff(original: string, modified: string): DiffLine[] {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const result: DiffLine[] = [];

  let origIndex = 0;
  let modIndex = 0;

  // 简化的差异算法：逐行比较
  const maxLines = Math.max(originalLines.length, modifiedLines.length);

  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i];
    const modLine = modifiedLines[i];

    if (origLine === undefined) {
      // 新增的行
      result.push({
        originalLineNumber: null,
        modifiedLineNumber: modIndex + 1,
        originalContent: '',
        modifiedContent: modLine,
        type: 'added',
      });
      modIndex++;
    } else if (modLine === undefined) {
      // 删除的行
      result.push({
        originalLineNumber: origIndex + 1,
        modifiedLineNumber: null,
        originalContent: origLine,
        modifiedContent: '',
        type: 'removed',
      });
      origIndex++;
    } else if (origLine === modLine) {
      // 未改变的行
      result.push({
        originalLineNumber: origIndex + 1,
        modifiedLineNumber: modIndex + 1,
        originalContent: origLine,
        modifiedContent: modLine,
        type: 'unchanged',
      });
      origIndex++;
      modIndex++;
    } else {
      // 修改的行
      result.push({
        originalLineNumber: origIndex + 1,
        modifiedLineNumber: modIndex + 1,
        originalContent: origLine,
        modifiedContent: modLine,
        type: 'modified',
      });
      origIndex++;
      modIndex++;
    }
  }

  return result;
}

/**
 * 文本差异对比弹窗组件
 */
const TextDiffModal: React.FC<TextDiffModalProps> = ({
  visible,
  originalText,
  modifiedText,
  originalTitle = '原始内容',
  modifiedTitle = '修改后内容',
  onCancel,
  onConfirm,
  confirmText = '应用修改',
  cancelText = '取消',
  title = '内容差异对比',
  width = 1000,
}) => {
  // 计算差异
  const diffLines = useMemo(
    () => computeDiff(originalText, modifiedText),
    [originalText, modifiedText]
  );

  // 统计差异
  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let modified = 0;

    diffLines.forEach((line) => {
      if (line.type === 'added') added++;
      else if (line.type === 'removed') removed++;
      else if (line.type === 'modified') modified++;
    });

    return { added, removed, modified };
  }, [diffLines]);

  return (
    <Modal
      open={visible}
      title={title}
      onCancel={onCancel}
      width={width}
      footer={
        <div className={styles.modalFooter}>
          <div className={styles.diffStats}>
            <span className={styles.statAdded}>+{stats.added} 新增</span>
            <span className={styles.statRemoved}>-{stats.removed} 删除</span>
            <span className={styles.statModified}>~{stats.modified} 修改</span>
          </div>
          <div className={styles.footerButtons}>
            <Button onClick={onCancel}>{cancelText}</Button>
            <Button type="primary" onClick={onConfirm}>
              {confirmText}
            </Button>
          </div>
        </div>
      }
      centered
      className={styles.diffModal}
    >
      <div className={styles.diffContainer}>
        {/* 表头 */}
        <div className={styles.diffHeader}>
          <div className={styles.diffColumn}>
            <span className={styles.columnHeader}>{originalTitle}</span>
          </div>
          <div className={styles.diffColumn}>
            <span className={styles.columnHeader}>{modifiedTitle}</span>
          </div>
        </div>

        {/* 内容区域 */}
        <div className={styles.diffContent}>
          {diffLines.map((line, index) => (
            <div key={index} className={`${styles.diffRow} ${styles[line.type]}`}>
              {/* 原始内容列 */}
              <div className={styles.diffCell}>
                {line.originalLineNumber !== null && (
                  <span className={styles.lineNumber}>{line.originalLineNumber}</span>
                )}
                <span className={`${styles.lineContent} ${line.type === 'removed' || line.type === 'modified' ? styles.highlightRemoved : ''}`}>
                  {line.originalContent || '\u00A0'}
                </span>
              </div>

              {/* 修改后内容列 */}
              <div className={styles.diffCell}>
                {line.modifiedLineNumber !== null && (
                  <span className={styles.lineNumber}>{line.modifiedLineNumber}</span>
                )}
                <span className={`${styles.lineContent} ${line.type === 'added' || line.type === 'modified' ? styles.highlightAdded : ''}`}>
                  {line.modifiedContent || '\u00A0'}
                </span>
              </div>
            </div>
          ))}

          {/* 空状态 */}
          {diffLines.length === 0 && (
            <div className={styles.emptyState}>
              <span>内容为空</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TextDiffModal;
