import EventEmitter from 'events'

type ConnectionStatus = "idle"|"connecting"|"established"

const kSetIndex  = Symbol()
const kGetIndex  = Symbol()
const kOnClose   = Symbol()
const kOnNewConn = Symbol()
const kInited    = Symbol()
const kInit      = Symbol()
const kCreate    = Symbol()




export interface Address{
    url?:string,
    [k:string]:any,
}



export interface BrokerOption {
    /**
     * whether can be connectioned by remotes
     */
    isPublic?:boolean
}

/**
 * remeber do the follwing things in subclass:
 * 
 * required:
 * 
 * * emit: `connection` `close` `data` `error`
 * * implement: `send` `close` `connect` `shutdown`
 * 
 * optional:
 * 
 * * setType `incomeDataTye` `outcomeDataType`
 * @see https://TODO.Write_A_DOC
 */
export abstract class BrokerBase<T=any>{
    [kInited]:boolean
    abstract incomeDataType:any
    abstract outcomeDataType:any;
    abstract raw?: any
    // private localNode:KnodeBase
    /**
     * create a connection.
     * @param raw raw object held by the created connection
     * @param emitEvent whether emit a `connection` event. if **true**, the connection
     * will be known in knode and marked as "established",
     * otherwise, return a connection out of `knode.connections[]` in "idle" status.
     * @returns the created connection
     */
    createConnection:(raw:T,emitEvent:boolean)=>KonnectionBase<T>;

    constructor(opt:BrokerOption){
        this[kInited] = false
    }
    [kInit](createFunc:typeof this["createConnection"]){
        if(this[kInited]) throw Error("Broker is already added")
        this.createConnection = createFunc
        this[kInited] = true
    }
    abstract send(conn:KonnectionBase<T>,data:any):Promise<void>;
    abstract close(conn:KonnectionBase<T>,reason:any):Promise<void>;
    abstract connect(conn:KonnectionBase<T>,remote:Address):Promise<void>;
    broadcast?(data:any):Promise<void>;
    abstract shutdown?():Promise<void>;
}







function delegateCreateConn<T>(node:KnodeBase){
    return (raw:T,emitEvent:boolean)=>{
        let conn = node.createConnection()
        conn.raw = raw
        if(emitEvent) conn.emit("connection",conn)
        return conn
    }
}







export class KonnectionBase<TRaw=any> extends EventEmitter 
{
    raw:TRaw;
    localNode:KnodeBase;
    remoteAddress:Address|KnodeBase;
    intend:"unknown"|"connect"|"close"
    private _index:{[k:symbol]:number};    
    private _status:ConnectionStatus
    // private _broker:BrokerBase;
    private _bakedListeners:{[k:string]:Function[]}
    get broker(){
        return /*this._broker ||*/ this.localNode.broker
    }
    // setBroker(b:BrokerBase):this{
    //     this._broker = b
    //     b[kInit](delegateCreateConn(this.localNode))
    //     return this
    // }
    public get status() {
        return this._status;
    }
    private set status(v) {
        if(v==this._status) return
        let prev = this._status
        this._status = v;
        this.emit("status",v,prev)
    }
    
    [kSetIndex](idx:number,nid:symbol){
        this._index[nid] = idx
        return this
    }
    [kGetIndex](nid:symbol){
        let idx =  this._index[nid]
        if(idx===undefined) return -1
        return idx
    }
    static [kCreate]<TRaw>(localNode:KnodeBase,raw?:TRaw){
        return new this(localNode,raw)
    }
    protected constructor(_localNode:KnodeBase,_raw?:TRaw){
        super({captureRejections:true})
        this._index = {}
        this.status = "idle"
        this.intend = "unknown"
        this.localNode = _localNode
        this.raw = _raw
        this.on("connection",()=>this.status = "established")
        this.on("close",()=>this.status = "idle")
        this.on("error",(err)=>console.error("Err From Impl",err)) // disable Uncaught Message
        
        this.on("connection",()=>{
            if(!this.localNode) throw Error("emited on a dissociative konnection")
            this.localNode[kOnNewConn](this)
            // this.localNode.emit("connection",this)
            this.localNode.rawListeners("connection").map(l=>l(this))
        })
        this.on("close",()=>this.localNode[kOnClose](this))
        // this.resetListeners()
    }
    /**
     * cache a copy of the listeners added currently 
     */
    bakeListeners() {
        this._bakedListeners = Object.fromEntries(
            this.eventNames().map(n => [n, this.rawListeners(n)])
        )
    }
    /**
     * retrieve the listeners cached by `bakeListeners`
     */
    resetListeners(){
        this.removeAllListeners()
        for (let k in this._bakedListeners)
            for(let l of this._bakedListeners[k])
                this.on(k,l)
    }
    /**
     * close the connection
     * @param reason reserved
     */
    close(reason?:any){
        // this.remoteAddress = null
        this.intend = "close"
        this.broker.close(this,reason)
    }
    /**
     * connect to remote address
     * @param addr remote
     * @param reason close for previous established connection, reserved
     * @returns Promise
     */
    connectTo(addr:Address,reason?:any){
        return new Promise<void>((res,rej)=>{
            if(this.status==="established"){
                this.close()
            }
            this.status ="connecting"
            this.intend = "connect"
            this.remoteAddress = addr
            this.broker.connect(this,addr).then(()=>{
                // this.status = "established" // "connection" event is more convincing
                res()
            },(err)=>{
                this.status = "idle"
                rej(err)
            })
        })//.catch(()=>{})
    }
    
    /**
     * send data with impl immediately
     * @param formedData the raw data to send
     * @returns Promise
     */
    /*protected*/ async rawSend(formedData:any):Promise<void>{
        return await this.broker.send(this,formedData)
    }

    /**
     * same as `rawSend`
     */
    async send(formedData:any):Promise<void>{
        return await this.rawSend(formedData)
    }
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
    
    emit(event:"connection",conn:KonnectionBase):boolean;
    emit(event:"data",data:any):boolean;
    // emit(event:"push",data:any):boolean;
    emit(event:"close",data:any):boolean;
    emit(event:"error",err:Error):boolean;
    emit(event:string,...args:any[]):boolean;
    // emit(event:"status",status:ConnectionStatus,prev:ConnectionStatus):boolean;
}











export class KnodeBase extends EventEmitter{
    connections:KonnectionBase[]
    broker:BrokerBase
    id:symbol
    prevKnodes:this[]
    protected getNextKnode:()=>this
    
    get nextKnode():this{
        return this.getNextKnode?.call(this)
    }
    // impl:ConnectionImpl    
    constructor(){
        super()
        this.id = Symbol()
        this.connections = []
    }

    [kOnNewConn](conn:KonnectionBase){
        this.connections.push(conn[kSetIndex](this.connections.length,this.id))
        this.nextKnode&&this.nextKnode[kOnNewConn](conn)
        // this connection may be a redirected one!
        // conn.localNode = this
    }
    [kOnClose](conn:KonnectionBase){
        let node = this
        let taridx = conn[kGetIndex](this.id)
        conn[kSetIndex](-1,this.id) //mark as invalid
        if(node.connections[taridx]!=conn){
            throw Error("not a valid connection")
        }
        if(taridx<0||taridx>=node.connections.length){
            throw Error("remove connection of an invalid index")
        }
        if(node.connections.length==taridx+1){
            node.connections.pop()
        }else{
            let tail = node.connections.pop()[kSetIndex](taridx,this.id)
            node.connections[taridx] = tail
        }
        this.nextKnode&&this.nextKnode[kOnClose](conn)
    }
    // setImpl(impl:(node:KnodeBase)=>ConnectionImpl){
    //     this.impl = impl(this)
    //     return this
    // }
    setBroker(broker:BrokerBase){
        broker[kInit](delegateCreateConn(this))
        this.broker = broker
        // return this
    }
    sendTo(conn:KonnectionBase,data:any):Promise<boolean>;
    sendTo(connections:KonnectionBase[],data:any):Promise<boolean>;
    async sendTo(connections:any,data:any){
        if(connections instanceof Array){
            let results = await Promise.allSettled(connections.map(c=>c.send(data)))
            return results.length && results.reduce((a,b)=>a&&b)
        }
        return await connections.send(data);
    }
    broadcast(data:any):Promise<boolean>;
    broadcast(cull:KonnectionBase,data:any):Promise<boolean>;
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
    createConnection():KonnectionBase{
        return KonnectionBase[kCreate](this)
    }
    connectTo(addr:Address,reason?:any):ReturnType<this["createConnection"]>{
        let conn = this.createConnection()
        if(addr) conn.connectTo(addr,reason)//.catch(()=>{})
        return conn as any
    }
    // CreateSourceConnection(){
    //     this.broker.conn
    // }
    // CreatePassiveConnection(){

    // }
    override emit(e:any,...args:any[]):any{
        throw Error("emitting on a knode is likely a wrong operation")
    }
    to(fn:()=>this){
        if(this.getNextKnode) throw Error("cannot call to multiple times")
        this.getNextKnode = ()=>{
            let n = fn()
            n.prevKnodes.push(this)
            return n
        }
        return this
    }
}

export interface KnodeBase{
    on(event:"connection",f:(conn:KonnectionBase)=>any):any;
    // emit(event:"connection",conn:KonnectionBase):boolean;
}




