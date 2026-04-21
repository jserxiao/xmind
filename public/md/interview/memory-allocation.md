# 内存分配

## Go 内存管理概述

Go 运行时自动管理内存，使用 **TCMalloc** 的设计思想。

## 内存层次结构

```
┌─────────────────────────────┐
│        Object (对象)          │  < 32KB: 从 mcache 分配
│   (用户申请的内存)            │
├─────────────────────────────┤
│        mspan                 │  内存页集合 (Span)
│   (由连续的 Page 组成)         │
├─────────────────────────────┤
│        mcentral              │  所有线程共享的中心缓存
│   (每种 sizeclass 有一个)      │
├─────────────────────────────┤
│        mheap                 │  堆 (从 OS 申请的大块内存)
│   (管理所有 mspan)            │
└─────────────────────────────┘
```

## 分配流程

### 小对象 (< 32KB)

```
1. 线程本地缓存 (mcache) → 直接返回 ✅
2. mcache 不足 → 从 mcentral 获取 mspan
3. mcentral 不足 → 从 mheap 分配新 mspan
4. mheap 不足 → 向 OS 申请内存 (sysAlloc)
```

### 大对象 (> 32KB)

直接从 mheap 分配，通常需要多页。

## mcache 结构

每个 P 有自己的 mcache（无锁分配）：

```go
type mcache struct {
    alloc [numSpanClasses]*mspan // 每种大小类别一个 span
}
```

- **sizeclass**: 预定义的大小类别（如 8B, 16B, 32B, ...）
- **无锁**: 因为每个 P 有独立的 mcache，无需加锁

## 逃逸分析 (Escape Analysis)

编译器通过逃逸分析决定变量分配在**栈**还是**堆**上：

```go
// ✅ 不逃逸 - 栈分配
func foo() int {
    x := 42
    return x // x 不会逃逸
}

// ❌ 逃逸 - 堆分配
func foo() *int {
    x := 42
    return &x // x 逃逸到堆上！
}

// ❌ 逃逸 - 接口赋值导致
var any interface{} = localVar // 可能逃逸
```

### 查看逃逸分析结果

```bash
go build -gcflags="-m" main.go
# 输出:
# ./main.go:10:2: moved to heap: x
# ./main.go:11:9: &x escapes to heap
```

## 减少堆分配的建议

1. **尽量在栈上分配** - 避免不必要的指针返回
2. **复用对象** - 使用 sync.Pool
3. **预分配切片/Map** - 已知大小时指定 cap
4. **避免不必要的装箱** - interface{} 会导致逃逸

## sync.Pool

```go
var bufPool = sync.Pool{
    New: func() any {
        return make([]byte, 0, 1024)
    },
}

func processData(data []byte) {
    buf := bufPool.Get().([]byte)
    defer bufPool.Put(buf[:0]) // 归还时清空
    
    // 使用 buf...
}
```
