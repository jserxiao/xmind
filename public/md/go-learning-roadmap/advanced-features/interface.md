# 接口 (interface)

## 概述

Go 的接口是隐式实现的，不需要显式声明 `implements` 关键字。这是 Go 语言最强大的特性之一。

## 基本定义

```go
// 定义接口
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

// 组合接口
type ReadWriter interface {
    Reader
    Writer
}
```

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
