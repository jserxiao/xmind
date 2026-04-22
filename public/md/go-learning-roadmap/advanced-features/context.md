# 上下文 (context)

## 概述

`context` 包用于在 API 边界和进程之间传递截止时间、取消信号和其他请求范围的值。

## 基本用法

### 创建 Context

```go
// 背景 context（通常作为根 context）
ctx := context.Background()

// TODO context（不确定使用场景时）
ctx := context.TODO()
```

### 派生 Context

```go
// WithCancel - 可手动取消
ctx, cancel := context.WithCancel(parentCtx)
defer cancel() // 重要：始终调用 cancel！

// WithTimeout - 超时自动取消
ctx, cancel := context.WithTimeout(parentCtx, 3*time.Second)
defer cancel()

// WithDeadline - 在指定时间点取消
ctx, cancel := context.WithDeadline(parentCtx, time.Now().Add(3*time.Second))
defer cancel()

// WithValue - 携带键值对
ctx := context.WithValue(parentCtx, "key", "value")
```

## 取消机制

```go
func longRunningOperation(ctx context.Context) error {
    for {
        select {
        case <-ctx.Done():
            // context 被取消或超时
            return ctx.Err()
        default:
            // 继续工作...
        }
    }
}

// 使用
ctx, cancel := context.WithCancel(context.Background())
go func() {
    if err := longRunningOperation(ctx); err != nil {
        log.Println("操作被取消:", err)
    }
}()
cancel() // 取消操作
```

## 在 HTTP 请求中使用

```go
func handler(w http.ResponseWriter, r *http.Request) {
    // http.Request 已经携带了 context
    ctx := r.Context()
    
    // 设置超时
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    
    result, err := callExternalAPI(ctx)
    // ...
}
```

## 携带请求值

```go
type ctxKey string

const UserIDKey ctxKey = "userID"

func middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        userID := authenticate(r)
        ctx := context.WithValue(r.Context(), UserIDKey, userID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func handler(w http.ResponseWriter, r *http.Request) {
    userID := r.Context().Value(UserIDKey).(string)
    // ...
}
```

## 最佳实践

1. **context 作为第一个参数** - `func Do(ctx context.Context, ...)`
2. **不要将 context 存储在结构体中** - 应该显式传递
3. **始终调用 cancel** - 使用 defer 确保资源释放
4. **context.Value 只用于请求范围的数据** - 如 traceID、userID 等
5. **不要传递 nil context** - 不知道用什么时用 `context.TODO()`
