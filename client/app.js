import {
    MicVAD
} from
"https://cdn.jsdelivr.net/npm/@ricky0123/vad-web/+esm"

let audioQueue = []

let isPlayingQueue =
    false
let vad = null
let isSpeaking = false
let playbackGeneration = 0
let currentAudio = null
let interruptStream = null
let state = "IDLE"
let speechEndTimeout = null
let recordingWatchdog = null
let recordingStartTime = null
let speechEndTime = null
let isProcessing = false

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
    state ===
    "PROCESSING"
) {

    return

}
            console.log(
                "ML Speech started"
            )

            if (isSpeaking) {

                console.log(
                    "ML interruption"
                )

                if (currentAudio) {

    state =
        "INTERRUPT_PENDING"

    currentAudio.pause()

    currentAudio.currentTime = 0

}

audioQueue = []
isSpeaking = false

state = "INTERRUPT_PENDING"

currentAudio = null
playbackGeneration++
            }

        },

        onSpeechEnd: () => {
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

    startRecording()

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

    mediaRecorder.ondataavailable = (event) => {

        audioChunks.push(event.data)

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
        console.log(
    "Total Delay:",
    Date.now() -
    speechEndTime,
    "ms"
)
        speak(data.reply)

    } catch (error) {

        console.log(error)

    }

    isRecording = false

    isProcessing = false

}

    console.log(
        "Recording started"
    )

    mediaRecorder.start()
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

    try {

        const sentences =
        text.match(
            /[^.!?]+[.!?]+/g
        ) || [text]

        for (
            const sentence
            of sentences
        ) {

            const response =
            await fetch(

                "http://localhost:8000/tts",

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                        "application/json"

                    },

                    body: JSON.stringify({

                        text: sentence.trim()

                    })

                }

            )

            const data =
            await response.json()

            audioQueue.push(
                data.audio_url
            )

            playQueue()

        }

    } catch (error) {

        console.log(error)

        isSpeaking = false

        startRecording()

    }

}

async function playQueue() {

    if (
        isPlayingQueue
    ) {

        return

    }

    isPlayingQueue =
    true
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

await currentAudio.play()

        } catch (error) {

            console.log(error)

        }

        await new Promise(
    (resolve) => {

        if (!currentAudio) {

            resolve()

            return

        }

        currentAudio.onended =
        () => {

            resolve()

        }

    }
)
        

    }

    isPlayingQueue =
    false

    isSpeaking =
    false

    state =
    "IDLE"

    startRecording()

}
