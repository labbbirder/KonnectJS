import { FilterEvent, Knode, Konnection, ReformIO } from "KonnectJS";
import { KonnectWS } from "Konnect-ws";

export * from './types'


export function startServer(){
    console.log("start")
    let globalClientID = 0
    let node = new Knode()
    .setImpl(KonnectWS({port:3000,isServer:true})) // use WebSocket
    .use(ReformIO<string>, b=>b.toString()) // reform network io
    .use(()=>{
        globalClientID+=1
        let id = globalClientID
        return ctx=>{
            //list clients in console
            console.clear()
            console.log("clients:")
            node.connections.forEach(c=>console.log("  ",c.session))

            if(ctx.eventType==="connection"){
                ctx.conn.session = {id}
                ctx.conn.send(`hello, ${id}`)
            }
            if(ctx.eventType==="data"){
                node.sendTo(node.connections,`[${id}]: ${ctx.dataIn}`)
            }
            if(ctx.eventType==="close"){
                node.sendTo(node.connections,`bye [${id}]`)
            }
        }
    })
}

export function startClient(){
    let node = new Knode()
    .setImpl(KonnectWS())
    .use(ReformIO<string>, b=>b.toString())
    .use(FilterEvent,["data"])
    .use(()=>ctx=>console.log(ctx.dataIn))

    let conn = new Konnection(node)
    conn.connectTo({url:"127.0.0.1:3000"})
    return conn
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