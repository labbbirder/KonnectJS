
![logo](https://github.com/labbbirder/KonnectJS/blob/main/docs/logo.png)

[简体中文 (recommended)](https://github.com/labbbirder/KonnectJS/blob/main/docs/zh-cn.md)

An extremely flexible abstraction of node-connections structure, which designed for keep-in-connection using, can be fit with any type of network protocol

this work is still in progress.
which means:
* breaking changes
* documentation mistakes
* uncovered usecase may fail
* potential bugs

however, the following are guaranteed:
* covered usecases and examples
* project integrity and consistency
* document-based functions stability and reproducibility


Calalog
<!-- vscode-markdown-toc -->
- [Concepts](#concepts)
  - [Konnection \& Knode](#konnection--knode)
  - [Broker](#broker)
- [Purpose](#purpose)
- [Installation](#installation)
- [Getting Started](#getting-started)
  - [Start A WebSocket Server](#start-a-websocket-server)
  - [Start A Tcp Server](#start-a-tcp-server)
  - [Details On Use](#details-on-use)
  - [Knode Concatenation](#knode-concatenation)
  - [LowLevel Methods](#lowlevel-methods)
  - [~~Flexible Connections~~(changed soon)](#flexible-connectionschanged-soon)
- [Cascade Midwares](#cascade-midwares)
- [Custom Midwares](#custom-midwares)
- [Custom Brokers](#custom-brokers)
- [Samples](#samples)

<!-- vscode-markdown-toc-config
	numbering=true
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

## Concepts

### Konnection & Knode

KonnectJS has two major concepts, which are 'Konnection' & 'Knode' & 'Kontext'. 

'Konnection' is for the same pronounce as 'Connection'(similarly hereinafter). 

'Knode' is for the same pronounce as 'Node'(similarly hereinafter). 

'Kontext' is for the same pronounce as 'Context'(similarly hereinafter). 

The ends of a connection are nodes. A node generally has lots of connections. A connection has some Kontext. Application data is treated on a Kontext.

### Broker

KonnectJS is only aware of the abstract structure. We just tell it what to do when a connection on establish, closed, transfer or error occurs. That is to say, the Konnect dont has network implements itself. We should set a event-based driver by calling `setBroker`. 

For the most time, a broker is something like network protocol. However, that is not to say that Konnect can only deal with networking using.


## Purpose

For business coders, the only thing to think about is to defines how the node acts with connection events, such as:

* connection - a new connection established
* close - a connection is close by some reason
* data - some data is transfered from a connection
* error - an error occured on a connection

Sometimes, there is no sense for business coders to worry about what protocol to use, what format the data is, how data is encrypted, even how the connection is established and so on. The followings are only one line code needed to set what the system consist of without any other code modification:

* set what communication protocol to use with only one line code. such as `websocket`, `tcp`, `udp`, `sse`, `polling`, `kcp`, `http3` or custom communication implement, see [Extend Implement](#extend-implement)
  
* set what format of the data transfered from the connection, for example `json`, `bson`, `buffer`, `string`, `protobuf` or custom data format, see [Custom Midware](#custom-midwares)
* set how connection is established, for example extra handshake, authentication and so on
* 
## Installation

install from npmjs:

```sh
> npm i -S konnectjs
```
when you installed the project successfully, it's time to import to your script:
```typescript
import { Knode,Konnection } from 'konnectjs'
```
## Getting Started
### Start A WebSocket Server
the code below illustrates how a websocket server is created:
```typescript
import { Knode,Konnection } from 'KonnectJS'
import { KonnectWS } from 'Konnect-ws'

let node = new Knode()
.setImpl(KonnectWS({ port:3000,isServer:true })) // Immediately listen on 3000, and communicate with websocket
.use(()=>ctx=>{
    console.log("websocket event", ctx.eventType, ctx.dataIn)
})
```
### Start A Tcp Server
the code below illustrates how a tcp server is created:
```typescript
import { Knode,Konnection } from 'KonnectJS'
import { KonnectTCP } from 'Konnect-tcp'

let node = new Knode()
.setImpl(KonnectTCP({ port:3000,isServer:true }))
.use(()=>ctx=>{
    console.log("tcp event", ctx.eventType, ctx.dataIn)
})
```
### Details On Use
And you may want to know who the connection is, and want some code persistent for the same connection to be retrieved, here is the example:
```typescript
import { Knode,Konnection } from 'konnectjs'

let node = new Knode()
.use(function(){ // called on conenction instantiation
    console.log(this) // output: Konnection Instance
    let connection_session = {event_count:0}
    return ctx=>{ // called when events emitted on this connection
        connection_session.event_count += 1
    }
})
```

### Knode Concatenation
It's recommeded to split use-chain properly into pieces. Generally, the one in head is for *Protocol Layer*, the following one is for *Application Layer*.

KonnectJS implement this logic by **Knode.to**, here is an example:
```typescript
/* start of two protocol layers */
let tcpNode = new Knode()
.setBroker(new TcpBroker({port:3000,isPublic:true}))
.use(stream_to_packet())
.use(reconnect())
.use(heartbeat())
.to(()=>appNode) // continue with appNode

let wsNode = new Knode()
.setBroker(new WebSocketBroker(port:3001,isPublic:true))
.use(heartbeat())
.to(()=>appNode) // continue with appNode


/* start of application layer */
let appNode = new Knode()
.use(reform_io<string>({
    former:i=>i.toString(),
    unformer:o=>Buffer.from(o),
}))
.use(()=>ctx=>{
    // your application code here...
})
```

### LowLevel Methods
this example shows how to drive it manually:
```typescript
import { Knode,Konnection } from 'konnectjs'

let node = new Knode()
node.use(()=>(ctx)=>{
    console.log(ctx)
})

let conn = new Konnection(node)
conn.emit("connection") // make a connection established manually
conn.emit("data","hello there") // put a data on connection manually
conn.emit("close") // close connection manually
```
### ~~Flexible Connections~~(changed soon)
And you may what to keep a standalone connection to another server with different logic, here comes an example:

```typescript
import { Knode,Konnection } from 'KonnectJS'
import { KonnectTCP } from 'Konnect-tcp'

let node = new Knode()
.use(()=>{
    // for lots of client connections...
    console.log("hello, new connection from client")
    return ctx=>{
        ctx.conn.send("you are a client")
    }
})
.setImpl(KonnectTCP({ port:3000,isServer:true })) 

let connA = new Konnection(node) // a standalone connection to an inner server
connA.connectTo({url:"localhost:3001"})
connA.use((ctx,next)=>{
    if(ctx.eventType==="connection"){
        ctx.conn.send("hello, gate server")
    }
})
```


## Cascade Midwares
the midware here is similar to which of [koa](https://github.com/koajs/koa)

```typescript
import { Knode,Konnection } from 'konnectjs'
const sleep = (ms:number)=>new Promise(res=>setTimeout(res,ms))

let node = new Knode()
.use(()=>async (ctx,next)=>{
    console.log("start")
    await next()
    console.log("end")
})
.use(()=>async (ctx,next)=>{
    await sleep(3000)
    console.log("good")
})
.use(()=>async (ctx,next)=>{
    console.log("you wont see this")
})

```

## Custom Midwares
here is an example of json parser midware ( set `jsonIn` field on Kontext when has dataIn):
```typescript
// json_data.ts

import { defineMidware } from "konnectjs";

declare module "konnectjs"{
    export interface Kontext{
        jsonIn?:any
    }
}

export let json_data = defineMidware(function(){
    return (ctx,next)=>{
        if(ctx.dataIn) ctx.jsonIn = JSON.parse(ctx.dataIn)
    }
})
```

```typescript
// index.js
import {json_data} from "./json_data"
import { Knode,Konnection } from 'KonnectJS'

let node = new Knode()
.use(json_data())
.use(["data"],()=>async (ctx,next)=>{
    console.log("data in json", ctx.jsonIn)
})

```
## Custom Brokers
To implement a custom broker, extends `BrokerBase`.

remeber do the follwing things in subclass:

required:

* emit: `connection`, `close`, `data`, `error`
* implement: `send`, `close`, `connect`, `shutdown`

optional:

* setType `incomeDataTye` `outcomeDataType`

check the example brokers:
* [konnect-ws](https://github.com/labbbirder/KonnectJS/blob/main/packages/konnect-ws): implement of websocket
* [konnect-tcp](https://github.com/labbbirder/KonnectJS/blob/main/packages/konnect-tcp): implement of socket tcp
* [konnect-local](https://github.com/labbbirder/KonnectJS/blob/main/packages/konnect-local): implement of local event

## Samples
there are alse samples [here](https://github.com/labbbirder/KonnectJS/blob/main/samples):
* chat - a simple chat room with websock server and client
* switch_protocols - a chat room, but can swtich with varied protocols
* chat2 - a chat room, but with packet split, autoreconnect, heartbeat strategies
* simple - a simple transmitter between knodes

and see step-by-step tutorial [here](https://github.com/labbbirder/KonnectJS/blob/main/packages/tutorial/README.md), after whitch you'll get a simple chat server upon TCP.