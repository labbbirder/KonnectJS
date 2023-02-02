// export {KnodeBase,KonnectionBase} from "./core.app"
export * from "./middleware.app";
export * from "./utils"


// interface KMetadata{
//     setMetadata(key:"pack-type",value:"unknown|stream|packet"):void;
//     setMetadata(key:"heartbeat",value:"unknown|no|yes"):void;
//     setMetadata(key:"no-delay",value:"unknown|no|yes"):void;
//     setMetadata(key:"reliable",value:"unknown|no|yes"):void;
//     setMetadata(key:"ordered",value:"unknown|no|yes"):void;
//     setMetadata(key:"connection-based",value:"unknown|no|yes"):void;
//     setMetadata(key:"raw-protocol",value:string):void;
//     setMetadata(key:string,value:any):void;
// }
// enum ErrorCode{
//     UNKNOWN = 0,
//     CONNECT_FAIL,
//     CREATE_FAIL,
//     SEND_FAIL,
//     INVALID_DATA,
//     CLOSE_FAIL,
//     length
// }


//#region Middleware


// const sleep = (ms:number)=>new Promise(res=>setTimeout(res,ms))
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
// }).use(()=>(ctx,next)=>{
//     console.log("-")
// })

// node.emit("connection",Konnection.from(node))