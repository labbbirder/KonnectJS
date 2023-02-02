import { Konnection } from "konnectjs";
declare module 'KonnectJS'{
    interface Konnection{
        session:{id?:number}
    }
}