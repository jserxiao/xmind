# Goroutine 调度模型和区别

## Goroutine vs 线程 vs 协程

| 特性 | Goroutine | 线程 (Thread) | 协程 (Coroutine) |
|------|-----------|---------------|-----------------|
| 创建者 | Go Runtime | OS | 用户程序 |
| 切换者 | Go Scheduler | OS | 用户程序 |
| 栈大小 | 2KB 起，动态增长 | 固定 1-8MB | 通常固定 |
| 切换成本 | ~几 ns | ~几 μs | ~几 ns |
| 调度方式 | 抢占 + 协作 | 抢占式 | 协作式 |
| 并行性 | 可多核并行 | 多核并行 | 单线程 |

## Goroutine 的栈管理

### 栈结构

```
初始: [2KB]
       ↓
增长: [2KB → 4KB → 8KB → ... → 1GB max]
       ↓
收缩: 当栈使用率低于 1/4 时收缩
```

### 栈扩展示例

```go
func growStack(n int) int {
    if n <= 0 {
        return 0
    }
    var buf [1024]byte // 每次调用占用 1KB 栈空间
    return growStack(n - 1) + len(buf)
}
// 随着递归深度增加，goroutine 的栈会自动增长
```

## Goroutine 的生命周期

```
创建 (go func())
   ↓
就绪 (Runnable) - 在 P 的队列中等待
   ↓
运行 (Running) - M 正在执行
   ↓
┌───────────────────────────────┐
│ 系统调用 (Syscall)            │ ← M 解绑 P
│ 阻塞 (Waiting/Blocking)      │ ← G 移出运行队列
│ 已结束 (Dead/Finished)        │ ← 清理资源
└───────────────────────────────┘
```

## 常见问题

### Q: 如何控制 goroutine 数量？

```go
// 方式1: 带 buffer channel 作为信号量
sem := make(chan struct{}, 10)

for i := 0; i < 100; i++ {
    go func(i int) {
        sem <- struct{}{}
        defer func() { <-sem }()
        doWork(i)
    }(i)
}

// 方式2: errgroup
g, _ := errgroup.WithContext(ctx)
g.SetLimit(10) // 最大并发数

for _, task := range tasks {
    task := task
    g.Go(func() error { return process(task) })
}
g.Wait()
```

### Q: goroutine 泄漏怎么检测？

```go
// 使用 pprof 查看 goroutine stack trace
import _ "net/http/pprof"

go http.ListenAndServe(":6060", nil)
// 访问 http://localhost:6060/debug/pprof/goroutine?debug=2
```
