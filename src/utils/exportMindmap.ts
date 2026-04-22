/**
 * 思维导图导出工具
 * 使用 AntV G6 官方 API 导出完整图片
 * 支持 PNG 图片 / PDF 文档 两种格式
 */

import { jsPDF } from 'jspdf';

// ==================== PNG 图片导出 (G6 官方 toFullDataURL API) ====================
// toFullDataURL 是 G6 官方推荐的导出完整图片的方法
// 它会导出整个图的全部内容（包括不可见区域），而不仅仅是当前视口可见部分
// API 签名: graph.toFullDataURL(callback, type?, imageConfig?)
//   - callback: 必填，回调函数接收 base64 data URL 字符串
//   - type: 可选，图片类型，默认 image/png
//   - imageConfig: 可选，{ backgroundColor, padding }

export function exportToJPG(graph: any, filename = 'go-roadmap') {
  try {
    // 使用 G6 官方 toFullDataURL API 导出完整图片
    // 该方法会异步渲染整张图并返回包含所有节点和边的完整图片
    graph.toFullDataURL(
      (dataUrl: string) => {
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      'image/png',
      {
        backgroundColor: '#fff',
        padding: [30, 20, 30, 20],
      }
    );
  } catch (err) {
    console.error('[Export] PNG export failed:', err);
    alert('导出图片失败，请重试');
  }
}

// ==================== PDF 文档导出 (G6 官方 toFullDataURL API) ====================

export function exportToPDF(graph: any, filename = 'go-roadmap') {
  try {
    // 使用 G6 官方 toFullDataURL API 获取完整图片
    graph.toFullDataURL(
      (dataUrl: string) => {
        // 创建 Image 对象获取图片尺寸
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const imgWidth = img.width;
          const imgHeight = img.height;

          // A4 尺寸: 210mm x 297mm，计算缩放比例让图片适应页面
          const a4Width = 210;
          const a4Height = 297;
          const margin = 10; // mm
          const maxW = a4Width - margin * 2;
          const maxH = a4Height - margin * 2;

          const scaleW = maxW / (imgWidth * 0.264583); // px to mm
          const scaleH = maxH / (imgHeight * 0.264583);
          const scale = Math.min(scaleW, scaleH, 1);

          const pdfW = imgWidth * 0.264583 * scale;
          const pdfH = imgHeight * 0.264583 * scale;

          const pdf = new jsPDF({
            orientation: pdfW > pdfH ? 'landscape' : 'portrait',
            unit: 'mm',
            format: 'a4',
          });

          // 居中放置
          const x = (a4Width - pdfW) / 2;
          const y = (a4Height - pdfH) / 2;

          pdf.addImage(dataUrl, 'PNG', x, y, pdfW, pdfH);

          // 添加标题
          pdf.setFontSize(14);
          pdf.setTextColor(24, 144, 255);
          pdf.text('Go 学习思维导图', a4Width / 2, 8, { align: 'center' });

          pdf.save(`${filename}.pdf`);
        };
        img.src = dataUrl;
      },
      'image/png',
      {
        backgroundColor: '#fff',
        padding: [30, 20, 30, 20],
      }
    );
  } catch (err) {
    console.error('[Export] PDF export failed:', err);
    alert('导出PDF失败，请重试');
  }
}


