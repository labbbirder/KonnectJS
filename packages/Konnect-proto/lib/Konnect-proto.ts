// import { defineMidware } from "Konnect";

import { BufferList } from "bl";
import { defineMidware, Kontext } from "konnectjs";
const sleep = (ms:number)=>new Promise(res=>setTimeout(res,ms))
type ReconnectOptions = Partial<{
    /**
     * time to reconnect since disconnection. default is 1s
     */
    timeout:number
}>

export let KonnectReconnect = defineMidware(function(opt:ReconnectOptions={}){
    let option = {
        timeout:1000,
        ...opt
    }
    let reconnect = async()=>{
        while(this.status==="idle"){
            await sleep(option.timeout)
            console.log("retry reconnect...")
            if(this.status==="idle")await this.connectTo(this.remoteAddress)
        }
    }
    this.on("status",(stat,prev)=>{
        if(stat==="idle"&&this.intend=="connect") reconnect()
    })
    return (ctx,next)=>{
        next()
    }
})

// type Second<T> = T extends `${infer M extends number}s`?M:never
// type MillionSecond<T> = T extends `${infer M extends number}ms`?M:never

// type SecondType<T> = Second<T> | MillionSecond<T> | (T extends number?T:never)


class HybridBufferList extends BufferList{
    at(idx:number){
        return super.get(idx)
    }
    subarray(start?:number,end?:number){
        return super.slice(start,end)
    }
}
type BufferLike = Buffer|InstanceType<typeof HybridBufferList>
export class BufferUtil{
    buf:BufferLike
    pos:number
    constructor(buf:BufferLike,pos=0){
        this.buf = buf
        this.pos = pos
    }
    static variedInt(n:number,buf?:Buffer,offset=0){
        let len = 
              n < ( 0x80 >>> 0 )? 1
            : n < ( 0x8000 >>> 1)? 2
            : n < ( 0x800000 >>> 2)? 3
            : n < ( 0x80000000 >>> 3)? 4
            : 5
        if(!buf) buf = Buffer.allocUnsafe(len)
        // let buf = Buffer.alloc(len)
        let pos = 0
        while(n > 127){
            buf[offset + pos++] = n & 127 | 128
            n >>>= 7
        }
        buf[offset + pos] = n
        return buf
    }
    readVariedInt():number{
        if(!this.buf.length) return -1;
        let offset = 0
        let bt
        let res = 0
        while(bt = this.buf.at(offset + this.pos)){
            if(offset>4) return -1
            res |= (bt&127) << (offset*7)
            offset++
            if(~bt&128) break
            if(this.buf.length<=offset+this.pos) return -1
        }
        this.pos+=offset
        return res
    }
    readBuffer(len:number){
        let end = this.pos+len
        if(end>this.buf.length) return null
        let ret = this.buf.subarray(this.pos,end)
        this.pos = end
        return ret
    }
}


// let buf = BufferUtil.variedInt(1234567890)
// console.log(buf)
// let util = new BufferUtil(Buffer.concat([buf,Buffer.from([1,3,2])]))
// let ret = util.readVariedInt()
// console.log(util)
// console.log(ret)

type SplitOptions = {
    /**
     * max allowed package size, 0 or negative for infinite
     */
    maxBytes? : number,
}

/**
 * avoid sticky package and half package problem. useful when your network protocol is stream-based
 */
export let KonnectSplit = defineMidware(function(opt:SplitOptions={}){
    let option = {
        maxBytes:8<<10,
        ...opt
    } as Required<SplitOptions>

    let rcvBuffer = new HybridBufferList()
    return async (ctx,next)=>{
        if(ctx.dataIn){
            if(ctx.dataIn.length) rcvBuffer.append(ctx.dataIn)
            let bu = new BufferUtil(rcvBuffer)
            let len = bu.readVariedInt()
            if(len<0) {
                return
            }
            if(option.maxBytes>0 && len>option.maxBytes){
                throw Error("package is too large")
            }
            let buf = bu.readBuffer(len)
            if(!buf) {
                console.log("buf not enough",rcvBuffer.toString())
                return
            }
            ctx.dataIn = buf
            rcvBuffer.consume(bu.pos)

            if(rcvBuffer.length){
                ctx.conn.once("complete",()=>{
                    ctx.conn.emit("data",Buffer.allocUnsafe(0))
                })
            }
        }
        await next()
        ctx.dataOut = ctx.dataOut?.map(d=>{
            return new HybridBufferList()
            .append(BufferUtil.variedInt(d.length))
            .append(d)
            .subarray()
        })
    }
})





type HeartbeatOption = {
    /**
     * default 2000 ms
     */
    heartBeatInterval?:number
    /**
     * default 6000 ms
     */
    maxLifeime?:number
}

enum HeartbeatMessage{
    PING = 0xC5,
    PONG = PING^0xff,
}
let bufPing = Buffer.from([HeartbeatMessage.PING])
let bufPong = Buffer.from([HeartbeatMessage.PONG])

/**
 * A connection detect strategy, which automatically closes connection on time exceeded.\
 * only works in **packet-based** protocol
 */
export let KonnectHeartbeat = defineMidware(function(opt:HeartbeatOption={}){
    let option = {
        heartBeatInterval :2000,
        maxLifeime :6000,
        ...opt
    } as Required<HeartbeatOption>

    if(option.maxLifeime/option.heartBeatInterval<=2){
        console.warn("maxLifeime is recommended to be more than 2 times bigger than heartBeatInterval")
    }
    
    let lastBeat = Date.now()
    let itBeat:NodeJS.Timeout,itLife:NodeJS.Timeout
    let heartbeat = ()=>{
        lastBeat = Date.now()
        itBeat&&clearTimeout(itBeat)
        itLife&&clearTimeout(itLife)
        itBeat = setTimeout(() => {
            if(lastBeat+option.heartBeatInterval < Date.now()){
                this.send(bufPing)
            }
        }, opt.heartBeatInterval)
        itLife = setTimeout(() => {
            this.close()
            // this.emit("close","heartbeat")
        }, opt.maxLifeime);
    }
    return async(ctx:Kontext<Buffer,Buffer>,next)=>{
        if(ctx.eventType==="connection"){
            heartbeat()
            return await next()
        }
        if(ctx.eventType==="data"){
            heartbeat()
            // if (!ctx.dataIn) return await next()
            if (ctx.dataIn?.at(0) == HeartbeatMessage.PING) {
                if (ctx.dataIn.length == 1) { // got ping
                    await this.send(bufPong)
                    // ctx.dataIn = undefined
                    return
                } else {
                    ctx.dataIn = ctx.dataIn.subarray(1)
                }
            } else if (ctx.dataIn?.at(0) == HeartbeatMessage.PONG) {
                if (ctx.dataIn.length == 1) { // got pong
                    // ctx.dataIn = undefined
                    // console.log("get pong")
                    return
                } else {
                    ctx.dataIn = ctx.dataIn.subarray(1)
                }
            }

            return await next()
        }
        
        if(ctx.eventType==="push" && ctx.dataOut?.length==1){
            if(
                ctx.dataOut[0] instanceof Buffer &&
                (
                    ctx.dataOut[0].equals(bufPing) ||
                    ctx.dataOut[0].equals(bufPong)
                )
            ){
                return
            }

            return await next()
        }
        next()
    }
})
