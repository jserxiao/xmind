# 调度器相关

## Go 调度器的演进

### Go 1.0 - 简单的 G-M 模型
- 全局队列，一个全局锁
- 所有 M 竞争同一个锁，性能差

### Go 1.1 - 引入 P
- 引入 P（Processor），每个 P 有本地队列
- Work Stealing 机制
- 大幅减少锁竞争

### Go 1.5 - 自旋 M 和网络轮询器
- 自旋 M 减少线程阻塞/唤醒开销
- 网络轮询器 (netpoll) 处理网络 I/O
- 移除旧的调度器代码

### Go 1.14 - 异步抢占
- 基于信号的异步抢占
- 解决死循环无法抢占的问题

## 调度策略

### 调度顺序

```
本地队列 -> 全局队列 -> 网络轮询器 -> Work Stealing
```

M 从 P 中获取 G 的优先级：
1. **P 的本地队列** - 最快，无锁
2. **全局队列** - 需要获取全局锁
3. **网络轮询器** - 检查是否有网络 I/O 就绪的 G
4. **Work Stealing** - 从其他 P 偷取一半的 G

### 系统调用时的处理

```
G 执行系统调用:
┌─────────────┐
│  G 进入 syscall │
│  P 与 M 解绑    │
│  P 寻找/唤醒新 M │
│  P 继续执行其他 G │
└─────────────┘
     ↓ syscall 完成
┌─────────────┐
│  G 尝试回到 P   │
│  有空闲位置: 放入本地队列 │
│  无空闲位置: 放入全局队列 │
└─────────────┘
```

## 常用调试方法

```go
// 查看 GMP 数量
fmt.Println("NumGoroutine:", runtime.NumGoroutine())
fmt.Println("NumCPU:", runtime.NumCPU())

// 打印调度信息
// GODEBUG=scheddetail=1,schedtrace=1000 ./myapp

// 查看 stack trace
// go tool pprof http://localhost:6060/debug/pprof/goroutine?debug=2
```

## 调度相关环境变量

| 变量 | 说明 |
|------|------|
| `GOMAXPROCS` | 设置最大 P 数量 |
| `GODEBUG` | 调试选项 |
| `GOGC` | GC 触发比例（默认 100） |
| `GOMEMLIMIT` | 内存限制 (Go 1.19+) |

## 性能优化建议

1. **合理设置 GOMAXPROCS** - CPU 密集型任务可设为核数；I/O 密集型可适当增加
2. **避免创建过多 Goroutine** - 使用 worker pool 控制并发数
3. **减少系统调用** - 批量操作优于多次小操作
4. **利用 netpoll** - Go 的网络 I/O 是非阻塞的，充分利用
