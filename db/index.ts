import fs from 'fs'
import { Message } from '../types'
let messages = require('./messages.json')

export default function createLocalRepo() {
    return {
        isOpen: true,
        topicExists,
        set,
        get,
        connect: async () => Promise.resolve(),
    }
}

function topicExists(topic: string) {
    return messages.some((m: Message) => m.topic === topic)
}

function get(topic: string) {
    const message = messages.find((m: Message) => m.topic === topic)
    return message ? message.data : null
}

function set(topic: string, data: string) {
    if (topicExists(topic)) {
        const message = messages.find((m: Message) => m.topic === topic)
        message.data = data
    } else {
        messages.push({ topic, data })
    }
    saveData()
}

function saveData() {
    fs.writeFileSync('./db/messages.json', JSON.stringify(messages))
}
