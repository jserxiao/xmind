# Map (面试重点)

## Map 的底层实现

### 数据结构

```go
type hmap struct {
    count     int       // 元素个数
    flags     uint8     // 状态标志
    B         uint8     // 桶数组大小的对数（2^B = bucket 数量）
    noverflow uint16    // 溢出桶数量
    hash0     uint32    // 哈希种子
    buckets   unsafe.Pointer // 桶数组指针
    oldbuckets unsafe.Pointer // 扩容时的旧桶
    nevacuate uintptr      // 扩容进度
}

type bmap struct {
    tophash [bucketCnt]uint8  // 哈希值高8位
    // 后面跟着 key1, key2, ..., key8
    // 然后是 val1, val2, ..., val8
    // 最后是指向溢出桶的指针
}
```

## 核心问题

### Q: Map 为什么是无序的？

1. Go 1+ 引入了**随机遍历起始位置**，防止程序依赖 map 遍历顺序
2. Map 在扩容时，元素可能迁移到不同的桶

### Q: Map 扩容过程？

**等量扩容**: 溢出桶过多，重新排列元素，不增加桶数量

**增量扩容**: 元素数量超过负载因子(6.5)，桶数量翻倍

```
渐进式扩容:
┌─────────────────────────────┐
│  每次操作最多搬迁 1-2 个桶    │
│  分摊扩容成本到每次操作        │
│  不会一次性 STW              │
└─────────────────────────────┘
```

### Q: Map 的 key 必须满足什么条件？

必须可比较（`comparable`）：
- ✅ `int`, `string`, `float`, `bool`, `pointer`
- ✅ 包含上述类型的 `array`, `struct`
- ❌ `slice`, `map`, `function`（只能作为 value）

### Q: 并发读写 Map 会怎样？

**直接 panic!**

```go
m := make(map[string]int)
go func() { m["key"] = 1 }()
go func() { _ = m["key"] }() // panic: concurrent map read and map write
```

解决方案：
- **sync.Mutex** - 加锁保护
- **sync.Map** - 并发安全 Map（读多写少场景）

### Q: slice 能做 map 的 key 吗？

不能直接做。但可以用底层数组指针：

```go
// ❌ 错误
m := make(map[[]byte]int)

// ✅ 正确方式
type SliceKey struct {
    ptr *byte
    len int
}
// 或者将 slice 转为 string（如果内容是合法 UTF-8）
key := string(byteSlice)
m[key] = value
```

## 性能优化

1. **预分配容量** - 已知大小时用 `make(map[K]V, size)`
2. **避免在热路径中扩容**
3. **考虑使用 sync.Map** - 特定并发模式下的性能更好
