# 性能分析工具 (pprof)

## 概述

`pprof` 是 Go 内置的性能分析和可视化工具，可以分析和可视化性能数据。

## 集成 pprof

```go
import _ "net/http/pprof"

func main() {
    go func() {
        log.Println(http.ListenAndServe(":6060", nil))
    }()
    
    // 应用逻辑...
}
```

## 使用方式

### 1. Web 界面

访问 `http://localhost:6060/debug/pprof/`

可查看：
- **allocs** - 内存分配采样
- **heap** - 堆内存快照
- **goroutine** - 当前所有 goroutine 的堆栈跟踪
- **block** - 阻塞操作
- **mutex** - 锁竞争
- **cpu** - CPU 分析（需要先采集）
- **threadcreate** - 线程创建

### 2. 命令行

```bash
# CPU 分析 (采集 30 秒)
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# 在 pprof 交互界面中:
(pprof) top10          # 查看 Top 10 热点函数
(pprof) list myFunc    # 查看具体函数的详细分析
(pprof) web            # 生成 SVG 图 (需要 graphviz)
(pprof) png            # 生成 PNG 图
(pprof) pdf            # 生成 PDF

# 内存分析
go tool pprof http://localhost:6060/debug/pprof/heap

# Goroutine 分析
go tool pprof http://localhost:6060/debug/pprof/goroutine
```

### 3. 测试中集成

```bash
# 运行带 CPU profiling 的测试
go test -cpuprofile=cpu.prof -bench=. ./...

# 运行带 memory profiling 的测试  
go test -memprofile=mem.prof -bench=. ./...

# 分析结果
go tool pprof cpu.prof
```

## 常用火焰图

```bash
# 安装 go-torch (已废弃，推荐使用 pprof 自带的 web 界面)
# Go 1.11+ 可以直接使用:
go tool pprof -http=:8080 cpu.prof
```

## 性能优化流程

1. **编写 Benchmark** - `go test -bench=.`
2. **采集 Profile** - `-cpuprofile=cpu.prof`
3. **分析热点** - `pprof top/web`
4. **定位瓶颈** - 找到最耗时的函数
5. **优化代码** - 针对性优化
6. **验证效果** - 再次 benchmark 对比
