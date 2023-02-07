import EventEmitter from 'events'
import compose from 'koa-compose'
import convert from 'koa-convert'
import { Logger } from 'ts-log'
import { isGeneratorFunction } from 'util/types'
import { WebSocketServer,WebSocket } from 'ws'
import {Address, BrokerBase, BrokerOption, KnodeBase,KonnectionBase} from "./core.app"
import { logger as defaultLogger } from './logger'
import { UrlData } from './utils'

const kCallback = Symbol()
const kCreate   = Symbol()
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
    [kCtxStck]:     Kontext[] //TODO: remove me

    override localNode: Knode
    private _cb:(eventType: EventType, ctx: Kontext) => Promise<void>
    
    public get [kCallback]() {
        return this._cb ||= this.callback();
    }
    
    static [kCreate]<TRaw>(localNode:Knode,raw?:TRaw){
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
        this.on("data",dataIn=>{
            shipContext("data",{conn:this,dataIn})
        }).prependListener("close",dataIn=>{
            if(this.status==="idle") return
            shipContext("close",{conn:this,dataIn})
        }).on("error",error=>{
            shipContext("error",{conn:this,error})
        })
        this.refresh()
        this.bakeListeners()
    }

    private useKnode(node:Knode){
        for(let fac of node.midwareFactories){
            let rawcb = fac.func.call(this)
            let cb = rawcb
            if(fac.filter){
                cb = async (ctx:Kontext,next:Function)=>{
                    if(~fac.filter.indexOf(ctx.eventType)){
                        return await rawcb(ctx,next)
                    }
                    next()
                }
            }
            this.middlewares.push(cb)
        }
        if(node.nextKnode) this.useKnode(node.nextKnode)
    }

    /**
     * refetch middlewares from local knode
     */
    refresh(){
        this.middlewares = []
        this.useKnode(this.localNode)
        this._cb = this.callback()
    }

    private callback(){
        // if(this._cb) return this._cb
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

    async emitOneByOne(event: string, ...args:any[]) {
        // one by one
        for(let l of this.rawListeners(event)){
            await l(...args)
        }
    }
}







export class Knode<TI=any,TO=any> extends KnodeBase{
    midwareFactories:{
        func:()=>MiddlewareFunction,
        filter?:EventType[]
        // args:any[],
    }[] = []
    override get nextKnode(): Knode {
        return super.nextKnode as Knode
    }

    constructor(){
        super()
        this.connections = []
        // redirect events to middlewares
        this.on("connection",conn=>{
            shipContext("connection",{conn})
        })
    }

    override setBroker<T extends BrokerBase>(broker: T):Knode<T["incomeDataType"],T["outcomeDataType"]>{
        super.setBroker(broker)
        return this
    }

    use<
        T extends (this:Konnection,...args:any[])=>MiddlewareFunction<TI,TO>,
        K extends Knode=Knode<TI,TO>
    >(func:T):NormalizedKnodeType<ReturnType<ReturnType<T>>,K>;
    use<
        T extends (this:Konnection,...args:any[])=>MiddlewareFunction<TI,TO>,
        K extends Knode=Knode<TI,TO>
    >(filter:EventType[],func:T):NormalizedKnodeType<ReturnType<ReturnType<T>>,K>;
    use(filter:any,func?:any):any{
        if(this.getNextKnode) throw Error("cannot use after set next knode")
        let opt = {} as any
        if(filter instanceof Array<string>){
            opt = {
                filter,func
            }
        }else{
            opt = {
                func:filter
            }
        }
        if(!!opt.func)this.midwareFactories.push(opt)
        return this as any
    }
    
    override createConnection():Konnection{
        return Konnection[kCreate](this)
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











export function defineMidware<T extends (this: Konnection, ...args: any[]) => MiddlewareFunction>(f: T) {
    return (...args: Parameters<T>) => function () {
        return f.call(this, ...args)
    } as (this: Konnection) => ReturnType<T>
}


export let reform_input = <T>(opt: { former?: (d: any) => T } = {}) =>
    () => (ctx: Kontext, next: Function) => {
        if (opt?.former) ctx.dataIn &&= opt.former(ctx.dataIn)
        return next() as SetContextType<"TI", T>
    }

export let reform_output = <T>(opt: { unformer?: (d: T) => any } = {}) =>
    () => async (ctx: Kontext, next: Function) => {
        await next()
        if (opt?.unformer) { ctx.dataOut = ctx.dataOut?.map(d => opt.unformer(d)) }
        return null as SetContextType<"TO", T>
    }

export let reform_io = <TI, TO = TI>(opt: { former?: (d: any) => TI, unformer?: (d: TO) => any } = {}) =>
    () => async (ctx: Kontext, next: Function) => {
        if (opt?.former) { ctx.dataIn &&= opt.former(ctx.dataIn) }
        await next()
        if (opt?.unformer) { ctx.dataOut = ctx.dataOut?.map(d => opt.unformer(d)) }
        return null as SetContextType<"TIO", TI, TO>
    }

export let filter_event = defineMidware((filter: EventType[], options?: { exlucde?: boolean }) => (ctx, next) => {
    if (!(~filter.indexOf(ctx.eventType)) == !!(options?.exlucde)) next()
})


const kDebugEventIndent = Symbol()
const kDebugEventDepth  = Symbol()
const packDebugData = (name:string,value:any)=>value?name+": "+
    (value instanceof Buffer?`<Buffer ${value}>`:`'${value}'`) + " "
    :''
const packDebugMessage=(ctx:Kontext,prefix:string,isStart:boolean)=> ""
    + " ".repeat(ctx[kDebugEventIndent])
    + `[DEBUG ${prefix} ${isStart?"↴":"↵"}]`
    + packDebugData("in",ctx.dataIn)
    + packDebugData("out",ctx.dataOut)
    + packDebugData("err",ctx.error)

export let debug_event = defineMidware((opt?:{prefix?:string,indent?:number,logger?:Logger})=>async (ctx,next)=>{
    let {logger,indent,prefix} = {
        prefix:"",
        logger:defaultLogger,
        indent:1,
        ...opt||{}
    }
    ctx[kDebugEventIndent]||=0
    ctx[kDebugEventDepth]||=0
    if(!ctx[kDebugEventDepth])logger.info(`--- ${prefix} get <${ctx.eventType}> event ---`)
    
    logger.debug(packDebugMessage(ctx,prefix,true))
    
    ctx[kDebugEventIndent] += indent
    ctx[kDebugEventDepth] ++
    await next()
    ctx[kDebugEventDepth] --
    ctx[kDebugEventIndent] -= indent

    logger.debug(packDebugMessage(ctx,prefix,false))
})


export {
    BrokerBase,Address,BrokerOption,KonnectionBase
}




