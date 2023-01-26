
![logo](logo.png)

KonnectJS 是一个非常灵活的基于结点和连接的抽象架构。专门为面向连接的应用而设计，可以随意切换各种网络协议

此项目尚处于开发中。。。

<!-- vscode-markdown-toc -->
- [概念](#概念)
  - [Konnection \& Knode](#konnection--knode)
  - [Impl](#impl)
- [功能](#功能)
- [安装](#安装)
- [开始认识](#开始认识)
  - [运行一个WS服务器](#运行一个ws服务器)
  - [运行一个Tcp服务器](#运行一个tcp服务器)
  - [连接会话](#连接会话)
  - [手动触发事件](#手动触发事件)
  - [多种类连接](#多种类连接)
- [层叠式中间件](#层叠式中间件)
- [自定义中间件](#自定义中间件)
- [扩展自定义实现](#扩展自定义实现)

<!-- vscode-markdown-toc-config
	numbering=true
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

## 概念

### Konnection & Knode

KonnectJS 有两个主要的概念 'Konnection' 和 'Knode'。 
'Konnection' 与 'Connection' 发音相同(下文不再区分)；
'Knode' 与 'Node' 发音相同(下文不再区分)。
连接的端点被称为结点； 一个结点可以有多个连接。


### Impl

KonnectJS 只关心抽象的逻辑结构，并处理在这个结构上的事件。 也就是说, KonnectJS 需要有专门的外部驱动者。 通过调用 `setImpl`. 
大多数情况下，Impl是一个特定的网络协议。**但是这并不意味着Impl只能是网络协议**.


## 功能

对于业务代码，只需要定义如何响应对应的事件:

* connection - 连接建立
* close - 连接关闭
* data - 数据传输
* error - 错误发生

有时一些简单场景，开发者不必关系与业务逻辑无关的繁琐事务。如使用何种网络协议，何种数据解析，何种加密方式，甚至是如何握手等等。下面这些内容使用KonnectJS只需要一行代码就可以切换:

* 何种通信协议。 如 `websocket`， `tcp`， `udp`， `sse`， `polling`， `kcp`，`http3` 或任意其他自定义实现，参考 [扩展自定义实现](#扩展自定义实现)
    > 无连接的网络协议：
    > 
    > 对于基于请求应答的无连接通信方式，如：http，KonnectJS也可以支持。只需要提前配置好中间件，甚至能够毫无察觉的对接到Koa或Express应用中，对于大部分逻辑简单的业务代码都可以无缝切换。由于KonnectJS侧重于有连接的通信实现，此类内容放在后续完善。
  
* 何种数据解析格式。如 `json`, `bson`, `buffer`, `string`, `protobuf` 或其他自定义格式，参考 [自定义中间件](#自定义中间件)
* 如何真正的建立连接。如自定义握手，自定义认证等
* 及其他各种
## 安装
clone the source code:
```sh
> git clone git@github.com:labbbirder/KonnectJS.git
```
or install from npmjs:
```sh
> npm i -S KonnectJS
```
when you installed the project successfully, it's time to import to your script:
```typescript
import { Knode,Konnection } from 'KonnectJS'
```
## 开始认识
### 运行一个WS服务器
the code below illustrates how a websocket server is created:
```typescript
import { Knode,Konnection } from 'KonnectJS'
import { KonnectWS } from 'Konnect-ws'

let node = new Knode()
.setImpl(KonnectWS({ port:3000 })) // 在3000端口监听，使用ws通信
.use(()=>ctx=>{
    console.log("websocket message", ctx.eventType, ctx.data)
})
```
### 运行一个Tcp服务器
the code below illustrates how a tcp server is created:
```typescript
import { Knode,Konnection } from 'KonnectJS'
import { KonnectTCP } from 'Konnect-tcp'

let wss = new WebSocketServer({
    port: 3000
})

let node = new Knode()
.use(()=>ctx=>{
    console.log("tcp data", ctx.eventType, ctx.data)
})
.setImpl(KonnectTCP({ port:3000 })) // 可以任何时刻调用setImpl
```
### 连接会话
And you may want to know who the connection is, and want some code persistent for the same connection to be retrieved, here is the example:
```typescript
import { Knode,Konnection } from 'KonnectJS'
import { KonnectTCP } from 'Konnect-tcp'

let wss = new WebSocketServer({
    port: 3000
})

let node = new Knode()
.use(()=>{
    // for a new connection here...
    let session = {}
    let lastEventTime = 0

    return ctx=>{ // the returned function is called every time the connection emits
        if(!!lastEventTime){
            console.log("i remember you", ctx.eventType, ctx.data)// we can retrieve here
            console.log("last message from you is on", lastEventTime)
        }else{
            console.log("hello, new connection")
        }
        session.data = ctx.data
        lastEventTime = Date.now()
    }
})
.setImpl(KonnectTCP({ port:3000 })) 
```
The scope of `let session = {}` is initialized the time as the connection established. The data under the scope is saved respectively.
### 手动触发事件
this example shows how to drive it manually:
```typescript
import { Knode,Konnection } from 'KonnectJS'

let node = new Knode()
node.use((ctx)=>{
    console.log(ctx.)
})

let conn = new Konnection(node)
node.emit("connection",conn) // establish a connection manually
conn.emit("data","hello there") // transfer a data via connection manually
```
### 多种类连接
有时候额外需要一个到内部服务器的单独连接，运行着不同的逻辑。这是例子:

```typescript
import { Knode,Konnection } from 'KonnectJS'
import { KonnectTCP } from 'Konnect-tcp'

let wss = new WebSocketServer({
    port: 3000
})
let node = new Knode()
.use(()=>{
    // 到各个客户端的连接
    console.log("hello, new connection from client")
    return ctx=>{
        ctx.conn.send("you are a client")
    }
})
.setImpl(KonnectTCP({ port:3000 })) 

let connA = new Konnection(node) // 到内部服务器的独立连接
connA.connectTo({host:"127.0.0.1",port:3001})
connA.use((ctx,next)=>{
    if(ctx.data==="who am I"){
        connA.send("you are gate server")
    }
})
```
## 层叠式中间件
the midware here is similar to which of [koa](https://github.com/koajs/koa)

```typescript
import { Knode,Konnection } from 'KonnectJS'
const sleep = (ms:number)=>new Promise(res=>setTimeout(res,ms))

let node = new Knode()
node.setImpl(KonnectWS({ port:3000 })) 
.use(async (ctx,next)=>{
    console.log("start")
    await next()
    console.log("end")
})
.use(async (ctx,next)=>{
    await sleep(3000)
    console.log("good")
})
.use(async (ctx,next)=>{
    console.log("you wont see this")
})

```

## 自定义中间件
here is an example of json parser midware:
```typescript
interface Context{ // declaration here
    json: any
}
```
```typescript
// how it transforms
let KnonectJson = defineMidware((options?:any)=>async (ctx,next)=>{
    ctx.json = JSON.parse(ctx.rawData)
    await next()
    ctx.respData = JSON.stringify(ctx.respData)
})
```
defineMidware 只是简单的返回原函数，但是会在代码编辑器中引入类型提示。

```typescript
import { Knode,Konnection } from 'KonnectJS'
import { KnonectJson } from 'KnonectJson'

let node = new Knode()
node.setImpl(KonnectWS({ port:3000 })) // use your midware
.use(KnonectJson())
.use(async (ctx,next)=>{
    console.log("data in json", ctx.json)
})

```
## 扩展自定义实现
On the most time, you'll need `defineImpl` function.
here is an example of websocket implement:
```typescript
import { WebSocketServer } from "ws"
import { Konnection, defineImpl } from "./KonnectJS/Konnect"

export let KonnectWS = defineImpl((wss:WebSocketServer)=>(node)=>{
    wss.on("connection",ws=>{
        let conn = new Konnection(node,ws)
        ws.on("message",(data:Buffer)=>{
            conn.emit("data",data)
        })
        ws.on("close",(code,reason)=>{
            conn.emit("close",{code,reason})
        })
        ws.on("error",err=>{
            conn.emit("error",err)
        })
        node.emit("connection",conn)
    })
    return {
        closeConnection(conn,code,reason){
            conn.close(code,reason)
            return true
        },
        sendTo(conn:Konnection<WebSocket>,data) {
            conn.raw.send(data)
            return true
        },
    }
})
```
defineImpl 只是简单的返回原函数，但是会在代码编辑器中引入类型提示。