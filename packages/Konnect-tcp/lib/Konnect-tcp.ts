import { defineImpl, defineMidware, Konnection,UrlData } from "KonnectJS";
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
        if(err.message==="read ECONNRESET"){
            return socket.destroy()
        }
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
            if(!conn.raw.writable) return false
            return conn.raw.write(data)
        },
        connectTo(conn:Connection, addr) {
            let url = UrlData.create(addr.url||"")
            if(!url) return false
            conn.raw = net.createConnection(url.portNum,url.host)
            conn.raw.on("connect",()=>{
                node.emit("connection",conn)
            })
            setupConnection(conn,conn.raw)
            return true
        },
        closeConnection(conn:Connection, reason) {
            conn.raw.end()
            return true
        },
    }
})