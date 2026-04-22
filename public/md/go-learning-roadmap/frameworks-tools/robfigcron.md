# 定时任务 (robfig/cron)

## 概述

`robfig/cron` 是 Go 中最流行的定时任务库，支持类 cron 表达式。

## 基本使用

```go
package main

import (
    "fmt"
    "github.com/robfig/cron/v3"
)

func main() {
    c := cron.New()
    
    // 每秒执行
    c.AddFunc("* * * * * *", func() {
        fmt.Println("每秒执行")
    })
    
    // 每分钟执行
    c.AddFunc("0 * * * * *", func() {
        fmt.Println("每分钟执行")
    })
    
    // 每天 8:30 执行
    c.AddFunc("0 30 8 * * *", func() {
        fmt.Println("每天 8:30 执行")
    })
    
    // 每周一 9:00 执行
    c.AddFunc("0 0 9 * * 1", func() {
        fmt.Println("每周一 9:00")
    })
    
    // 自定义 Job
    c.AddJob("@every 1h", MyJob{})
    
    c.Start()
    
    // 非阻塞...
    select {}
}

type MyJob struct{}

func (j MyJob) Run() {
    fmt.Println("自定义 Job 执行")
}
```

## Cron 表达式格式

```
┌───────────── 秒 (0-59)
│ ┌──────────── 分 (0-59)
│ │ ┌────────── 时 (0-23)
│ │ │ ┌──────── 日 (1-31)
│ │ │ │ ┌────── 月 (1-12)
│ │ │ │ │ ┌──── 周几 (0-6, 0=周日)
* * * * * *
```

## 预定义表达式

| 表达式 | 含义 |
|--------|------|
| `@yearly` / `@annually` | 每年一次 (0 0 0 1 1 *) |
| `@monthly` | 每月一次 (0 0 0 1 * *) |
| `@weekly` | 每周一次 (0 0 0 * * 0) |
| `@daily` / `@midnight` | 每天 (0 0 0 * * *) |
| `@hourly` | 每小时 (0 0 * * * *) |

## 高级用法

### 带参数的 Job

```go
func myTask(name string) func() {
    return func() { fmt.Printf("Hello %s\n", name) }
}

c.AddFunc("@every 10m", myTask("world"))
```

### 获取 Job ID 和移除

```go
id, _ := c.AddFunc("@every 5m", task)
c.Remove(id)
```

### 线程安全选项

```go
c := cron.New(cron.WithChain(
    cron.Recover(cron.DefaultLogger), // panic 恢复
    // cron.DelayIfStillRunning(...), // 防止重叠执行
))
```
