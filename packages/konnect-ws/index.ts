import { WebSocket, WebSocketServer } from "ws"
import { UrlData, KonnectionBase, Address, BrokerBase, BrokerOption } from "konnectjs"

type WsOption = BrokerOption & {
    port?:number
}
export class WebSocketBroker extends BrokerBase<WebSocket>{
    incomeDataType: Buffer = null as any
    outcomeDataType: Buffer = null as any
    raw?: WebSocketServer
    constructor(opt:WsOption={}){
        super(opt)
        if(opt.isPublic){
            this.raw = new WebSocketServer(opt).on("connection",ws=>{
                let conn = this.createConnection(ws,true)
                this.setupConnection(conn)
            })
        }
    }
    
    setupConnection(conn:KonnectionBase<WebSocket>){
        let ws = conn.raw
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
    // start(emitConnection: (raw: WebSocket) => KonnectionBase<WebSocket>): void {

    // }
    async send(conn: KonnectionBase<WebSocket>, data: any) {
        conn.raw.send(data)
    }
    async close(conn: KonnectionBase<WebSocket>, reason: any) {
        conn.raw.close(reason?.code,reason?.reason)
        conn.raw.removeAllListeners()
    }
    async connect(conn: KonnectionBase<WebSocket>, addr: Address){
        return new Promise<void>((res,rej)=>{
            let url = UrlData.create(addr.url||"")
            if(!url) return rej()
            url.proto = "ws"
            let ws = new WebSocket(url.compose())
            ws.on("open",()=>{
                conn.emit("connection",conn)
                this.setupConnection(conn)
                res()
            })
            ws.once("error",err=>{
                if("connect"===(err as any)?.syscall) rej()
            })
            conn.raw = ws
        })
    }
    async shutdown?() {
        this.raw?.close()
    }
    
}
