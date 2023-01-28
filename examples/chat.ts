import { FilterEvent, Knode, Konnection, ReformIO } from "KonnectJS";
import { KonnectWS } from "Konnect-ws";
import { WebSocketServer } from 'ws'


export function startServer(){
    console.log("start")
    let globalClientID = 0
    let wss = new WebSocketServer({port:3000})
    let node = new Knode()
    .setImpl(KonnectWS(new WebSocketServer({port:3000})))
    .use(ReformIO<string>, b=>b.toString())
    .use(()=>{
        globalClientID+=1
        let id = globalClientID
        return ctx=>{
            if(ctx.eventType==="connection"){
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
    conn.connectTo({url:"ws://127.0.0.1:3000"})
    return conn
}

/*
On Server Side:
    import {startServer} from './chat'
    startServer()

On Several Client Sides:
    import {startClient} from './chat'
    let conn = startClient()
    conn.send("hi")
*/