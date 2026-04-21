# Echo

## 概述

Echo 是另一个高性能的 Go Web 框架，以极简设计和出色的性能著称。

## 基本使用

```go
package main

import "github.com/labstack/echo/v4"

func main() {
    e := echo.New()
    
    // 中间件
    e.Use(middleware.Logger())
    e.Use(middleware.Recover())
    
    // 路由
    e.GET("/", hello)
    
    e.Logger.Fatal(e.Start(":8080"))
}

func hello(c echo.Context) error {
    return c.String(200, "Hello, World!")
}
```

## Echo vs Gin

| 特性 | Echo | Gin |
|------|------|-----|
| 性能 | 极快 | 极快 |
| API 设计 | 面向对象 | 类似 |
| 默认中间件 | 较少 | 较多（Logger 等）|
| HTTP/2 | 内置支持 | 需要额外配置 |
| 绑定 | 更灵活 | 够用 |
| 社区 | 活跃 | 最活跃 |

## 特色功能

### 自动 TLS
```go
e.AutoTLSManager.HostPolicy = echotls.HostWhitelist("example.com")
e.AutoTLSManager.Cache = autocache.NewFolderCache(".cache")
e.StartAutoTLS(":443")
```

### JWT 中间件
```go
e.Use(middleware.JWTWithConfig(middleware.JWTConfig{
    SigningKey: []byte("secret"),
}))
```

### Binding
```go
type User struct {
    Name  string `json:"name" validate:"required"`
    Email string `json:"email" validate:"required,email"`
}

func create(c echo.Context) error {
    u := new(User)
    if err := c.Bind(u); err != nil {
        return err
    }
    if err := c.Validate(u); err != nil {
        return err
    }
}
```
