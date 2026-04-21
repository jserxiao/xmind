# Go Module 工具

## 常用命令速查

```bash
# 初始化
go mod init github.com/user/myproject

# 整理依赖
go mod tidy

# 下载依赖到缓存
go mod download

# 查看依赖图
go graph | dot -T svg -o dep.svg

# 为什么需要某个依赖
go mod why github.com/some/pkg

# 验证校验和
go mod verify

# 更新所有依赖
get -u ./...

# 更新指定依赖
get github.com/pkg@latest

# 清理模块缓存
clean -modcache

# Vendor 管理
mod vendor  # 创建 vendor 目录
```

## 常用工具

### gops (进程管理)
```bash
go install github.com/google/gops@latest
gops          # 列出所有 Go 进程
gops <pid>    # 查看进程详情
gops stack <pid>   # 打印堆栈
gops memstats <pid> # 内存统计
gops gc <pid>      # 触发 GC
```

### goimports (格式化 + import 排序)
```bash
go install golang.org/x/tools/cmd/goimports@latest
goimports -w .
```

### gofumpt (更严格的 gofmt)
```bash
go install mvdan.cc/gofumpt@latest
gofumpt -w .
```

### staticcheck (静态分析)
```bash
go install honnef.co/go/tools/cmd/staticcheck@latest
staticcheck ./...
```

### errcheck (检查未处理的错误)
```bash
go install github.com/kisielk/errcheck@latest
errcheck ./...
```
