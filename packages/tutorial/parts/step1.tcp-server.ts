import { TcpBroker } from "konnect-tcp";
import { Knode } from "konnectjs";

export const server = new Knode()
.setBroker(new TcpBroker({port:3000,isPublic:true})) // listen on port 3000
.use(()=>(ctx,next)=>{
    // outputs on event
    console.log(ctx.eventType,ctx.dataIn)
    next()
})

