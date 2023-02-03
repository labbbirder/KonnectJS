import { Knode, ReformIO } from "konnectjs";

new Knode()

.use(ReformIO<Buffer,string>,/*...args*/)

// the same as:
.use( ()=>ReformIO<Buffer,Buffer>(/*...args*/) )

// for "data" event only
.use(["data"], ReformIO<Buffer>)

// for "data" "connection" only
.use(["data","connection"], ReformIO<Buffer>) 
