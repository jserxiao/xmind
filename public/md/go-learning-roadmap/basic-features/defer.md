# 延迟调用 (defer)

## 概述

`defer` 用于延迟函数的执行，直到包含它的函数返回时才执行。常用于资源清理操作。

## 基本用法

```go
func readFile(filename string) ([]byte, error) {
    f, err := os.Open(filename)
    if err != nil {
        return nil, err
    }
    defer f.Close() // 函数返回时自动关闭文件
    
    return io.ReadAll(f)
}
```

## 执行顺序

多个 `defer` 按照**后进先出 (LIFO)** 的顺序执行：

```go
func main() {
    defer fmt.Println("1")
    defer fmt.Println("2")
    defer fmt.Println("3")
    // 输出: 3 2 1
}
```

## defer 的参数求值

`defer` 声明时会立即求值参数，但函数体在最后执行：

```go
func main() {
    x := 10
    defer fmt.Println(x) // 打印 10，不是 20
    x = 20
}
```

## 常见使用场景

### 1. 关闭资源
```go
resp, err := http.Get(url)
if err != nil { return err }
defer resp.Body.Close()
```

### 2. 解锁互斥锁
```go
mu.Lock()
defer mu.Unlock()
```

### 3. 记录耗时
```go
defer func(start time.Time) {
    fmt.Printf("elapsed: %v\n", time.Since(start))
}(time.Now())
```

### 4. panic 恢复
```go
defer func() {
    if r := recover(); r != nil {
        log.Printf("recovered: %v", r)
    }
}()
```

## 注意事项

1. **defer 在循环中的性能问题** - 大量 defer 可能影响性能
2. **defer 与方法值** - 注意方法接收者的变化
3. **defer 在闭包中** - 变量捕获的行为

## 性能优化

Go 1.14+ 对 defer 进行了大幅优化，大部分场景下性能开销可以忽略不计。
