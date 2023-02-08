import { heartbeat, reconnect,stream_to_packet } from "konnect-proto";
import { TcpBroker } from "konnect-tcp";
import { WebSocketBroker } from "konnect-ws";
import { debug_event, Knode, reform_io } from "konnectjs";
// import { json_data } from "./json";

let fore = new Knode()
.setBroker(new TcpBroker({port:3001,isPublic:true}))
.use(debug_event({prefix:"Server 通信层"}))
.use(stream_to_packet({maxBytes:132})) // 分包，流式转为包体
.use(heartbeat())// 心跳检测
.use(reform_io<string>({former:i=>i.toString(),unformer:Buffer.from}))
.to(()=>end)

let end = new Knode()
.use(debug_event({prefix:"Server 应用层"}))
.use(["data"],()=>ctx=>{
    ctx.send("我收到了"+ctx.dataIn)
})

let client = new Knode()
.setBroker(new TcpBroker({}))
.use(["data"],debug_event({prefix:"Client 通信层"}))
.use(stream_to_packet({maxBytes:300}))// 分包，流式转为包体
.use(heartbeat())// 心跳检测
.use(reconnect())// 自动重连
.use(reform_io<string>({former:i=>i.toString(),unformer:Buffer.from}))
.use(["data"],debug_event({prefix:"Client 应用层"}))
.use(["data"],()=>ctx=>console.log(ctx.dataIn))
.connectTo({url:"127.0.0.1:3001"})


client.on("connection",()=>{
    client.send("heelo")
})
