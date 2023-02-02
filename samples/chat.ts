import { FilterEvent, Knode, Konnection, ReformIO } from "KonnectJS";
import { KonnectWS } from "Konnect-ws";
export * from './common/types'

export function startServer(){
    console.log("start")
    let globalClientID = 0
    let node = new Knode()
    .setImpl(KonnectWS({port:3000,isServer:true})) // use WebSocket
    .use(ReformIO<string>, { // reform network io
        former:b=>b.toString(),
        unformer:s=>Buffer.from(s),
    })
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
    .setImpl(KonnectWS())
    .use(ReformIO<string>, { // reform network io
        former:b=>b.toString(),
        unformer:s=>Buffer.from(s),
    })
    .use(FilterEvent,["data"])
    .use(()=>ctx=>console.log(ctx.dataIn))

    return node.CreateConnectTo({url:"127.0.0.1:3000"}) //return a konnection
}


// const cli_opt = process.argv[3]
// if(cli_opt=="-c"){
//     startClient()
// }
// if(cli_opt=="-s"){
//     startServer()
// }
// let c1 = startClient()
/*
On Server Side:
    import {startServer} from './chat'
    startServer()

On numbers of Client Sides:
    import {startClient} from './chat'
    let c = startClient()
    c.send("hi")
*/