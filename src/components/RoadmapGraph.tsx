import { useEffect, useRef, useCallback, useState } from 'react';
import G6 from '@antv/g6';
import { loadRoadmapData, enrichWithSubNodes, type RoadmapNode } from '../data/roadmapData';
import { useNavigate } from 'react-router-dom';
import { exportToJPG, exportToPDF } from '../utils/exportMindmap';

interface RoadmapGraphProps {
  onNodeClick?: (nodeData: any) => void;
}

// ─── 数据转换 ─────────────────────────────────────────────
function convertToTreeData(node: RoadmapNode): any {
  const nodeData: any = {
    id: node.id,
    label: node.label,
    mdPath: node.mdPath,
    url: node.url,
    description: node.description,
    originalType: node.type,
  };
  switch (node.type) {
    case 'root':   nodeData.type = 'root-node';   nodeData.size = [220, 70]; break;
    case 'branch': nodeData.type = 'branch-node'; nodeData.size = [130, 40]; break;
    case 'leaf':   nodeData.type = 'leaf-node';   nodeData.size = [160, 36]; break;
    case 'link':   nodeData.type = 'link-node';   nodeData.size = [150, 30]; break;
    case 'sub':    nodeData.type = 'sub-node';    nodeData.size = [120, 26]; break;
  }
  if (node.children?.length) {
    nodeData.children = node.children.map(convertToTreeData);
  }
  return nodeData;
}

// ─── 缩放策略（纯函数，无副作用）─────────────────────────
function zoomForType(type: string): number {
  switch (type) {
    case 'root':   return 1.2;
    case 'branch': return 2.0;
    case 'sub':    return 3.5;
    default:       return 2.8;   // leaf / link
  }
}

// ─── 主组件 ───────────────────────────────────────────────
const RoadmapGraph: React.FC<RoadmapGraphProps> = ({ onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ── 面板状态 ──
  const [panelOpen, setPanelOpen] = useState(false);
  const [rawData, setRawData] = useState<RoadmapNode | null>(null);

  // ── 聚焦：focusItem 居中 → zoomTo 放大（以画布中心为锚点）──
  const focusQueue = useRef<string[]>([]);
  const rafId = useRef<number>(0);
  const isAnimatingRef = useRef(false);

  /** 入队 */
  const focusNode = useCallback((id: string) => {
    focusQueue.current = [id];
    if (!rafId.current && !isAnimatingRef.current) {
      rafId.current = requestAnimationFrame(tick);
    }
  }, []);

  function tick() {
    const id = focusQueue.current.shift();
    if (!id) { rafId.current = 0; return; }

    const graph = (window as any).__g6Graph__ || graphRef.current;
    if (!graph) { rafId.current = 0; return; }

    const item = graph.findById(id);
    if (!item) { rafId.current = 0; return; }

    isAnimatingRef.current = true;
    rafId.current = 0;

    const model = item.getModel();
    const targetZoom = zoomForType(model.originalType);
    const cx = graph.get('width') / 2;
    const cy = graph.get('height') / 2;

    console.log(`[focus] → "${model.label}" | zoom=${targetZoom}`);

    // Step 1: focusItem 把节点移到视口中心（带动画）
    graph.focusItem(item, true, { easing: 'easeCubic', duration: 400 });

    // Step 2: focusItem 动画结束后，以画布中心为锚点放大
    setTimeout(() => {
      const g = (window as any).__g6Graph__ || graphRef.current;
      if (g) {
        g.zoomTo(targetZoom, { x: cx, y: cy, easing: 'easeCubic', duration: 250 });
      }
      // 解锁
      setTimeout(() => {
        isAnimatingRef.current = false;
        if (focusQueue.current.length > 0) {
          rafId.current = requestAnimationFrame(tick);
        }
      }, 300);
    }, 450);
  }

  // ── 注册自定义节点 ──
  const registerCustomNodes = useCallback(() => {
    G6.registerNode('root-node', {
      draw(cfg: any, group: any) {
        const w = (cfg.size || [200, 60])[0], h = (cfg.size || [200, 60])[1];
        const box = group.addShape('rect', {
          attrs: { x: -w/2, y: -h/2, width: w, height: h, radius: 10,
            fill: '#1890ff', stroke: '#096dd9', lineWidth: 3,
            shadowColor: 'rgba(24,144,255,.3)', shadowBlur: 20, cursor: 'pointer' },
          name: 'root-box',
        });
        group.addShape('text', { attrs: { x: -w/2+15, y: -h/2+h/2+1, text: '📘', fontSize: 20 }, name: 'root-icon' });
        (cfg.label || '').split('\n').forEach((line: string, i: number) =>
          group.addShape('text', { attrs: { x: -w/2+45, y: -h/2+22+i*24, text: line,
            fontSize: i?14:17, fontWeight: i?'normal':'bold', fill: '#fff' }, name: `rt-${i}` }));
        return box;
      },
      setState(name: string, value: boolean, item: any) {
        const b = item.getContainer().find((e:any)=>e.get('name')==='root-box');
        if (name === 'hover' && b) { b.attr('shadowBlur', value?30:20); b.attr('fill', value?'#40a9ff':'#1890ff'); }
      },
    });

    G6.registerNode('branch-node', {
      draw(cfg: any, group: any) {
        const w = (cfg.size||[130,38])[0], h = (cfg.size||[130,38])[1];
        const box = group.addShape('rect', {
          attrs: { x:-w/2, y:-h/2, width:w, height:h, radius:8,
            fill:'#e6f7ff', stroke:'#1890ff', lineWidth:2, cursor:'pointer' },
          name: 'branch-box',
        });
        group.addShape('rect', { attrs: { x:-w/2, y:-h/2, width:4, height:h, radius:[8,0,0,8], fill:'#1890ff' }, name: 'bar' });
        if (cfg.children?.length)
          group.addShape('text', { attrs: { x:w/2-14, y:4, text: cfg.collapsed?'+':'−', fontSize:12, fill:'#1890ff', fontWeight:'bold' }, name:'tg' });
        group.addShape('text', { attrs: { x:-w/2+12, y:3, text:cfg.label||'', fontSize:12.5, fontWeight:'600', fill:'#0050b3' }, name:'bt' });
        return box;
      },
      setState(name:string, value:boolean, item:any) {
        const g=item.getContainer(), b=g.find((e:any)=>e.get('name')==='branch-box'), bar=g.find((e:any)=>e.get('name')==='bar');
        if (name==='hover'&&b&&bar){b.attr('fill',value?'#bae7ff':'#e6f7ff');bar.attr('fill',value?'#40a9ff':'#1890ff');}
      },
    });

    G6.registerNode('leaf-node', {
      draw(cfg: any, group: any) {
        const w=(cfg.size||[160,36])[0], h=(cfg.size||[160,36])[1];
        const box=group.addShape('rect',{
          attrs:{x:-w/2,y:-h/2,width:w,height:h,radius:17,fill:'#f6ffed',stroke:'#b7eb8f',lineWidth:1.5,cursor:'pointer'},name:'lb'});
        group.addShape('rect',{attrs:{x:-w/2+6,y:-h/3,width:2,height:h*.66,radius:1,fill:'#52c41a',opacity:.5},name:'ld'});
        group.addShape('text',{attrs:{x:-w/2+22,y:3,text:cfg.label||'',fontSize:11.5,fill:'#389e0d'},name:'lt'});
        group.addShape('text',{attrs:{x:w/2-18,y:5,text:'📖',fontSize:13,cursor:'pointer'},name:'dit',capture:true});
        if(cfg.children?.length)
          group.addShape('text',{attrs:{x:w/2-40,y:4,text:cfg.collapsed?'+':'−',fontSize:12,fill:'#52c41a',fontWeight:'bold',cursor:'pointer'},name:'ltt',capture:true});
        return box;
      },
      setState(name:string,value:boolean,item:any){
        const b=item.getContainer().find((e:any)=>e.get('name')==='lb');
        if(name==='hover'&&b){b.attr('fill',value?'#d9f7be':'#f6ffed');b.attr('stroke',value?'#52c41a':'#b7eb8f');}
      },
    });

    G6.registerNode('link-node', {
      draw(cfg:any,group:any){
        const w=(cfg.size||[150,28])[0],h=(cfg.size||[150,28])[1];
        const box=group.addShape('rect',{attrs:{x:-w/2,y:-h/2,width:w,height:h,radius:14,fill:'#fffbe6',lineDash:[4,2],stroke:'#ffe58f',lineWidth:1.5,cursor:'pointer'},name:'lk'});
        group.addShape('text',{attrs:{x:-w/2+8,y:3,text:'🔗',fontSize:10},name:'li'});
        const t=(cfg.label||'').length>18?(cfg.label||'').slice(0,16)+'...':(cfg.label||'');
        group.addShape('text',{attrs:{x:-w/2+22,y:3,text:t,fontSize:10,fill:'#ad6800'},name:'lkt'});
        group.addShape('text',{attrs:{x:w/2-20,y:4,text:'📖',fontSize:10,cursor:'pointer'},name:'ldit',capture:true});
        if(cfg.children?.length)
          group.addShape('text',{attrs:{x:w/2-37.5,y:4,text:cfg.collapsed?'+':'−',fontSize:11,fill:'#fa8c16',fontWeight:'bold',cursor:'pointer'},name:'ltt',capture:true});
        return box;
      },
      setState(name:string,value:boolean,item:any){
        const b=item.getContainer().find((e:any)=>e.get('name')==='lk');
        if(name==='hover'&&b){b.attr('fill',value?'#fff1b8':'#fffbe6');b.attr('stroke',value?'#ffc53d':'#ffe58f');}
      },
    });

    G6.registerNode('sub-node', {
      draw(cfg:any,group:any){
        const w=(cfg.size||[110,24])[0],h=(cfg.size||[110,24])[1];
        const box=group.addShape('rect',{attrs:{x:-w/2,y:-h/2,width:w,height:h,radius:12,fill:'#f0f5ff',stroke:'#adc6ff',lineWidth:1,cursor:'default'},name:'sb'});
        const t=(cfg.label||'').length>14?(cfg.label||'').slice(0,12)+'..':(cfg.label||'');
        group.addShape('text',{attrs:{x:-w/2+17,y:2,text:t,fontSize:10,fill:'#2f54eb'},name:'st'});
        return box;
      },
      setState(name:string,value:boolean,item:any){
        const b=item.getContainer().find((e:any)=>e.get('name')==='sb');
        if(name==='hover'&&b){b.attr('fill',value?'#d6e4ff':'#f0f5ff');b.attr('stroke',value?'#597ef7':'#adc6ff');}
      },
    });
  }, []);

  // ── 初始化图 ──
  useEffect(() => {
    if (!containerRef.current) return;
    registerCustomNodes();

    let destroyed = false;

    const init = async () => {
      try {
        const root = await loadRoadmapData();
        if (destroyed) return;
        const enriched = await enrichWithSubNodes(root);
        if (destroyed) return;

        setRawData(enriched); // 保存原始数据给面板使用

        const treeData = convertToTreeData(enriched);
        const graph = new G6.TreeGraph({
          container: containerRef.current,
          width: containerRef.current.clientWidth || window.innerWidth,
          height: containerRef.current.clientHeight || window.innerHeight - 220,
          modes: { default: [
            { type: 'drag-canvas', enableOptimize: true },
            { type: 'zoom-canvas', sensitivity: 1.5, minZoom: 0.08, maxZoom: 25 },
          ]},
          defaultEdge: {
            type: 'cubic-horizontal',
            style: { stroke: '#c6c6c6', lineWidth: 1.2,
              endArrow: { path: G6.Arrow.triangle(4,6,0), fill: '#c6c6c6', d: 0 } },
          },
          layout: { type: 'compactBox', direction: 'LR',
            getId: (d:any) => d.id, getHeight: () => 30, getWidth: () => 80,
            getVGap: () => 20, getHGap: () => 55 },
          animate: true,
          animateCfg: { duration: 300, easing: 'easeCubic' },
        });

        graph.data(treeData);
        graph.render();
        graph.fitView(15);

        // 初始加载后平滑定位到根节点
        setTimeout(() => {
          if (destroyed) return;
          const rn = graph.findById(treeData.id);
          if (rn) graph.focusItem(rn, true, { easing: 'easeCubic', duration: 500 });
        }, 400);

        // ── 节点点击事件 ──
        graph.on('node:click', (evt: any) => {
          const { item, target } = evt;
          if (!item) return;
          const model = item.getModel();
          const tn = target?.get('name') || '';

          // 详情图标 → 导航
          if (tn.includes('detail-icon') || tn.includes('detail-bg') || tn.includes('detail-text')) {
            if (model.mdPath) navigate(`/knowledge/${model.mdPath.replace('.md','')}`, {
              state: { label: model.label, mdPath: model.mdPath, description: model.description, url: model.url },
            });
            else if (model.url) window.open(model.url, '_blank');
            return;
          }

          // 展开/收起
          if (tn.includes('toggle')) {
            if (model.children?.length) {
              graph.updateItem(item, { collapsed: !model.collapsed });
              graph.layout(false);
            }
            return;
          }

          // 叶子/链接节点主体 → 导航
          if (!model.children?.length && (model.originalType === 'leaf' || model.originalType === 'link')) {
            if (model.mdPath) navigate(`/knowledge/${model.mdPath.replace('.md','')}`, {
              state: { label: model.label, mdPath: model.mdPath, description: model.description, url: model.url },
            });
            else if (model.url) window.open(model.url, '_blank');
          }
        });

        // 悬停效果
        graph.on('node:mouseenter', (evt: any) => {
          if (!evt.item || !containerRef.current) return;
          const tn = evt.target?.get('name') || '';
          if (tn.includes('detail-icon') || tn.includes('detail-bg') || tn.includes('detail-text'))
            graph.setItemState(evt.item, 'icon-hover', true);
          else
            graph.setItemState(evt.item, 'hover', true);
          containerRef.current.style.cursor = 'pointer';
        });
        graph.on('node:mouseleave', (evt: any) => {
          if (!evt.item || !containerRef.current) return;
          graph.setItemState(evt.item, 'hover', false);
          graph.setItemState(evt.item, 'icon-hover', false);
          containerRef.current.style.cursor = 'default';
        });

        graphRef.current = graph;
        (window as any).__g6Graph__ = graph;
        setLoading(false);
      } catch (err) {
        console.error('[graph] init failed:', err);
        setLoading(false);
      }
    };

    init();

    const handleResize = () => {
      if (!containerRef.current || !graphRef.current) return;
      graphRef.current.changeSize(containerRef.current.clientWidth,
        containerRef.current.clientHeight || window.innerHeight - 220);
      graphRef.current.fitView(15);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      destroyed = true;
      window.removeEventListener('resize', handleResize);
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (graphRef.current) { graphRef.current.destroy(); graphRef.current = null; }
    };
  }, [navigate, onNodeClick, registerCustomNodes]);

  // ── 工具栏操作 ──
  const fitView = () => { if (graphRef.current) graphRef.current.fitView(15); };
  const zoomIn = () => { if (graphRef.current) { const z = graphRef.current.getZoom(); graphRef.current.zoomTo(z * 1.3, { x: innerWidth/2, y: innerHeight/2 }); }};
  const zoomOut = () => { if (graphRef.current) { const z = graphRef.current.getZoom(); graphRef.current.zoomTo(z * 0.77, { x: innerWidth/2, y: innerHeight/2 }); }};
  const resetZoom = () => { if (graphRef.current) graphRef.current.zoomTo(1, { x: innerWidth/2, y: innerHeight/2 }); };

  // ── 面板：递归渲染树节点 ──
  const renderTree = (nodes: RoadmapNode[], depth = 0): React.ReactNode => {
    return nodes.map(node => {
      const hasKids = !!node.children?.length;
      return (
        <div key={node.id}>
          <div
            className="tree-node-content"
            style={{ paddingLeft: `${depth * 16 + 10}px` }}
            onClick={() => focusNode(node.id)}
          >
            <span className="tree-icon" style={{
              color: { root:'#1890ff', branch:'#1890ff', leaf:'#52c41a', link:'#fa8c16', sub:'#597ef7' }[node.type] || '#888',
            }}>
              {{ root:'📘', branch:'📂', leaf:'🟢', link:'🔗', sub:'📝' }[node.type] || '⚪'}
            </span>
            <span className="tree-label" title={node.label}>
              {node.label.replace(/\n/g, ' ').slice(0, 30)}
            </span>
          </div>
          {hasKids && (
            <div className="tree-children">
              {renderTree(node.children!, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // ── 导出 ──
  const handleExportJPG = () => { if (graphRef.current) exportToJPG(graphRef.current, 'Go学习路线图'); setShowExportMenu(false); };
  const handleExportPDF = () => { if (graphRef.current) exportToPDF(graphRef.current, 'Go学习路线图'); setShowExportMenu(false); };

  // ══════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="graph-container">
      {/* 工具栏 */}
      <div className="graph-toolbar">
        <div className="toolbar-title">📘 Go 学习路线图</div>
        <div className="toolbar-actions">
          <button onClick={fitView} className="toolbar-btn" title="适应画布">⊞ 适应画布</button>
          <button onClick={zoomIn} className="toolbar-btn" title="放大">🔍+</button>
          <button onClick={zoomOut} className="toolbar-btn" title="缩小">🔍−</button>
          <button onClick={resetZoom} className="toolbar-btn" title="实际大小">1:1</button>

          <button onClick={() => setPanelOpen(!panelOpen)} className="toolbar-btn"
            title="节点导航面板" style={{ marginLeft: 8 }}>
            🌳 节点
          </button>

          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={() => setShowExportMenu(!showExportMenu)} className="toolbar-btn"
              title="导出" style={{ marginLeft: 8 }}>📥 导出</button>
            {showExportMenu && (
              <div className="export-dropdown" onMouseLeave={() => setShowExportMenu(false)}>
                <div onClick={handleExportJPG} className="export-item">🖼️ 导出为 PNG</div>
                <div onClick={handleExportPDF} className="export-item">📄 导出为 PDF</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div className="graph-legend">
        <div className="legend-item"><span className="legend-color legend-root"></span><span>根节点</span></div>
        <div className="legend-item"><span className="legend-color legend-branch"></span><span>分类</span></div>
        <div className="legend-item"><span className="legend-color legend-leaf"></span><span>知识点</span></div>
        <div className="legend-item"><span className="legend-color legend-link"></span><span>外部资源</span></div>
        <div className="legend-item"><span className="legend-color legend-sub"></span><span>细分知识点</span></div>
      </div>

      {/* 提示 */}
      <div className="graph-hint">
        👆 点击 📖 进入详情 &nbsp;|&nbsp; ± 展开/收起 &nbsp;|&nbsp; 拖拽平移 · 滚轮缩放 &nbsp;|&nbsp; 🌳 快速定位节点
      </div>

      {/* 加载 */}
      {loading && (
        <div className="graph-loading">
          <div className="loading-spinner-small"></div>
          <span>正在加载数据...</span>
        </div>
      )}

      {/* 悬浮导航面板 */}
      {panelOpen && rawData && (
        <div className="tree-panel">
          <div className="tree-panel-header">
            <span>🌳 节点导航</span>
            <button className="tree-panel-close" onClick={() => setPanelOpen(false)}>✕</button>
          </div>
          <div className="tree-panel-body">
            {renderTree([rawData])}
          </div>
          <div className="tree-panel-footer">点击节点 → 定位 &amp; 缩放</div>
        </div>
      )}

      {/* G6 画布 */}
      <div ref={containerRef} className="graph-canvas" />
    </div>
  );
};

export default RoadmapGraph;
