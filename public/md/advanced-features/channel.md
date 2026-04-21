# 通道 (channel)

## 概述

Channel 是 Go 中 goroutine 之间通信的主要方式，遵循 "不要通过共享内存来通信，而要通过通信来共享内存" 的理念。

## 创建与基本操作

```go
// 无缓冲 channel（同步）
ch := make(chan int)

// 有缓冲 channel（异步）
ch := make(chan int, 10)

// 发送
ch <- 42

// 接收
v := <-ch

// 关闭
close(ch)
```

## Channel 方向

```go
// 只发送
func producer(ch chan<- int) {
    ch <- 1
}

// 只接收
func consumer(ch <-chan int) {
    v := <-ch
}
```

## 遍历 Channel

```go
// for range (channel 关闭后自动退出)
for v := range ch {
    fmt.Println(v)
}

// select + break
for {
    select {
    case v, ok := <-ch:
        if !ok { return } // channel 已关闭
        fmt.Println(v)
    }
}
```

## Select 语句

```go
select {
case v := <-ch1:
    fmt.Println("从 ch1 收到:", v)
case v := <-ch2:
    fmt.Println("从 ch2 收到:", v)
case ch3 <- 42:
    fmt.Println("发送到 ch3 成功")
default:
    fmt.Println("没有就绪的 channel")
}
```

### 超时控制
```go
select {
case result := <-doWork():
    fmt.Println(result)
case <-time.After(2 * time.Second):
    fmt.Println("超时!")
}
```

## 常见模式

### Fan-Out / Fan-In
```go
// Fan-Out: 一个输入分发到多个 worker
func fanOut(input <-chan int, workers int) []<-chan int {
    outputs := make([]<-chan int, workers)
    for i := 0; i < workers; i++ {
        outputs[i] = worker(input)
    }
    return outputs
}

// Fan-In: 多个输出合并为一个
func fanIn(channels ...<-chan int) <-chan int {
    merged := make(chan int)
    var wg sync.WaitGroup
    
    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan int) {
            defer wg.Done()
            for v := range c {
                merged <- v
            }
        }(ch)
    }
    
    go func() {
        wg.Wait()
        close(merged)
    }()
    return merged
}
```

### Pipeline
```go
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * n
        }
        close(out)
    }()
    return out
}

// 使用: square(generate(1, 2, 3, 4, 5))
```

## 注意事项

1. **向已关闭的 channel 发送会 panic**
2. **从已关闭的 channel 接收立即返回零值**
3. **close 只能由发送方执行** - 不要在接收方关闭
4. **nil channel 的操作会永久阻塞** - 可以用于禁用 select 分支
