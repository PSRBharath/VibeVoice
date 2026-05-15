let isSpeaking = false

let interruptStream = null

const button =
    document.getElementById("connect")

let mediaRecorder

let audioChunks = []

let isRecording = false

button.onclick = () => {

    startInterruptionDetection()
    startRecording()

}

async function startRecording() {
    let hasSpoken = false
    if (isRecording) return

    isRecording = true

    const stream =
        await navigator.mediaDevices.getUserMedia({
            audio: true
        })

    mediaRecorder =
        new MediaRecorder(stream)

    audioChunks = []

    mediaRecorder.ondataavailable = (event) => {

        audioChunks.push(event.data)

    }

    mediaRecorder.onstop = async () => {

        console.log("Recording stopped")

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

            console.log("Uploading audio...")

            const response =
                await fetch(
                    "http://localhost:3000/transcribe",
                    {
                        method: "POST",
                        body: formData
                    }
                )

           const data =
    await response.json()

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

    startRecording()

    return

}

console.log(
    "AI:",
    data.reply
)

speak(data.reply)

            

        } catch (error) {

            console.log(error)

        }

        isRecording = false

    }

    console.log("Recording started")

    mediaRecorder.start()

   const audioContext =
    new AudioContext()

const source =
    audioContext.createMediaStreamSource(stream)

const analyser =
    audioContext.createAnalyser()

source.connect(analyser)

const dataArray =
    new Uint8Array(
        analyser.fftSize
    )

let silenceStart =
    null

const silenceThreshold =
    5

const silenceDelay =
    2500

function checkSilence() {

    analyser.getByteTimeDomainData(
        dataArray
    )

    let sum = 0

    for (
        let i = 0;
        i < dataArray.length;
        i++
    ) {

        sum += Math.abs(
            dataArray[i] - 128
        )

    }

    const average =
        sum / dataArray.length
        console.log(average)

        if (average > 5) {

    hasSpoken = true

}
    if (average < silenceThreshold) {

        if (!silenceStart) {

            silenceStart = Date.now()

        }

        const silenceDuration =
            Date.now() - silenceStart

        if (
            silenceDuration >
            silenceDelay
        ) {

            console.log(
                "Silence detected"
            )

            if (hasSpoken) {

    mediaRecorder.stop()

} else {

    console.log(
        "No speech detected"
    )

    silenceStart = null

}

            return

        }

    } else {

        silenceStart = null

    }

    requestAnimationFrame(
        checkSilence
    )

}

checkSilence()

}

/*
-----------------------------------
TTS
-----------------------------------
*/

function speak(text) {
    isSpeaking = true
    speechSynthesis.cancel()

    const utterance =
        new SpeechSynthesisUtterance(text)

    utterance.rate = 1

    utterance.pitch = 1

    utterance.volume = 1

    utterance.lang = "en-US"

    utterance.onend = () => {

    isSpeaking = false

    startRecording()

}

    speechSynthesis.speak(
        utterance
    )

}

async function startInterruptionDetection() {

    interruptStream =
        await navigator.mediaDevices.getUserMedia({
            audio: true
        })

    const audioContext =
        new AudioContext()

    const source =
        audioContext.createMediaStreamSource(
            interruptStream
        )

    const analyser =
        audioContext.createAnalyser()

    source.connect(analyser)

    const dataArray =
        new Uint8Array(
            analyser.fftSize
        )

    function detectSpeech() {

        if (!isSpeaking) {

    requestAnimationFrame(
        detectSpeech
    )

    return

}

        analyser.getByteTimeDomainData(
            dataArray
        )

        let sum = 0

        for (
            let i = 0;
            i < dataArray.length;
            i++
        ) {

            sum += Math.abs(
                dataArray[i] - 128
            )

        }

        const average =
            sum / dataArray.length

        if (average > 5) {

            console.log(
                "User interrupted AI"
            )

            speechSynthesis.cancel()

            isSpeaking = false

            startRecording()

            return

        }

        requestAnimationFrame(
            detectSpeech
        )

    }

    detectSpeech()

}