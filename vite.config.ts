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
      
      // 创建新的思维导图
      server.middlewares.use('/api/roadmap/create', (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { folderName, name, description, icon, color, rootPath } = JSON.parse(body);
              
              // 计算实际的目标路径
              // rootPath 是用户设置的路径，如 'md'、'public/md' 或其他
              let targetRoot = mdRoot; // 默认是 public/md
              if (rootPath) {
                // 标准化路径：移除开头的 public/
                const normalizedRootPath = rootPath.replace(/^public\/?/, '');
                if (normalizedRootPath === 'md' || normalizedRootPath === '') {
                  // 如果是 'md' 或空，使用默认的 mdRoot
                  targetRoot = mdRoot;
                } else if (normalizedRootPath !== 'md') {
                  // 其他自定义路径，相对于 public 目录
                  targetRoot = path.resolve(__dirname, 'public', normalizedRootPath);
                }
              }
              
              const folderPath = path.join(targetRoot, folderName);
              
              // 检查文件夹是否已存在
              if (fs.existsSync(folderPath)) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: '该文件夹已存在' }));
                return;
              }
              
              // 创建文件夹
              fs.mkdirSync(folderPath, { recursive: true });
              
              // 创建默认的 index.json
              const indexData = {
                id: folderName,
                label: name || folderName,
                type: 'root',
                description: description || `${name || folderName} 思维导图`,
                icon: icon || '📚',
                color: color || '#1890ff',
                children: []
              };
              
              const indexPath = path.join(folderPath, 'index.json');
              fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: true, 
                path: indexPath,
                roadmap: {
                  id: folderName,
                  name: indexData.label,
                  path: folderName,
                  description: indexData.description,
                  icon: indexData.icon,
                  color: indexData.color
                }
              }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }
        next();
      });
      
      // 扫描指定路径下的所有思维导图
      server.middlewares.use('/api/roadmap/scan', (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { rootPath } = JSON.parse(body);
              
              // 计算实际的目标路径
              let targetRoot = mdRoot;
              if (rootPath) {
                const normalizedRootPath = rootPath.replace(/^public\/?/, '');
                if (normalizedRootPath === 'md' || normalizedRootPath === '') {
                  targetRoot = mdRoot;
                } else {
                  targetRoot = path.resolve(__dirname, 'public', normalizedRootPath);
                }
              }
              
              // 检查目录是否存在
              if (!fs.existsSync(targetRoot)) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, roadmaps: [] }));
                return;
              }
              
              // 扫描所有子文件夹
              const entries = fs.readdirSync(targetRoot, { withFileTypes: true });
              const roadmaps = [];
              
              for (const entry of entries) {
                if (entry.isDirectory()) {
                  const indexPath = path.join(targetRoot, entry.name, 'index.json');
                  if (fs.existsSync(indexPath)) {
                    try {
                      const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
                      roadmaps.push({
                        id: entry.name,
                        name: data.label || entry.name,
                        path: entry.name,
                        description: data.description || `${entry.name} 思维导图`,
                        icon: data.icon || '📚',
                        color: data.color || '#1890ff',
                      });
                    } catch {
                      // 读取失败，跳过
                    }
                  }
                }
              }
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: true, 
                roadmaps,
                absolutePath: targetRoot // 返回绝对路径
              }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }
        next();
      });
      
      // 删除思维导图
      server.middlewares.use('/api/roadmap/delete', (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { folderName, rootPath } = JSON.parse(body);
              
              // 计算实际的目标路径
              let targetRoot = mdRoot;
              if (rootPath) {
                const normalizedRootPath = rootPath.replace(/^public\/?/, '');
                if (normalizedRootPath === 'md' || normalizedRootPath === '') {
                  targetRoot = mdRoot;
                } else {
                  targetRoot = path.resolve(__dirname, 'public', normalizedRootPath);
                }
              }
              
              const folderPath = path.join(targetRoot, folderName);
              
              // 检查文件夹是否存在
              if (!fs.existsSync(folderPath)) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: '该文件夹不存在' }));
                return;
              }
              
              // 递归删除文件夹
              fs.rmSync(folderPath, { recursive: true, force: true });
              
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
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mdFilePlugin()],
})
