/**
 * MdSearchResults - MD内容搜索结果组件
 * 
 * 显示Markdown文件内容的搜索结果
 */

import React from 'react';
import { FileTextOutlined } from '@ant-design/icons';
import type { MdSearchResult } from '../../utils/nodeUtils';
import styles from '../../styles/TreePanel.module.css';

interface MdSearchResultsProps {
  results: MdSearchResult[];
  searchKeyword: string;
  onFocusNode: (nodeId: string) => void;
  highlightText: (text: string, keyword: string) => React.ReactNode;
}

/**
 * MD内容搜索结果组件
 * 显示匹配的文档内容片段
 */
const MdSearchResults: React.FC<MdSearchResultsProps> = ({
  results,
  searchKeyword,
  onFocusNode,
  highlightText,
}) => {
  if (!searchKeyword.trim() || results.length === 0) {
    return null;
  }

  return (
    <div className={styles.mdSearchResults}>
      <div className={styles.mdSearchHeader}>
        <FileTextOutlined /> 文档内容匹配 ({results.length})
      </div>
      {results.map((result) => (
        <div
          key={result.nodeId}
          className={styles.mdSearchItem}
          onClick={() => onFocusNode(result.nodeId)}
        >
          <div className={styles.mdSearchItemTitle}>
            {highlightText(result.nodeLabel, searchKeyword)}
          </div>
          {result.matches.slice(0, 2).map((match, idx) => (
            <div key={idx} className={styles.mdSearchItemContext}>
              ...{highlightText(match, searchKeyword)}...
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default MdSearchResults;
