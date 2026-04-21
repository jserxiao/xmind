# Go 学习路线图

## Go 社区站点

- [studygolang.com](https://studygolang.com) | go-community/studygolang.md | Go语言中文网
- [tourgo.org](https://tourgo.org) | go-community/tourlorg.md | 交互式Go教程
- [gocn.vip](https://gocn.vip) | go-community/gocn.md | GoCN社区

## 推荐 Go 图书

### 入门图书

- [《Go 入门指南》](https://github.com/unknwon/the-way-to-go_ZH_CN) | 在线免费教程
- [Go分类教程](https://geddyj.com/go-categories/) | 按类别学习

### 项目实战类

- 《Go语言编程（第2版）》 | go-books/go-entry.md
- 《Go语言设计模式》 | go-books/go-design-pattern.md

### 语言设计/理念

- 《Effective Go》 | go-books/go-bible.md
- [《Go 101》](https://go101.org) | go-books/go-101.md
- [《Go语言设计与实现》](https://draveness.me/golang/) | go-books/go-practice.md

## 基础特性

- 错误处理 (error/panic) | basic-features/error-handling.md
- 延迟调用 (defer) | basic-features/defer.md
- 切片 (slice) | basic-features/slice.md
- 字典 (map) | basic-features/map.md
- 依赖管理 (Go modules) | basic-features/modules.md

## 高级特性

- 接口 (interface) | advanced-features/interface.md
- 协程 (goroutine) | advanced-features/goroutine.md
- 通道 (channel/select) | advanced-features/channel.md
- 上下文 (context) | advanced-features/context.md
- 互斥锁 (mutexes) | advanced-features/mutex.md

## 面试八股文

### 内存与GC

- GMP 模型 | interview/gmp.md
- 调度器相关 | interview/scheduler.md
- 协程调度模型 | interview/goroutine-model.md
- 内存模型 | interview/memory-model.md
- 内存分配 | interview/memory-allocation.md
- GC 垃圾回收 | interview/gc.md

### 基础数据类型

- Map 原理 | interview/map-interview.md
- Slice 原理 | interview/slice-interview.md
- 接口原理 | interview/interface-interview.md

### 并发相关

- Channel | advanced-features/channel.md
- Context | advanced-features/context.md
- Sync 互斥锁 | advanced-features/mutex.md

### 复合数据类型

- Slice 操作 | interview/slice-interview.md
- Map 操作 | interview/map-interview.md
- Timer 理解 | interview/gc.md

### 线程安全

- Goroutine 泄漏排查 | interview/goroutine-model.md
- CPU/Memory 异常 | interview/memory-allocation.md

### 排查工具

- PProf 性能分析 | frameworks-tools/pprof.md
- golangci-lint | frameworks-tools/golangci-lint.md

## 框架和工具

### RPC 框架

- gRPC | frameworks-tools/rpc.md
- go-zero / kratos | frameworks-tools/rpc.md

### HTTP 框架

- Gin / GoFrame | frameworks-tools/gin.md
- Echo | frameworks-tools/echo.md
- Fiber | frameworks-tools/fiber.md

### WebSocket

- golang/websocket | frameworks-tools/golangwebsocket.md
- gorilla/websocket | frameworks-tools/golangwebsocket.md

### ORM 框架

- GORM | frameworks-tools/orm.md
- XORM | frameworks-tools/xorm.md

### 其他框架

- go-redis | frameworks-tools/redis.md
- client-go/controller-runtime | frameworks-tools/kubemachinery.md
- robfig/cron 定时任务 | frameworks-tools/robfigcron.md

### CLI 工具

- Cobra | frameworks-tools/cobra.md

### 日志库

- Zap | frameworks-tools/zap.md
- Logrus | frameworks-tools/logrus.md

### 性能工具

- PProf | frameworks-tools/pprof.md
- golangci-lint | frameworks-tools/golangci-lint.md
