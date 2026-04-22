# Redis (go-redis)

## 概述

`go-redis/v9` 是 Go 中最流行的 Redis 客户端库。

## 基本使用

```go
package main

import (
    "context"
    "github.com/redis/go-redis/v9"
)

var rdb = redis.NewClient(&redis.Options{
    Addr:     "localhost:6379",
    Password: "",
    DB:       0,
})

func main() {
    ctx := context.Background()
    
    // String
    rdb.Set(ctx, "key", "value", 0)
    val, _ := rdb.Get(ctx, "key").Result()
    
    // Hash
    rdb.HSet(ctx, "user:1", "name", "Alice")
    name, _ := rdb.HGet(ctx, "user:1", "name").Result()
    
    // List
    rdb.LPush(ctx, "queue", "task1")
    task, _ := rdb.RPop(ctx, "queue").Result()
    
    // Set
    rdb.SAdd(ctx, "tags", "go", "redis")
    members, _ := rdb.SMembers(ctx, "tags").Result()
    
    // Sorted Set
    rdb.ZAdd(ctx, "ranking", redis.Z{Score: 100, Member: "Alice"})
    top3, _ := rdb.ZRevRangeWithScores(ctx, "ranking", 0, 2).Result()
}
```

## Pipeline (管道)

将多个命令打包发送，减少网络往返：

```go
pipe := rdb.Pipeline()
incr := pipe.Incr(ctx, "pipe_counter")
pipe.Expire(ctx, "pipe_counter", time.Hour)
cmds, _ := pipe.Exec(ctx)

// 获取结果
fmt.Println(incr.Val())
```

## 发布/订阅

```go
sub := rdb.Subscribe(ctx, "mychannel")
ch := sub.Channel()

go func() {
    for msg := range ch {
        fmt.Println(msg.Channel, msg.Payload)
    }
}()

rdb.Publish(ctx, "mychannel", "hello")
```

## 分布式锁 (RedSync)

```go
import "github.com/go-redsync/redsync/v4"

pool := redsyncredis.NewPool(rdb)
rs := redsync.New(pool)

mutex := rs.NewMutex("my-resource")
if err := mutex.Lock(); err != nil {
    // 处理错误
}
defer mutex.Unlock()

// 执行业务逻辑...
```
