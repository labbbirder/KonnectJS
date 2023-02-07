import { Knode, reform_io, debug_event } from "konnectjs";
import { stream_to_packet,reconnect,heartbeat } from "konnect-proto";
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


if(false) // ** COMMENT TO RUN: **
{
    startServer()
    startClient().on("connection",conn=>{
        console.log("on conn, send")
        conn.send("123")
        conn.send("456")
    })
    setTimeout(process.exit,3000)
}

/*
On Server Side:
    import {startServer} from './chat'
    startServer()

On numbers of Client Sides:
    import {startClient} from './chat'
    let c = startClient()
    c.send("hi")
*/