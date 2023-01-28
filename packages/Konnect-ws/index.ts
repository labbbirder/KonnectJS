import { WebSocket, WebSocketServer } from "ws"
import { Konnection, defineImpl } from "KonnectJS"
type WSConnection = Konnection<any,any,WebSocket>
function setupWebSocket(ws:WebSocket,conn:Konnection){
    ws.on("message",(data:Buffer)=>{
        conn.emit("data",data)
    })
    ws.on("close",(code,reason)=>{
        conn.emit("close",reason)
    })
    ws.on("error",err=>{
        conn.emit("error",err)
    })
}
export let KonnectWS = defineImpl((wss?:WebSocketServer)=>(node)=>{
    wss?.on("connection",ws=>{
        let conn = new Konnection(node,ws)
        setupWebSocket(ws,conn)
        node.emit("connection",conn)
    })
    return {
        closeConnection(conn:WSConnection,reason){
            conn.raw.close(reason?.code,reason?.reason)
            return true
        },
        sendTo(conn:WSConnection,data) {
            conn.raw.send(data)
            return true
        },
        connectTo(conn:WSConnection,addr){
            conn.raw = new WebSocket(addr.url||"")
            conn.raw.on("open",()=>{
                node.emit("connection",conn)
            })
            setupWebSocket(conn.raw,conn)
            return true
        },
    }
})