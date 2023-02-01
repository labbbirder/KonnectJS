import { FilterEvent, Knode, Konnection, ReformIO } from "KonnectJS";
// import { KonnectWS } from "../packages/Konnect-ws";
import { KonnectSplit,KonnectReconnect,KonnectHeartbeat } from "Konnect-proto";
import { KonnectTCP } from "Konnect-tcp";

export * from './types'


export function startServer(){
    console.log("start")
    let globalClientID = 0
    let node = new Knode()
    .setImpl(KonnectTCP({port:3000,isServer:true})) // use a stream-based protocol
    .use(KonnectSplit) //avoid sticky package and half package problem
    .use(KonnectHeartbeat,{
        heartBeatInterval:2000,
        maxLifeime:6000,
    })
    .use(ReformIO<string>, { // reform network io
        former:b=>b.toString(),
        unformer:s=>Buffer.from(s),
    })
    .use(()=>{
        globalClientID+=1
        let id = globalClientID
        return async ctx=>{
            //list clients in console
            // console.clear()
            // console.log("clients:")
            // node.connections.forEach(c=>console.log("  ",c.session))

            if(ctx.eventType==="connection"){
                ctx.conn.session = {id}
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
    .setImpl(KonnectTCP())
    .use(KonnectSplit)
    .use(KonnectHeartbeat,{
        heartBeatInterval:3000,
        maxLifeime:7000,
    })
    .use(KonnectReconnect,{
        timeout:1500
    })
    .use(ReformIO<string>, { // reform network io
        former:b=>b.toString(),
        unformer:s=>Buffer.from(s),
    })
    .use(FilterEvent,["data"])
    .use(()=>ctx=>
    console.log("client recv - ",ctx.dataIn)
    )

    let conn = new Konnection(node)
    conn.connectTo({url:"127.0.0.1:3000"})
    return conn
}

// startServer()
// startClient().on("connection",conn=>{
//     conn.send("123")
//     conn.send("456")
// })
// setTimeout(process.exit,1000)

/*
On Server Side:
    import {startServer} from './chat'
    startServer()

On numbers of Client Sides:
    import {startClient} from './chat'
    let c = startClient()
    c.send("hi")
*/