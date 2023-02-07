
![logo](https://github.com/labbbirder/KonnectJS/blob/main/docs/logo.png)

An extremely flexible abstraction of node-connections structure, which designed for keep-in-connection using, can be fit with any type of network protocol

this work is still in progress.

<!-- vscode-markdown-toc -->
- [Installation](#installation)
- [Basic Usage](#basic-usage)
  - [Start A WebSocket Server](#start-a-websocket-server)
  - [Start A Tcp Server](#start-a-tcp-server)
  - [Hybrid Server](#hybrid-server)
- [Documentation](#documentation)

<!-- vscode-markdown-toc-config
	numbering=true
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->


## Installation
or install from npmjs:

```sh
> npm i -S konnectjs
```
in editor:
```typescript
import { Knode,Konnection } from 'KonnectJS'
```
## Basic Usage
### Start A WebSocket Server
the code below illustrates how a websocket server is created:
```typescript
import { Knode,Konnection } from 'konnectjs'
import { WebSocketBroker } from 'konnect-ws'

let node = new Knode()
.setBroker(new WebSocketBroker({ port:3000, isPublic:true })) // Immediately listen on 3000, and communicate with websocket
.use(()=>ctx=>{
    console.log("websocket message", ctx.eventType, ctx.dataIn)
})
```
### Start A Tcp Server
the code below illustrates how a tcp server is created:
```typescript
import { Knode,Konnection } from 'konnectjs'
import { TcpBroker } from 'konnect-tcp'

let node = new Knode()
.setBroker(new TcpBroker({ port:3000, isPublic:true })) // now it's upon TCP
.use(()=>ctx=>{
    console.log("tcp data", ctx.eventType, ctx.dataIn)
})
```
### Hybrid Server
the code below illustrates how a server accepting either WebScoket or TCP connections!
```typescript
import { Knode,Konnection } from 'konnectjs'
import { TcpBroker } from 'konnect-tcp'
import { WebSocketBroker } from 'konnect-ws'


let wsNode = new Knode() // websocket
.setBroker(new WebSocketBroker({ port:3000, isPublic:true }))
.use(()=>(ctx,next)=>{
  console.log("raw WebSocket",ctx.eventType)
  next()
})
.to(()=>endNode) // continue with endNode


let tcpNode = new Knode() // tcp
.setBroker(new TcpBroker({ port:3000, isPublic:true }))
.use(()=>(ctx,next)=>{
  console.log("raw TCP",ctx.eventType)
  next()
})
.to(()=>endNode) // continue with endNode


let endNode = new Knode()
.use(()=>(ctx)=>{
  // both TCP and WS events are redirected here
  console.log("application event",ctx.eventType) 
  ctx.send(ctx.dataIn) // send back
})

```
## Documentation
See full document [here](https://github.com/labbbirder/KonnectJS/blob/main/README.md)

there are alse samples [here](https://github.com/labbbirder/KonnectJS/blob/main/samples):
* chat - a simple chat room with websock server and client
* switch_protocols - a chat room, but can swtich with varied protocols
* chat2 - a chat room, but with packet split, autoreconnect, heartbeat strategies
* simple - a simple transmitter between knodes

see step-by-step tutorial [here](https://github.com/labbbirder/KonnectJS/blob/main/packages/tutorial/README.md)