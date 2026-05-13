require("dotenv").config()

const express = require("express")
const http = require("http")
const WebSocket = require("ws")
const cors = require("cors")

const app = express()

app.use(cors())

const server = http.createServer(app)

const wss = new WebSocket.Server({ server })

wss.on("connection", (ws) => {

    console.log("Client connected")

    ws.on("message", (message) => {

        console.log("Received audio chunk:", message.length)

    })

    ws.on("close", () => {

        console.log("Client disconnected")

    })

})

server.listen(3000, () => {

    console.log("Server running on port 3000")

})