import { Knode, ReformIO } from "konnectjs";

new Knode()

// tells followings treat IO data as Buffer
.use(ReformIO<Buffer>) // does nothing but typing data

.use(()=>(ctx,next)=>{
    ctx.dataIn // recv Buffer type
    ctx.send(Buffer.alloc(2)) // send Buffer type
    next()
})
.use(ReformIO<string>,{ // transform the buffer to string
    former:input=>input.toString(),
    unformer:output=>Buffer.from(output),
})
// from now on, we can regard IO data as string
.use(()=>(ctx,next)=>{
    ctx.dataIn // recv string type
    ctx.send("hello, string") // send string type
    next()
})