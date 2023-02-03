# Tutorial
let's begin with an step-by-step example of simple server. After the steps you'll get a chat server upon TCP.
## Step 1. Startup a Server
install konnectjs and konnect-tcp as local denpendencies:
```bash
npm i -S konnectjs konnect-tcp konnect-ws konnect-proto # install denpendencies locally
```
It's very simple to startup a server. Only specify the network specify by invoking `setImpl`
```typescript
import { KonnectTCP } from "konnect-tcp";
import { Knode } from "konnectjs/dist/middleware.app";

export const server = new Knode()
.setImpl(KonnectTCP({port:3000,isServer:true})) // listen on port 3000
.use(()=>(ctx,next)=>{
    // outputs on event
    console.log(ctx.eventType,ctx.dataIn)
    next()
})


```
By now you have a tcp server listening on port 3000

## Step 2. Create a Client for Test
let's now create a client either to test recv/send and connect/close.
```typescript
import { KonnectTCP } from "konnect-tcp";
import { Knode } from "konnectjs";


let client = new Knode()
.setImpl(KonnectTCP()) // not a server , no listen

// connect to server, returns a connecting connection.
let connection = client.CreateConnectTo({url:"127.0.0.1:3000"})

connection.on("connection",()=>{
    console.log("connected!")
})

// All above can be shorten to:

// let conn = new Knode()
// .setImpl(KonnectTCP())
// .CreateConnectTo({url:"127.0.0.1:3000"})
// .on("connection",()=>{
//     console.log("connected!")
// })

```
Generally, `isServer`( by default false ) is used for specify whether it's a server or not.

## Step 3. Use a Middleware
KonnectJS mainly implements functionalities by stacking middlewares. It is something similar to which in [koa](https://github.com/koajs/koa)
```typescript
import { Knode, ReformIO } from "konnectjs";

new Knode()

.use(ReformIO<Buffer,string>,/*...args*/)
// the same as:
// .use( ()=>ReformIO<Buffer,Buffer>(/*...args*/) )

// use middleware with event filter
.use(["data"], ReformIO<Buffer>) // for "data" event only
.use(["data","connection"], ReformIO<Buffer>) // for "data" ,"connection" only

```
An outter IO data form can be varied, which can be string, bytes, json or anything else. Therefore, KonnectJS specifies the IO data format by stacking `ReformIO` middleware.

`ReformIO` use two template arguments.The `TI` is used to specify input data type. The `TO` is for output data type, which will be the same as input data type if omitted.

`ReformIO` can be called with a argument for transformer. A `former` transforms input data to inner application data. Correspondingly The `unformer` transforms output data from application upwards.

here is an example for using `ReformIO`:
```typescript
import { Knode, ReformIO } from "konnectjs";

new Knode()

// tells followings treat IO data as Buffer
.use(ReformIO<Buffer>) // does nothing but typing data

.use(()=>(ctx,next)=>{
    ctx.dataIn // recv Buffer type
    ctx.send(Buffer.alloc(2)) // send Buffer type
    next()
})
.use(ReformIO<string>,{ // transform the buffer to string
    former:input=>input.toString(),
    unformer:output=>Buffer.from(output),
})
// from now on, we can regard IO data as string
.use(()=>(ctx,next)=>{
    ctx.dataIn // recv string type
    ctx.send("hello, string") // send string type
    next()
})
```
## Step 4. Output Debug Information to Console
```typescript
import { KonnectTCP } from "konnect-tcp"
import { DebugEvent, Knode, ReformIO } from "konnectjs"

new Knode()
.setImpl(KonnectTCP({port:3000,isServer:true}))
.use(ReformIO<Buffer>)

.use(DebugEvent,{prefix:"transfer"})
.use(ReformIO<string>,{
    former:input=>input.toString(),
    unformer:output=>Buffer.from(output),
})

.use(["data","connection","close"],DebugEvent,{prefix:"application"})
```
when a client acts, you will see the output like:
```
--- transfer get <connection> event ---
[DEBUG transfer ↴]
 [DEBUG application ↴]
 [DEBUG application ↵]
[DEBUG transfer ↵]
```
## Step 5. Split TCP Stream into Separate Packages
As TCP is stream-based on transfer, when bytes recv from connection may not a isolate package, which can be sticked or splited. A commonly used middware named `KonnectSplit` is used for this problem.

```typescript
import { KonnectSplit } from "konnect-proto"

...

server.use(KonnectSplit) // split streaming data
.use(["data"],()=>ctx=>{
    console.log(ctx.dataIn) // should see "a" and "ward", instead of "award"
})


client.use(KonnectSplit)  // client should use too
.use(["connection"],()=>ctx=>{
    ctx.send(Buffer.from("a"))
    ctx.send(Buffer.from("ward"))
})
```

## Step 6. Connection Heartbeat
when a connection is closed, the protocol should emit a "close" event generally. However, it may not happens as we expected sometimes. As a solution, a knode use a timer to record last remove event and close the connection actively on time exceeds.
```typescript
import { KonnectHeartbeat } from "konnect-proto"

...

server.use(KonnectHeartbeat) // disconnect on long-time-no-action

client.use(KonnectHeartbeat)  // client too
```

## Step 7. Final Work
```typescript
import { Knode, ReformIO, DebugEvent } from "konnectjs";
import { KonnectSplit,KonnectReconnect,KonnectHeartbeat } from "konnect-proto";
import { KonnectTCP } from "konnect-tcp";


export function startServer(){
    console.log("chat server start")
    let globalClientID = 0

    let node = new Knode()
    .setImpl(KonnectTCP({port:3000,isServer:true}))
    .use(KonnectSplit) //avoid sticky package and half package problem
    .use(KonnectHeartbeat,{
        heartBeatInterval:2000,
        maxLifeime:6000,
    })
    .use(DebugEvent,{prefix:"server net"})
    .use(ReformIO<string>, { // reform network io
        former:b=>b.toString(),
        unformer:s=>Buffer.from(s),
    })
    .use(()=>{
        let clientid = ++globalClientID
        return async ctx=>{
            if(ctx.eventType==="connection"){
                ctx.send(`hello, ${clientid}`)
            }
            if(ctx.eventType==="data"){
                node.sendTo(node.connections,`[${clientid}]: ${ctx.dataIn}`)
            }
            if(ctx.eventType==="close"){
                node.sendTo(node.connections,`bye [${clientid}]`)
            }
        }
    })
    return node
}


export function startClient(){
    let node = new Knode()
    .setImpl(KonnectTCP())
    .use(KonnectSplit)
    .use(KonnectHeartbeat,{
        heartBeatInterval:3000,
        maxLifeime:7000,
    })
    .use(KonnectReconnect,{ timeout:1500 })
    .use(DebugEvent,{prefix:"client"})
    .use(ReformIO<string>, { // reform network io
        former:b=>b.toString(),
        unformer:s=>Buffer.from(s),
    })
    .use(DebugEvent,{prefix:"client2"})
    .use(["data"],()=>ctx=>{
        console.log("client recv - ",ctx.dataIn)
    })

    return node.CreateConnectTo({url:"127.0.0.1:3000"})
}

```
By now you can run the script via `ts-node` to experient.


> By the way, you can switch protocol from TCP to WS or any other by simpling replacing `KonnectTCP()` to `KonnectWS()` !

