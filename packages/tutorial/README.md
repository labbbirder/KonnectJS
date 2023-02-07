# Tutorial
let's begin with a step-by-step example, after witch you'll get a chat server upon TCP.
## Step 1. Startup a Server
install konnectjs and konnect-tcp as local denpendencies:
```bash
npm i -S konnectjs konnect-tcp konnect-ws konnect-proto # install denpendencies locally
```
It's simple to start a server. first of all is set low-level network implement by `setBroker`
```typescript
import { TcpBroker } from "konnect-tcp";
import { Knode } from "konnectjs";

export const server = new Knode()
.setBroker(new TcpBroker({port:3000,isPublic:true})) // listen on port 3000
.use(()=>(ctx,next)=>{
    // outputs on event
    console.log(ctx.eventType,ctx.dataIn)
    next()
})


```
now it's listening on port 3000

## Step 2. Create a Client for Test
let's now create a client either to test with.
```typescript
import { TcpBroker } from "konnect-tcp";
import { Knode } from "konnectjs";


let client = new Knode()
.setBroker(new TcpBroker({})) // not a server , no listen

// connect to server, returns a connecting connection.
let clientConn = client.connectTo({url:"127.0.0.1:3000"})

clientConn.on("connection",()=>{
    console.log("connected!")
})


// All above can be shorten to:

let conn = new Knode()
.setBroker(new TcpBroker({}))
.connectTo({url:"127.0.0.1:3000"})
.on("connection",()=>{
    console.log("connected!")
})

```
Generally, `isPublic`( by default false ) is used for indicate whether it's a server , in other words, can be connected to.

## Step 3. Use a Middleware
KonnectJS mainly implements functionalities by stacking middlewares. It is something similar to which in [koa](https://github.com/koajs/koa)
```typescript
new Knode()
.use(middleware_a())
.use(middleware_b())
.use(middleware_c())
// more...
```
> ### Alter IO Data Type
> An outter IO data form can be varied, which can be string, bytes, json or anything else. Therefore, KonnectJS alters the IO data format by stacking `reform_io` middleware.
>
> `reform_io` use two template arguments.The `TI` is used to specify input data type. The `TO` is for output data type, if omitted, the same as `TI`.
>
>`reform_io` can be called with a argument for transformers. The `former` transforms input data to inner application data. Correspondingly The `unformer` transforms output data from application upwards.

here is an example for using `reform_io`:
```typescript
import { Knode, reform_io } from "konnectjs";

new Knode()

// tells followings treat IO data as Buffer
.use(reform_io<Buffer>()) // only typing

.use(()=>(ctx,next)=>{
    ctx.dataIn // recv type: Buffer
    ctx.send(Buffer.alloc(2)) // send type: Buffer
    next()
})
.use(reform_io<string>({ // transform the buffer to string
    former:input=>input.toString(),
    unformer:output=>Buffer.from(output),
}))
// from now on, we can regard IO data as string
.use(()=>(ctx,next)=>{
    ctx.dataIn // recv type: string
    ctx.send("hello, string") // send type: string
    next()
})
```
## Step 4. Debuging Middleware
```typescript
import { TcpBroker } from "konnect-tcp"
import { debug_event, Knode, reform_io } from "konnectjs"

new Knode()
.setBroker(new TcpBroker({port:3000,isPublic:true}))
.use(reform_io<Buffer>)

.use(debug_event({prefix:"net event"}))
.use(reform_io<string>({
    former:input=>input.toString(),
    unformer:output=>Buffer.from(output),
}))
.use(["data"],debug_event({prefix:"app data"}))
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
As TCP is stream-based on transfer, when bytes recv from connection may not a isolate package, which can be sticked or splited. `stream_to_packet` solves this problem by prefixing a length header.

```typescript
import { stream_to_packet } from "konnect-proto"

...

server.use(stream_to_packet()) // split streaming data
.use(["data"],()=>ctx=>{
    console.log(ctx.dataIn) // should see "a" and "ward", instead of "award"
})

...

client.use(stream_to_packet())  // client should use too
.use(["connection"],()=>ctx=>{
    ctx.send(Buffer.from("a"))
    ctx.send(Buffer.from("ward"))
})
```

## Step 6. Connection Heartbeat
when a connection is closed, the protocol should emit a "close" event generally. However, it may not happens as we expected sometimes. As a solution, `heartbeat` use a timer to record last remote event and close the connection on time exceeds.
```typescript
import { heartbeat } from "konnect-proto"

...

server.use(heartbeat()) // disconnect on long-time-no-action

client.use(heartbeat())  // client too
```

## Step 7. Final Work
```typescript
import { Knode, debug_event, reform_io } from "konnectjs";
import { stream_to_packet, heartbeat, reconnect } from "konnect-proto";
import { TcpBroker } from "konnect-tcp";


export function startServer(){
    console.log("chat server start")
    let globalClientID = 0

    let node = new Knode()
    .setBroker(new TcpBroker({port:3000,isPublic:true}))
    .use(stream_to_packet()) //avoid sticky package and half package problem
    .use(heartbeat({
        heartBeatInterval:2000,
        maxLifeime:6000,
    }))
    .use(debug_event({prefix:"server net"}))
    .use(reform_io<string>({ // reform network io
        former:b=>b.toString(),
        unformer:s=>Buffer.from(s),
    }))
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
    .setBroker(new TcpBroker({}))
    .use(stream_to_packet())
    .use(heartbeat({
        heartBeatInterval:3000,
        maxLifeime:7000,
    }))
    .use(reconnect({ timeout:1500 }))
    .use(debug_event({prefix:"client"}))
    .use(reform_io<string>({ // reform network io
        former:b=>b.toString(),
        unformer:s=>Buffer.from(s),
    }))
    .use(debug_event({prefix:"client2"}))
    .use(["data"],()=>ctx=>{
        console.log("client recv - ",ctx.dataIn)
    })

    return node.connectTo({url:"127.0.0.1:3000"})
}

```
By now you can run the script via `ts-node` to experient.

```typescript
// client side
> ts-node
import {startClient,startServer} from './parts/step9.final-work'
let server = startServer()
```

```typescript
// client side
> ts-node
import {startClient,startServer} from './parts/step9.final-work'
let client = startClient()
client.send("hi, there")
```

> By the way, you can switch protocol from TCP to WebSocket or any others, by simpling replacing `KonnectTCP()` to `KonnectWS()` !



