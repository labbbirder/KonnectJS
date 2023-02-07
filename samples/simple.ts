import { Knode,Konnection,defineMidware, debug_event, filter_event } from "KonnectJS";
import { LocalBroker } from "Konnect-local";


// let debug = defineMidware((ev:string[]=["data"],prefix:string="")=>(ctx,next)=>{
//     if(~ev.indexOf(ctx.eventType)){
//         console.log(`[${prefix}] got [${ctx.eventType}]: ${ctx.dataIn}`)
//     }
//     next()
// })

function createNode(nodeName:string){
    return new Knode()
    .setBroker(new LocalBroker({}))
    .use(["data"],debug_event({prefix:nodeName}))
    // .use(debug,["data","connection","close"],nodeName)
}


let A = createNode("Node A"),
    B = createNode("Node B"),
    C = createNode("Node C"),
    D = createNode("Node D");



B.use(filter_event(["data"]))
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


let B2A = B.createConnection()
B2A.connectTo(A)
B.connectTo(C)
B.connectTo(D)

setTimeout(() => {
    A.broadcast("hello, from A")
}, 100);
// console.log(B,C)
