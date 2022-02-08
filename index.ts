import { createServer, Server } from 'http'
import { createServer as createHttpsServer, Server as HttpsServer } from 'https'
import { Server as SocketServer } from 'socket.io'
import { createClient } from 'redis'
import { config } from 'dotenv'
config()
import fs from 'fs'
import { Message } from './types'

// Global variables
let server: Server | HttpsServer
try {
    server = createHttpsServer({
        key: fs.readFileSync('./certificates/key.pem'),
        cert: fs.readFileSync('./certificates/cert.pem'),
    })
    console.log('HTTPS server created')
} catch (error) {
    server = createServer()
    console.log('HTTP server created')
}
const url = process.env.REDIS_URL || 'redis://localhost:6379'
const redisClient = createClient({ url })

// Main Process
;(async () => {
    await connectRedis()
    setupSocketServer()
    startServer()
})()

async function connectRedis() {
    redisClient.on('error', err => console.log('Redis Client Error', err))
    await redisClient.connect()
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
            console.log(`${socket.id} subscribed to ${topic}`)

            socket.join(topic)
            console.log(`${socket.id} subscribed to ${topic}`)

            const data = await getMessage(topic)
            socket.emit('message', { topic, data })
        })

        socket.on('publish', async (message: Message) => {
            // save message to redis
            await setMessage(message)
            console.log(`${socket.id} published ${message}`)

            // send message to everyone in the room including the sender
            socket.nsp.to(message.topic).emit('message', message)
        })

        socket.on('disconnect', () => {
            console.log('disconnected')
        })
    })

    async function getMessage(topic: string) {
        if (!redisClient.isOpen) await redisClient.connect()
        return await redisClient.get(topic)
    }

    // overwrites last message on the same topic
    async function setMessage(message: Message) {
        const { topic, data } = message
        if (!redisClient.isOpen) await redisClient.connect()
        await redisClient.set(topic, data)
    }
}

function startServer() {
    const PORT = parseInt(process.env.SOCKET_PORT || '4040')
    server.listen(PORT, () => {
        console.log(`Listening on port ${PORT}`)
    })
}
