import fs from 'fs'
import { config as dotenvConfig } from 'dotenv'
dotenvConfig()
import { Config } from './types'

let https: { key: Buffer | undefined; cert: Buffer | undefined } = {
    key: undefined,
    cert: undefined,
}
try {
    https.key = fs.readFileSync('./certificates/key.pem')
    https.cert = fs.readFileSync('./certificates/cert.pem')
} catch (error) {
    // console.log(error)
}

export const config: Config = {
    port: parseInt(process.env.PORT || '8080'),
    useRedis: false,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    https,
}
