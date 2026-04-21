# RPC 框架

## gRPC

### 简介

gRPC 是 Google 开源的高性能 RPC 框架，使用 Protocol Buffers 作为接口定义语言。

### 特点
- 基于 HTTP/2
- 使用 Protobuf 序列化（比 JSON 更小更快）
- 支持四种服务模式：一元、服务器流、客户端流、双向流
- 内置代码生成

### 基本使用

```protobuf
// hello.proto
syntax = "proto3";

package hello;

service Greeter {
  rpc SayHello (HelloRequest) returns (HelloReply) {}
}

message HelloRequest {
  string name = 1;
}

message HelloReply {
  string message = 1;
}
```

```go
// 服务端
type server struct{}
func (s *server) SayHello(ctx context.Context, req *pb.HelloRequest) (*pb.HelloReply, error) {
    return &pb.HelloReply{Message: "Hello " + req.Name}, nil
}

lis, _ := net.Listen("tcp", ":50051")
s := grpc.NewServer()
pb.RegisterGreeterServer(s, &server{})
s.Serve(lis)
```

## 其他 RPC 框架

### go-zero
- 微服务框架，内置 RPC 支持
- 自动代码生成
- 内置限流、熔断、负载均衡

### kratos
- Bilibili 开源的 Go 微服务框架
- 高性能、易扩展
- 内置服务发现、配置管理、链路追踪

### kitex
- 字节跳动开源的 RPC 框架
- 基于 Netpoll（自研网络库）
- 高性能，支持 Thrift 和 gRPC 协议
