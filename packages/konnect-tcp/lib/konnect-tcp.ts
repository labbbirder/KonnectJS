import { defineImpl, Konnection,UrlData } from "konnectjs";
import * as net from 'net'

type Options = Partial<{
    port:number,
    isServer:boolean,
    noDelay:boolean,
    // ttl:number,
}>
type Connection = Konnection<net.Socket>

function setupConnection(conn:Connection,socket:net.Socket){
    socket.on("data",data=>{
        conn.emit("data",data)
    })
    socket.on("close",(hasError)=>{
        conn.emit("close")
    })
    socket.on("error",err=>{
        if("ECONNRESET"===(err as any)?.code) return conn.emit("close")
        // console.log("tcp error",err)
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
            let conn = Konnection.from(node,socket)
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
            conn.raw = net.createConnection(url.portNum,url.host,()=>{})
            conn.raw.on("connect",()=>{
                node.emit("connection",conn)
                setupConnection(conn,conn.raw)
                res()
            })
            conn.raw.on("error",err=>{
                if("connect"===(err as any)?.syscall) {
                    conn.raw.removeAllListeners()
                    conn.raw.end()
                    rej(err)
                }
            })
        }),
        closeConnection(conn:Connection, reason) {
            conn.raw.end()
            return Promise.resolve()
        },
    }
})
