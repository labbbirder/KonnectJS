import { Knode,FilterEvent,Konnection,defineMidware } from "KonnectJS";
import { KonnectLocal } from "Konnect-local";

let debug = defineMidware((ev:string[]=["data"],prefix:string="")=>(ctx,next)=>{
    if(~ev.indexOf(ctx.eventType)){
        console.log(`[${prefix}] got [${ctx.eventType}]: ${ctx.dataIn}`)
    }
    next()
})

function createNode(nodeName:string){
    return new Knode()
    .setImpl(KonnectLocal())
    .use(debug,["data","connection","close"],nodeName)
}


let A = createNode("Node A"),
    B = createNode("Node B"),
    C = createNode("Node C"),
    D = createNode("Node D");

let B2A = new Konnection(B)


B.use(FilterEvent,["data"])
.use(function(){
    return ctx=>{
        this.broadcast(B2A,ctx.dataIn) //向后转发
    }
})

/**
 *          -- C
 * A -- B {
 *          -- D
 */

B2A.connectTo(A)
// A.ConnectTo(B)
B.ConnectTo(C)
B.ConnectTo(D)

A.broadcast("hello, from A")
// console.log(B,C)