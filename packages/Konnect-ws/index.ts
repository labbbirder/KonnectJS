import { WebSocket, WebSocketServer } from "ws"
import { defineImpl, UrlData, Konnection } from "KonnectJS"

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
            let conn = Konnection.from(node,ws)
            setupWebSocket(ws,conn)
            node.emit("connection",conn)
        })
    }
    return {
        raw:wss,
        closeConnection(conn,reason){
            conn.raw.close(reason?.code,reason?.reason)
            return Promise.resolve()
        },
        sendTo(conn,data) {
            conn.raw.send(data)
            return Promise.resolve()
        },
        connectTo: (conn,addr)=>new Promise((res,rej)=>{
            let url = UrlData.create(addr.url||"")
            if(!url) return rej()
            url.proto = "ws"
            let ws = new WebSocket(url.compose())
            ws.on("open",()=>{
                node.emit("connection",conn)
            })
            ws.on("error",err=>{
                if("connect"===(err as any)?.syscall) rej()
            })
            conn.raw = ws
            setupWebSocket(conn.raw,conn)
            res()
        }),
        
    }
}))
