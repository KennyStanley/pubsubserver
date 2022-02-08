import { createServer, Server } from 'http'
import { createServer as createHttpsServer, Server as HttpsServer } from 'https'
import { Server as SocketServer } from 'socket.io'
import { createClient } from 'redis'
import { config } from './config'
import { Message } from './types'
import createLocalRepo from './db'

// Global variables
let server: Server | HttpsServer
if (config.https.cert != null && config.https.key != null) {
    server = createHttpsServer({
        key: config.https.key,
        cert: config.https.cert,
    })
    console.log('HTTPS server created')
} else {
    server = createServer()
    console.log('HTTP server created')
}
let db: any
if (config.useRedis) {
    db = createClient({ url: config.redisUrl })
} else {
    db = createLocalRepo()
}

// Main Process
;(async () => {
    if (config.useRedis) await connectRedis()
    setupSocketServer()
    startServer()
})()

async function connectRedis() {
    db.on('error', (err: any) => console.log('Redis Client Error', err))
    await db.connect()
}

function setupSocketServer() {
    const io = new SocketServer(server, {
        cors: {
            origin: '*',
        },
    })

    io.on('connection', socket => {
        console.log(`${socket.id} connected`)

        socket.on('subscribe', async (topic: string) => {
            socket.join(topic)
            console.log(`${socket.id} subscribed to ${topic}`)

            const data = await getMessage(topic)
            socket.emit('message', { topic, data })
        })

        socket.on('publish', async (message: Message) => {
            const { topic, data, persistent } = message
            if (persistent) {
                await setMessage(message)
            }
            console.log(`${socket.id} published '${data}' to topic '${topic}'`)

            // send message to everyone in the room including the sender
            socket.nsp.to(topic).emit('message', { topic, data })
        })

        socket.on('disconnect', () => {
            console.log('disconnected')
        })
    })

    async function getMessage(topic: string) {
        if (!db.isOpen) await db.connect()
        return await db.get(topic)
    }

    // overwrites last message on the same topic
    async function setMessage(message: Message) {
        const { topic, data } = message
        if (!db.isOpen) await db.connect()
        await db.set(topic, data)
    }
}

function startServer() {
    server.listen(config.port, () => {
        console.log(`Listening on port ${config.port}`)
    })
}
