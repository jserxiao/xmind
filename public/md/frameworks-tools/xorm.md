# XORM

## 概述

XORM 是一个简单而强大的 Go ORM 库，支持多种数据库驱动。

## 特点

- 轻量级，API 简洁
- 支持 MySQL, PostgreSQL, SQLite, MSSQL, Oracle 等
- 支持关联查询、事务、缓存等
- 内置连接池

## 基本使用

```go
package main

import (
    _ "github.com/go-sql-driver/mysql"
    "github.com/xorm/xorm"
)

type User struct {
    Id   int64  `xorm:"pk autoincr"`
    Name string `xorm:"varchar(255) notnull"`
    Age  int    `xorm:"int default 0"`
}

func main() {
    engine, err := xorm.NewEngine("mysql", "root:pwd@/dbname?charset=utf8")
    if err != nil {
        panic(err)
    }
    
    // 同步表结构
    engine.Sync2(new(User))
    
    // 创建
    _, _ = engine.Insert(&User{Name: "Alice", Age: 25})
    
    // 查询
    var user User
    has, _ := engine.ID(1).Get(&user)
    
    // 条件查询
    var users []User
    engine.Where("age > ?", 18).Find(&users)
    
    // 更新
    engine.ID(1).Update(&User{Age: 26})
    
    // 删除
    engine.ID(1).Delete(new(User))
}
```

## 高级功能

### 事务
```go
session := engine.NewSession()
defer session.Close()
err := session.Begin()

_, err = session.Insert(&user1)
_, err = session.Insert(&user2)

if err != nil {
    session.Rollback()
} else {
    session.Commit()
}
```

### 缓存
```go
// 启用缓存
cacher := xorm.NewLRUCacher(xorm.NewMemoryStore(), 1000)
engine.SetDefaultCacher(cacher)
```

## XORM vs GORM

| 特性 | XORM | GORM |
|------|------|------|
| 学习曲线 | 平缓 | 中等 |
| 功能丰富度 | 够用 | 更丰富 |
| 社区活跃度 | 中等 | 最活跃 |
| 性能 | 较好 | 较好 |
| 文档质量 | 好 | 很好 |
