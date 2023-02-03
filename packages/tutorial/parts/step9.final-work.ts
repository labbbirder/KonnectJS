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
