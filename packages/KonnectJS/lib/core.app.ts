import EventEmitter from 'events'

type ConnectionStatus = "idle"|"connecting"|"established"

const kSetIndex = Symbol()
const kGetIndex = Symbol()

export interface ConnectionImpl<TConn extends KonnectionBase=KonnectionBase>{
    raw?:any,
    sendTo:(conn:TConn,data:any)=>Promise<void>,
    closeConnection:(conn:TConn,reason:any)=>Promise<void>,
    connectTo:(conn:TConn,addr:Address)=>Promise<void>,
    broadcast?:(data:any)=>Promise<void>,
    shutdown?:()=>Promise<void>,
    [key:string]:any
}

export interface Address{
    url?:string,
    [k:string]:any,
}









export class KonnectionBase<TRaw=any> extends EventEmitter 
{
    raw:TRaw;
    localNode:KnodeBase;
    remoteAddress:Address|KnodeBase;
    intend:"unknown"|"connect"|"close"
    private _index:number;    
    private _status:ConnectionStatus
    private _impl:ConnectionImpl;
    private _bakedListeners:{[k:string]:Function[]}
    get impl(){
        return this._impl || this.localNode.impl
    }
    setImpl(impl:(node:KnodeBase)=>ConnectionImpl){
        this._impl = impl(this.localNode)
        return this
    }
    public get status() {
        return this._status;
    }
    private set status(v) {
        if(v==this._status) return
        let prev = this._status
        this._status = v;
        this.emit("status",v,prev)
    }
    
    [kSetIndex](idx:number){
        this._index = idx
        return this
    }
    [kGetIndex](){
        return this._index
    }
    static from<TRaw>(localNode:KnodeBase,raw?:TRaw){
        return new this(localNode,raw)
    }
    protected constructor(localNode:KnodeBase,raw?:TRaw){
        super({captureRejections:true})
        this.status = "idle"
        this.intend = "unknown"
        this.localNode = localNode
        this.raw = raw
        this.on("connection",()=>this.status = "established")
        this.on("close",()=>this.status = "idle")
        this.on("error",(err)=>console.error("Err From Impl",err)) // disable Uncaught Message
        // this.resetListeners()
    }
    bakeListeners() {
        this._bakedListeners = Object.fromEntries(
            this.eventNames().map(n => [n, this.rawListeners(n)])
        )
    }
    resetListeners(){
        this.removeAllListeners()
        for (let k in this._bakedListeners)
            for(let l of this._bakedListeners[k])
                this.on(k,l)
    }
    close(reason?:any){
        // this.remoteAddress = null
        this.intend = "close"
        this.impl.closeConnection(this,reason)
    }
    connectTo(addr:Address,reason?:any){
        return new Promise<void>((res,rej)=>{
            if(this.status=="established"){
                this.close()
            }
            this.status ="connecting"
            this.intend = "connect"
            this.remoteAddress = addr
            this.impl.connectTo(this,addr).then(()=>{
                // this.status = "established" // "connection" event is more convincing
                res()
            },(err)=>{
                this.status = "idle"
                rej(err)
            })
        }).catch(()=>{})
    }
    /*protected*/ async rawSend(formedData:any):Promise<void>{
        return await this.impl.sendTo(this,formedData)
    }

    async send(formedData:any):Promise<void>{
        return await this.rawSend(formedData)
    }
    // private async sendWithContext(ctx:Context){
    //     if(!this._cb) return false
    //     if(!this.established) return false
    //     // let context = { conn, dataOut:data }
    //     await this._cb("unform",ctx)
    //     return this.localNode.impl.sendTo(this,ctx.dataOut)
    // }
}

export interface KonnectionBase{
    /**
     * on connection etablished
     */ 
    on(event:"connection",f:(conn:KonnectionBase)=>any):this;
    /**
     * on receive data
     */
    on(event:"data",f:(data:any)=>any):this;
    /**
     * on send data
     */
    on(event:"push",f:(data:any)=>any):this;
    /**
     * on connection lost
     */
    on(event:"close",f:(data:any)=>any):this;
    /**
     * on error
     */
    on(event:"error",f:(err:Error)=>any):this;
    /**
     * on a related context completed
     */
    on(event:"complete",f:()=>any):this;
    /**
     * on a connection status changes
     */
    on(event:"status",f:(status:ConnectionStatus,prev:ConnectionStatus)=>any):this;
    on(event:string,f:Function):this;
    
    // emit(event:"connection",conn:KonnectionBase):boolean;
    emit(event:"data",data:any):boolean;
    // emit(event:"push",data:any):boolean;
    emit(event:"close",data:any):boolean;
    emit(event:"error",err:Error):boolean;
    emit(event:"aaa",...args:any):boolean;
    emit(event:string,...args:any[]):boolean;
    // emit(event:"status",status:ConnectionStatus,prev:ConnectionStatus):boolean;
}
// interface KonnectionBase extends KonnectionEmitter{}








export class KnodeBase<TI = any,TO = any> extends EventEmitter{

    connections:KonnectionBase[]
    impl:ConnectionImpl    
    constructor(){
        super()
        this.connections = []
        this.on("connection",conn=>{
            this.connections.push(conn[kSetIndex](this.connections.length))
            conn.localNode = this
            conn.resetListeners()
            conn.on("close",()=>{
                conn.resetListeners()
                let taridx = conn[kGetIndex]()
                if(this.connections[taridx]!=conn){
                    throw Error("not a valid connection")
                    return
                }
                if(taridx<0||taridx>=this.connections.length){
                    throw Error("remove connection of an invalid index")
                }
                if(this.connections.length==taridx+1){
                    this.connections.pop()
                }else{
                    let tail = this.connections.pop()[kSetIndex](taridx)
                    this.connections[taridx] = tail
                }
            })
            conn.emit("connection",conn)
        })
    }

    setImpl(impl:(node:KnodeBase)=>ConnectionImpl){
        this.impl = impl(this)
        return this
    }
    // ioType<NTI,NTO>(){
    //     return this as any as Knode<NTI,NTO>
    // }
    private isConnectionArray(conn:any):conn is KonnectionBase[]{
        return conn instanceof Array
    }
    sendTo(conn:KonnectionBase,data:TO):Promise<boolean>;
    sendTo(connections:KonnectionBase[],data:TO):Promise<boolean>;
    async sendTo(connections:any,data:any){
        if(this.isConnectionArray(connections)){
            let results = await Promise.allSettled(connections.map(c=>c.send(data)))
            return results.length && results.reduce((a,b)=>a&&b)
        }
        return await connections.send(data);
    }
    broadcast(data:TO):Promise<boolean>;
    broadcast(cull:KonnectionBase,data:TO):Promise<boolean>;
    broadcast(cull:any,data?:any){
        let targets = this.connections;
        if(!!data && (cull instanceof KonnectionBase)){
            targets = targets.filter(c=>c!=cull)
        }else{
            data = cull;
        }
        return this.sendTo(targets,data);
    }
    /**
     * create a connection from localNode to remote addr, which may be established later
     * @param addr remote addr
     * @param reason reserved
     * @returns the created connection
     */
    CreateConnectTo(addr:Address,reason?:any):KonnectionBase{
        let conn = KonnectionBase.from(this)
        conn.connectTo(addr,reason).catch(()=>{})
        return conn
    }
}

export interface KnodeBase{
    on(event:"connection",f:(conn:KonnectionBase)=>any):any;
    emit(event:"connection",conn:KonnectionBase):boolean;
}






// let node = new KnodeBase()
// let conn = KonnectionBase.from(node)
// node.emit("connection",conn)

// conn.emit("close",null)
// node.emit("connection",conn)
// conn.emit("close",null)

// console.log(conn)


// class A {
//     foo(){
//         this.bar()
//     }
//     bar(){
//         console.log("bad")
//     }
// }

// class B extends A{
//     bar(){
//         console.log("good")
//     }
// }

// new B().foo()