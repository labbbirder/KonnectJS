import { BrokerBase,UrlData,Address, BrokerOption,KonnectionBase } from "konnectjs";
import * as net from 'net'




type TcpOption = BrokerOption & {
    port?:number,
    noDelay?:boolean,
}

export class TcpBroker extends BrokerBase<net.Socket>{
    incomeDataType: Buffer = null as any
    outcomeDataType: Buffer = null as any
    raw?: net.Server;
    constructor(opt:TcpOption){
        opt = {
            noDelay:false,
            isPublic:false,
            ...opt
        }
        super(opt)
        if(opt.isPublic){
            this.raw = net.createServer(socket=>{
                socket.setNoDelay(opt.noDelay)
                let conn = this.createConnection(socket,true)
                this.setupConnection(conn)
            }).listen(opt.port)
        }
    }
    private setupConnection(conn:KonnectionBase<net.Socket>){
        let socket = conn.raw
        socket.on("data",data=>{
            conn.emit("data",data)
        })
        socket.on("close",(hasError)=>{
            conn.emit("close")
        })
        socket.on("error",err=>{
            //dont emit error when connection reset
            if("ECONNRESET"===(err as any)?.code) return conn.emit("close")
            // console.log("tcp error",err)
            conn.emit("error",err)
        })
    }
    async send(conn: KonnectionBase<net.Socket>, data: any) {
        return new Promise<void>((res,rej)=>{
            if(!conn.raw.writable) return Promise.reject()
            function onSendFail(err:Error){
                if("EPIPE"===(err as any)?.code) return rej(err)
                console.log("send fail",err)
            }
            conn.once("error",onSendFail)
            conn.raw.write(data,()=>{
                conn.removeListener("error",onSendFail)
                res()
            })
        })
    }
    async close(conn: KonnectionBase<net.Socket>, reason: any) {
        return new Promise<void>((res,rej)=>{
            conn.raw.end(()=>{
                res()
            })
        })
    }
    connect(conn: KonnectionBase<net.Socket>, remote: Address) {
        return new Promise<void>((res,rej)=> {
            let url = UrlData.create(remote.url||"")
            if(!url) return rej()
            conn.raw = net.createConnection(url.portNum,url.host,()=>{})
            conn.raw.on("connect",()=>{
                conn.emit("connection",conn)
                this.setupConnection(conn)
                res()
            })
            conn.raw.on("error",err=>{
                if("connect"===(err as any)?.syscall) {
                    conn.raw.removeAllListeners()
                    conn.raw.end()
                    rej(err)
                }
            })
        })
    }
    async shutdown?(){
        this.raw?.close()
    }
}
