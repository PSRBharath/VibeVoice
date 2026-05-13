require("dotenv").config()

const express = require("express")
const http = require("http")
const WebSocket = require("ws")
const cors = require("cors")
const axios = require("axios")

const app = express()

app.use(cors())

const server = http.createServer(app)

const wss = new WebSocket.Server({ server })

wss.on("connection", (ws) => {

    console.log("Client connected")

    ws.on("message", async (message) => {

        try {

            const data = JSON.parse(message)

            console.log("User:", data.text)

            const response = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: "openai/gpt-oss-120b:free",

                    messages: [
                        {
                            role: "system",
                            content:
                                "You are a realtime conversational voice assistant. Keep responses short and natural."
                        },
                        {
                            role: "user",
                            content: data.text
                        }
                    ]
                },
                {
                    headers: {
                        Authorization:
                            `Bearer ${process.env.OPENROUTER_API_KEY}`,

                        "Content-Type": "application/json"
                    }
                }
            )

            const reply =
                response.data.choices[0].message.content

            console.log("AI:", reply)

            ws.send(
                JSON.stringify({
                    reply
                })
            )

        } catch (error) {

            console.log(
                error.response?.data || error.message
            )

        }

    })

    ws.on("close", () => {

        console.log("Client disconnected")

    })

})

server.listen(3000, () => {

    console.log("Server running on port 3000")

})