import { defineImpl,Knode,Konnection } from "KonnectJS";
type Raw = {
    remote:Connection|null
}
type Connection = Konnection<Raw>

export let KonnectLocal = defineImpl(()=>node=>{
    return {
        async sendTo(conn:Connection, data) {
            if(conn.raw.remote==null) return Promise.reject()
            conn.raw.remote.emit("data",data)
        },
        closeConnection(conn:Connection, reason) {
            conn.raw.remote?.emit("close",reason)
            conn.raw.remote = null
            return Promise.resolve()
        },
        async connectTo(conn:Connection, addr) {
            if(!(addr instanceof Knode)) {
                throw new Error("KonnectLocal can only connect to Knode")
            }
            let rn = addr as any as Knode
            if(!!addr){
                let rmtConn = Konnection.from(rn,{remote:conn})
                rn.emit("connection",rmtConn)

                conn.raw = {remote:rmtConn as any}
                node.emit("connection",conn)
                return Promise.resolve()
            }
            return Promise.reject()
        },
        
    }
})