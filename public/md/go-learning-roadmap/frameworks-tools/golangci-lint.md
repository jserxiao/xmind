# 代码质量工具 (golangci-lint)

## 概述

golangci-lint 是一个 Go linter 聚合器，集成了大量静态分析工具，速度快且易于配置。

## 安装与使用

```bash
# 安装
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# 运行（在项目根目录）
golangci-lint run

# 只检查变更的文件 (git)
golangci-lint run --new-from-rev=HEAD~1

# 自动修复部分问题
golangci-lint run --fix
```

## 配置 (.golangci.yml)

```yaml
run:
  timeout: 5m
  modules-download-mode: readonly

linters:
  enable:
    - errcheck       # 检查未处理的错误
    - gosimple       # 简化代码建议
    - govet          # vet 检查
    - ineffassign    # 检查无效赋值
    - staticcheck    # 全面静态分析
    - unused         # 检查未使用的变量/函数
    - revive         // golint 替代品
    - gofmt          # 格式化检查
    - misspell       # 拼写检查
    - gocritic       # 代码审查建议
    - bodyclose      # 检查 HTTP body 是否关闭
    - noctx          # 检查是否传递 context
    - nilerr         # 检查只返回 nil 的错误路径
    - prealloc      # 建议预分配切片
    - unconvert      # 不必要的类型转换
    - unparam        # 未使用的函数参数

linters-settings:
  errcheck:
    check-type-assertions: true
    check-blank: true
  gocritic:
    enabled-tags:
      - diagnostic
      - style
      - performance

issues:
  max-issues-per-linter: 0
  max-same-issues: 0
  exclude-rules:
    # 排除测试文件中的某些规则
    - path: _test\.go
      linters:
        - dupl
        - gosec
```

## CI/CD 集成

### GitHub Actions
```yaml
name: lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: golangci/golangci-lint-action@v4
        with:
          version: latest
```

### Makefile
```makefile
lint:
	golangci-lint run ./...

lint-fix:
	golangci-lint run --fix ./...
```
