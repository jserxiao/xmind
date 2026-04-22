# API 网关

## 概述

API 网关是微服务架构中的入口点，负责请求路由、认证、限流、日志等横切关注点。

## 常用 Go 网关框架

### grpc-gateway

将 gRPC 服务同时暴露为 RESTful API：

```protobuf
// 使用 google.api.http 注解
rpc GetUser(GetUserRequest) returns (User) {
  option (google.api.http) = {
    get: "/v1/users/{id}"
  };
}
```

### APISIX (Go 插件)

- Apache 基金会顶级项目
- 基于 OpenResty
- 支持 Go 语言编写自定义插件
- 动态路由、认证、限流

### Traefik

- 云原生网关
- 自动服务发现
- 内置 Let's Encrypt 证书管理
- 与 Docker/Kubernetes 深度集成

## 网关核心功能

| 功能 | 说明 |
|------|------|
| 路由 | 将请求转发到正确的后端服务 |
| 认证 | JWT、OAuth2、API Key 验证 |
| 限流 | 防止过载，保护后端服务 |
| 负载均衡 | 在多个实例间分配流量 |
| 日志/监控 | 请求追踪和指标收集 |
| 缓存 | 减少后端压力 |
