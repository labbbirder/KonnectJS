import { KonnectTCP } from "konnect-tcp";
import { Knode } from "konnectjs";


let client = new Knode()
.setImpl(KonnectTCP()) // not a server , no listen

// connect to server, returns a connecting connection.
let connection = client.CreateConnectTo({url:"127.0.0.1:3000"})

connection.on("connection",()=>{
    console.log("connected!")
})

// All above can be shorten to:

// let conn = new Knode()
// .setImpl(KonnectTCP())
// .CreateConnectTo({url:"127.0.0.1:3000"})
// .on("connection",()=>{
//     console.log("connected!")
// })
