# Protobuf

## 概述

Protocol Buffers (Protobuf) 是 Google 开发的语言中立、平台中立的序列化格式。

## 为什么选择 Protobuf？

| 特性 | Protobuf | JSON |
|------|----------|------|
| 序列化大小 | 小 (~JSON 的 1/3 ~ 1/10) | 较大 |
| 序列化速度 | 快（二进制） | 慢（文本解析） |
| Schema | 强类型，必须定义 .proto 文件 | 无 Schema 或 JSON Schema |
| 可读性 | 不可直接阅读 | 人类可读 |
| 语言支持 | 多语言代码生成 | 天然支持 |

## 基本语法

```protobuf
syntax = "proto3";

package example;

option go_package = "github.com/example/proto/gen;example";

// 枚举
enum Status {
    UNKNOWN = 0;
    ACTIVE = 1;
    INACTIVE = 2;
}

// 消息
message User {
    string name = 1;
    int32 age = 2;
    string email = 3;
    Status status = 4;
    repeated string tags = 5; // 列表
}

// 服务
service UserService {
    rpc GetUser(GetUserRequest) returns (User);
}
```

## Go 使用方式

```bash
# 安装 protoc 编译器
# 安装 Go 插件
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# 编译
protoc --go_out=. --go_opt=paths=source_relative \
       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
       *.proto
```

## 最佳实践

1. **字段编号一旦分配不要改变** - 用于标识字段，变更会导致兼容性问题
2. **使用 `reserved`** - 废弃的字段标记为保留
3. **合理使用 `oneof`** - 类似 union，同一时间只有一个字段有值
4. **使用 `map` 类型** - 替代重复 key-value 对
5. **考虑向前兼容** - 新增字段使用新编号
