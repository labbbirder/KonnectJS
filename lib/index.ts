import EventEmitter from 'events'
import Koa from 'koa'

interface Context {
    conn:Konnection,
    eventType?:"connection"|"data"|"error"|"close",
    rawData?:any,
    respData?:any,
    // buffer?:Buffer|string|Uint8Array,
}
export interface Address{
    host?:string,
    port?:number,
    url?:string,
    [k:string]:any,
}
class ReshapedKoa extends Koa{
    //it not a public method, may be modified in the future
    handleRequest<T>(ctx:T, fnMiddleware:(c:T)=>Promise<any>){
        return fnMiddleware(ctx).then(()=>{
            // if(ctx.dataToSend){

            // }
        })//.catch(ctx.onerror)
    }
    createContext(eventType:any, ctx: any): any {
        ctx.eventType = eventType
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
export class Konnection<TRaw=any> extends ReshapedKoa{
    _index:number;
    raw:TRaw;
    localNode:Knode;
    constructor(localNode:Knode,raw?:TRaw){
        super()
        this.localNode = localNode
        this.raw = raw
    }
    send(data:any){
        this.localNode.impl.sendTo(this,data)
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
    on(event:"close",f:(data:any)=>any):this;
    on(event:"error",f:(err:Error)=>any):this;

    emit(event:"data",data:any):boolean;
    emit(event:"close",data:any):boolean;
    emit(event:"error",err:Error):boolean;
}
export class Knode extends EventEmitter{
    connections:Konnection[]
    impl:ReturnType<ReturnType<ConnectionImplFactory>>
    midwareFactories:{func:(...args:any[])=>MiddlewareFunction,args:any[]}[] = []
    constructor(){
        super()
        this.connections = []
        this.on("connection",conn=>{
            this.connections.push(conn._setIndex(this.connections.length))
            let cb = conn.callback()
            conn.localNode = this
            for(let fac of this.midwareFactories) conn.use(fac.func(...fac.args))
            cb("connection",{ conn })
            conn.on("data",(data)=>{
                cb("data",{ conn, rawData:data })
            }).on("close",data=>{
                this.connections[conn._index] = this.connections.pop()._setIndex(conn._index)
                cb("close",{ conn, rawData:data })
            }).on("error",err=>{
                cb("error",{ conn, rawData:err })
            })
        })
    }
    setImpl(impl:ReturnType<ConnectionImplFactory>){
        this.impl = impl(this)
    }
    use<T extends (...args:any[])=>MiddlewareFunction>(func:T,...args:Parameters<T>):any{
        this.midwareFactories.push({func,args})
    }
    sendTo(conn:Konnection,data:any):boolean;
    sendTo(connections:Konnection[],data:any):boolean;
    sendTo(connections:any,data:any){
        let res = true
        if(connections instanceof Array){
            for(let con of connections){
                res &&= this.impl.sendTo(con,data);
            }
            return res
        }
        return this.impl.sendTo(connections,data);
    }
}
export interface Knode{
    on(event:"connection",f:(conn:Konnection)=>any):any;
    emit(event:"connection",conn:Konnection):boolean;
}
export function defineImpl<T extends ConnectionImplFactory>(f:T){
    return f
}
export function defineMidware<T extends (...args:any[])=>MiddlewareFunction>(f:T){
    return f
}