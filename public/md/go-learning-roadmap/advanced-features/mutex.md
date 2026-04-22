# 互斥锁 (mutex)

## 概述

`sync.Mutex` 和 `sync.RWMutex` 是 Go 中用于保护共享数据的基本同步原语。

## sync.Mutex (互斥锁)

```go
var mu sync.Mutex
var count int

func increment() {
    mu.Lock()         // 获取锁
    defer mu.Unlock() // 确保释放
    
    count++
}
```

### 注意事项

1. **不要复制 Mutex** - 复制后行为未定义
2. **不要在锁定期间调用未知函数** - 可能导致死锁
3. **始终使用 defer Unlock** - 防止忘记解锁

## sync.RWMutex (读写锁)

```go
var rwmu sync.RWMutex
var data map[string]string

func read(key string) string {
    rwmu.RLock()         // 读锁（多个 goroutine 可同时获取）
    defer rwmu.RUnlock()
    return data[key]
}

func write(key, value string) {
    rwmu.Lock()          // 写锁（独占）
    defer rwmu.Unlock()
    data[key] = value
}
```

### 适用场景

- **读多写少** 的场景使用 RWMutex
- 读写性能差异不大时，直接用 Mutex 更简单

## 常见错误

### 死锁

```go
// 错误: 重复加锁
mu.Lock()
mu.Lock() // 死锁！

// 错误: 加锁后未解锁就再次尝试
func bad() {
    mu.Lock()
    otherFunction() // 如果其他函数也尝试获取同一个锁...
    mu.Unlock()
}
```

### 忘记解锁

```go
// 危险: 如果中间发生 panic，锁不会被释放
func dangerous() {
    mu.Lock()
    doSomething() // 可能 panic!
    mu.Unlock() // 不会执行！
}

// 正确: 使用 defer
func safe() {
    mu.Lock()
    defer mu.Unlock() // 即使 panic 也会执行
    doSomething()
}
```

## 替代方案

### sync.Map (并发安全 Map)

适用于以下场景：
- key 类型稳定（很少变化）
- 读多写少或不同 key 被不同的 goroutine 操作

```go
var m sync.Map

m.Store("key", "value")
v, ok := m.Load("key")
m.Delete("key")

m.Range(func(key, value any) bool {
    fmt.Println(key, value)
    return true // 继续遍历
})
```

### atomic (原子操作)

对于简单的数值操作：

```go
var counter int64

// 原子操作比 mutex 更轻量
atomic.AddInt64(&counter, 1)
value := atomic.LoadInt64(&counter)
```

## 性能建议

1. **减少锁的粒度** - 锁住尽可能小的代码区域
2. **避免热点** - 不要让所有 goroutine 竞争同一个锁
3. **考虑无锁设计** - 使用 channel 或原子操作替代
4. **Profile 分析** - 使用 `go tool pprof` 检查锁竞争
