# 错误处理 (error/panic/recover)

## 概述

Go 语言的错误处理是其最独特的设计之一。Go 不使用 try-catch，而是通过返回 error 值来处理错误。

## error 接口

```go
type error interface {
    Error() string
}
```

### 创建错误

```go
// 方式1: errors.New
err := errors.New("something went wrong")

// 方式2: fmt.Errorf
err := fmt.Errorf("invalid input: %v", value)

// 方式3: 自定义错误类型
type MyError struct {
    Code int
    Msg  string
}

func (e *MyError) Error() string {
    return fmt.Sprintf("code %d: %s", e.Code, e.Msg)
}
```

### 错误包装 (Go 1.13+)

```go
// 使用 %w 包装错误
if err != nil {
    return fmt.Errorf("open file: %w", err)
}

// 使用 errors.Is 判断错误类型
if errors.Is(err, os.ErrNotExist) {
    // 文件不存在
}

// 使用 errors.As 获取具体错误类型
var pathError *os.PathError
if errors.As(err, &pathError) {
    fmt.Println(pathError.Path)
}
```

## panic 和 recover

### panic

`panic` 用于不可恢复的严重错误：

```go
panic("something terrible happened")
```

### recover

`recover` 用于从 panic 中恢复，必须在 defer 中使用：

```go
func safeFunction() {
    defer func() {
        if r := recover(); r != nil {
            fmt.Println("Recovered:", r)
        }
    }()
    // 可能发生 panic 的代码
}
```

## 最佳实践

1. **普通函数** 返回 error，让调用者决定如何处理
2. **不要忽略错误** - 总是检查返回的 error
3. **panic 仅用于真正不可恢复的情况** - 如程序初始化失败
4. **错误信息要清晰有用** - 包含上下文信息

## 常见错误处理模式

```go
// Sentinel 错误
var ErrNotFound = errors.New("not found")

// 自定义错误类型
type ValidationError struct {
    Field string
    Msg   string
}

func (v *ValidationError) Error() string {
    return fmt.Sprintf("validation failed for %s: %s", v.Field, v.Msg)
}
```
