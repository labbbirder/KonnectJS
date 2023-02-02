import { FilterEvent, Knode, Konnection, ReformIO, DebugEvent } from "konnectjs";
// import { KonnectWS } from "../packages/konnect-ws";
import { KonnectSplit,KonnectReconnect,KonnectHeartbeat } from "konnect-proto";
import { KonnectTCP } from "konnect-tcp";
import { logger } from "./common/logger";
export * from './common/types'


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
    .use(DebugEvent,"server net",1,logger)
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
                // ctx.conn.session = {id}
                await ctx.send(`hello, ${id}`)
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
// var logs = []
//   , hook_stream = function(_stream, fn) { 
//         // Reference default write method 
//         var old_write = _stream.write; 
//         // _stream now write with our shiny function 
//         _stream.write = fn; 
//         return function() { 
//             // reset to the default write method 
//             _stream.write = old_write; 
//         }; 
//     }
//   , // hook up standard output 
//   unhook_stdout = hook_stream(process.stdout, function(string, encoding, fd) {
//      logs.push(string); 
//     }); // goes to our custom write method 
//     console.log('foo'); console.log('bar'); unhook_stdout(); console.log('Not hooked anymore.'); // Now do what you want with logs stored by the hook logs.forEach(function(_log) { console.log('logged: ' + _log); }); 

export function startClient(){
    // const _raw = process.stdout.write
    // process.stdout.write = function(buf:any,...args:any[]){
        
    // //     if(!process.stdout.writable) return
    // //     const obj = Object.create(null); // 初始化一个空对象  
    // //     Error.captureStackTrace(obj); // 捕捉堆栈并塞入obj.stack属性中  
    // //     return _raw(buf,...args)
    //     return _raw(buf,...args)
    // }
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
    .use(DebugEvent,"client",1,logger)
    .use(ReformIO<string>, { // reform network io
        former:b=>b.toString(),
        unformer:s=>Buffer.from(s),
    })
    .use(DebugEvent,"client2",1,logger)
    .use(["data"],()=>ctx=>{
        console.log("client recv - ",ctx.dataIn)
    })

    return node.CreateConnectTo({url:"127.0.0.1:3000"})
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