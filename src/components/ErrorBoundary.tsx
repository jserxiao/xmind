/**
 * ErrorBoundary - React 错误边界组件
 * 
 * 捕获子组件树中的 JavaScript 错误，记录错误并显示备用 UI
 * 防止局部错误导致整个应用崩溃
 * 
 * 使用方式：
 * <ErrorBoundary fallback={<div>出错了</div>}>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import { Component, type ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface ErrorBoundaryProps {
  /** 子组件 */
  children: ReactNode;
  /** 错误时显示的备用 UI */
  fallback?: ReactNode;
  /** 错误发生时的回调 */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** 错误边界名称（用于日志） */
  name?: string;
  /** 是否显示重试按钮 */
  showRetry?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 默认错误 UI 组件
// ═══════════════════════════════════════════════════════════════════════════════

interface DefaultErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
  showRetry: boolean;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  onRetry,
  showRetry,
}) => (
  <div style={styles.container}>
    <div style={styles.icon}>⚠️</div>
    <h2 style={styles.title}>出现了一些问题</h2>
    <p style={styles.message}>
      很抱歉，页面遇到了错误。请尝试刷新页面或联系支持团队。
    </p>
    {error && (
      <details style={styles.details}>
        <summary style={styles.summary}>错误详情</summary>
        <pre style={styles.errorText}>{error.message}</pre>
        <pre style={styles.stackText}>{error.stack}</pre>
      </details>
    )}
    <div style={styles.actions}>
      {showRetry && (
        <button style={styles.retryButton} onClick={onRetry}>
          🔄 重试
        </button>
      )}
      <button
        style={styles.refreshButton}
        onClick={() => window.location.reload()}
      >
        🔃 刷新页面
      </button>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 样式
// ═══════════════════════════════════════════════════════════════════════════════

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    minHeight: '300px',
    backgroundColor: '#fff5f5',
    border: '1px solid #ffccc7',
    borderRadius: '8px',
    textAlign: 'center',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#cf1322',
    margin: '0 0 8px 0',
  },
  message: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 16px 0',
    maxWidth: '400px',
  },
  details: {
    width: '100%',
    maxWidth: '600px',
    marginBottom: '16px',
    textAlign: 'left',
  },
  summary: {
    cursor: 'pointer',
    color: '#1890ff',
    fontSize: '13px',
  },
  errorText: {
    fontSize: '12px',
    color: '#cf1322',
    backgroundColor: '#fff',
    padding: '8px 12px',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '100px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  stackText: {
    fontSize: '11px',
    color: '#999',
    backgroundColor: '#f5f5f5',
    padding: '8px 12px',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '150px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  retryButton: {
    padding: '8px 20px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#1890ff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  refreshButton: {
    padding: '8px 20px',
    fontSize: '14px',
    color: '#1890ff',
    backgroundColor: '#fff',
    border: '1px solid #1890ff',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ErrorBoundary 类组件
// ═══════════════════════════════════════════════════════════════════════════════

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 更新 state 使下一次渲染能够显示备用 UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { onError, name } = this.props;

    // 更新状态保存错误信息
    this.setState({ errorInfo });

    // 记录错误日志
    console.error(`[ErrorBoundary${name ? `:${name}` : ''}] 捕获到错误:`, error);
    console.error('[ErrorBoundary] 组件栈:', errorInfo.componentStack);

    // 调用外部错误处理回调
    if (onError) {
      onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { children, fallback, showRetry = true } = this.props;
    const { hasError, error } = this.state;

    if (hasError) {
      // 如果提供了自定义 fallback，使用它
      if (fallback) {
        return fallback;
      }

      // 否则使用默认的错误 UI
      return (
        <DefaultErrorFallback
          error={error}
          onRetry={this.handleRetry}
          showRetry={showRetry}
        />
      );
    }

    return children;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 专用错误边界组件
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 图形渲染错误边界
 */
export class GraphErrorBoundary extends ErrorBoundary {
  static defaultProps = {
    name: 'Graph',
    showRetry: true,
  };
}

/**
 * 面板错误边界
 */
export class PanelErrorBoundary extends ErrorBoundary {
  static defaultProps = {
    name: 'Panel',
    showRetry: true,
  };
}

/**
 * 编辑器错误边界
 */
export class EditorErrorBoundary extends ErrorBoundary {
  static defaultProps = {
    name: 'Editor',
    showRetry: true,
  };
}

export default ErrorBoundary;
