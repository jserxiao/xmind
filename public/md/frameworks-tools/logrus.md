# 日志 (logrus)

## 概述

Logrus 是 Go 中最流行的结构化日志库之一，API 友好，插件丰富。

## 基本使用

```go
package main

import (
    "os"
    "github.com/sirupsen/logrus"
)

func main() {
    var log = logrus.New()
    
    // 设置输出
    log.SetOutput(os.Stdout)
    
    // 设置格式 (JSON / Text)
    log.SetFormatter(&logrus.JSONFormatter{
        TimestampFormat: "2006-01-02 15:04:05",
    })
    
    // 设置日志级别
    log.SetLevel(logrus.DebugLevel)
    
    // 结构化日志
    log.WithFields(logrus.Fields{
        "event":    "user_login",
        "user_id":  123,
        "ip":       "192.168.1.1",
    }).Info("用户登录")
}
```

## 日志级别

```go
log.Panic("panic 级别") // 会 panic
log.Fatal("fatal 级别") // 会 os.Exit(1)
log.Error("error 级别")
log.Warn("warn 级别")
log.Info("info 级别")
log.Debug("debug 级别")
log.Trace("trace 级别")
```

## Hooks（钩子）

```go
import (
    logrus_syslog "github.com/sirupsen/logrus/hooks/syslog"
)

// 发送到 syslog
hook, _ := logrus_syslog.NewSyslogHook("udp", "localhost:514", syslog.LOG_LOCAL0, "")
log.AddHook(hook)

// 自定义 Hook
type MyHook struct{}

func (h *MyHook) Fire(entry *logrus.Entry) error {
    // 发送到外部系统...
    return nil
}

func (h *MyHook) Levels() []logrus.Level {
    return logrus.AllLevels
}

log.AddHook(&MyHook{})
```

## Logrus vs Zap

| 特性 | Logrus | Zap |
|------|--------|-----|
| 性能 | 中等 | 极快 |
| API | 非常友好 | 较底层 |
| Hooks 生态 | 丰富 | 需要自行实现 |
| 社区成熟度 | 很高 | 高 |
| 推荐 | 快速原型/小项目 | 生产环境/高性能场景 |
