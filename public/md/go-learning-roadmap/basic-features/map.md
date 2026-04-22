# 字典 (map)

## 概述

Map 是 Go 中的内置哈希表，提供键值对的存储和快速查找。

## 创建 Map

```go
// 1. 使用 make
m := make(map[string]int)

// 2. 字面量
m := map[string]int{
    "apple":  5,
    "banana": 3,
}

// 3. nil map (只读)
var m map[string]int // nil，不能写入
```

## 基本操作

```go
// 插入/更新
m["key"] = "value"

// 获取值
v := m["key"]

// 获取值 + 检查是否存在
v, ok := m["key"]
if ok {
    // key 存在
}

// 删除
delete(m, "key")

// 遍历
for k, v := range m {
    fmt.Printf("%s: %v\n", k, v)
}
```

## Map 的特性

### 无序性

Go 的 map 是**无序的**。每次遍历顺序可能不同（Go 1+ 引入随机化防止依赖遍历顺序）。

### 引用类型

```go
m1 := make(map[string]int)
m2 := m1 // m1 和 m2 指向同一个 map
m2["key"] = 1 // m1 也会看到这个变化
```

### 并发安全

**Map 不是并发安全的！** 并发读写会导致 panic。

```go
// 错误: 并发访问
go func() { m["key"] = 1 }()
go func() { _ = m["key"] }()

// 正确: 使用 sync.Map 或加锁
var mu sync.Mutex
mu.Lock()
m["key"] = 1
mu.Unlock()

// 或者使用 sync.Map (适合读多写少场景)
var sm sync.Map
sm.Store("key", "value")
v, _ := sm.Load("key")
```

## 性能考虑

- **负载因子**: Go map 默认负载因子为 6.5
- **桶数量**: 总是 2 的幂次方
- **哈希冲突**: 使用链地址法解决

## 常用模式

### 分组统计
```go
counts := make(map[string]int)
for _, item := range items {
    counts[item.Category]++
}
```

### Set 实现
```go
set := make(map[string]struct{})
set["a"] = struct{}{}
set["b"] = struct{}{}
_, exists := set["a"] // true
```
