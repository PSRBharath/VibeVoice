const button = document.getElementById("connect")

let ws

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

    const recognition = new SpeechRecognition()

    recognition.continuous = true

    recognition.interimResults = false

    recognition.lang = "en-US"

    recognition.onresult = (event) => {

        const transcript =
            event.results[event.results.length - 1][0].transcript

        console.log("You:", transcript)

        ws.send(
            JSON.stringify({
                text: transcript
            })
        )

    }

    recognition.start()

}

function speak(text) {

    speechSynthesis.cancel()

    const utterance =
        new SpeechSynthesisUtterance(text)

    utterance.rate = 1

    utterance.pitch = 1

    utterance.volume = 1

    speechSynthesis.speak(utterance)

}