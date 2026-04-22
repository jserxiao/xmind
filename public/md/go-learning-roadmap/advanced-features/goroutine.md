# 协程 (goroutine)

## 概述

Goroutine 是 Go 并发模型的核心，是轻量级的线程，由 Go 运行时管理，而非操作系统。

## 基本用法

```go
go func() {
    fmt.Println("hello from goroutine")
}()

// 带参数
go func(msg string) {
    fmt.Println(msg)
}("hello")
```

## Goroutine vs 线程

| 特性 | Goroutine | OS Thread |
|------|-----------|-----------|
| 初始栈大小 | 2KB (可增长) | 通常 1-8MB |
| 创建成本 | ~几微秒 | ~几毫秒 |
| 切换成本 | 低（用户态） | 高（内核态） |
| 调度方式 | 协作式 + 抢占式 | 抢占式 |

## 调度模型: GMP

```
G (Goroutine) - 用户态协程
M (Machine)   - 操作系统线程
P (Processor) - 逻辑处理器（持有本地运行队列）
```

### 工作流程

1. G 在 P 的本地队列中等待运行
2. M 从 P 的队列中取出 G 执行
3. G 阻塞时，M 可以切换执行其他 G
4. P 的队列为空时，从其他 P 偷取 G（Work Stealing）

## 控制 Goroutine 数量

### 使用带缓冲 Channel 作为信号量
```go
var sem = make(chan struct{}, 10) // 最多10个并发

func process(task Task) {
    sem <- struct{}{}        // 获取信号量
    defer func() { <-sem }() // 释放信号量
    
    // 处理任务...
}
```

### 使用 errgroup
```go
g, ctx := errgroup.WithContext(context.Background())
for _, task := range tasks {
    task := task
    g.Go(func() error {
        return process(ctx, task)
    })
}
if err := g.Wait(); err != nil {
    // 处理错误
}
```

## Goroutine 泄漏

Goroutine 泄漏类似于内存泄漏：goroutine 创建后永远不会退出。

### 常见原因

1. **从 channel 发送但没人接收**
2. **等待永远不会有值的 channel**
3. **忘记使用 context 取消**

### 预防方法

```go
// 使用 context 控制生命周期
func worker(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            return // 正常退出
        case task := <-taskCh:
            handle(task)
        }
    }
}
```

## 最佳实践

1. **不要启动无法控制的 goroutine** - 总是有办法停止它
2. **使用 context 管理 goroutine 生命周期**
3. **限制并发数量** - 使用 semaphore 或 worker pool
4. **注意闭包捕获变量** - 循环中的变量要正确传递
5. **使用 errgroup 管理一组 goroutine**
