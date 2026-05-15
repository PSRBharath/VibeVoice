require("dotenv").config()

const express = require("express")
const http = require("http")
const WebSocket = require("ws")
const cors = require("cors")
const axios = require("axios")
const multer = require("multer")
const fs = require("fs")
const path = require("path")
const { exec } = require("child_process")

const app = express()

app.use(cors())

const server = http.createServer(app)

const wss = new WebSocket.Server({ server })
let conversationHistory = []

const upload = multer({
    dest: "uploads/"
})

app.use(express.static("client"))

/*
-----------------------------------
WHISPER TRANSCRIPTION ENDPOINT
-----------------------------------
*/

app.post(
    "/transcribe",
    upload.single("audio"),
    (req, res) => {

        const inputPath = req.file.path + ".webm"

fs.renameSync(
    req.file.path,
    inputPath
)
const wavPath =
    req.file.path + ".wav"

        const outputBase =
    path.join(
        "uploads",
        path.parse(inputPath).name
    )

const ffmpegCommand =
    `"D:/ffmpeg-master-latest-win64-gpl-shared/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe" ` +
    `-i "${inputPath}" ` +
    `-ar 16000 ` +
    `-ac 1 ` +
    `"${wavPath}" -y`

exec(ffmpegCommand, (ffmpegError) => {

    if (ffmpegError) {

        console.log(
            "FFmpeg Error:",
            ffmpegError
        )

        return res
            .status(500)
            .send(
                "FFmpeg conversion failed"
            )

    }

    const whisperCommand =
        `C:/Users/sriramabharath/Desktop/internship@Xerago/whisper.cpp/build/bin/Release/whisper-cli.exe ` +
        `-m C:/Users/sriramabharath/Desktop/internship@Xerago/whisper.cpp/models/ggml-base.en.bin ` +
        `-f "${wavPath}" ` +
        `-otxt ` +
        `-of "${outputBase}"`

    exec(
        whisperCommand,
        (error, stdout, stderr) => {

            if (error) {

                console.log("Whisper Error:", error)

                return res
                    .status(500)
                    .send("Whisper failed")

            }

            const txtFile =
    outputBase + ".txt"

            fs.readFile(
                txtFile,
                "utf8",
                async (err, transcript) => {

                    if (err) {

                        console.log(err)

                        return res
                            .status(500)
                            .send("Transcript read failed")

                    }

                    transcript =
                        transcript.trim()

                    console.log(
                        "User:",
                        transcript
                    )

                    try {

                        const response =
                            await axios.post(
                                "https://openrouter.ai/api/v1/chat/completions",
                                {
                                    model:
                                        "openai/gpt-oss-120b:free",

                                    messages: [
    {
        role: "system",

        content:
            "You are a realtime conversational voice assistant. Keep responses short and natural."
    },

    ...conversationHistory,

    {
        role: "user",

        content:
            transcript
    }
]
                                },
                                {
                                    headers: {
                                        Authorization:
                                            `Bearer ${process.env.OPENROUTER_API_KEY}`,

                                        "Content-Type":
                                            "application/json"
                                    }
                                }
                            )

                        const reply =
                            response
                                .data
                                .choices[0]
                                .message
                                .content

                        console.log(
                            "AI:",
                            reply
                        )
                        conversationHistory.push({
    role: "user",
    content: transcript
})

conversationHistory.push({
    role: "assistant",
    content: reply
})

if (
    conversationHistory.length > 20
) {

    conversationHistory =
        conversationHistory.slice(-20)

}

                        res.json({
                            text: transcript,
                            reply
                        })

                    } catch (apiError) {

                        console.log(
                            apiError.response?.data ||
                            apiError.message
                        )

                        res.status(500).send(
                            "LLM failed"
                        )

                    }

                }
            )

        })

    }
)

/*
-----------------------------------
WEBSOCKET CONNECTION
-----------------------------------
*/

wss.on("connection", (ws) => {

    console.log("Client connected")

    ws.on("close", () => {

        console.log("Client disconnected")

                    }
            )

        }
    )

})

/*
-----------------------------------
START SERVER
-----------------------------------
*/

server.listen(3000, () => {

    console.log(
        "Server running on port 3000"
    )

})