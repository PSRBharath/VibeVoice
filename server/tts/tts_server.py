from fastapi import FastAPI
from pydantic import BaseModel
from kokoro import KPipeline
import soundfile as sf
import numpy as np
import uuid
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(

    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]

)

app.mount(
    "/audio",
    StaticFiles(directory="server/audio"),
    name="audio"
)

pipeline = KPipeline(
    lang_code='a'
)

class TTSRequest(BaseModel):

    text: str

@app.post("/tts")
async def generate_tts(
    request: TTSRequest
):

    generator = pipeline(

        request.text,

        voice='af_heart'

    )

    all_audio = []

    for gs, ps, audio in generator:

        all_audio.append(audio)

    final_audio = np.concatenate(
        all_audio
    )

    filename = f"{uuid.uuid4()}.wav"

    path = f"server/audio/{filename}"

    sf.write(
        path,
        final_audio,
        24000
    )

    return {

        "audio_url":
        f"http://localhost:8000/audio/{filename}"

    }