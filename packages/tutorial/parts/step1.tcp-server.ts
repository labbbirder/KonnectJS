import { KonnectTCP } from "konnect-tcp";
import { Knode } from "konnectjs/dist/middleware.app";

export const server = new Knode()
.setImpl(KonnectTCP({port:3000,isServer:true})) // listen on port 3000
.use(()=>(ctx,next)=>{
    // outputs on event
    console.log(ctx.eventType,ctx.dataIn)
    next()
})

