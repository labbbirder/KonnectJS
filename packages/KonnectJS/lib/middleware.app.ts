import EventEmitter from 'events'
import compose from 'koa-compose'
import convert from 'koa-convert'
import { Logger } from 'ts-log'
import { isGeneratorFunction } from 'util/types'
import {Address, ConnectionImpl, KnodeBase,KonnectionBase} from "./core.app"

const kCallback = Symbol()
const kComplete = Symbol()
const kCtxStck  = Symbol()
const kCrtCtx   = Symbol()

export type EventType = "connection"|"data"|"error"|"close"|"push"
export type MiddlewareFunction<TI=any,TO=any> = (ctx:Kontext<TI,TO>,next:Function)=>any
// export interface Context<TI = any,TO = any> {
//     conn:       Konnection,
//     eventType?: EventType,
//     error?:     Error,
//     dataIn?:    TI,
//     dataOut?:   TO[],
//     send:       (data:TO)=>void,
// }
class KontextContent<TI = any,TO = any>{
    conn:       Konnection;
    eventType?: EventType;
    error?:     Error;
    dataIn?:    TI;
    dataOut?:   TO[];
    protected constructor(conn:Konnection){
        this.conn = conn
    }
    [k:string|symbol]:any
}
type AuthorType<T> = {
    [k in keyof T]:T[k]
}
export class Kontext<TI = any,TO = any> extends KontextContent<TI,TO>{
    private constructor(conn:Konnection){
        super(conn)
    }
    send(data:TO):void{
        ;(this.dataOut||=[]).push(data)
    }
    static [kCrtCtx](o:AuthorType<KontextContent>){
        let ctx = new Kontext(o.conn)
        Object.assign(ctx,o)
        // o.conn[kCtxStck].push(ctx)
        return ctx
    }
}

function shipContext(e:EventType,o:AuthorType<KontextContent>){
    let conn = o.conn
    let ctx = Kontext[kCrtCtx](o)
    ctx.eventType = e
    let stack = conn[kCtxStck]
    stack.push(ctx)
    return conn[kCallback](e,ctx).catch(err=>console.error(err)).finally(()=>{
        if(stack.at(-1)!==ctx){
            //Fix Me: dataOut was settled on another new context, this may cause unexpectedness
            // throw Error("context stack check failed")
            let idx = stack.lastIndexOf(ctx)
            if(~idx) stack.splice(idx,1)
        }else{
            stack.pop()
        }
        
        if(!ctx?.dataOut || !(ctx?.dataOut instanceof Array)) return
        ctx.dataOut.forEach(data => {
            conn.rawSend(data)
        });
        conn.emit("complete")
    })
}


export class Konnection<TRaw=any> extends KonnectionBase<TRaw>{
    middlewares:    MiddlewareFunction[]
    [kCtxStck]:     Kontext[]

    override localNode: Knode
    private _cb:(eventType: EventType, ctx: Kontext) => Promise<void>
    
    public get [kCallback]() {
        return this._cb ||= this.callback();
    }
    
    static from<TRaw>(localNode:Knode,raw?:TRaw){
        return new this(localNode,raw)
    }
    /**
     * create a konnection from a local knode, use its middlewares. if middlewares \
     * asd changes later, call `refresh` manually to catch up.
     * @param localNode 
     * @param raw 
     */
    private constructor(localNode:Knode,raw?:TRaw){
        super(localNode,raw)
        this[kCtxStck] = []
        this.refresh()
        this.bakeListeners()
    }

    /**
     * refetch middlewares from local knode
     */
    refresh(){
        this.middlewares = []
        for(let fac of this.localNode.midwareFactories){
            let rawcb = fac.func.call(this,...fac.args)
            let cb = rawcb
            if(fac.filter){
                cb = async (ctx:Kontext,next:Function)=>{
                    if(~fac.filter.indexOf(ctx.eventType)){
                        return await rawcb(ctx,next)
                    }
                    next()
                }
            }
            this.use(cb)
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
        let cb = (eventType:EventType,ctx:Kontext)=>{
            ctx.eventType = eventType
            ctx.send = (d)=>{
                ctx.dataOut||=[]
                ctx.dataOut.push(d)
            }
            return fn(ctx)
        }
        return cb
    }
    override async send(formedData:any):Promise<void>{
        let contexts = this[kCtxStck]
        if(!this[kCtxStck].length){
            // let ctx = createContext(this,{dataOut:[formedData]})
            // this[kCallback]("push",ctx).finally(()=>this[kComplete](ctx))
            shipContext("push",{ conn:this,dataOut:[formedData] })
        }else{
            //Fix Me: dataOut was settled on another new context, this may cause unexpectedness
            let ctx = contexts.at(-1) 
            ctx.send(formedData)
        }
    }
    // [kComplete](ctx:Kontext){
    //     // if(this[kCtxStck].at(-1)!==ctx){
    //     //     //Fix Me: dataOut was settled on another new context, this may cause unexpectedness
    //     //     // throw Error("context stack check failed")
    //     //     let idx = this[kCtxStck].lastIndexOf(ctx)
    //     //     if(~idx) this[kCtxStck].splice(idx,1)
    //     // }
    //     // this[kCtxStck].pop()
    //     if(!ctx?.dataOut || !(ctx?.dataOut instanceof Array)) return
    //     ctx.dataOut.forEach(data => {
    //         super.rawSend(data)
    //     });
    //     this.emit("complete")
    // }
}







export class Knode<TI=any,TO=any> extends KnodeBase<TI,TO>{
    midwareFactories:{
        func:(...args:any[])=>MiddlewareFunction,
        filter?:EventType[]
        args:any[],
    }[] = []
    
    constructor(){
        super()
        this.connections = []
        // redirect events to middlewares
        this.on("connection",conn=>{
            // let cb = conn[kCallback]
            // let ctx = createContext(conn)
            conn.on("data",dataIn=>{
                // let ctx = createContext(conn,{ dataIn })
                // cb("data",ctx).finally(()=>conn[kComplete](ctx))
                shipContext("data",{conn,dataIn})
            }).prependListener("close",dataIn=>{
                if(conn.status==="idle") return
                // let ctx = createContext(conn,{ dataIn })
                // cb("close",ctx).finally(()=>conn[kComplete](ctx))
                shipContext("close",{conn,dataIn})
            }).on("error",error=>{
                // let ctx = createContext(conn,{ error })
                // cb("error",ctx).finally(()=>conn[kComplete](ctx))
                shipContext("error",{conn,error})
            })
            shipContext("connection",{conn})
            // cb("connection",ctx).finally(()=>conn[kComplete](ctx))
        })
    }

    use<
        T extends (this:Konnection,...args:any[])=>MiddlewareFunction<TI,TO>,
        K extends Knode=Knode<TI,TO>
    >(events:EventType[],func:T,...args:Parameters<T>):NormalizedKnodeType<ReturnType<ReturnType<T>>,K>;
    use<
        T extends (this:Konnection,...args:any[])=>MiddlewareFunction<TI,TO>,
        K extends Knode=Knode<TI,TO>
    >(func:T,...args:Parameters<T>):NormalizedKnodeType<ReturnType<ReturnType<T>>,K>;
    use(filter:any,func?:any,...args:any[]):any{
        let opt = {} as any
        if(filter instanceof Array<string>){
            opt = {
                filter,func,args
            }
        }else{
            args.unshift(func)
            opt = {
                func:filter,args
            }
        }
        if(!!opt.func)this.midwareFactories.push(opt)
        return this as any
    }
    override CreateConnectTo(addr:Address,reason?:any):Konnection{
        let conn = Konnection.from(this)
        conn.connectTo(addr,reason).catch(()=>{})
        return conn
    }
    override async emit(event: string, ...args:any[]) {
        // one by one
        for(let l of this.rawListeners(event)){
            await l(...args)
        }
    }
}

export interface Knode{
    on(event:"connection",f:(conn:Konnection)=>any):any;
    emit(event:"connection",conn:Konnection):any;
}










export type SetContextType<K extends "TI"|"TO"|"TIO",T1,T2=any> = {_:K}
type SetContextTypeLike<K extends "TI" | "TO" | "TIO",T1,T2=any> = SetContextType<K,T1,T2>|Promise<SetContextType<K,T1,T2>>
type NormalizedKnodeType<T,TK extends Knode = Knode> = TK extends Knode<infer TI,infer TO>?(
    T extends SetContextTypeLike<"TI",infer TI>? Knode<TI,TO>:
    T extends SetContextTypeLike<"TO",infer TO>? Knode<TI,TO>:
    T extends SetContextTypeLike<"TIO",infer TI,infer TO>? Knode<TI,TO>:
    TK
):TK



type ConnectionImplFactory<TRaw=any> = (...args:any[])=>(node:Knode)=>ConnectionImpl<Konnection<TRaw>>
export function defineImpl<T extends ConnectionImplFactory>(f:T){
    return f
}



export function defineMidware<T extends (this:Konnection,...args:any[])=>MiddlewareFunction>(f:T):T{
    return f
}



export let ReformInput = defineMidware(<T>(opt:{former?:(d:any)=>T}={})=>(ctx,next)=>{
    if(opt?.former) ctx.dataIn &&= opt.former(ctx.dataIn)
    return next() as SetContextType<"TI",T>
})
export let ReformOutput = defineMidware(<T>(opt:{unformer?:(d:T)=>any} = {})=>async(ctx,next)=>{
    await next()
    if(opt?.unformer) {ctx.dataOut = ctx.dataOut?.map(d=>opt.unformer(d))}
    return null as SetContextType<"TO",T>
})
export let ReformIO = defineMidware(<TI,TO=TI>(opt:{former?:(d:any)=>TI,unformer?:(d:TO)=>any}={})=>async(ctx,next)=>{
    if(opt?.former) {ctx.dataIn &&= opt.former(ctx.dataIn)}
    await next()
    if(opt?.unformer) {ctx.dataOut = ctx.dataOut?.map(d=>opt.unformer(d))}
    return null as SetContextType<"TIO",TI,TO>
})
export let FilterEvent = defineMidware((filter:EventType[],options?:{exlucde?:boolean})=>(ctx,next)=>{
    if(!(~filter.indexOf(ctx.eventType))==!!(options?.exlucde)) next()
})

const kDebugEventIndent = Symbol()
const kDebugEventDepth = Symbol()
const packDebugData = (name:string,value:any)=>value?name+": "+
    (value instanceof Buffer?`<Buffer ${value}>`:`'${value}'`)
    :''
const packDebugMessage=(ctx:Kontext,prefix:string,isStart:boolean)=> ""
    + " ".repeat(ctx[kDebugEventIndent])
    + `[DEBUG ${prefix} ${isStart?"↴":"↵"}]`
    + packDebugData("in",ctx.dataIn)
    + packDebugData("out",ctx.dataOut)
    + packDebugData("err",ctx.error)

export let DebugEvent = defineMidware((prefix:string,indent=1,logger:Logger=console)=>async (ctx,next)=>{
    ctx[kDebugEventIndent]||=0
    ctx[kDebugEventDepth]||=0
    // let strIn = "",strOut = ""
    if(!ctx[kDebugEventDepth])logger.info(`--- get <${ctx.eventType}> event ---`)
    
    // strIn = ctx.dataIn?` in: ${ctx.dataIn}`:``
    // strOut = ctx.dataOut?` out: ${ctx.dataOut}`:``
    logger.debug(packDebugMessage(ctx,prefix,true))
    
    ctx[kDebugEventIndent] += indent
    ctx[kDebugEventDepth] ++
    await next()
    ctx[kDebugEventDepth] --
    ctx[kDebugEventIndent] -= indent

    // strIn = ctx.dataIn?` in: ${ctx.dataIn}`:``
    // strOut = ctx.dataOut?` out: ${ctx.dataOut}`:``
    logger.debug(packDebugMessage(ctx,prefix,false))
})


// let node = new Knode()
// .use(()=>async (ctx,next)=>{
//     ctx.dataIn &&= Buffer.from(ctx.dataIn)
//     await next()
//     ctx.dataOut?.map(d=>d.toString())
//     return null as SetContextType<"TIO",Buffer,Buffer>
// })
// .use(()=>(ctx,next)=>{
//     console.log(ctx.eventType,ctx.dataIn)
//     ctx.send(Buffer.from("yes"))
//     next()
// })
// .use(()=>(ctx,next)=>{
//     ctx.send(Buffer.from("no"))
// })
// let c1 = Konnection.from(node)
// let c2 = Konnection.from(node)
// let c3 = Konnection.from(node)

// node.emit("connection",c1)
