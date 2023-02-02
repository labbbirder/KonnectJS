import { Knode,FilterEvent,Konnection,defineMidware,DebugEvent } from "KonnectJS";
import { KonnectLocal } from "Konnect-local";
import { logger } from "./common/logger";


// let debug = defineMidware((ev:string[]=["data"],prefix:string="")=>(ctx,next)=>{
//     if(~ev.indexOf(ctx.eventType)){
//         console.log(`[${prefix}] got [${ctx.eventType}]: ${ctx.dataIn}`)
//     }
//     next()
// })

function createNode(nodeName:string){
    return new Knode()
    .setImpl(KonnectLocal())
    .use(["data"],DebugEvent,nodeName,2,logger)
    // .use(debug,["data","connection","close"],nodeName)
}


let A = createNode("Node A"),
    B = createNode("Node B"),
    C = createNode("Node C"),
    D = createNode("Node D");



B.use(FilterEvent,["data"])
.use(function(){
    return ctx=>{
        this.localNode.broadcast(B2A,ctx.dataIn) //向后转发
    }
})
/**
 *          -- C
 * A -- B {
 *          -- D
 */


let B2A = Konnection.from(B)
B2A.connectTo(A)
// A.ConnectTo(B)
B.CreateConnectTo(C)
B.CreateConnectTo(D)

setTimeout(() => {
    A.broadcast("hello, from A")
}, 100);
// console.log(B,C)

// console.log(1)
// Promise.resolve(123).finally(()=>console.log("fin"))
// console.log(3)


// let e = new EventEmitter()
// e.on("asd",()=>console.log(1))
// e.once("asd",()=>console.log("oc"))
// e.once("asd",()=>console.log("oc2"))
// e.once("asd",()=>console.log("oc3"))
// e.on("asd",()=>console.log(1111))


// for(let l of e.rawListeners("asd")){
//     l()
// }

// console.log(e)