# ORM

## GORM

### 简介

Go 最流行的 ORM 库，功能齐全，支持多种数据库。

### 基本使用

```go
package main

import (
    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

type User struct {
    gorm.Model
    Name  string
    Email string `gorm:"type:varchar(100);unique_index"`
    Age   int
}

func main() {
    db, err := gorm.Open(mysql.Open("user:pwd@tcp(127.0.0.1:3306)/db?charset=utf8mb4"), &gorm.Config{})
    
    // 自动迁移
    db.AutoMigrate(&User{})
    
    // 创建
    db.Create(&User{Name: "Alice", Age: 25})
    
    // 查询
    var user User
    db.First(&user, 1)              // 按 ID 查询
    db.Where("name = ?", "Alice").First(&user)
    
    // 更新
    db.Model(&user).Update("age", 26)
    
    // 删除
    db.Delete(&user)
}
```

### 关联

```go
type User struct {
    gorm.Model
    CreditCards []CreditCard     // has many
    Address     Address          // has one (一对一)
    Languages   []Language `gorm:"many2many:user_languages;"` // 多对多
}

// 预加载（避免 N+1 问题）
db.Preload("CreditCards").Preload("Languages").Find(&users)
```

## ent (Facebook 出品)

```go
// Schema 定义
type User struct {
    ent.Schema
}

func (User) Fields() []ent.Field {
    return []ent.Field{
        field.String("name"),
        field.Int("age"),
        field.Time("created_at").Default(time.Now),
    }
}

// 生成代码后使用
client.User.Create().SetName("Alice").SetAge(25).SaveX(ctx)
user, _ := client.User.Query().Where(user.Name("Alice")).Only(ctx)
```

## xorm

另一个流行的 ORM，更轻量：

```go
engine, _ := xorm.NewEngine("mysql", "dsn")
engine.Sync2(new(User))

// CRUD
engine.Insert(&User{Name: "Alice"})
engine.ID(1).Get(&user)
engine.ID(1).Update(&User{Age: 26})
engine.ID(1).Delete(&User{})
```
