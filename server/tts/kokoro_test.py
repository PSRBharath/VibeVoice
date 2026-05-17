from kokoro import KPipeline
import soundfile as sf

p = KPipeline(lang_code='a')

text = """
Hey there! I’m really excited to finally test this local neural voice system. 
Some sentences are short. Others are intentionally much longer so we can evaluate pacing, pronunciation, breathing rhythm, and overall conversational smoothness during realtime playback. 
Honestly, this already feels far more natural than the browser’s built-in speech synthesis. 
Wait... did you hear that? 
That tiny pause actually sounded surprisingly human. 
Now let’s test technical wording: artificial intelligence, quantum mechanics, reinforcement learning, superconducting qubits, and Indian Railways Finance Corporation. 
I also want to see how emotional tone works — for example: “I’m genuinely proud of the progress we made tonight.” 
Finally, let’s finish with something energetic and expressive: this is the beginning of a real realtime conversational AI assistant!
"""

generator = p(
    text,
    voice='af_heart'
)

for i, (gs, ps, audio) in enumerate(generator):

    sf.write(
        f'output_{i}.wav',
        audio,
        24000
    )

print("done")