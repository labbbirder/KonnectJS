import { Knode, reform_io } from "konnectjs";

new Knode()

// tells followings treat IO data as Buffer
.use(reform_io<Buffer>()) // only typing

.use(()=>(ctx,next)=>{
    ctx.dataIn // recv type: Buffer
    ctx.send(Buffer.alloc(2)) // send type: Buffer
    next()
})
.use(reform_io<string>({ // transform the buffer to string
    former:input=>input.toString(),
    unformer:output=>Buffer.from(output),
}))
// from now on, we can regard IO data as string
.use(()=>(ctx,next)=>{
    ctx.dataIn // recv type: string
    ctx.send("hello, string") // send type: string
    next()
})