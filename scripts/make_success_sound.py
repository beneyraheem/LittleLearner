# Generates a .wav (then: ffmpeg -i success.wav -b:a 96k src/assets/sounds/success.mp3)
# A short (~0.6 s) bright "done!" chime: three quick rising bell notes and a tiny sparkle. – a bright "you did it!" chime:
# a quick rising arpeggio (C E G C) with bell-like overtones and a sparkle tail.
import math, random, struct, wave, sys

RATE = 44100
out = sys.argv[1] if len(sys.argv) > 1 else 'success.wav'
length = 0.62
buf = [0.0] * int(RATE * length)

def bell(freq, start, dur, vol):
    s0 = int(start * RATE)
    for i in range(int(dur * RATE)):
        t = i / RATE
        env = min(1, t / 0.004) * math.exp(-t * 9)
        v = (math.sin(2 * math.pi * freq * t)
             + 0.45 * math.sin(2 * math.pi * freq * 2 * t) * math.exp(-t * 6)
             + 0.2 * math.sin(2 * math.pi * freq * 3.01 * t) * math.exp(-t * 9))
        if s0 + i < len(buf):
            buf[s0 + i] += vol * env * v

for k, f in enumerate([783.99, 987.77, 1318.5]):   # G5 B5 E6
    bell(f, k * 0.06, 0.5, 0.26)
random.seed(7)
for k in range(3):                                   # tiny sparkle
    bell(random.choice([2637, 3136]), 0.2 + k * 0.05, 0.2, 0.05)

peak = max(abs(x) for x in buf)
with wave.open(out, 'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
    fade = int(0.08 * RATE)
    frames = bytearray()
    for i, x in enumerate(buf):
        g = min(1, (len(buf) - i) / fade)
        frames += struct.pack('<h', int(x / peak * 0.85 * g * 32767))
    w.writeframes(bytes(frames))
