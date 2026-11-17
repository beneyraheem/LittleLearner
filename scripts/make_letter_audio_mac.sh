#!/bin/bash
# Generates English and Arabic letter clips with macOS's built-in voices.
# Run on a Mac from the project folder:   bash scripts/make_letter_audio_mac.sh
# Choose other voices:  EN_VOICE="Karen" AR_VOICE="Majed" bash scripts/make_letter_audio_mac.sh
# See installed voices: say -v '?'   (add more in System Settings → Accessibility →
# Spoken Content → System voice → Manage Voices; "Enhanced"/"Premium" versions sound best)
set -euo pipefail
cd "$(dirname "$0")/.."

EN_VOICE="${EN_VOICE:-Samantha}"
AR_VOICE="${AR_VOICE:-}"
if [ -z "$AR_VOICE" ]; then
  # Prefer a female Arabic voice if one is installed.
  for v in Laila Mariam Amira Hala Majed Maged; do
    if say -v '?' | grep -q "^$v "; then AR_VOICE="$v"; break; fi
  done
fi
for v in "$EN_VOICE" "$AR_VOICE"; do
  if [ -z "$v" ] || ! say -v '?' | grep -q "^$v "; then
    echo "Voice '$v' is not installed. Installed voices:"; say -v '?' | grep -E "en_|ar_"; exit 1
  fi
done
echo "English voice: $EN_VOICE   Arabic voice: $AR_VOICE"

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
make() { # make <voice> <rate> <out file> <text>
  say -v "$1" -r "$2" -o "$tmp/clip.aiff" "$4"
  afconvert -f m4af -d aac -b 96000 "$tmp/clip.aiff" "$3"
  echo "  $3"
}

mkdir -p src/assets/audio/en src/assets/audio/ar
while IFS='|' read -r id word; do
  L=$(echo "$id" | tr a-z A-Z)
  make "$EN_VOICE" 150 "src/assets/audio/en/$id.m4a" "$L. [[slnc 250]] $L is for $word."
done <<'LIST'
a|Apple
b|Ball
c|Cat
d|Dog
e|Elephant
f|Fish
g|Grapes
h|Hat
i|Ice cream
j|Juice
k|Kite
l|Lion
m|Moon
n|Nest
o|Orange
p|Pig
q|Queen
r|Rabbit
s|Sun
t|Tiger
u|Umbrella
v|Violin
w|Whale
x|Xylophone
y|Yo-yo
z|Zebra
LIST

while IFS='|' read -r id name word; do
  make "$AR_VOICE" 130 "src/assets/audio/ar/$id.m4a" "$name. [[slnc 300]] $word"
done <<'LIST'
1-alif|ألف|أرنب
2-baa|باء|بطة
3-taa|تاء|تفاحة
4-thaa|ثاء|ثعلب
5-jeem|جيم|جمل
6-haa|حاء|حصان
7-khaa|خاء|خروف
8-daal|دال|دب
9-dhaal|ذال|ذرة
10-raa|راء|ريشة
11-zaay|زاي|زرافة
12-seen|سين|سمكة
13-sheen|شين|شمس
14-saad|صاد|صقر
15-daad|ضاد|ضفدع
16-taa|طاء|طائرة
17-dhaa|ظاء|ظرف
18-ayn|عين|عين
19-ghayn|غين|غيمة
20-faa|فاء|فيل
21-qaaf|قاف|قمر
22-kaaf|كاف|كلب
23-laam|لام|ليمون
24-meem|ميم|موز
25-noon|نون|نحلة
26-haa|هاء|هدية
27-waaw|واو|وردة
28-yaa|ياء|يد
LIST
echo "Done – rebuild or redeploy the app to use the new clips."
