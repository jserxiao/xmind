# 泛型 (generics)

## 概述

Go 1.18 引入了泛型（类型参数），允许编写与类型无关的通用代码。

## 基本语法

### 类型参数

```go
// 泛型函数
func Print[T any](s []T) {
    for _, v := range s {
        fmt.Println(v)
    }
}

// 使用
Print([]int{1, 2, 3})
Print([]string{"a", "b", "c"})
```

### 类型约束

```go
// 内置约束
// any     - 任意类型
// comparable - 可比较类型

// 自定义约束
type Number interface {
    int | int64 | float64
}

func Sum[T Number](nums []T) T {
    var total T
    for _, n := range nums {
        total += n
    }
    return total
}
```

### 波浪号 ~ (底层类型约束)

```go
// ~ 表示包含该类型的所有底层类型为该类型的自定义类型
type Ordered interface {
    ~int | ~int64 | ~float64 | ~string
}

type MyInt int // MyInt 也满足 Ordered 约束（因为有 ~）
```

## 泛型类型

```go
// 泛型结构体
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(v T) {
    s.items = append(s.items, v)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    v := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return v, true
}

// 使用
s := Stack[int]{}
s.Push(1)
s.Push(2)
```

## 标准库中的泛型

Go 1.18+ 在标准库中新增了多个泛型包：

- **`constraints`** - 常用类型约束定义
- **`slices`** - 切片操作工具函数
- **`maps`** - Map 操作工具函数
- **`cmp`** - 比较相关工具
- **`golang.org/x/exp/slices`** - 实验性切片函数

## 最佳实践

1. **不要过度使用泛型** - 只有真正需要时才用
2. **使用 any 作为默认约束** - 除非需要特定操作
3. **考虑可读性** - 过多的类型参数会降低代码可读性
4. **利用标准库泛型函数** - slices、maps 等包已经提供了常用操作

## 何时使用泛型

✅ **适合使用:**
- 容器数据结构 (Stack, Queue, Tree 等)
- 需要对不同类型做相同操作的函数
- 减少代码重复

❌ **不适合使用:**
- 只用于一两种具体类型时
- 接口已能满足需求时
- 使代码变得难以理解时
