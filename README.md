
![logo](packages/KonnectJS/docs/logo.png)

An extremely flexible abstraction of node-connections structure, which designed for keep-in-connection using, can be fit with any type of network protocol

this work is still in progress.

<!-- vscode-markdown-toc -->
- [Major Concepts](#major-concepts)
  - [Knode](#knode)
  - [Konnection](#konnection)
- [Purpose](#purpose)
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
## Major Concepts
### Knode
'Knode' is for the same pronounce as 'Node'(similarly hereinafter). A node is the unit to communicate with the each other. A node is implicitly the local-machine node, which we should define the behaviour.
### Konnection
'Konnection' is for the same pronounce as 'Connection'(similarly hereinafter). The ends of a Konnection are nodes. A node may has lots of connections. Nodes cannot communicate without a established connection.

## Purpose

The main purpose of this project is deeply decoupling the business code with network api, network behaviour, data-parseing, and even engine api if possible.

In a common way, the very aims of KonnectJS are:
* make in-connection-network programming much more easier
* uniform the api of network protocol, one code for all
* make network protocols compatible to be seamlessly swtiched with
* make it possible to upgrade an existing project to fit with KonnectJS without too much effort
* etc

KonnectJS with help with scenes like:
* network protocol is not determined currently, or will be switch in runtime
* upgrade application based on koa or express to a in-connection-network version.
* finding a way to make bussiness code deeply decoupled
* develop an in-connection-network application in koa/express way
* etc

## Installation
clone the source code:
```sh
> git clone git@github.com:labbbirder/KonnectJS.git
```

~or install from npmjs:~ (not yet)

```sh
> npm i -S KonnectJS
```
then import locally:
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
See full document [here](packages/KonnectJS/README.md)

there are alse samples [here](samples):
* chat - a simple chat room with websock server and client
* switch_protocols - a chat room, but can swtich with varied protocols
* chat2 - a chat room, but with packet split, autoreconnect, heartbeat strategies
* simple - a simple transmitter between knodes

