# Fiber

## 概述

Fiber 是一个受 Express.js 启发的 Go Web 框架，基于 **fasthttp** 构建，追求极致性能。

## 特点

- **极快** - 基于 fasthttp，号称是第二快 Go Web 框架
- **Express 风格 API** - 对 Node.js 开发者友好
- **低内存占用**
- **丰富的内置功能**

## 基本使用

```go
package main

import "github.com/gofiber/fiber/v2"

func main() {
    app := fiber.New()
    
    app.Get("/", func(c *fiber.Ctx) error {
        return c.SendString("Hello, World!")
    })
    
    // 路由参数
    app.Get("/users/:id", func(c *fiber.Ctx) error {
        id := c.Params("id")
        return c.JSON(fiber.Map{"id": id})
    })
    
    // 分组
    api := app.Group("/api")
    v1 := api.Group("/v1")
    v1.Get("/list", listHandler)
    
    app.Listen(":3000")
}
```

## Fiber vs Gin vs Echo 性能

在大多数基准测试中：

1. **Fiber** (fasthttp) > **Gin/Echo** (net/http)
2. 但 fasthttp 与标准库不完全兼容
3. 对于大多数应用，Gin 的性能已经足够

## 注意事项

- Fiber 使用 `fasthttp`，与标准库 `net/http` 不兼容
- 某些中间件可能不支持 fasthttp
- 如果需要标准库兼容性，建议选择 Gin 或 Echo
