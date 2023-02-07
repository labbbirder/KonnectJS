import { TcpBroker } from "konnect-tcp";
import { Knode } from "konnectjs";


let client = new Knode()
.setBroker(new TcpBroker({})) // not a server , no listen

// connect to server, returns a connecting connection.
let clientConn = client.connectTo({url:"127.0.0.1:3000"})

clientConn.on("connection",()=>{
    console.log("connected!")
})


// All above can be shorten to:

let conn = new Knode()
.setBroker(new TcpBroker({}))
.connectTo({url:"127.0.0.1:3000"})
.on("connection",()=>{
    console.log("connected!")
})
