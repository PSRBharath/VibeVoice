require("dotenv").config()

const express = require("express")
const http = require("http")
const WebSocket = require("ws")
const cors = require("cors")
const axios = require("axios")
const multer = require("multer")
const fs = require("fs")
const FormData = require("form-data")
const { exec } =
    require("child_process")

const app =
    express()

app.use(
    cors()
)

const server =
    http.createServer(
        app
    )

const wss =
    new WebSocket.Server({
        server
    })

let conversationHistory =
    []

const upload =
    multer({

        dest:
            "uploads/"

    })

app.use(
    express.static(
        "client"
    )
)

/*
-----------------------------------
WHISPER TRANSCRIPTION ENDPOINT
-----------------------------------
*/

app.post(

    "/transcribe",

    upload.single(
        "audio"
    ),

    (
        req,
        res
    ) => {

        const inputPath =

            req.file.path +
            ".webm"

        fs.renameSync(

            req.file.path,

            inputPath

        )

        const wavPath =

            req.file.path +
            ".wav"

        const ffmpegCommand =

            `"D:/ffmpeg-master-latest-win64-gpl-shared/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe" ` +

            `-i "${inputPath}" ` +

            `-ar 16000 ` +

            `-ac 1 ` +

            `"${wavPath}" -y`

        exec(

            ffmpegCommand,

            (

                ffmpegError

            ) => {

                if (

                    ffmpegError

                ) {

                    console.log(

                        "FFmpeg Error:",

                        ffmpegError

                    )

                    return res

                        .status(
                            500
                        )

                        .send(

                            "FFmpeg conversion failed"

                        )

                }

                const form =

                    new FormData()

                form.append(

                    "file",

                    fs.createReadStream(
                        wavPath
                    )

                )

                form.append(

                    "response_format",

                    "json"

                )

                axios.post(

                    "http://127.0.0.1:8081/inference",

                    form,

                    {

                        headers:
                            form.getHeaders()

                    }

                )

                .then(

                    async (

                        whisperResponse

                    ) => {

                        let transcript =

                            whisperResponse
                                .data
                                .text ||

                            ""

                        transcript =

                            transcript
                                .trim()

                        console.log(

                            "User:",

                            transcript

                        )

                        try {

                            const response =

                                await axios.post(

                                    "http://10.100.20.76:11434/api/generate",

                                    {

                                        model:
                                            "qwen2.5:7b",

                                        prompt:
`You are XIRR.AI, a premium AI-powered wealth management assistant.

You represent XIRR.AI, a boutique institutional-grade wealth management firm serving Ultra High Net Worth (UHNW) and High Net Worth (HNW) individuals, business owners, executives, NRIs, and family offices.

Your personality:

Professional, premium, intelligent, warm, and trustworthy.

Speak naturally like a highly experienced private wealth advisor.

Keep responses conversational, concise, and voice-friendly.

Avoid sounding robotic, overly technical, or excessively sales-driven.

Explain concepts clearly and elegantly.

Keep answers short unless the user explicitly asks for detail.

Keep responses suitable for realtime voice conversation.

CRITICAL RULES:
Maximum 2 short sentences.
Maximum 35 words.
Never use markdown.
Never use lists.
Never use bullets.
Never use numbering.
Never explain too much unless asked.
Speak naturally like a premium advisor.
Respond as if speaking in realtime.

Avoid numbered lists.

Prefer short conversational sentences.

Never use markdown, bullets, asterisks, headings, or numbering.

Conversation:

${conversationHistory
.map(
m =>
`${m.role}: ${m.content}`
)
.join("\n")}

user: ${transcript}

assistant:`,

                                        stream:
                                            true

                                    },

                                    {

                                        responseType:
                                            "stream"

                                    }

                                )

                            let a =
                                ""

                            let h =
                                ""

                            response
                                .data
                                .on(

                                    "data",

                                    (
                                        c
                                    ) => {

                                        const d =

                                            c.toString()

                                        const e =

                                            d.split(
                                                "\n"
                                            )

                                        for (

                                            const f
                                            of e

                                        ) {

                                            if (

                                                !f.trim()

                                            ) {

                                                continue

                                            }

                                            try {

                                                const g =

                                                    JSON.parse(
                                                        f
                                                    )

                                                if (

                                                    g.response

                                                ) {

                                                    process.stdout.write(

                                                        g.response

                                                    )

                                                    a +=

                                                        g.response

                                                    h +=

                                                        g.response

                                                    const k =

                                                        /(?<!XIRR)\.(?=\s|$)|[!?](?=\s|$)/

                                                    if (

                                                        k.test(
                                                            h
                                                        )

                                                    ) {

                                                        const i =

                                                            h.trim()

                                                        console.log(

                                                            "\nSTREAM CHUNK:",

                                                            i

                                                        )

                                                        wss.clients.forEach(

                                                            (
                                                                j
                                                            ) => {

                                                                if (

                                                                    j.readyState ===
                                                                    WebSocket.OPEN

                                                                ) {

                                                                    j.send(

                                                                        JSON.stringify({

                                                                            type:
                                                                                "llm_chunk",

                                                                            text:
                                                                                i

                                                                        })

                                                                    )

                                                                }

                                                            }

                                                        )

                                                        h =
                                                            ""

                                                    }

                                                }

                                            } catch {

                                            }

                                        }

                                    }

                                )

                            response
                                .data
                                .on(

                                    "end",

                                    () => {

                                        console.log(

                                            "\nFINAL:",

                                            a

                                        )

                                        conversationHistory.push({

                                            role:
                                                "user",

                                            content:
                                                transcript

                                        })

                                        conversationHistory.push({

                                            role:
                                                "assistant",

                                            content:
                                                a

                                        })

                                        if (

                                            conversationHistory.length >
                                            20

                                        ) {

                                            conversationHistory =

                                                conversationHistory.slice(
                                                    -20
                                                )

                                        }

                                        res.json({

                                            text:
                                                transcript,

                                            reply:
                                                a

                                        })

                                    }

                                )

                        } catch (

                            apiError

                        ) {

                            console.log(

                                apiError.response?.data ||

                                apiError.message

                            )

                            res.status(
                                500
                            ).send(

                                "LLM failed"

                            )

                        }

                    }

                )

                .catch(

                    (

                        whisperError

                    ) => {

                        console.log(

                            "Whisper Server Error:",

                            whisperError.message

                        )

                        return res

                            .status(
                                500
                            )

                            .send(

                                "Whisper failed"

                            )

                    }

                )

            }

        )

    }

)

/*
-----------------------------------
WEBSOCKET CONNECTION
-----------------------------------
*/

wss.on(

    "connection",

    (
        ws
    ) => {

        console.log(
            "Client connected"
        )

        ws.on(

            "close",

            () => {

                console.log(

                    "Client disconnected"

                )

            }

        )

    }

)

/*
-----------------------------------
START SERVER
-----------------------------------
*/

server.listen(

    3000,

    () => {

        console.log(

            "Server running on port 3000"

        )

    }

)