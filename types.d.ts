export interface Config {
    port: number
    useRedis: boolean
    redisUrl: string
    https: {
        key: Buffer | undefined
        cert: Buffer | undefined
    }
}

export interface Message {
    topic: string
    data: string
    persistent: boolean
}
