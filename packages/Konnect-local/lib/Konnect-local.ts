import { defineImpl,Knode,Konnection } from "KonnectJS";
type Raw = {
    remote:Connection|null
}
type Connection = Konnection<any,any,Raw>

export let KonnectLocal = defineImpl(()=>node=>{
    return {
        sendTo(conn:Connection, data) {
            if(conn.raw.remote==null) return Promise.reject()
            conn.raw.remote.emit("data",data)
            return Promise.resolve()
        },
        closeConnection(conn:Connection, reason) {
            conn.raw.remote?.emit("close",reason)
            conn.raw.remote = null
            return Promise.resolve()
        },
        connectTo(conn:Connection, addr) {
            if(!(addr instanceof Knode)) {
                throw new Error("KonnectLocal can only connect to Knode")
            }
            let rn = addr as any as Knode
            if(!!addr){
                let rmtConn = new Konnection(rn,{remote:conn})
                rn.emit("connection",rmtConn)

                conn.raw = {remote:rmtConn as any}
                node.emit("connection",conn)
                return Promise.resolve()
            }
            return Promise.reject()
        },
        
    }
})