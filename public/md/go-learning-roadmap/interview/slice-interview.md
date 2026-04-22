# 切片 (面试重点)

## 底层结构

```go
type slice struct {
    array unsafe.Pointer // 指向底层数组的指针
    len   int            // 长度
    cap   int            // 容量
}
```

## 核心问题

### Q: Slice 和 Array 的区别？

| 特性 | 数组 (Array) | 切片 (Slice) |
|------|-------------|-------------|
| 长度 | 固定 | 动态 |
| 值/引用 | 值类型（拷贝整个数组） | 引用类型（拷贝头信息） |
| 比较 | 可用 `==` 比较 | 不能用 `==` 比较 |

### Q: Slice 的扩容机制？

```go
// Go 1.18+ 扩容策略
func growslice(et *_type, old slice, cap int) slice {
    newcap := old.cap
    
    if newcap < 1024 {
        newcap += newcap  // 翻倍 (< 1024 时)
    } else {
        // 每次增加 25% 左右，直到 >= 所需容量
        for newcap < cap {
            newcap = newcap + newcap/4
        }
    }
    
    // 内存对齐...
}
```

### Q: 切片为什么是引用类型？

因为切片只包含三个字段（指针、长度、容量），拷贝时只拷贝这三个字段，不拷贝底层数组。

### Q: 什么是切片的"陷阱"？

**陷阱1: 共享底层数组**
```go
a := []int{1, 2, 3, 4, 5}
b := a[1:3]      // b = [2, 3]
b[0] = 99         // a 变成 [1, 99, 3, 4, 5]！
```

**陷阱2: append 可能修改原数据**
```go
a := make([]int, 3, 5) // len=3, cap=5
b := append(a, 4)       // 不分配新数组！a 也受影响
```

**陷阱3: for range 的值拷贝**
```go
s := []*MyStruct{&A{}, &B{}}
for _, v := range s {
    v = &C{} // 只修改了局部变量 v，不影响 s
}

// 正确方式:
for i := range s {
    s[i] = &C{}
}
```

### Q: 如何深拷贝一个切片？

```go
// 方式1: copy
dst := make([]T, len(src))
copy(dst, src)

// 方式2: append
dst := append([]T(nil), src...)

// 方式3: 如果包含引用类型，需要逐元素深拷贝
```
