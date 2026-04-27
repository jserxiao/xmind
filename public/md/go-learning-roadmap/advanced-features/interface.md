# 接口 (interface)

## 概述

Go 的接口是隐式实现的，不需要显式声明 `implements` 关键字。这是 Go 语言最强大的特性之一。

## 基本定义
接口是 Go 语言中实现抽象和多态的核心机制，它定义了一组方法签名，但不包含具体实现。任何类型只要实现了接口中的所有方法，就隐式地实现了该接口。

**核心概念**
- **方法集合**：接口通过方法签名集合来定义行为规范，不关心具体类型。
- **隐式实现**：Go 中无需显式声明 `implements` 关键字，类型只要拥有接口要求的所有方法，即自动满足接口。
- **动态类型**：接口变量可以存储任何实现了该接口的具体类型值，在运行时动态决定调用哪个方法。

**关键要点**
1. 接口由一组方法签名组成，方法名、参数列表和返回值必须完全匹配。
2. 一个类型可以实现多个接口，接口之间可以互相组合。
3. 空接口 `interface{}` 可以表示任何类型，常用于处理未知类型或泛型场景。
4. 接口值由具体类型和具体值两部分组成，`nil` 接口值不等于 `nil` 具体值。

**代码示例**
```go
// 定义简单接口
type Animal interface {
    Speak() string
}

type Dog struct{}
func (d Dog) Speak() string { return "Woof!" }

type Cat struct{}
func (c Cat) Speak() string { return "Meow!" }

// 使用接口作为参数
func MakeSound(a Animal) {
    fmt.Println(a.Speak())
}

func main() {
    dog := Dog{}
    cat := Cat{}
    MakeSound(dog) // 输出: Woof!
    MakeSound(cat) // 输出: Meow!
}
```

```go
// 空接口示例
func PrintValue(v interface{}) {
    fmt.Printf("Value: %v, Type: %T\n", v, v)
}

func main() {
    PrintValue(42)        // 输出: Value: 42, Type: int
    PrintValue("hello")   // 输出: Value: hello, Type: string
    PrintValue(3.14)      // 输出: Value: 3.14, Type: float64
}
```

**注意事项与最佳实践**
- 接口应保持小而专注，通常只包含 1-3 个方法（如 `io.Reader`、`io.Writer`）。
- 使用接口组合而非继承来扩展行为，保持灵活性。
- 避免定义大而全的接口，遵循接口隔离原则。
- 使用类型断言或类型开关（type switch）来安全地处理接口的具体类型。
- 返回具体类型而非接口，接收接口作为参数，这是 Go 的惯用设计模式。
## 隐式实现

```go
// 只需要实现接口的所有方法，就自动实现了该接口
type MyReader struct{}

func (r *MyReader) Read(p []byte) (n int, err error) {
    // 实现...
    return len(p), nil
}

// MyReader 自动实现了 Reader 接口，无需显式声明
var r Reader = &MyReader{}
```

## 空接口

```go
// 空接口可以接收任何类型
var any interface{} = 42
any = "hello"
any = []int{1, 2, 3}

// any 是 interface{} 的别名 (Go 1.18+)
func PrintAnything(v any) {
    fmt.Println(v)
}
```

## 类型断言

```go
var i interface{} = "hello"

// 方式1: 直接断言
s := i.(string)

// 方式2: 安全断言（推荐）
s, ok := i.(string)
if ok {
    fmt.Println("是 string:", s)
}

// type switch
switch v := i.(type) {
case string:
    fmt.Println("字符串:", v)
case int:
    fmt.Println("整数:", v)
default:
    fmt.Println("未知类型")
}
```

## 接口内部结构

### eface (空接口)
```go
type eface struct { // 16 bytes on 64-bit
    _type *_type     // 类型信息
    data  unsafe.Pointer // 数据指针
}
```

### iface (非空接口)
```go
type iface struct { // 24 bytes on 64-bit
    tab  *itab       // 方法表 + 类型信息
    data unsafe.Pointer // 数据指针
}
```

## 最佳实践

1. **接受接口，返回结构体** - 函数参数用接口，返回值用具体类型
2. **设计小接口** - 接口应该尽量小（如 io.Reader 只有 Read 一个方法）
3. **先使用再抽象** - 不要一开始就设计接口，在需要时再抽取
4. **检查接口是否为 nil** - 包含 nil 具体值的接口不是 nil！

## 常见陷阱

### nil 接口不是 nil
```go
var r *bytes.Buffer // nil
var w io.Writer = r  // w 不是 nil！它有类型信息
if w != nil {
    w.Write([]byte("hello")) // panic!
}
```
