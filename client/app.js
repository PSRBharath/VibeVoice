const button = document.getElementById("connect")

let ws
let mediaRecorder

button.onclick = async () => {

    ws = new WebSocket("ws://localhost:3000")

    ws.onopen = async () => {

        console.log("Connected to server")

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
        })

        mediaRecorder = new MediaRecorder(stream)

        mediaRecorder.start(250)

        mediaRecorder.ondataavailable = async (event) => {

            if (event.data.size > 0) {

                const arrayBuffer = await event.data.arrayBuffer()

                ws.send(arrayBuffer)

                console.log("Audio chunk sent")

            }

        }

    }

    ws.onmessage = (event) => {

        console.log("Server:", event.data)

    }

}