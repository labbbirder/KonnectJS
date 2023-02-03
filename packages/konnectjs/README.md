
![logo](https://github.com/labbbirder/KonnectJS/blob/main/docs/logo.png)

An extremely flexible abstraction of node-connections structure, which designed for keep-in-connection using, can be fit with any type of network protocol

this work is still in progress.

<!-- vscode-markdown-toc -->
- [Installation](#installation)
- [Basic Usage](#basic-usage)
  - [Start A WebSocket Server](#start-a-websocket-server)
  - [Start A Tcp Server](#start-a-tcp-server)
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
import { Knode,Konnection } from 'KonnectJS'
import { KonnectWS } from 'Konnect-ws'

let node = new Knode()
.setImpl(KonnectWS({ port:3000, isServer:true })) // Immediately listen on 3000, and communicate with websocket
.use(()=>ctx=>{
    console.log("websocket message", ctx.eventType, ctx.data)
})
```
### Start A Tcp Server
the code below illustrates how a tcp server is created:
```typescript
import { Knode,Konnection } from 'KonnectJS'
import { KonnectTCP } from 'Konnect-tcp'

let node = new Knode()
.use(()=>ctx=>{
    console.log("tcp data", ctx.eventType, ctx.data)
})
.setImpl(KonnectTCP({ port:3000, isServer:true })) // the invoking order of setImpl does not matter
```

## Documentation
See full document [here](https://github.com/labbbirder/KonnectJS/blob/main/README.md)

there are alse samples [here](https://github.com/labbbirder/KonnectJS/blob/main/samples):
* chat - a simple chat room with websock server and client
* switch_protocols - a chat room, but can swtich with varied protocols
* chat2 - a chat room, but with packet split, autoreconnect, heartbeat strategies
* simple - a simple transmitter between knodes

see step-by-step tutorial [here](https://github.com/labbbirder/KonnectJS/blob/main/packages/tutorial/README.md)