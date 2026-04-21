# GMP 调度模型

## 核心概念

Go 的调度器使用 **GMP** 模型：

- **G (Goroutine)**: 协程，用户态轻量级线程
- **M (Machine/Thread)**: 操作系统内核线程
- **P (Processor)**: 逻辑处理器，维护本地 goroutine 运行队列

## 工作流程

```
                    全局队列
                       |
    [P0] [P1] [P2] [P3]  ...  本地队列
     |    |    |    |
     M    M    M    M     OS 线程
     |    |    |    |
     G    G    G    G     Goroutine
```

### 详细过程

1. **创建 G** - `go func()` 创建一个 G，放入 P 的本地队列
2. **获取 M** - P 绑定一个 M（OS 线程）
3. **执行 G** - M 从 P 的本地队列取出 G 执行
4. **调度** - G 阻塞时，M 切换执行其他 G；P 的队列为空时从全局队列或其他 P 偷取 G

## 关键问题

### Q: 一个程序有多少个 P？

默认等于 CPU 核心数，可通过 `runtime.GOMAXPROCS()` 修改。

### Q: M 的数量是固定的吗？

不是。M 会动态增长：
- 当所有 M 都在阻塞时，会创建新的 M
- 最大数量默认为 10000 (`runtime/debug.SetMaxThreads` 可修改)

### Q: 什么是 Work Stealing？

当 P 的本地队列为空时，它会随机选择另一个 P，偷取其队列中一半的 G。

### Q: 抢占式调度是什么？

Go 1.14+ 引入了基于信号的抢占式调度：
- 基于**信号 (SIGURG)** 的异步抢占
- 解决了长时间循环不主动让出 CPU 的问题

## 调度时机

G 会主动或被动让出 CPU：

1. **系统调用** - 网络和文件 I/O
2. **Channel 操作** - 发送/接收阻塞
3. **Mutex 竞争** - 获取锁失败
4. **time.Sleep** - 休眠
5. **GC** - 垃圾回收期间
6. **函数调用** - 检查是否需要抢占 (Go 1.14+)

## 面试常见问题

### Q: Goroutine 为什么比线程轻量？
- 初始栈只有 2KB（线程通常 1-8MB）
- 栈可以动态伸缩
- 创建和切换成本极低（用户态调度）

### Q: 如何设置 GOMAXPROCS？
```go
// 查看
fmt.Println(runtime.NumCPU())

// 设置（通常不需要手动设置）
runtime.GOMAXPROCS(4)

// 或通过环境变量
// GOMAXPROCS=4 ./myapp
```
