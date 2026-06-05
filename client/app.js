import {
    MicVAD
} from
"https://cdn.jsdelivr.net/npm/@ricky0123/vad-web/+esm"

let audioQueue = []
let isIntro =
false
let isPlayingQueue =
    false
let vad = null
let isSpeaking = false
let playbackGeneration = 0
let currentAudio = null
let firstAudioPlayed =
false
let interruptStream = null
let state = "IDLE"
let speechEndTimeout = null
let interruptTimeout = null
let recordingWatchdog = null
let recordingStartTime = null
let speechEndTime = null
let isProcessing = false
let speechStartTime =
0
let ttsChain =
Promise.resolve()
let responseGeneration = 0


const x =
    new WebSocket(
        "ws://localhost:3000"
    )
    x.binaryType =
    "arraybuffer"

x.onmessage =
(a) => {

    try {

        const b =
            JSON.parse(
                a.data
            )

        if (

            b.type ===
            "llm_chunk"

        ) {

            const d =

                responseGeneration

            console.log(

                "LIVE CHUNK:",

                b.text

            )

            let c =
                b.text

            c =
            c.replaceAll(

                "XIRR.AI",

                "XIRR AI"

            )

            ttsChain =
            ttsChain.then(

                async () => {

                    if (

                        d !==
                        responseGeneration

                    ) {

                        console.log(

                            "Dropped old chunk"

                        )

                        return

                    }

                    await speak(c)

                }

            )

        }

    }

    catch (c) {

        console.log(c)

    }

}
const button =
    document.getElementById("connect")

let mediaRecorder

let audioChunks = []

let isRecording = false

async function setupVAD() {

    vad = await MicVAD.new({

        baseAssetPath:
            "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@latest/dist/",

        onnxWASMBasePath:
            "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/",

        onSpeechStart: () => {

            if (
    isIntro
) {

    return

}

                if (
    state ===
    "PROCESSING"
) {

    return

}
            console.log(
                "ML Speech started"
            )

//            if (isSpeaking) {

           

//     clearTimeout(
//         interruptTimeout
//     )

//     interruptTimeout =
//     setTimeout(() => {

//         console.log(
//             "ML interruption"
//         )

//         if (
//             currentAudio
//         ) {

//             state =
//             "INTERRUPT_PENDING"

           

// currentAudio.pause()

// currentAudio.currentTime =
// 0

//         }

//         audioQueue = []

//         isSpeaking =
//         false

//         state =
//         "INTERRUPT_PENDING"

//         currentAudio =
//         null

//         playbackGeneration++

// responseGeneration++

// ttsChain =
// Promise.resolve()

//     }, 700)

// }

        },

        onSpeechEnd: () => {
            clearTimeout(
    interruptTimeout
)
            if (
    state ===
    "PROCESSING"
) {

    return

}
            console.log(
                "ML Speech ended"
            )

            clearTimeout(
                speechEndTimeout
            )

            speechEndTimeout =
            setTimeout(() => {

                if (
                    state ===
                    "INTERRUPT_PENDING"
                ) {

                    isSpeaking = false

                    state = "IDLE"

                    startRecording()

                    return

                }

                if (

                    mediaRecorder &&
                    isRecording

                ) {
                    speechEndTime =
    Date.now()
                    mediaRecorder.stop()

                }

            }, 1200)

        }

    })

    vad.start()

}

button.onclick = async () => {

    await setupVAD()

    playIntro()     

}

async function playIntro() {

    isIntro =
true

    state =
    "SPEAKING"

    isSpeaking =
    true

    await speak(

`Hello, I’m XIRR AI, your AI-powered wealth assistant. I help simplify wealth management, investment insights, portfolio understanding, and financial planning conversations. Backed by institutional-grade expertise in global wealth strategies, I’m here to help answer your questions and guide you through financial decisions. How may I assist you today?
`

    )

}

async function startRecording() {

    if (

        state === "LISTENING" ||
        state === "PROCESSING" ||
        state === "SPEAKING"

    ) {

        return

    }

    if (isRecording) return

    recordingStartTime =
    Date.now()
    isRecording = true

    state = "LISTENING"

    const stream =
    await navigator.mediaDevices.getUserMedia({

        audio: {

            echoCancellation: true,

            noiseSuppression: true,

            autoGainControl: true

        }

    })

    mediaRecorder =
        new MediaRecorder(stream)

    audioChunks = []

    mediaRecorder.ondataavailable =
(event) => {

    audioChunks.push(
        event.data
    )

    if (

        x.readyState ===
        WebSocket.OPEN

    ) {

        event.data
            .arrayBuffer()

            .then(

                (a) => {

                    x.send(a)

                }

            )

    }

}

    mediaRecorder.onstop = async () => {

    state = "PROCESSING"
        clearTimeout(
    recordingWatchdog
)
    if (isProcessing) {

        console.log(
            "Already processing"
        )

        return

    }

    isProcessing = true

    console.log(
        "Recording stopped"
    )

    const duration =
        Date.now() -
        recordingStartTime

    console.log(
        "Duration:",
        duration
    )

    if (duration < 700) {

        console.log(
            "Recording too short"
        )

        isRecording = false

        isProcessing = false

        state = "IDLE"

        startRecording()

        return

    }

    const audioBlob =
        new Blob(audioChunks, {
            type: "audio/webm"
        })

    const formData =
        new FormData()

    formData.append(
        "audio",
        audioBlob,
        "recording.webm"
    )

    try {

        console.log(
            "Uploading audio..."
        )

            const sttStart =
    Date.now()
        firstAudioPlayed =
false

audioQueue = []
        const response =
            await fetch(
                "http://localhost:3000/transcribe",
                {
                    method: "POST",
                    body: formData
                }
            )

        if (!response.ok) {

            const errorText =
                await response.text()

            console.log(
                errorText
            )

            isRecording = false

            isProcessing = false

            startRecording()

            return

        }

        const data =
            await response.json()
         const sttEnd =
    Date.now()

console.log(
    "STT Latency:",
    sttEnd - sttStart,
    "ms"
)
        console.log(
            "Transcript:",
            data.text
        )

        const transcript =
            data.text

            if (

    transcript ===
    "[BLANK_AUDIO]"

    ||

    transcript ===
    "[ Inaudible ]"

) {

    console.log(
        "Ignoring blank audio"
    )

    isRecording =
    false

    isProcessing =
    false

    state =
    "IDLE"

    startRecording()

    return

}
        if (!transcript.trim()) {

            console.log(
                "Empty transcript"
            )

            isRecording = false

            isProcessing = false

            startRecording()

            return

        }

        console.log(
            "AI:",
            data.reply
        )
        if (
    speechEndTime
) {

    console.log(
        "Total Delay:",
        Date.now() -
        speechEndTime,
        "ms"
    )

}

        //speak(data.reply)

    } catch (error) {

        console.log(error)

    }

    isRecording = false

    isProcessing = false

}

    console.log(
        "Recording started"
    )

    mediaRecorder.start(250)
    recordingWatchdog =
setTimeout(() => {

    if (
        mediaRecorder &&
        isRecording
    ) {

        console.log(
            "Watchdog forced stop"
        )

        mediaRecorder.stop()

    }

}, 15000)

}

/*
-----------------------------------
TTS
-----------------------------------
*/
async function speak(text) {

    const myGeneration =
responseGeneration
    let playbackStarted =
        false

    const firstGenerationStart =
        Date.now()

    try {

        /*
        -----------------------------------
        CLEAN TEXT
        -----------------------------------
        */

        text =
            text

            // remove markdown
            .replace(/\*\*/g, "")

            // remove numbered bullets
            .replace(/\n?\d+\.\s*/g, " ")

            // fix abbreviations
            .replace(/U\.S\./g, "US")
            .replace(/U\.K\./g, "UK")
            .replace(/XIRR\.AI/g, "XIRR A,I")
.replace(/\bAI\b/g, "A,I")

            // collapse spaces
            .replace(/\s+/g, " ")
            .trim()

        /*
        -----------------------------------
        SMART SPLIT
        -----------------------------------
        */

        const sentences =

    (

        text.match(

            /[^.!?]+(?:[.!?]+|$)/g

        ) || [text]

    )

    .map(

        a => a.trim()

    )

    .filter(

        a => a.length > 2

    )

        console.log(
            "Sentences:",
            sentences
        )

        const a = {}

        let b = 0

        /*
        -----------------------------------
        PARALLEL GENERATION
        -----------------------------------
        */

        const q =

            sentences.map(

                async (

                    d,
                    c

                ) => {

                    const e =
                        Date.now()

                    console.log(

                        `[GEN START]`,

                        {
                            index: c,
                            at:
                                new Date()
                                    .toLocaleTimeString(),
                            ts: e,
                            text: d
                        }

                    )

                    try {

                        const f =
                            await fetch(

                                "http://localhost:8000/tts",

                                {

                                    method:
                                        "POST",

                                    headers: {

                                        "Content-Type":
                                            "application/json"

                                    },

                                    body:
                                        JSON.stringify({

                                            text:
                                                d.trim()

                                        })

                                }

                            )

                        const g =
                            await f.json()

                        const l =
                            Date.now()

                        console.log(

                            `[GEN END]`,

                            {

                                index:
                                    c,

                                latency:
                                    l - e,

                                queue:
                                    audioQueue.length

                            }

                        )

                        if (

    myGeneration !==
    responseGeneration

) {

    return

}
                        a[c] =
                            g.audio_url

                        while (

                            a[b]

                        ) {
                            if (

    myGeneration !==
    responseGeneration

) {

    return

}
                            audioQueue.push(

                                a[b]

                            )

                            delete a[b]

                            b++

                        }

                        /*
                        -----------------------------------
                        START PLAYBACK FAST
                        -----------------------------------
                        */

                        const h =
                            audioQueue.length

                        const m =
                            Date.now() -
                            firstGenerationStart

                        if (

                            !playbackStarted &&

                            (

                                h >= 1 ||
                                m > 1500

                            )

                        ) {

                            playbackStarted =
                                true

                            console.log(
                                "Playback starting"
                            )

                            playQueue()

                        }

                    } catch (

                        error

                    ) {

                        console.log(

                            "TTS error",

                            error

                        )

                    }

                }

            )

        await Promise.all(q)

    } catch (

        error

    ) {

        console.log(error)

        isSpeaking =
            false

        state =
            "IDLE"

        startRecording()

    }

}

async function playQueue() {

   if (
    isPlayingQueue
) {

    console.log(
        "playQueue blocked"
    )

    return

}

    isPlayingQueue =
true

console.log(
    "playQueue started"
)

if (

    audioQueue.length ===
    0

) {

    console.log(

        "buffering:",

        audioQueue.length

    )

    isPlayingQueue =
    false

    return

}
try {

        const generation =
        playbackGeneration

        while (
            audioQueue.length > 0
        ) {

            if (
                generation !==
                playbackGeneration
            ) {

                break

            }

            const audioUrl =
            audioQueue.shift()

            currentAudio =
            new Audio(audioUrl)

            try {

                if (
                    !currentAudio
                ) {

                    break

                }

                state =
                "SPEAKING"

                isSpeaking =
                true
                console.log(
    `[PLAY START]`,
    {
        at:
        new Date()
            .toLocaleTimeString(),
        ts:
        Date.now(),
        queue:
        audioQueue.length
    }
)
                await currentAudio.play()
                speechStartTime =
Date.now()
                if (
                    !firstAudioPlayed
                ) {

                    if (
    speechEndTime
    &&
    speechEndTime > 0
) {

    console.log(
        "TTFW:",
        Date.now() -
        speechEndTime,
        "ms"
    )

}

                    firstAudioPlayed =
                    true
                    
                }

            } catch (error) {

                if (
                    error.name !==
                    "AbortError"
                ) {

                    console.log(
                        error
                    )

                }

            }

            await new Promise(
    (resolve) => {

        if (!currentAudio) {

            resolve()

            return

        }

        currentAudio.onended =
        () => {

            console.log(
                `[PLAY END]`,
                {
                    at:
                    new Date()
                        .toLocaleTimeString(),
                    ts:
                    Date.now(),
                    queue:
                    audioQueue.length
                }
            )

            resolve()

        }

        // currentAudio.onpause =
        // () => {

        //     console.log(
        //         "[PLAY INTERRUPTED]"
        //     )

        //     resolve()

        // }

    }
)


        }

    } finally {
        console.log(
    "playQueue cleanup"
)
        isPlayingQueue =
        false

        isSpeaking =
        false

        state =
        "IDLE"

        setTimeout(() => {

    if (
        isIntro
    ) {

        isIntro =
        false

    }

    startRecording()

}, 1200)

    }
   

}
