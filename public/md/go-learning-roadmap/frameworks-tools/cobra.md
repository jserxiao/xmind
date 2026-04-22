# 命令行工具 (cobra)

## 概述

Cobra 是 Go 中最强大的命令行应用框架，被 Kubernetes、Hugo、GitHub CLI 等众多知名项目使用。

## 基本使用

```go
package main

import (
    "fmt"
    "github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
    Use:   "myapp",
    Short: "My awesome application",
    Run: func(cmd *cobra.Command, args []string) {
        fmt.Println("Hello from myapp!")
    },
}

func main() {
    rootCmd.Execute()
}
```

## 子命令和参数

```go
var verbose bool
var output string

var serveCmd = &cobra.Command{
    Use:   "serve",
    Short: "Start the server",
    Run: func(cmd *cobra.Command, args []string) {
        fmt.Printf("Serving on port %s (verbose=%v)\n", port, verbose)
    },
}

func init() {
    rootCmd.AddCommand(serveCmd)
    
    // 全局参数
    rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "verbose output")
    
    // 局部参数
    serveCmd.Flags().StringVarP(&port, "port", "p", "8080", "server port")
    serveCmd.Flags().StringVarP(&output, "output", "o", "", "output format")
}
```

## 使用效果

```
$ myapp --help
My awesome application

Usage:
  myapp [command]

Available Commands:
  help        Help about any command
  serve       Start the server

Flags:
  -v, --verbose   verbose output
  -h, --help      help for myapp

$ myapp serve --port=3000 -v
Serving on port 3000 (verbose=true)
```

## 常用组合

### Cobra + Viper (配置管理)
```go
import "github.com/spf13/viper"

func init() {
    cobra.OnInitialize(initConfig)
    
    rootCmd.PersistentFlags().String("config", "", "config file")
    viper.BindPFlag("config", rootCmd.PersistentFlags().Lookup("config"))
}

func initConfig() {
    if cfgFile != "" {
        viper.SetConfigFile(cfgFile)
    } else {
        viper.SetConfigName("config")
        viper.AddConfigPath(".")
    }
    viper.ReadInConfig()
}
```
