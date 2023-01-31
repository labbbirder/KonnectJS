import { Konnection } from "../packages/KonnectJS";
declare module 'KonnectJS'{
    interface Konnection{
        session:{id?:number}
    }
}