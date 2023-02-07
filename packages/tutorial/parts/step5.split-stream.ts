import { stream_to_packet } from "konnect-proto"
import { TcpBroker } from "konnect-tcp"
import { debug_event, Knode, reform_io } from "konnectjs"


const server = new Knode()
.setBroker(new TcpBroker({port:3000,isPublic:true}))
.use(reform_io<Buffer>())

.use(["data"],debug_event({prefix:"raw stream"}))
.use(stream_to_packet())

.use(["data"],debug_event({prefix:"reformed stream"}))
.use(["data"],()=>ctx=>{
    console.log(ctx.dataIn) // should see "a" and "ward", instead of "award"
})


const client = new Knode()
.setBroker(new TcpBroker({}))
.use(reform_io<Buffer>())

.use(stream_to_packet())
.use(["connection"],()=>ctx=>{
    ctx.send(Buffer.from("a"))
    ctx.send(Buffer.from("ward"))
})


client.connectTo({url:"127.0.0.1:3000"})