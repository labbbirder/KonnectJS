// import {describe, expect, test} from '@jest/globals';
import { Knode, Konnection } from "..";
test("connection scope",()=>{
    // // console.log("test 1")
    let node = new Knode()
    node.use(()=>{
        let idx = 0
        return (ctx,next)=>{
            if(ctx.eventType=="data"){
                expect(ctx.rawData).toBe(idx)
                idx += 1
            }
        }
    })
    
    let coA = new Konnection(node)
    let coB = new Konnection(node)
    node.emit("connection",coA)
    coA.emit("data",0)
    coA.emit("data",1)
    node.emit("connection",coB)
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
                expect(ctx.rawData).toBe(idx)
                idx += 1
            }
        }
    })
    let coA = new Konnection(node)
    let coB = new Konnection(node)
    let coC = new Konnection(node)
    expect(node.connections).toHaveLength(0)
    node.emit("connection",coA)
    node.emit("connection",coB)
    node.emit("connection",coC)
    expect(node.connections).toHaveLength(3)
    coA.emit("close",{})
    expect(node.connections).toHaveLength(2)
    expect(node.connections[0]._index).toBe(0)
    expect(node.connections[0]).toBe(coC)
    expect(node.connections[1]).toBe(coB)
})

