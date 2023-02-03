import { KonnectSplit } from "konnect-proto"
import { KonnectTCP } from "konnect-tcp"
import { DebugEvent, Knode, ReformIO } from "konnectjs"


const server = new Knode()
.setImpl(KonnectTCP({port:3000,isServer:true}))
.use(ReformIO<Buffer>)

.use(["data"],DebugEvent,{prefix:"raw stream"})
.use(KonnectSplit)

.use(["data"],DebugEvent,{prefix:"reformed stream"})
.use(["connection"],()=>ctx=>{
    console.log(ctx.dataIn) // should see "a" and "ward", instead of "award"
})


const client = new Knode()
.setImpl(KonnectTCP())
.use(ReformIO<Buffer>)

.use(KonnectSplit)
.use(["connection"],()=>ctx=>{
    ctx.send(Buffer.from("a"))
    ctx.send(Buffer.from("ward"))
})


client.CreateConnectTo({url:"127.0.0.1:3000"})