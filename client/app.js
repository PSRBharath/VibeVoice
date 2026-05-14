const button = document.getElementById("connect")

let ws
let recognition

let isSpeaking = false
let isProcessing = false

button.onclick = () => {

    ws = new WebSocket("ws://localhost:3000")

    ws.onopen = () => {

        console.log("Connected to server")

        startRecognition()

    }

    ws.onmessage = (event) => {

        const data = JSON.parse(event.data)

        console.log("AI:", data.reply)

        speak(data.reply)

    }

}

function startRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition

    recognition = new SpeechRecognition()

    recognition.continuous = true

    recognition.interimResults = false

    recognition.lang = "en-US"

recognition.onresult = (event) => {

    const result =
        event.results[event.results.length - 1]

    const transcript =
        result[0].transcript

   

    if (!transcript) return

    const text = transcript.trim()

    if (text.length < 3) return

    // IGNORE VERY LOW CONFIDENCE

   

}

    // IGNORE DUPLICATE REPETITIONS

    if (window.lastTranscript === text) {

        return

    }

    window.lastTranscript = text

    console.log("You:", text)

    // INTERRUPT AI IF USER SPEAKS

    if (isSpeaking) {

        console.log("User interrupted AI")

        speechSynthesis.cancel()

        isSpeaking = false

    }

    if (isProcessing) return

    isProcessing = true

    // CHECK WEBSOCKET STATE

    if (ws.readyState === WebSocket.OPEN) {

        ws.send(
            JSON.stringify({
                text
            })
        )

    } else {

        console.log("WebSocket disconnected")

        isProcessing = false

    }

}

    recognition.onerror = (event) => {

        console.log("Speech recognition error:", event.error)

    }

    recognition.onend = () => {

        if (!isSpeaking) {

            recognition.start()

        }

    }

    recognition.start()

}

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

        isProcessing = false

    }

    speechSynthesis.speak(utterance)

}