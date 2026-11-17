# Convert a CFF (.otf) font to TrueType outlines and save as WOFF2.
import sys
from fontTools.ttLib import TTFont, newTable
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen

src, dst = sys.argv[1], sys.argv[2]
font = TTFont(src)
gs = font.getGlyphSet()
glyf = newTable('glyf'); glyf.glyphOrder = font.getGlyphOrder(); glyf.glyphs = {}
for name in font.getGlyphOrder():
    pen = TTGlyphPen(gs)
    gs[name].draw(Cu2QuPen(pen, max_err=1.0, reverse_direction=True))
    glyf[name] = pen.glyph()
font['glyf'] = glyf
font['loca'] = newTable('loca')
maxp = font['maxp']; maxp.tableVersion = 0x00010000
for a in ('maxZones','maxTwilightPoints','maxStorage','maxFunctionDefs','maxInstructionDefs',
          'maxStackElements','maxSizeOfInstructions','maxComponentElements'):
    setattr(maxp, a, 0)
maxp.maxZones = 1; maxp.maxComponentDepth = 0
font['post'].formatType = 2.0; font['post'].extraNames = []; font['post'].mapping = {}
font['head'].indexToLocFormat = 0
del font['CFF ']
font.sfntVersion = '\0\1\0\0'
font.flavor = 'woff2'
font.save(dst)
