import { filter_event, Knode, Konnection, reform_io } from "KonnectJS";
import { WebSocketBroker } from "Konnect-ws";
import { TcpBroker } from "Konnect-tcp";

const NETWORK_CONFIG = {
    /**
     * server listen port
     */
    port:3000,
    /**
     * network protocol
     */
    proto:"ws",// or "tcp"
}

const NETWORK_IMPLEMENT = ({
    tcp:{
        server:()=>new TcpBroker({port:NETWORK_CONFIG.port,isPublic:true}),
        client:()=>new TcpBroker({isPublic:false}),
    },
    ws:{
        server:()=>new WebSocketBroker({port:NETWORK_CONFIG.port,isPublic:true}),
        client:()=>new WebSocketBroker({isPublic:false}),
    }
})[NETWORK_CONFIG.proto]

export function startServer(){
    console.log("start")
    let globalClientID = 0
    let node = new Knode()
    .setBroker(NETWORK_IMPLEMENT.server())
    .use(reform_io<string>({ // reform network io from Buffer to string
        former:b=>b.toString(),
        unformer:s=>Buffer.from(s),
    }))
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
    .setBroker(NETWORK_IMPLEMENT.client())
    .use(reform_io<string>( { // reform network io from Buffer to string
        former:b=>b.toString(),
        unformer:s=>Buffer.from(s),
    }))
    .use(filter_event(["data"]))
    .use(()=>ctx=>console.log(ctx.dataIn))

    return node.connectTo({url:"127.0.0.1:3000"})
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