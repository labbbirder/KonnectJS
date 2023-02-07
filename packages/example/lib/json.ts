// import { defineMidware } from "konnectjs";

// declare module "konnectjs"{
//     export interface Kontext{
//         jsonIn?:any
//     }
// }

// export let json_data = defineMidware(function(){
//     return async (ctx,next)=>{
//         if(ctx.dataIn) ctx.jsonIn = JSON.parse(ctx.dataIn)
//         await next()
//     }
// })