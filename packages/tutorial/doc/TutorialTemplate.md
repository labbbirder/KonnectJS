# Tutorial
let's begin with a step-by-step example, after witch you'll get a chat server upon TCP.
## Step 1. Startup a Server
install konnectjs and konnect-tcp as local denpendencies:
```bash
npm i -S konnectjs konnect-tcp konnect-ws konnect-proto # install denpendencies locally
```
It's very simple to startup a server. Only specify the network protocol by `setImpl`
```typescript
!import[/packages/tutorial/parts/step1.tcp-server.ts]
```
By now you have a tcp server listening on port 3000

## Step 2. Create a Client for Test
let's now create a client either to test with.
```typescript
!import[/packages/tutorial/parts/step2.tcp-client.ts]
```
Generally, `isServer`( by default false ) is used for indicate whether it's a server.

## Step 3. Use a Middleware
KonnectJS mainly implements functionalities by stacking middlewares. It is something similar to which in [koa](https://github.com/koajs/koa)
```typescript
!import[/packages/tutorial/parts/step3.use-middleware.ts]
```
> ### About ReformIO
> An outter IO data form can be varied, which can be string, bytes, json or anything else. Therefore, KonnectJS specifies the IO data format by stacking `ReformIO` middleware.
>
> `ReformIO` use two template arguments.The `TI` is used to specify input data type. The `TO` is for output data type, if omitted, the same as `TI`.
>
>`ReformIO` can be called with a argument for transformers. The `former` transforms input data to inner application data. Correspondingly The `unformer` transforms output data from application upwards.

here is an example for using `ReformIO`:
```typescript
!import[/packages/tutorial/parts/step3.reformio.ts]
```
## Step 4. Output Debug Information to Console
```typescript
!import[/packages/tutorial/parts/step4.debug.ts]
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
As TCP is stream-based on transfer, when bytes recv from connection may not a isolate package, which can be sticked or splited. `KonnectSplit` solves this problem by prefixing and retrieving a length header.

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
when a connection is closed, the protocol should emit a "close" event generally. However, it may not happens as we expected sometimes. As a solution, `KonnectHeartbeat` use a timer to record last remote event and close the connection on time exceeds.
```typescript
import { KonnectHeartbeat } from "konnect-proto"

...

server.use(KonnectHeartbeat) // disconnect on long-time-no-action

client.use(KonnectHeartbeat)  // client too
```

## Step 7. Final Work
```typescript
!import[\packages\tutorial\parts\step9.final-work.ts]
```
By now you can run the script via `ts-node` to experient.


> By the way, you can switch protocol from TCP to WebSocket or any others, by simpling replacing `KonnectTCP()` to `KonnectWS()` !

!export[/packages/tutorial/README.md]
