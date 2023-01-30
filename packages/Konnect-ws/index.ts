import { WebSocket, WebSocketServer } from "ws"
import { Konnection, defineImpl, Knode, ConnectionImpl, UrlData } from "KonnectJS"
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
type FirstContrustorParamType<T> = T extends new (r: infer U, ...args:any[])=>any?U:never
type WssOption = Exclude<FirstContrustorParamType<typeof WebSocketServer>,undefined>
interface Options extends WssOption{
    isServer?:boolean
}

export let KonnectWS = (defineImpl((opt:Options = {})=>(node)=>{
    let wss;
    if(!!opt.isServer){
        wss = new WebSocketServer(opt)
        wss.on("connection",ws=>{
            let conn = new Konnection(node,ws)
            setupWebSocket(ws,conn)
            node.emit("connection",conn)
        })
    }
    return {
        raw:wss,
        closeConnection(conn:WSConnection,reason){
            conn.raw.close(reason?.code,reason?.reason)
            return true
        },
        sendTo(conn:WSConnection,data) {
            conn.raw.send(data)
            return true
        },
        connectTo(conn:WSConnection,addr){
            let url = UrlData.create(addr.url||"")
            if(!url) return false
            url.proto = "ws"
            conn.raw = new WebSocket(url.compose())
            conn.raw.on("open",()=>{
                node.emit("connection",conn)
            })
            setupWebSocket(conn.raw,conn)
            return true
        },
    }
}))