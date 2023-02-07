class UrlMetaData{
    url:string
    proto:string
    host:string
    port:string
    path:string
    username:string
    _:string
}

export class UrlData extends UrlMetaData{
    // [k:string]:any
    private static fromEntries(fields:(keyof InstanceType<typeof UrlMetaData>)[],regRes:string[]){
        let url = new UrlData()
        fields.forEach((k,i) => {
            url[k] = regRes[i]
        });
        return url
    }
    get portNum(){
        return parseInt(this.port||"0")
    }
    static create(url:string):UrlData|null{
        const combineRegs = (...args:RegExp[])=>args.map(a=>a.source).join("")
        const hostPattern = /([\w\.\u0100-\uffff]+|[\[\:\d\]]+)/
        const portPattern = /(:(\d+|\w+))?/
        const mode1 = [/^(\w*?)@/,hostPattern,portPattern,/(\/(.*))?$/]
        const mode2 = [/^((\w+):\/\/)?/,hostPattern,portPattern,/(\/(.*))?$/]
        let res
        res = url.match(combineRegs(...mode1))
        if(res){
            return UrlData.fromEntries([
                "url","username","host","_","port","_","path"
            ],res)
        }
        res = url.match(combineRegs(...mode2))
        if(res){
            return UrlData.fromEntries([
                "url","_","proto","host","_","port","_","path"
            ],res)
        }
        return null
    }
    /**
     * 
     * @returns composed url
     */
    compose(){
        let ret = ""

        if(this.username){
            ret+=this.username+"@"
        }else{
            if(this.proto) ret+=this.proto+"://"
        }
        ret+=this.host
        if(this.port) ret+=":"+this.port
        if(this.path) ret+="/"+this.path
        this.url = ret
        return ret
    }
}
