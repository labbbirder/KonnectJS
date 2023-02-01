import compose from 'koa-compose'
import convert from 'koa-convert'
import EventEmitter from 'events'
import { isGeneratorFunction } from 'util/types'

type EventType = "connection"|"data"|"error"|"close"|"form"|"unform"
interface KMetadata{
    setMetadata(key:"pack-type",value:"unknown|stream|packet"):void;
    setMetadata(key:"heartbeat",value:"unknown|no|yes"):void;
    setMetadata(key:"no-delay",value:"unknown|no|yes"):void;
    setMetadata(key:"reliable",value:"unknown|no|yes"):void;
    setMetadata(key:"ordered",value:"unknown|no|yes"):void;
    setMetadata(key:"connection-based",value:"unknown|no|yes"):void;
    setMetadata(key:"raw-protocol",value:string):void;
    setMetadata(key:string,value:any):void;
}
export interface Context<TI = any,TO = any> {
    conn:Konnection<TI,TO>,
    eventType?:EventType,
    error?:Error,
    dataIn?:TI,
    dataOut?:TO,
}
export interface Address{
    url?:string,
    [k:string]:any,
}
enum ErrorCode{
    UNKNOWN = 0,
    CONNECT_FAIL,
    CREATE_FAIL,
    SEND_FAIL,
    INVALID_DATA,
    CLOSE_FAIL,
    length
}

type MiddlewareFunction = (ctx:Context,next:Function)=>any
type ConnectionImplFactory = (...args:any[])=>(node:Knode)=>ConnectionImpl
export interface ConnectionImpl{
    raw?:any,
    sendTo:(conn:Konnection,data:any)=>Promise<void>,
    closeConnection:(conn:Konnection,reason:any)=>Promise<void>,
    connectTo:(conn:Konnection,addr:Address)=>Promise<void>,
    broadcast?:(data:any)=>Promise<void>,
    shutdown?:()=>Promise<void>,
    [key:string]:any
}
type ConnectionStatus = "idle"|"connecting"|"established"


const kSetIndex = Symbol()
const kGetIndex = Symbol()
const kCallback = Symbol()


export class Konnection<TI=any,TO=any,TRaw=any> extends EventEmitter{
    // private 
    // _established:boolean
    middlewares:MiddlewareFunction[]
    raw:TRaw;
    localNode:Knode;
    remoteAddress:Address|Knode;
    intend:"unknown"|"connect"|"close"

    private _cb:(eventType: EventType, ctx: Context) => Promise<void>
    private _index:number;
    private _status:ConnectionStatus
    
    public get [kCallback]() {
        return this._cb;
    }
    public get status() {
        return this._status;
    }
    public set status(v) {
        this.emit("status",v,this._status)
        this._status = v;
    }
    
    [kSetIndex](idx:number){
        this._index = idx
        return this
    }
    [kGetIndex](){
        return this._index
    }
    get established(){
        return this.status=="established"
    }
    /**
     * create a konnection from a local knode, use its middlewares. if middlewares \
     * asd changes later, call `refresh` manually to catch up.
     * @param localNode 
     * @param raw 
     */
    constructor(localNode:Knode,raw?:TRaw){
        super({captureRejections:false})
        this.status = "idle"
        this.intend = "unknown"
        this.on("connection",()=>this.status = "established")
        this.on("close",()=>this.status = "idle")
        this.on("error",()=>{}) // disable Uncaught Message
        this.localNode = localNode
        this.raw = raw
        this.refresh()
    }
    /**
     * refetch middlewares from local knode
     */
    refresh(){
        this.middlewares = []
        for(let fac of this.localNode.midwareFactories){
            this.use(fac.func.call(this,...fac.args))
        }
        this._cb = this.callback()
    }
    use(fn:MiddlewareFunction){
        if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
        if (isGeneratorFunction(fn)) {
            fn = convert(fn);
        }
        this.middlewares.push(fn)
        return this
    }
    callback(){
        let fn = compose(this.middlewares)
        let cb = (eventType:EventType,ctx:Context)=>{
            ctx.eventType = eventType
            return fn(ctx)
        }
        return cb
    }
    async send(formedData:TO):Promise<boolean>{
        if(!this._cb) return false
        if(!this.established) return false
        let ctx = { conn:this, dataOut:formedData }
        await this._cb("unform",ctx).finally()
        await this.localNode.impl.sendTo(this,ctx.dataOut)
        return true
    }
    async sendWithContext(ctx:Context){
        if(!this._cb) return false
        if(!this.established) return false
        // let context = { conn, dataOut:data }
        await this._cb("unform",ctx)
        return this.localNode.impl.sendTo(this,ctx.dataOut)
    }
    close(reason?:any){
        // this.remoteAddress = null
        this.intend = "close"
        this.localNode.impl.closeConnection(this,reason)
    }
    connectTo(addr:Address,reason?:any){
        return new Promise<void>((res,rej)=>{
            if(this.established){
                this.close()
            }
            this.status ="connecting"
            this.intend = "connect"
            this.remoteAddress = addr
            this.localNode.impl.connectTo(this,addr).then(()=>{
                // this.status = "established" // "connection" event is more convincing
                res()
            },()=>{
                this.status = "idle"
                rej()
            })
        })
    }
}

export interface Konnection{
    on(event:"connection",f:(conn:Konnection)=>any):this;
    on(event:"data",f:(data:any)=>any):this;
    // on(event:"form",f:(data:any)=>any):this;
    // on(event:"unform",f:(data:any)=>any):this;
    on(event:"close",f:(data:any)=>any):this;
    on(event:"error",f:(err:Error)=>any):this;
    on(event:"status",f:(status:ConnectionStatus,prev:ConnectionStatus)=>any):this;

    emit(event:"connection",conn:Konnection):boolean;
    emit(event:"data",data:any):boolean;
    // emit(event:"form",data:any):boolean;
    // emit(event:"unform",data:any):boolean;
    emit(event:"close",data:any):boolean;
    emit(event:"error",err:Error):boolean;
    emit(event:"status",status:ConnectionStatus,prev:ConnectionStatus):boolean;
}
export type SetContextType<K extends "TI"|"TO"|"TIO",T1,T2=any> = {_:K}
type SetContextTypeLike<K extends "TI" | "TO" | "TIO",T1,T2=any> = SetContextType<K,T1,T2>|Promise<SetContextType<K,T1,T2>>
type NormalizedKnodeType<T,TK extends Knode = Knode> = TK extends Knode<infer TI,infer TO>?(
    T extends SetContextTypeLike<"TI",infer TI>? Knode<TI,TO>:
    T extends SetContextTypeLike<"TO",infer TO>? Knode<TI,TO>:
    T extends SetContextTypeLike<"TIO",infer TI,infer TO>? Knode<TI,TO>:
    TK
):TK

// type RestParamters<T> = T extends (h:any,...args: infer P)=>any? P:never;

export class Knode<TI = any,TO = any> extends EventEmitter{
    connections:Konnection[]
    impl:ConnectionImpl
    midwareFactories:{func:(...args:any[])=>MiddlewareFunction,args:any[]}[] = []
    constructor(){
        super()
        this.connections = []
        this.on("connection",conn=>{
            this.connections.push(conn[kSetIndex](this.connections.length))
            conn.localNode = this
            // for(let fac of this.midwareFactories){
            //     conn.use(fac.func.call(conn,...fac.args))
            // }
            let cb = conn[kCallback]

            conn.emit("connection",conn)
            cb("connection",{ conn })
            conn.on("data",dataIn=>{
                let ctx:Context<TI,TO> = { conn, dataIn }
                cb("form",ctx).then(()=>{
                    if(ctx.dataIn!==undefined) cb("data",ctx)
                })
            }).on("close",dataIn=>{
                let taridx = conn[kGetIndex]()
                if(this.connections[taridx]!=conn){
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
                // this.connections[conn._index] = this.connections.pop()._setIndex(conn._index)
                cb("close",{ conn, dataIn })
            }).on("error",error=>{
                cb("error",{ conn, error })
            })
        })
    }
    setImpl(impl:ReturnType<ConnectionImplFactory>){
        this.impl = impl(this)
        return this
    }
    use<
        // NTI=TI, NTO=TO,
        T extends (this:Konnection,...args:any[])=>(ctx:Context<TI,TO>,next:Function)=>any,
        K extends Knode=Knode<TI,TO>
    >(func?:T,...args:Parameters<T>):NormalizedKnodeType<ReturnType<ReturnType<T>>,K>{
        if(!!func)this.midwareFactories.push({func,args})
        return this as any
    }
    // ioType<NTI,NTO>(){
    //     return this as any as Knode<NTI,NTO>
    // }
    private isConnectionArray(conn:any):conn is Konnection[]{
        return conn instanceof Array
    }
    sendTo(conn:Konnection,data:TO):Promise<boolean>;
    sendTo(connections:Konnection[],data:TO):Promise<boolean>;
    async sendTo(connections:any,data:any){
        if(this.isConnectionArray(connections)){
            let results = await Promise.allSettled(connections.map(c=>c.send(data)))
            return results.length && results.reduce((a,b)=>a&&b)
        }
        return await connections.send(data);
    }
    broadcast(data:TO):Promise<boolean>;
    broadcast(cull:Konnection,data:TO):Promise<boolean>;
    broadcast(cull:any,data?:any){
        let targets = this.connections;
        if(!!data && (cull instanceof Konnection)){
            targets = targets.filter(c=>c!=cull)
        }else{
            data = cull;
        }
        return this.sendTo(targets,data);
    }
    ConnectTo(addr:Address,reason?:any):Konnection{
        let conn = new Konnection(this)
        conn.connectTo(addr,reason)
        return conn
    }
}
export interface Knode{
    on(event:"connection",f:(conn:Konnection)=>any):any;
    emit(event:"connection",conn:Konnection):boolean;
}
export function defineImpl<T extends ConnectionImplFactory>(f:T){
    return f
}
export function defineMidware<T extends (this:Konnection,...args:any[])=>MiddlewareFunction>(f:T):T{
    return f
}

export let ReformInput = defineMidware(<T>(opt:{former?:(d:any)=>T}={})=>(ctx,next)=>{
    if(ctx.eventType==="form"&&!!opt.former){
        ctx.dataIn = opt.former(ctx.dataIn)
    }
    return next() as SetContextType<"TI",T>
})
export let ReformOutput = defineMidware(<T>(opt:{unformer?:(d:T)=>any} = {})=>async(ctx,next)=>{
    await next()
    if(ctx.eventType==="unform"&&!!opt.unformer){
        ctx.dataOut = opt.unformer(ctx.dataOut)
    }
    return null as SetContextType<"TO",T>
})
export let ReformIO = defineMidware(<TI,TO=TI>(opt:{former?:(d:any)=>TI,unformer?:(d:TO)=>any}={})=>async(ctx,next)=>{
    if(ctx.eventType==="form"&&!!opt.former){
        ctx.dataIn = opt.former(ctx.dataIn)
    }
    await next()
    if(ctx.eventType==="unform"&&!!opt.unformer){
        ctx.dataOut = opt.unformer(ctx.dataOut)
    }
    return null as SetContextType<"TIO",TI,TO>
})


// export let KonnectJSON = defineMidware((useUnform:boolean=true)=>{
//     return (ctx,next)=>{
//         if(ctx.eventType=="form"){
//             ctx.dataIn = JSON.parse(ctx.dataIn.toString())
//         }
//         if(ctx.eventType=="unform"){
//             if(useUnform) ctx.dataOut = JSON.stringify(ctx.dataOut)
//         }
//         return next() as SetContextType<"TIO",{[k:string]:any},{[k:string]:any}>
//     }
// })

export let FilterEvent = defineMidware((filter:EventType[],options?:{exlucde?:boolean})=>(ctx,next)=>{
    if(!(~filter.indexOf(ctx.eventType))==!!(options?.exlucde)) next()
})

class UrlMetaData{
    url:string
    proto:string
    host:string
    port:string
    path:string
    username:string
    _:string
}
export class UrlData extends UrlMetaData{
    private static fromEntries(fields:(keyof InstanceType<typeof UrlMetaData>)[],regRes:string[]){
        let url = new UrlData()
        fields.forEach((k,i) => {
            url[k] = regRes[i]
        });
        return url
    }
    get portNum(){
        return parseInt(this.port||"0")
    }
    static create(url:string):UrlData|null{
        const combineRegs = (...args:RegExp[])=>args.map(a=>a.source).join("")
        const hostPattern = /([\w\.\u0100-\uffff]+|[\[\:\d\]]+)/
        const portPattern = /(:(\d+|\w+))?/
        const mode1 = [/^(\w*?)@/,hostPattern,portPattern,/(\/(.*))?$/]
        const mode2 = [/^((\w+):\/\/)?/,hostPattern,portPattern,/(\/(.*))?$/]
        let res
        res = url.match(combineRegs(...mode1))
        if(res){
            return UrlData.fromEntries([
                "url","username","host","_","port","_","path"
            ],res)
        }
        res = url.match(combineRegs(...mode2))
        if(res){
            return UrlData.fromEntries([
                "url","_","proto","host","_","port","_","path"
            ],res)
        }
        return null
    }
    /**
     * 
     * @returns composed url
     */
    compose(){
        let ret = ""

        if(this.username){
            ret+=this.username+"@"
        }else{
            if(this.proto) ret+=this.proto+"://"
        }
        ret+=this.host
        if(this.port) ret+=":"+this.port
        if(this.path) ret+="/"+this.path
        this.url = ret
        return ret
    }
}

// export function ParseUrl(url:string):UrlData|null{
//     const combineRegs = (...args:RegExp[])=>args.map(a=>a.source).join("")
//     const hostPattern = /([\w\.\u0100-\uffff]+|[\[\:\d\]]+)/
//     const portPattern = /(:(\d+|\w+))?/
//     const mode1 = [/^(\w*?)@/,hostPattern,portPattern,/(\/(.*))?$/]
//     const mode2 = [/^((\w+):\/\/)?/,hostPattern,portPattern,/(\/(.*))?$/]
//     let res
//     res = url.match(combineRegs(...mode1))
//     if(res){
//         return UrlData.create([
//             "url","username","host","_","port","_","path"
//         ],res)
//     }
//     res = url.match(combineRegs(...mode2))
//     if(res){
//         return UrlData.create([
//             "url","_","proto","host","_","port","_","path"
//         ],res)
//     }
//     return null
// }
const sleep = (ms:number)=>new Promise(res=>setTimeout(res,ms))
// async function Foo(p:number) {
//     console.log(p,"start")
//     await sleep(1000)
//     console.log(p,"end")
//     return 1
// }
// ;(async function(){
//     await Promise.allSettled([1,2,3,4,5].map(v=>Foo(v)))
//     console.log("all end")
// })()

// let node = new Knode()
// .use(()=>async(ctx,next)=>{
//     console.log(1)
//     await sleep(100)
//     await next()
//     await sleep(100)
//     console.log(6)
// }).use(()=>async(ctx,next)=>{
//     console.log(2)
//     await sleep(100)
//     await next()
//     await sleep(100)
//     console.log(5)
// }).use(()=>async(ctx,next)=>{
//     console.log(3)
//     await sleep(100)
//     await next()
//     await sleep(100)
//     console.log(4)
// })

// node.emit("connection",new Konnection(node))