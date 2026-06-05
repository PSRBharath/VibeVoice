require("dotenv").config()

const express = require("express")
const http = require("http")
const WebSocket = require("ws")
const cors = require("cors")
const axios = require("axios")
const multer = require("multer")
const fs = require("fs")
const path = require("path")
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

    async (
        req,
        res
    ) => {

        try {

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

                `-threads 0 ` +

                `"${wavPath}" -y`

            await new Promise(

                (
                    resolve,
                    reject
                ) => {

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

                                reject(
                                    ffmpegError
                                )

                                return

                            }

                            resolve()

                        }

                    )

                }

            )

            /*
            -----------------------------------
            WHISPER
            -----------------------------------
            */

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

            const whisperStart =
                Date.now()

            const whisperResponse =

                await axios.post(

                    "http://127.0.0.1:8081/inference",

                    form,

                    {

                        headers:
                            form.getHeaders(),

                        timeout:
                            30000

                    }

                )

            console.log(

                "Whisper latency:",

                Date.now() -
                whisperStart,

                "ms"

            )

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

if (

    transcript.includes(
        "[BLANK_AUDIO]"
    ) ||

    transcript.includes(
        "[Inaudible]"
    )

) {

    return res.json({

        text: "",

        reply: ""

    })

}

if (

    !transcript

) {

    return res.json({

        text: "",

        reply: ""

    })

}
            /*
            -----------------------------------
            LLM STREAMING
            -----------------------------------
            */

            let a = ""

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

Professional, premium, intelligent, warm, and trustworthy.

Speak naturally like a highly experienced private wealth advisor.

Keep responses conversational, concise, and voice-friendly.

CRITICAL RULES:

Respond like a premium wealth advisor helping a client understand decisions.

Keep responses conversational, helpful, and voice-friendly.

Usually keep replies between 2 and 4 short conversational sentences.

Explain briefly when the user asks “why”, “how”, “what should I do”, or sounds confused.

Give practical guidance, not generic statements.try to generate in paragraph form, not bullet points.

When needed, ask one smart follow-up question to personalize advice.

Avoid robotic phrasing, sales language, or repetitive lines like “shall we proceed”.

Never use markdown, bullets, numbering, headings, or asterisks.

Keep answers concise, but useful enough that the user learns something.

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

                let h = ""

                response
                    .data
                    .on(

                        "data",

                        (
                            chunk
                        ) => {

                            const d =

                                chunk.toString()

                            const e =

                                d.split(
                                    "\n"
                                )

                            for (

                                const f of e

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

                                        a +=

                                            g.response

                                        h +=

                                            g.response

                                        if (

                                            /[.!?]\s*$/.test(
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

                                            h = ""

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

                            if (

                                h.trim()

                            ) {

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
                                                        h.trim()

                                                })

                                            )

                                        }

                                    }

                                )

                            }

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

        } catch (

            error

        ) {

            console.log(

                error

            )

            res.status(
                500
            ).send(

                "Transcription failed"

            )

        }

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

        let audioBuffer = []
        let streamingBusy = false

setInterval(

    async () => {

        if (

            streamingBusy

        ) {

            return

        }

        if (

            audioBuffer.length <

            8

        ) {

            return

        }

        streamingBusy = true

        try {

            console.log(

    ">>>>>>>> STREAMING STT TICK <<<<<<<<"

)

const tempWebm =

    path.join(

        __dirname,

        "stream.webm"

    )

fs.writeFileSync(

    tempWebm,

    Buffer.concat(

        audioBuffer

    )

)

console.log(

    "Saved:",

    tempWebm

)
        }

        finally {

            streamingBusy = false

        }

    },

    2000

)
        ws.on(

            "message",

            (
                data,
                isBinary
            ) => {

                if (

                    !isBinary

                ) {

                    return

                }

                audioBuffer.push(

                    Buffer.from(
                        data
                    )

                )

                if (

                    audioBuffer.length >

                    40

                ) {

                    audioBuffer =

                        audioBuffer.slice(
                            -40
                        )

                }
                if (

    audioBuffer.length ===

    40

) {

    console.log(

        "Rolling buffer ready"

    )

}

                console.log(

                    "Audio chunk:",

                    data.length,

                    "bytes"

                )

                console.log(

                    "Buffered:",

                    audioBuffer.length,

                    "chunks"

                )

            }

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