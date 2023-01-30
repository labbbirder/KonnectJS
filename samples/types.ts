import { Konnection } from "KonnectJS";
declare module 'KonnectJS'{
    interface Konnection{
        session:{id?:number}
    }
}