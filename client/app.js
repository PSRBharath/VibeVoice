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

        if (isSpeaking) return

        if (isProcessing) return

        const transcript =
            event.results[event.results.length - 1][0].transcript

        if (!transcript) return

        const text = transcript.trim()

        if (text.length < 2) return

        console.log("You:", text)

        isProcessing = true

        ws.send(
            JSON.stringify({
                text
            })
        )

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

    recognition.stop()

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

        recognition.start()

    }

    speechSynthesis.speak(utterance)

}