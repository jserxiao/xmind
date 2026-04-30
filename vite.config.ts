import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svg from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    svg(),
    react(),
  ],
  server: {
    port: 5174,
  },
  build: {
    // 增加 chunk 大小警告限制
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 手动分割代码块（使用函数形式）
        manualChunks(id) {
          // React 核心
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/react-router-dom/')) {
            return 'react-vendor';
          }
          
          // Ant Design
          if (id.includes('node_modules/antd/') || 
              id.includes('node_modules/@ant-design/')) {
            return 'antd';
          }
          
          // G6
          if (id.includes('node_modules/@antv/g6/')) {
            return 'g6';
          }
          
          // Markdown 编辑器（含 @uiw/react-md-editor 及其依赖）
          if (id.includes('node_modules/@uiw/react-md-editor/') || 
              id.includes('node_modules/@uiw/react-markdown-preview/') || 
              id.includes('node_modules/react-markdown/') || 
              id.includes('node_modules/rehype-') || 
              id.includes('node_modules/remark-') || 
              id.includes('node_modules/unified/') || 
              id.includes('node_modules/mdast-') || 
              id.includes('node_modules/micromark/') || 
              id.includes('node_modules/parse-numeric-range/') ||
              id.includes('node_modules/boolbase/') ||
              id.includes('node_modules/css-what/') ||
              id.includes('node_modules/nth-check/')) {
            return 'markdown';
          }
          
          // PDF/图片导出
          if (id.includes('node_modules/jspdf/') || 
              id.includes('node_modules/html2canvas/')) {
            return 'export';
          }
          
          // 拖拽库
          if (id.includes('node_modules/@dnd-kit/')) {
            return 'dnd';
          }
          
          // 状态管理
          if (id.includes('node_modules/zustand/')) {
            return 'zustand';
          }
          
          // Markdown 解析器（marked - 仅知识详情页使用）
          if (id.includes('node_modules/marked/')) {
            return 'marked-parser';
          }
        },
      },
    },
    // 生产环境关闭 CSS 分割以减少 HTTP 请求（适合非 HTTP/2 部署）
    cssCodeSplit: false,
    // 启用源映射（生产环境可关闭以减小体积）
    sourcemap: false,
    // 压缩选项
    minify: 'esbuild',
    target: 'es2020',
    // 修复 CommonJS 模块的默认导出
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  // 优化依赖预构建 - 强制预构建所有 CommonJS 依赖
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'antd',
      '@ant-design/icons',
      '@antv/g6',
      'zustand',
      // 强制预构建 CommonJS 模块
      '@uiw/react-md-editor',
    ],
    esbuildOptions: {
      // 修复 CommonJS 模块的 ESM 兼容性问题
      mainFields: ['module', 'main'],
    },
  },
})
