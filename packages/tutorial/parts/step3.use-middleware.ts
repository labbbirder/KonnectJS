import { Knode, ReformIO } from "konnectjs";

new Knode()

.use(ReformIO<Buffer,string>,/*...args*/)
// the same as:
// .use( ()=>ReformIO<Buffer,Buffer>(/*...args*/) )

// use middleware with event filter
.use(["data"], ReformIO<Buffer>) // for "data" event only
.use(["data","connection"], ReformIO<Buffer>) // for "data" ,"connection" only
