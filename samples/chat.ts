import { debug_event, filter_event, Knode, Konnection, reform_io } from "konnectjs";
import { WebSocketBroker } from "konnect-ws";
export * from './common/types'

export function startServer(){
    console.log("start")
    let globalClientID = 0
    let node = new Knode()
    .use(debug_event({prefix:"server"}))
    .setBroker(new WebSocketBroker({port:3000,isPublic:true})) // use WebSocket
    .use(reform_io<string>( { // reform network io
        former:b=>b.toString(),
        unformer:s=>Buffer.from(s),
    }))
    .use(()=>{
        globalClientID+=1
        let id = globalClientID
        return async ctx=>{
            if(ctx.eventType==="connection"){
                await ctx.conn.send(`hello, ${id}`)
            }
            if(ctx.eventType==="data"){
                await node.sendTo(node.connections,`[${id}]: ${ctx.dataIn}`)
            }
            if(ctx.eventType==="close"){
                await node.sendTo(node.connections,`bye [${id}]`)
            }
        }
    })
    return node
}

export function startClient(){
    let node = new Knode()
    .setBroker(new WebSocketBroker({}))
    .use(debug_event({prefix:"client"}))
    .use(reform_io<string>( { // reform network io
        former:b=>b.toString(),
        unformer:s=>Buffer.from(s),
    }))
    .use(filter_event(["data"]))
    .use(()=>ctx=>console.log(ctx.dataIn))

    return node.connectTo({url:"127.0.0.1:3000"}) //return a konnection
}

// startServer()
// startClient().on("connection",conn=>{
//     console.log("send")
//     conn.send("Good")
// })

/*
On Server Side:
    import {startServer} from './chat'
    startServer()

On numbers of Client Sides:
    import {startClient} from './chat'
    let c = startClient()
    c.send("hi")
*/