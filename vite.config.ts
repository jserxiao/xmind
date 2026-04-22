import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs';
import path from 'path';

// 自定义插件：处理 MD 文件的读写
function mdFilePlugin() {
  const mdRoot = path.resolve(__dirname, 'public/md');
  
  return {
    name: 'md-file-plugin',
    configureServer(server) {
      // 保存 MD 文件
      server.middlewares.use('/api/md/save', (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { mdPath, content } = JSON.parse(body);
              const filePath = path.join(mdRoot, `${mdPath}.md`);
              const dir = path.dirname(filePath);
              
              // 确保目录存在
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              
              // 写入文件
              fs.writeFileSync(filePath, content, 'utf-8');
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, path: filePath }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }
        next();
      });
      
      // 更新 index.md
      server.middlewares.use('/api/md/index', (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { content } = JSON.parse(body);
              const filePath = path.join(mdRoot, 'index.md');
              
              fs.writeFileSync(filePath, content, 'utf-8');
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }
        next();
      });
      
      // 删除节点（删除对应的 MD 文件）
      server.middlewares.use('/api/md/delete', (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { mdPath } = JSON.parse(body);
              const filePath = path.join(mdRoot, `${mdPath}.md`);
              
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }
        next();
      });
      
      // 更新 index.json
      server.middlewares.use('/api/json/index', (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const filePath = path.join(mdRoot, 'index.json');
              
              // 格式化 JSON 并写入文件
              fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, path: filePath }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mdFilePlugin()],
})
