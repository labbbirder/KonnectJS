import { KonnectHeartbeat, KonnectReconnect, KonnectSplit } from "konnect-proto";
import { KonnectTCP } from "konnect-tcp";
import { KonnectWS } from "konnect-ws";
import { DebugEvent, Knode, ReformIO } from "konnectjs";


new Knode()
.setImpl(KonnectTCP({port:3000,isServer:true}))
.use(ReformIO<Buffer>) // 告诉后面收发的是Buffer
.use(DebugEvent,{prefix:"Server 通信层"})
.use(KonnectSplit,{maxBytes:132})// 分包，流式转为包体
.use(ReformIO<string,string>,{former:i=>i.toString(),unformer:Buffer.from})
// .use(KonnectHeartbeat)// 心跳检测
.use(DebugEvent,{prefix:"Server 应用层"})
.use(["data"],()=>ctx=>{
    ctx.send("我收到了"+ctx.dataIn)
})

let client = new Knode()
.setImpl(KonnectTCP())
.use(ReformIO<Buffer>) // 告诉后面收发的是Buffer
.use(["data"],DebugEvent,{prefix:"Client 通信层"})
.use(KonnectSplit,{maxBytes:300})// 分包，流式转为包体
// .use(KonnectHeartbeat)// 心跳检测
.use(KonnectReconnect)// 自动重连
.use(ReformIO<string,string>,{former:i=>i.toString(),unformer:Buffer.from})
.use(["data"],DebugEvent,{prefix:"Client 应用层"})
.use(["data"],()=>ctx=>console.log(ctx.dataIn))
.CreateConnectTo({url:"127.0.0.1:3000"})


client.on("connection",conn=>{
    client.send("heelo")
})