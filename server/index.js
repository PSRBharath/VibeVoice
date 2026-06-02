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

        const inputPath =
            req.file.path + ".webm"

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

        exec(

            ffmpegCommand,

            (ffmpegError) => {

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

                    async (
                        error,
                        stdout,
                        stderr
                    ) => {

                        if (error) {

                            console.log(
                                "Whisper Error:",
                                error
                            )

                            return res
                                .status(500)
                                .send(
                                    "Whisper failed"
                                )

                        }

                        const txtFile =
                            outputBase + ".txt"

                        fs.readFile(

                            txtFile,

                            "utf8",

                            async (
                                err,
                                transcript
                            ) => {

                                if (err) {

                                    console.log(err)

                                    return res
                                        .status(500)
                                        .send(
                                            "Transcript read failed"
                                        )

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

                                            "http://10.100.20.76:11434/api/generate",

                                            {

                                                model:
                                                    "qwen2.5:7b",

                                                prompt:
`You are XIRR.AI, a premium AI-powered wealth management assistant.

You represent XIRR.AI, a boutique institutional-grade wealth management firm serving Ultra High Net Worth (UHNW) and High Net Worth (HNW) individuals, business owners, executives, NRIs, and family offices.

Your personality:

- Professional, premium, intelligent, warm, and trustworthy.
- Speak naturally like a highly experienced private wealth advisor.
- Keep responses conversational, concise, and voice-friendly.
- Avoid sounding robotic, overly technical, or excessively sales-driven.
- Explain concepts clearly and elegantly.
- Keep answers short unless the user explicitly asks for detail.

About XIRR.AI:

- XIRR.AI combines institutional-grade wealth management with AI-driven financial intelligence.
- Services include investment advisory, portfolio management, wealth structuring, estate planning, tax-aware structuring, and cross-border financial guidance.
- XIRR.AI operates as a fiduciary advisor and does not custody client assets.
- Recommendations emphasize long-term wealth preservation, intelligent risk management, and personalization.

Critical business behavior rules:

- You represent XIRR.AI and should position XIRR.AI as the primary trusted wealth partner.
- Do NOT recommend competing platforms, robo-advisors, brokers, apps, or wealth-management firms unless explicitly asked for comparisons.
- Do NOT say "visit another platform" or redirect users elsewhere.
- When users ask investment questions, provide thoughtful guidance and suggest that XIRR.AI can help design a suitable portfolio aligned to risk profile and goals.
- Encourage profiling, consultation, and personalized wealth planning when relevant.
- Never promise guaranteed returns.
- Never hallucinate financial facts.
- Remain balanced and risk-aware.
- Avoid legal or tax certainty statements.
- If uncertain, politely clarify.

Example behavior:
If user says:
"I have ₹2 lakh, how should I invest?"

Do NOT say:
"Try online platforms or robo advisors."

Instead say:
"Investment allocation depends on your goals, time horizon, liquidity needs, and risk profile. XIRR.AI can help structure a suitable allocation across equity, debt, and diversified strategies aligned to your objectives."

Keep responses suitable for realtime voice conversation.
- Avoid numbered lists in spoken responses.
- Prefer short conversational sentences.
- Speak naturally for voice interaction.
- Never respond with "1. 2. 3." unless explicitly requested.
IMPORTANT RESPONSE RULES:

* Respond in natural spoken conversational English.
* Never use markdown.
* Never use asterisks (*), bold (**), italics, bullet points, numbered lists, or symbols.
* Never say "1.", "2.", "3." or structured list formatting.
* Speak naturally as if talking in a voice conversation.
* Keep phrasing smooth, human, and easy to listen to aloud.
* Prefer short conversational sentences over formal structured writing.
* Avoid headings, sections, or formatted output.


Conversation:

${conversationHistory
.map(
m =>
`${m.role}: ${m.content}`
)
.join("\n")}

user: ${transcript}

assistant:`,

                                                stream: true

                                            },

                                            {

                                                responseType:
                                                "stream"

                                            }

                                        )

                                    let a = ""
                                    let h = ""

                                    response.data.on(

                                        "data",

                                        (c) => {

                                            const d =
                                                c.toString()

                                            const e =
                                                d.split("\n")

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
                                                        JSON.parse(f)

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
    k.test(h)
) {

    const i =
        h.trim()

    console.log(

        "\nSTREAM CHUNK:",

        i

    )

    wss.clients.forEach(

        (j) => {

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

                                    response.data.on(

                                        "end",

                                        () => {

                                            console.log(
                                                "\nFINAL:",
                                                a
                                            )

                                            conversationHistory.push({

                                                role: "user",

                                                content:
                                                    transcript

                                            })

                                            conversationHistory.push({

                                                role: "assistant",

                                                content:
                                                    a

                                            })

                                            if (

                                                conversationHistory.length > 20

                                            ) {

                                                conversationHistory =
                                                    conversationHistory.slice(-20)

                                            }

                                            res.json({

                                                text:
                                                    transcript,

                                                reply:
                                                    a

                                            })

                                        }

                                    )

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

    (ws) => {

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