import { FilterEvent, Knode, Konnection, ReformIO } from "KonnectJS";
import { KonnectWS } from "Konnect-ws";
import { KonnectTCP } from "Konnect-tcp";

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
        server:KonnectTCP({port:NETWORK_CONFIG.port,isServer:true}),
        client:KonnectTCP({isServer:false}),
    },
    ws:{
        server:KonnectWS({port:NETWORK_CONFIG.port,isServer:true}),
        client:KonnectWS({isServer:false}),
    }
})[NETWORK_CONFIG.proto]

export function startServer(){
    console.log("start")
    let globalClientID = 0
    let node = new Knode()
    .setImpl(NETWORK_IMPLEMENT.server)
    .use(ReformIO<string>, { // reform network io from Buffer to string
        former:b=>b.toString(),
        unformer:s=>Buffer.from(s),
    })
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
    .setImpl(NETWORK_IMPLEMENT.client)
    .use(ReformIO<string>, { // reform network io from Buffer to string
        former:b=>b.toString(),
        unformer:s=>Buffer.from(s),
    })
    .use(FilterEvent,["data"])
    .use(()=>ctx=>console.log(ctx.dataIn))

    return node.CreateConnectTo({url:"127.0.0.1:3000"})
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