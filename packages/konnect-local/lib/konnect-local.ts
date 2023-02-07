import { Address, BrokerBase,Knode,Konnection, KonnectionBase } from "konnectjs";
type Raw = {
    remote:Konnection<Raw>|null
}
export class  LocalBroker extends BrokerBase<Raw>{
    incomeDataType: any;
    outcomeDataType: any;
    raw?: any;
    async send(conn: KonnectionBase<{ remote: any; }>, data: any) {
        if(conn.raw.remote==null) return Promise.reject()
        conn.raw.remote.emit("data",data)
    }
    close(conn: KonnectionBase<{ remote: any; }>, reason: any): Promise<void> {
        conn.raw.remote?.emit("close",reason)
        conn.raw.remote = null
        return Promise.resolve()
    }
    connect(conn: KonnectionBase<{ remote: any; }>, addr: Address): Promise<void> {
        if(!(addr instanceof Knode)) {
            throw new Error("KonnectLocal can only connect to Knode")
        }
        let rn = addr as any as Knode
        if(!!addr){
            let rmtConn = rn.createConnection()
            rmtConn.raw = {remote:conn}
            rmtConn.emit("connection",rmtConn)

            conn.raw = {remote:rmtConn as any}
            conn.emit("connection",conn)
            return Promise.resolve()
        }
        return Promise.reject()
    }
    async shutdown?(){
        
    }

}