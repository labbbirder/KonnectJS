// import {describe, expect, test} from '@jest/globals';
import { Knode, Konnection } from "../lib";
test("connection scope",()=>{
    // // console.log("test 1")
    let node = new Knode()
    node.use(()=>{
        let idx = 0
        return (ctx,next)=>{
            if(ctx.eventType=="data"){
                expect(ctx.dataIn).toBe(idx)
                idx += 1
            }
        }
    })
    
    let coA = node.createConnection()
    let coB = node.createConnection()
    coA.emit("connection",coA)
    coA.emit("data",0)
    coA.emit("data",1)
    coB.emit("connection",coB)
    coB.emit("data",0)
    coA.emit("data",2)
    coB.emit("data",1)
    coB.emit("data",2)
    coB.emit("data",3)
    coA.emit("data",3)
    coB.emit("data",4)
})

test("connections maintain",()=>{
    // // console.log("test 1")
    let node = new Knode()
    node.use(()=>{
        let idx = 0
        return (ctx,next)=>{
            if(ctx.eventType=="data"){
                expect(ctx.dataIn).toBe(idx)
                idx += 1
            }
        }
    })
    let coA = node.createConnection()
    let coB = node.createConnection()
    let coC = node.createConnection()
    expect(node.connections).toHaveLength(0)
    coA.emit("connection",coA)
    coB.emit("connection",coB)
    coC.emit("connection",coC)
    expect(node.connections).toHaveLength(3)
    coA.emit("close",{})
    expect(node.connections).toHaveLength(2)
    expect((node.connections[0] as any)._index[node.connections[0].localNode.id]).toBe(0)
    expect(node.connections[0]).toBe(coC)
    expect(node.connections[1]).toBe(coB)
})

test("connections index",()=>{
    let A = new Knode()
    .to(()=>B)
    let C = new Knode()
    .to(()=>B)
    
    let B = new Knode()
    
    A.createConnection().emit("connection")
    C.createConnection().emit("connection")
    C.createConnection().emit("connection")


    expect(A.connections).toHaveLength(1)
    expect(B.connections).toHaveLength(3)
    expect(C.connections).toHaveLength(2)
})

