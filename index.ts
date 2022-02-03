import { Server } from 'socket.io'
import { createClient } from 'redis'
import { config } from 'dotenv'
config()
import { Message } from './types'

const url = process.env.REDIS_URL || 'redis://localhost:6379'
const redisClient = createClient({ url })

// connect to redis
;(async () => {
    redisClient.on('error', err => console.log('Redis Client Error', err))
    await redisClient.connect()
})()

const PORT = parseInt(process.env.SOCKET_PORT || '4040')
const io = new Server(PORT)

io.on('connection', socket => {
    console.log(`${socket.id} connected`)

    socket.on('subscribe', async (topic: string) => {
        console.log(`${socket.id} subscribed to ${topic}`)

        socket.join(topic)

        const messageData = await getMessage(topic)
        socket.emit('last-message', messageData)
    })

    socket.on('publish', async (message: Message) => {
        // save message to redis
        await setMessage(message)

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
    const { topic, text } = message
    if (!redisClient.isOpen) await redisClient.connect()
    await redisClient.set(topic, text)
}
