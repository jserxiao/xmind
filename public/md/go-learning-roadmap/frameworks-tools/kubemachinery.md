# Kubernetes (client-go / controller-runtime)

## 概述

Go 是 Kubernetes 的原生语言，使用 Go 开发 K8s 应用和控制器是最自然的选择。

## client-go

Kubernetes 官方 Go 客户端：

```go
import (
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/clientcmd"
)

func main() {
    // 加载 kubeconfig
    config, _ := clientcmd.BuildConfigFromFlags("", "/home/.kube/config")
    
    // 创建 clientset
    clientset, _ := kubernetes.NewForConfig(config)
    
    // 列出所有 Pod
    pods, _ := clientset.CoreV1().Pods("default").List(context.TODO(), metav1.ListOptions{})
    for _, pod := range pods.Items {
        fmt.Println(pod.Name)
    }
    
    // Watch 变化
    watcher, _ := clientset.CoreV1().Pods("default").Watch(context.TODO(), metav1.ListOptions{})
    for event := range watcher.ResultChan() {
        fmt.Printf("Event: %s\n", event.Type)
    }
}
```

## controller-runtime

开发 K8s 控制器的标准框架（Kubebuilder 使用）：

```go
import ctrl "sigs.k8s.io/controller-runtime"

func main() {
    mgr, _ := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
        Scheme: scheme,
    })
    
    // 注册 Reconciler
    if err := (&MyReconciler{
        Client: mgr.GetClient(),
        Scheme: mgr.GetScheme(),
    }).SetupWithManager(mgr); err != nil {
        panic(err)
    }
    
    mgr.Start(ctrl.SetupSignalHandler())
}

type MyReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

func (r *MyReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // 获取资源
    var myapp mygroupv1.MyApp
    if err := r.Get(ctx, req.NamespacedName, &myapp); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }
    
    // 调谐逻辑...
    return ctrl.Result{}, nil
}
```

## Kubebuilder

快速生成 K8s CRD 和 Controller：

```bash
# 安装
os=$(go env GOOS)
arch=$(go env GOARCH)
# 下载 kubebuilder

# 创建项目
kubebuilder init --domain example.com --repo github.com/example/mycontroller

# 创建 API
kubebuilder create api --group web --version v1 --kind MyApp

# 实现 Reconcile 逻辑后运行
make run
```
