import { TcpBroker } from "konnect-tcp"
import { debug_event, Knode, reform_io } from "konnectjs"

new Knode()
.setBroker(new TcpBroker({port:3000,isPublic:true}))
.use(reform_io<Buffer>)

.use(debug_event({prefix:"net event"}))
.use(reform_io<string>({
    former:input=>input.toString(),
    unformer:output=>Buffer.from(output),
}))
.use(["data"],debug_event({prefix:"app data"}))