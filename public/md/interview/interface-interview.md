# 接口 (面试重点)

## 底层实现

### eface (空接口 interface{})

```go
type eface struct {    // 16 bytes (64-bit)
    _type *_type      // 类型信息
    data  unsafe.Pointer // 数据指针
}
```

### iface (非空接口)

```go
type iface struct {    // 24 bytes (64-bit)
    tab  *itab        // 方法表 + 类型信息
    data unsafe.Pointer // 数据指针
}

type itab struct {
    inter *interfacetype // 接口类型
    _type *_type        // 具体类型
    hash  uint32        // 类型的 hash（用于类型断言快速判断）
    _     [4]byte
    fun   [1]uintptr   // 方法地址数组（变长）
}
```

## 核心问题

### Q: nil 接口 != 包含 nil 的接口？

```go
var p *int = nil
var i interface{} = p
fmt.Println(i == nil) // false!

// 因为 i 不是"纯"nil:
// i.tab = *int 的类型信息 (非 nil)
// i.data = nil
```

### Q: 接口的动态分派开销？

调用接口方法比直接调用结构体方法慢，因为需要：
1. 通过 `itab.fun` 查找方法地址
2. 间接跳转

但在大多数场景下，这个开销可以忽略。

### Q: 类型断言的底层原理？

使用 `itab.hash` 快速判断：

```go
func assertI2I2(inter *interfacetype, i iface) (iface, bool) {
    tab := i.tab
    if tab == nil {
        return iface{}, false
    }
    if tab.inter == inter {
        return i, true
    }
    // 使用类型哈希快速查找 itab
    t := getitab(inter, tab._type, false)
    if t == nil {
        return iface{}, false
    }
    return iface{tab: t, data: i.data}, true
}
```

### Q: "接受接口，返回结构体" 原则？

```go
// ✅ 好: 参数用接口
func Process(r io.Reader) { ... }

// ✅ 好: 返回具体类型
func NewDB() *sql.DB { ... }

// ❌ 避免: 返回接口（除非确实需要）
func New() io.Reader { ... } // 调用者无法访问具体方法
```

## 接口与泛型的选择

| 场景 | 推荐 |
|------|------|
| 多态行为 | 接口 |
| 容器/算法 | 泛型 |
| 约束行为 | 接口 |
| 约束类型 | 泛型 |
