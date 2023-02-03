import { KonnectTCP } from "konnect-tcp"
import { DebugEvent, Knode, ReformIO } from "konnectjs"

new Knode()
.setImpl(KonnectTCP({port:3000,isServer:true}))
.use(ReformIO<Buffer>)

.use(DebugEvent,{prefix:"transfer"})
.use(ReformIO<string>,{
    former:input=>input.toString(),
    unformer:output=>Buffer.from(output),
})

.use(["data","connection","close"],DebugEvent,{prefix:"application"})