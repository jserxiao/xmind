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
Go Modules 的最佳实践不仅关乎工具的正确使用，更关乎团队协作与项目长期维护。遵循以下原则可以显著减少依赖冲突和构建问题：

1. **始终使用 `go mod tidy` 保持依赖整洁**  
   - 该命令会移除 `go.mod` 和 `go.sum` 中不再需要的依赖，并添加缺失的间接依赖。  
   - **建议**：在每次提交代码前运行一次，确保依赖列表与代码实际引用一致。  
   ```bash
   go mod tidy
   ```

2. **提交 `go.mod` 和 `go.sum` 到版本控制**  
   - 这两个文件是构建的精确记录，必须入库以确保所有协作者和 CI/CD 环境使用相同的依赖版本。  
   - **注意**：不要将 `vendor` 目录提交，除非项目有特殊离线部署需求。

3. **不要直接修改 `go.sum`**  
   - `go.sum` 由 Go 工具链自动维护，手动修改会导致哈希校验失败。  
   - 若出现不一致，应运行 `go mod tidy` 或 `go mod verify` 自动修复。

4. **使用语义化版本发布自己的模块**  
   - 遵循 `vMAJOR.MINOR.PATCH` 格式，例如 `v1.2.3`。  
   - 破坏性变更（API 不兼容）必须升级主版本号，如 `v1.x.x` → `v2.0.0`。  
   - 发布示例：  
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

5. **定期更新依赖**  
   - 使用 `go get -u ./...` 更新所有依赖到最新次版本或补丁版本，然后运行 `go mod tidy` 清理。  
   ```bash
   go get -u ./...
   go mod tidy
   ```
   - **谨慎**：对于主版本升级（如 `v1` → `v2`），需手动修改 import 路径并充分测试。

6. **使用 `go mod vendor` 管理私有依赖**  
   - 如果项目依赖私有仓库或需要离线构建，可创建 `vendor` 目录：  
   ```bash
   go mod vendor
   ```
   - 构建时需添加 `-mod=vendor` 标志：  
   ```bash
   go build -mod=vendor ./...
   ```

7. **保持模块路径唯一且有意义**  
   - 模块路径通常使用仓库 URL，如 `github.com/username/project`，避免使用 `example.com` 等占位符。

8. **使用 `go mod verify` 验证依赖完整性**  
   - 定期运行该命令检查下载的依赖是否被篡改或损坏：  
   ```bash
   go mod verify
   ```

9. **避免使用 `replace` 指令过度**  
   - `replace` 可用于本地调试，但不应长期保留在 `go.mod` 中，以免影响其他开发者。

遵循这些实践可以确保依赖管理清晰、可重复，减少“在我机器上可以运行”的问题。