# Generates a .wav (then: ffmpeg -i success.wav -b:a 96k src/assets/sounds/success.mp3) – a bright "you did it!" chime:
# a quick rising arpeggio (C E G C) with bell-like overtones and a sparkle tail.
import math, random, struct, wave, sys

RATE = 44100
out = sys.argv[1] if len(sys.argv) > 1 else 'success.wav'
length = 1.6
buf = [0.0] * int(RATE * length)

def bell(freq, start, dur, vol):
    s0 = int(start * RATE)
    for i in range(int(dur * RATE)):
        t = i / RATE
        env = min(1, t / 0.006) * math.exp(-t * 4.2)
        v = (math.sin(2 * math.pi * freq * t)
             + 0.45 * math.sin(2 * math.pi * freq * 2 * t) * math.exp(-t * 6)
             + 0.2 * math.sin(2 * math.pi * freq * 3.01 * t) * math.exp(-t * 9))
        if s0 + i < len(buf):
            buf[s0 + i] += vol * env * v

for k, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
    bell(f, k * 0.09, 1.2, 0.22)
bell(1318.5, 0.36, 1.1, 0.12)          # top note
random.seed(7)
for k in range(10):                     # sparkles
    bell(random.choice([2093, 2349, 2637, 3136]), 0.42 + k * 0.07, 0.35, 0.05)

peak = max(abs(x) for x in buf)
with wave.open(out, 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
    fade = int(0.05 * RATE)
    frames = bytearray()
    for i, x in enumerate(buf):
        g = min(1, (len(buf) - i) / fade)
        frames += struct.pack('<h', int(x / peak * 0.85 * g * 32767))
    w.writeframes(bytes(frames))
