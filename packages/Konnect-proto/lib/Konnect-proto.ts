// import { defineMidware } from "Konnect";

import { BufferList } from "bl";
import { Context, defineMidware, Konnection } from "KonnectJS";
type ReconnectOptions = Partial<{
    /**
     * time to reconnect since disconnection. default is 1s
     */
    timeout:number
}>

export let KonnectReconnect = defineMidware(function(opt:ReconnectOptions={}){
    opt = {
        timeout:1000,
        ...opt
    }
    this.on("status",(stat,prev)=>{
        if(stat==="idle"&&this.intend=="connect") setTimeout(() => {
            if(this.status!="idle") return
            this.connectTo(this.remoteAddress)
        }, opt.timeout);
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

}

/**
 * avoid sticky package and half package problem. useful when your network protocol is stream-based
 */
export let KonnectSplit = defineMidware(function(opt:SplitOptions={}){
    opt = {
        
        ...opt
    }
    let rcvBuffer = new HybridBufferList()
    return async (ctx,next)=>{
        if(ctx.eventType==="form"){
            if(ctx.dataIn?.length) rcvBuffer.append(ctx.dataIn)
            let bu = new BufferUtil(rcvBuffer)
            let len = bu.readVariedInt()
            if(len<0) {
                ctx.dataIn = null
                return
            }
            let buf = bu.readBuffer(len)
            if(!buf) {
                ctx.dataIn = null
                return
            }
            ctx.dataIn = buf
            rcvBuffer.consume(bu.pos)
            await next()
            return
        }
        if(ctx.eventType==="data"){
            if(ctx.dataIn==null) return
            await next()
            if(rcvBuffer.length){
                // console.log(rcvBuffer)
                ctx.conn.emit("data",Buffer.allocUnsafe(0))
            }
            return
        }
        if(ctx.eventType==="unform"){
            await next()
            ctx.dataOut = new HybridBufferList()
            .append(BufferUtil.variedInt(ctx.dataOut.length))
            .append(ctx.dataOut)
            .subarray()
            return
        }
        next()
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
    return async(ctx:Context<Buffer,Buffer>,next)=>{
        if(ctx.eventType==="connection"){
            heartbeat()
            return await next()
        }
        if(ctx.eventType==="form"){
            heartbeat()
            if (!ctx.dataIn) return await next()
            if (ctx.dataIn[0] == HeartbeatMessage.PING) {
                if (ctx.dataIn.length == 1) { // got ping
                    await this.send(bufPong)
                    return
                } else {
                    ctx.dataIn = ctx.dataIn.subarray(1)
                }
            } else if (ctx.dataIn[0] == HeartbeatMessage.PONG) {
                if (ctx.dataIn.length == 1) { // got pong
                    // console.log("get pong")
                    return
                } else {
                    ctx.dataIn = ctx.dataIn.subarray(1)
                }
            }
            return await next()
        }
        next()
    }
})
