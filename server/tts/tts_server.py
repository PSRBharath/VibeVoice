from fastapi import FastAPI
from pydantic import BaseModel
from kokoro import KPipeline
import soundfile as sf
import numpy as np
import uuid
import re
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

    StaticFiles(
        directory="server/audio"
    ),

    name="audio"

)

pipeline = KPipeline(

    lang_code='a'

)

class TTSRequest(BaseModel):

    text: str


def clean_text(a):

    if not a:

        return ""

    a = (

        a

        # markdown cleanup
        .replace("*", "")
        .replace("#", "")

        # numbering cleanup
        .replace("1.", "")
        .replace("2.", "")
        .replace("3.", "")
        .replace("4.", "")

        # advisor pronunciation
        .replace("U.S.", "US")
        .replace("U.K.", "UK")
        .replace("XIRR.AI", "XIRR AI")
        .replace("AI", "A I")

        # advisor pacing
        .replace(" but ", ", but ")
        .replace(" however ", ". However, ")
        .replace(" therefore ", ". Therefore, ")
        .replace(" because ", ", because ")

    )

    # collapse spaces
    a = re.sub(

        r"\s+",

        " ",

        a

    ).strip()

    return a


@app.post("/tts")
async def generate_tts(

    request: TTSRequest

):

    text = clean_text(

        request.text

    )

    generator = pipeline(

        text,

        voice='af_bella'

    )

    all_audio = []

    for gs, ps, audio in generator:

        all_audio.append(

            audio

        )

    final_audio = np.concatenate(

        all_audio

    )

    filename = (

        f"{uuid.uuid4()}.wav"

    )

    path = (

        f"server/audio/{filename}"

    )

    sf.write(

        path,

        final_audio,

        24000

    )

    return {

        "audio_url":

        f"http://localhost:8000/audio/{filename}"

    }