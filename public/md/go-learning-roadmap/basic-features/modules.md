# Go Modules

## 概述

Go Modules 是 Go 1.11+ 引入的官方依赖管理方案，解决了长期以来 Go 语言缺少官方包管理工具的问题。

## 基本命令

### 初始化模块
```bash
go mod init github.com/user/myproject
```

这会创建 `go.mod` 文件：
```
module github.com/user/myproject

go 1.21.0
```

### 添加依赖
```go
import "github.com/gin-gonic/gin"
// 运行 go build 或 go mod tidy 自动下载依赖
```

### 常用命令

```bash
go mod tidy      # 整理依赖，移除未使用的
go mod download  # 下载依赖到缓存
go mod verify    # 验证依赖哈希
go mod graph     # 打印依赖图
go mod why       # 解释为什么需要某个依赖
```

## go.mod 文件

```
module github.com/example/myapp

go 1.21.0

require (
    github.com/gin-gonic/gin v1.9.1
    golang.org/x/sync v0.3.0
)

require github.com/bytedance/sonic v1.9.1 // indirect
```

- **require** - 直接依赖
- **indirect** - 间接依赖（被其他依赖引入）

## go.sum 文件

记录所有依赖的**校验和**，确保依赖的完整性和安全性。**不要手动编辑此文件。**

## 版本选择规则

Go Modules 使用**最小版本选择 (MVS)** 算法：

1. 选择每个依赖要求的**最低兼容版本**
2. 选择所有依赖中**最高的版本**

### 版本格式

```
v0.0.0        // 初始版本
v1.2.3        // 正式版本
v1.2.3-pre    // 预发布版本
v0.0.0-20230101... // 伪版本（基于 commit）
```

## 替换与排除

### replace - 替换依赖
```go
// go.mod
replace github.com/old/pkg => github.com/new/pkg v1.0.0
replace github.com/local/pkg => ../local-pkg // 本地替换
```

### exclude - 排除特定版本
```
exclude github.com/bad/pkg v1.0.0
```

## 私有仓库 / GOPROXY

```bash
# 设置代理
export GOPROXY=https://goproxy.cn,direct

# 跳过 HTTPS 校验（私有仓库）
export GOINSECURE=git.company.com
export GOPRIVATE=git.company.com
```

## 常用代理

| 代理 | 地址 |
|------|------|
| 官方 | https://proxy.golang.org |
| 中国 | https://goproxy.cn |
| 七牛 | https://goproxy.io |
| 阿里 | https://mirrors.aliyun.com/goproxy/ |

## 最佳实践

1. **始终使用 `go mod tidy`** 保持依赖整洁
2. **提交 `go.mod` 和 `go.sum`** 到版本控制
3. **不要直接修改 `go.sum`**
4. **使用语义化版本** 发布自己的模块
5. **定期更新依赖** `go get -u ./...` 然后 `go mod tidy`
