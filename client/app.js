const button =
    document.getElementById("connect")

let mediaRecorder

let audioChunks = []

let isRecording = false

button.onclick = async () => {

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

    setTimeout(() => {

        mediaRecorder.stop()

    }, 5000)

}

/*
-----------------------------------
TTS
-----------------------------------
*/

function speak(text) {

    speechSynthesis.cancel()

    const utterance =
        new SpeechSynthesisUtterance(text)

    utterance.rate = 1

    utterance.pitch = 1

    utterance.volume = 1

    utterance.lang = "en-US"

    speechSynthesis.speak(
        utterance
    )

}