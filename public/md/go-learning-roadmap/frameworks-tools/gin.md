# Gin

## 概述

Gin 是 Go 最流行的 Web 框架，以高性能和简洁的 API 著称。

## 基本使用

```go
package main

import "github.com/gin-gonic/gin"

func main() {
    r := gin.Default()
    
    // 路由
    r.GET("/ping", func(c *gin.Context) {
        c.JSON(200, gin.H{"message": "pong"})
    })
    
    // 路径参数
    r.GET("/users/:id", getUser)
    
    // 查询参数
    r.GET("/search", search)
    
    // 分组路由
    v1 := r.Group("/api/v1")
    {
        v1.POST("/login", login)
        v1.POST("/submit", submit)
    }
    
    r.Run(":8080")
}
```

## 中间件

```go
// 自定义中间件
func Logger() gin.HandlerFunc {
    return func(c *gin.Context) {
        t := time.Now()
        c.Next()
        latency := time.Since(t)
        log.Printf("%s %s %v", c.Request.Method, c.Request.URL.Path, latency)
    }
}

// 使用
r.Use(Logger())
r.Use(gin.Recovery())
```

## 参数绑定

```go
type LoginRequest struct {
    User     string `form:"user" json:"user" binding:"required"`
    Password string `form:"password" json:"password" binding:"required"`
}

func login(c *gin.Context) {
    var req LoginRequest
    
    // 自动绑定: JSON / Form / Query
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
}
```

## 性能特点

- 基于 **httprouter** 的 radix tree 路由
- 无反射的路由匹配
- 中间件链式处理
- Benchmark 表现优异（每秒可处理数十万请求）
