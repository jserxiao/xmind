# Go WebSocket

## 概述

WebSocket 提供了浏览器和服务器之间的全双工通信通道。

## 标准库实现

```go
// 服务端
var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool { return true },
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()
    
    for {
        messageType, message, err := conn.ReadMessage()
        if err != nil {
            break
        }
        log.Printf("recv: %s", message)
        err = conn.WriteMessage(messageType, message)
        if err != nil {
            break
        }
    }
}
```

## gorilla/websocket

最流行的 Go WebSocket 库：

```go
import "github.com/gorilla/websocket"

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
}

func handleWS(w http.ResponseWriter, r *http.Request) {
    conn, _ := upgrader.Upgrade(w, r, nil)
    
    // 读取
    _, message, _ := conn.ReadMessage()
    
    // 写入 JSON
    conn.WriteJSON(map[string]string{"msg": "hello"})
    
    // 写入文本
    conn.WriteMessage(websocket.TextMessage, []byte("hello"))
}
```

## nhooyr.io/websocket (推荐)

更现代、更轻量的选择：

- 零依赖（除了标准库）
- 完整的 API
- 支持 context 取消
- 更好的并发安全

## 常见应用场景

1. **实时聊天** - 即时消息推送
2. **实时数据** - 股票行情、监控面板
3. **在线协作** - 共同编辑文档
4. **游戏** - 多人实时游戏
5. **DevOps** - 实时日志查看
