# GoFrame (GF)

## 概述

GoFrame 是一个模块化、高性能、企业级的 Go 应用开发框架。

## 特点

- **模块化设计** - 可按需引入组件
- **企业级功能** - 内置配置管理、数据库 ORM、缓存、日志等
- **工程化规范** - 统一的代码风格和项目结构
- **中文文档完善** - 对中文开发者友好

## 核心模块

| 模块 | 说明 |
|------|------|
| `net/ghttp` | HTTP 服务端/客户端 |
| `database/gdb` | ORM 数据库操作 |
| `cache/gcache` | 缓存管理 |
| `os/gfile` | 文件系统操作 |
| `os/glog` | 日志管理 |
| `crypto/gmd5` | 加密工具 |
| `encoding/gjson` | JSON 处理 |
| `errors/gerror` | 错误处理 |

## 基本使用

```go
package main

import (
    "github.com/gogf/gf/v2/frame/g"
    "github.com/gogf/gf/v2/net/ghttp"
)

func main() {
    s := g.Server()
    
    s.BindHandler("/", func(r *ghttp.Request) {
        r.Response.Write("Hello World!")
    })
    
    s.BindHandler("/hello/:name", func(r *ghttp.Request) {
        r.Response.Writef("Hello, %s!", r.Get("name"))
    })
    
    s.Run()
}
```

## 项目结构（推荐）

```
my-project/
├── api/          # API 接口定义
├── internal/
│   ├── logic/    # 业务逻辑
│   ├── model/    # 数据模型
│   └── dao/      # 数据访问对象
├── manifest/     # 配置文件
├── utility/      # 工具函数
└── main.go       # 入口文件
```

## 适用场景

- 企业级 Web 应用和 API 服务
- 需要快速开发的中小型项目
- 喜欢统一框架风格的团队
