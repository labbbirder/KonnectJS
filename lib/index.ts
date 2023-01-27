import EventEmitter from 'events'
import Koa from 'koa'
type EventType = "connection"|"data"|"error"|"close"|"form"|"unform"
interface Context<TI = any,TO = any> {
    conn:Konnection<TI,TO>,
    eventType?:EventType,
    error?:Error,
    dataIn?:TI,
    dataOut?:TO,
}
export interface Address{
    host?:string,
    port?:number,
    url?:string,
    [k:string]:any,
}
class ReshapedKoa extends Koa{
    _cb:(eventType: string | number | symbol, ctx: Context) => void
    //it not a public method, may be modified in the future
    handleRequest<T>(ctx:T, fnMiddleware:(c:T)=>Promise<any>){
        return fnMiddleware(ctx).then(()=>{
            // if(ctx.dataToSend){

            // }
        })//.catch(ctx.onerror)
    }
    createContext(eventType:any, ctx: any): any {
        ctx.eventType = eventType
        // ctx.send = ctx.conn.send
        return ctx
    }
    callback(): (eventType:any, ctx: any) => void {
        return super.callback() as any
    }
}
interface ReshapedKoa{
    createContext(eventType:string|symbol|number,ctx: Context): Context;
    callback(): (eventType:string|symbol|number,ctx: Context) => void;
}
type MiddlewareFunction = (ctx:Context,next:Function)=>any
interface ConnectionImpl{
    sendTo:(conn:Konnection,data:any)=>boolean,
    closeConnection:(conn:Konnection,code:number,reason:Buffer)=>boolean,
    connectTo?:(conn:Konnection,addr:Address)=>boolean,
    broadcast?:(data:any)=>boolean,
    [key:string]:any
}
type ConnectionImplFactory = (...args:any[])=>(n:Knode)=>ConnectionImpl
export class Konnection<TI=any,TO=any,TRaw=any> extends ReshapedKoa{
    _index:number;
    raw:TRaw;
    localNode:Knode;
    constructor(localNode:Knode,raw?:TRaw){
        super()
        this.localNode = localNode
        this.raw = raw
    }
    // send(data:any){
    //     this.localNode.impl.sendTo(this,data)
    // }
    send(formedData:TO){
        if(!this._cb) return false
        let ctx = { conn:this, dataOut:formedData }
        this._cb("unform",ctx)
        this.localNode.impl.sendTo(this,ctx.dataOut)
    }
    sendWithContext(ctx:Context){
        if(!this._cb) return false
        // let context = { conn, dataOut:data }
        this._cb("unform",ctx)
        this.localNode.impl.sendTo(this,ctx.dataOut)
    }
    close(code:number,reason:Buffer){
        this.localNode.impl.closeConnection(this,code,reason)
    }
    connectTo(addr:Address){
        this.localNode.impl.connectTo(this,addr)
    }
    _setIndex(idx:number){
        this._index = idx
        return this
    }
}
export interface Konnection{
    on(event:"data",f:(data:any)=>any):this;
    // on(event:"form",f:(data:any)=>any):this;
    // on(event:"unform",f:(data:any)=>any):this;
    on(event:"close",f:(data:any)=>any):this;
    on(event:"error",f:(err:Error)=>any):this;

    emit(event:"data",data:any):boolean;
    // emit(event:"form",data:any):boolean;
    // emit(event:"unform",data:any):boolean;
    emit(event:"close",data:any):boolean;
    emit(event:"error",err:Error):boolean;
}
export type SetContextType<K extends "TI"|"TO"|"TIO",T1,T2=any> = {_:K}
type NormalizedKnodeType<T,TK extends Knode = Knode> = TK extends Knode<infer TI,infer TO>?(
    T extends SetContextType<"TI",infer TI>? Knode<TI,TO>:
    T extends SetContextType<"TO",infer TO>? Knode<TI,TO>:
    T extends SetContextType<"TIO",infer TI,infer TO>? Knode<TI,TO>:
    TK
):TK

export class Knode<TI = any,TO = any> extends EventEmitter{
    connections:Konnection[]
    impl:ReturnType<ReturnType<ConnectionImplFactory>>
    midwareFactories:{func:(...args:any[])=>MiddlewareFunction,args:any[]}[] = []
    constructor(){
        super()
        this.connections = []
        this.on("connection",conn=>{
            this.connections.push(conn._setIndex(this.connections.length))
            let cb = conn._cb = conn.callback()
            conn.localNode = this
            for(let fac of this.midwareFactories) conn.use(fac.func(...fac.args))
            cb("connection",{ conn })
            conn.on("data",dataIn=>{
                let ctx:Context<TI,TO> = { conn, dataIn }
                cb("form",ctx)
                cb("data",ctx)
            }).on("close",dataIn=>{
                this.connections[conn._index] = this.connections.pop()._setIndex(conn._index)
                cb("close",{ conn, dataIn })
            }).on("error",error=>{
                cb("error",{ conn, error })
            })
        })
    }
    setImpl(impl:ReturnType<ConnectionImplFactory>){
        this.impl = impl(this)
    }
    use<
        // NTI=TI, NTO=TO,
        T extends (...args:any[])=>(ctx:Context<TI,TO>,next:Function)=>any,
        K extends Knode=Knode<TI,TO>
    >(func?:T,...args:Parameters<T>):NormalizedKnodeType<ReturnType<ReturnType<T>>,K>{
        if(!!func)this.midwareFactories.push({func,args})
        return this as any
    }
    private isConnectionArray(conn:any):conn is Konnection[]{
        return conn instanceof Array
    }
    sendTo(conn:Konnection,data:TO):boolean;
    sendTo(connections:Konnection[],data:TO):boolean;
    sendTo(connections:any,data:any){
        let res = true
        if(this.isConnectionArray(connections)){
            for(let conn of connections){
                res &&= conn.send(data);
            }
            return res
        }
        return connections.send(data);
    }
}
export interface Knode{
    on(event:"connection",f:(conn:Konnection)=>any):any;
    emit(event:"connection",conn:Konnection):boolean;
}
export function defineImpl<T extends ConnectionImplFactory>(f:T){
    return f
}
export function defineMidware<T extends (...args:any[])=>MiddlewareFunction>(f:T):T{
    return f
}

export let SetIOType = <TI,TO>()=>defineMidware(()=>(_,next)=>next() as SetContextType<"TIO",TI,TO>)
export let KonnectJSON = defineMidware((useUnform:boolean=true)=>{
    return (ctx,next)=>{
        if(ctx.eventType=="form"){
            ctx.dataIn = JSON.parse(ctx.dataIn.toString())
        }
        if(ctx.eventType=="unform"){
            if(useUnform) ctx.dataOut = JSON.stringify(ctx.dataOut)
        }
        return next() as SetContextType<"TIO",{[k:string]:any},{[k:string]:any}>
    }
})
export let FilterEvent = defineMidware((filter:EventType[],options?:{exlucde?:boolean})=>(ctx,next)=>{
    if(!~filter.indexOf(ctx.eventType)==!!options?.exlucde) next()
})
