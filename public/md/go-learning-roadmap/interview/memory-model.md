# 内存模型

## 概述

Go 内存模型规定了在什么条件下，对一个变量的读取可以保证看到其他 goroutine 对该变量写入的值。

## Happens-Before 原则

如果操作 A **happens-before** 操作 B，则 A 的结果对 B 可见。

### 保证 Happens-Before 的情况

1. **同一个 goroutine** 中，按代码顺序执行
2. **Channel 发送** happens-before **对应的接收完成**
3. **Channel 关闭** happens-before **从关闭的 channel 接收返回零值**
4. **无缓冲 channel** 的**接收** happens-before **发送完成**
5. **Mutex/RWMutex**：Unlock happens-before Lock
6. **Sync 包**：原子操作和同步原语提供 happens-before 保证

## Channel 的 Happens-Before

```go
// 发送 happens-before 接收完成
var msg string
go func() {
    msg = "hello"      // (1)
    ch <- struct{}{}   // (2) 发送
}()
<-ch                    // (3) 接收完成
print(msg)             // (4) 可以看到 "hello"
// 因为 (1) hb (2) hb (3) hb (4)
```

## 数据竞争 (Data Race)

### 什么是数据竞争？

两个 goroutine 同时访问同一变量，其中至少一个是写操作，且没有同步机制。

```go
// ❌ 数据竞争！
var x int
go func() { x = 1 }()
go func() { x = 2 }()
fmt.Println(x) // 结果不确定: 可能是 0, 1, 或 2
```

### 如何检测？

```bash
# 使用 -race 标志运行
go run -race main.go
go test -race ./...

# 输出示例:
# WARNING: DATA RACE
# Write by goroutine X:
#   main.go:10
# Read by goroutine Y:
#   main.go:15
```

### 如何修复？

```go
// ✅ 方式1: 使用 channel
ch := make(chan int)
go func() { ch <- 1 }()
x := <-ch

// ✅ 方式2: 使用 mutex
var mu sync.Mutex
mu.Lock()
x = 1
mu.Unlock()

// ✅ 方式3: 使用原子操作
atomic.StoreInt64(&x, 1)
```

## 内存顺序保证

Go 不像 C/C++ 那样暴露弱内存模型。在 Go 中：

- **Channel 操作** 提供强排序保证
- **原子操作** 是 sequentially consistent 的
- **编译器不会做非法的重排**

## 最佳实践

1. **始终使用 `-race` 进行测试** - 在 CI 中加入竞态检测
2. **不要依赖"看起来能工作"的代码** - 竞态是未定义行为
3. **优先使用 channel** - Go 的惯用做法
4. **必要时使用 sync/atomic** - 高性能场景
