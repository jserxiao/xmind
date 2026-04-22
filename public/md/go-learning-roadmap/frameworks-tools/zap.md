# 日志 (zap)

## 概述

Zap 是 Uber 开源的高性能结构化日志库，比标准库 log 快很多。

## 基本使用

```go
package main

import (
    "go.uber.org/zap"
)

func main() {
    // 创建 logger (生产环境)
    logger, _ := zap.NewProduction()
    defer logger.Sync()
    
    // 结构化日志
    logger.Info("request received",
        zap.String("method", "GET"),
        zap.String("path", "/api/users"),
        zap.Int("status", 200),
        zap.Duration("latency", 10*time.Millisecond),
    )
    
    // 不同级别
    logger.Debug("debug info")
    logger.Info("info message")
    logger.Warn("warning message")
    logger.Error("error message")
    
    // Fatal 会调用 os.Exit(1)
    // logger.Fatal("fatal error")
}
```

## Logger 配置

```go
// 自定义配置
func initLogger() (*zap.Logger, error) {
    cfg := zap.NewProductionConfig()
    
    // 输出到文件
    cfg.OutputPaths = []string{"stdout", "./logs/app.log"}
    
    // 修改时间格式
    cfg.EncoderConfig.TimeKey = "timestamp"
    cfg.EncoderConfig.EncodeTime = zap.ISO8601TimeEncoder
    
    // 修改日志级别
    cfg.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
    
    return cfg.Build()
}

// 开发环境 - 更友好的输出
func devLogger() {
    logger, _ := zap.NewDevelopment()
    defer logger.Sync()
    logger.Debug("开发模式日志")
}
```

## SugaredLogger

更灵活但稍慢的 API：

```go
sugar := logger.Sugar()

// printf 风格
sugar.Infof("hello %s", "world")

// 自动类型推断
sugar.Infow("request",
    "url", "/api/test",
    "attempt", 3,
    "backoff", time.Second,
)
```

## 性能对比

| 日志库 | 操作/ns | 内存分配 |
|--------|---------|----------|
| zap | ~86 ns | 0 alloc |
| zap.Sugared | ~260 ns | 1 alloc |
| standard log | ~2284 ns | 3 alloc |
| apex/log | ~18724 ns | 20 alloc |

## 最佳实践

1. **生产环境用 `NewProduction`** - JSON 格式，便于日志收集
2. **开发环境用 `NewDevelopment`** - 彩色可读输出
3. **始终调用 `Sync()`** - 确保缓冲区内容写入
4. **使用全局 Logger 或依赖注入**
5. **避免在热路径中使用 SugaredLogger**
