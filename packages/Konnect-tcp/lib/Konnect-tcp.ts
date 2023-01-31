import { defineImpl, defineMidware, Knode, Konnection,ReformIO,UrlData } from "KonnectJS";
import * as net from 'net'

type Options = Partial<{
    port:number,
    isServer:boolean,
    noDelay:boolean,
    // ttl:number,
}>
type Connection = Konnection<Buffer,Buffer,net.Socket>

function setupConnection(conn:Connection,socket:net.Socket){
    socket.on("data",data=>{
        conn.emit("data",data)
    })
    socket.on("close",(hasError)=>{
        conn.emit("close",hasError)
    })
    socket.on("error",err=>{
        conn.emit("error",err)
    })
}

export let KonnectTCP = defineImpl((options:Options={})=>node=>{
    options = {
        isServer:false,
        noDelay:false,
        ...options
    }
    if(options.isServer){
        net.createServer(socket=>{
            socket.setNoDelay(options.noDelay)
            let conn = new Konnection(node,socket)
            setupConnection(conn,socket)
            node.emit("connection",conn)
        }).listen(options.port)
    }

    return {
        sendTo(conn:Connection, data) {
            if(!conn.raw.writable) return Promise.reject()
            conn.raw.write(data)
            return Promise.resolve()
        },
        connectTo:(conn:Connection, addr)=>new Promise((res,rej)=> {
            let url = UrlData.create(addr.url||"")
            if(!url) return rej()
            conn.raw = net.createConnection(url.portNum,url.host)
            conn.raw.on("connect",()=>{
                node.emit("connection",conn)
            })
            conn.raw.on("error",err=>{
                if("connect"===(err as any)?.syscall) rej()
            })
            setupConnection(conn,conn.raw)
            res()
        }),
        closeConnection(conn:Connection, reason) {
            conn.raw.end()
            return Promise.resolve()
        },
    }
})
