import { Logger } from 'ts-log'
import * as chalk from 'chalk'

const ck = new chalk.Instance()
const log = (colour:chalk.Chalk)=>(...args:any[]) => {
    console.log(colour(...args))
}

export const logger:Logger = {
    debug: log(ck.gray),
    trace: log(ck.white),
    info: log(ck.green),
    warn: log(ck.yellow),
    error: log(ck.red),
}
