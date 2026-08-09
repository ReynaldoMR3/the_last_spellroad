import sys
from music21 import converter

path = sys.argv[1]
sc = converter.parse(path)
parts = sc.parts
print("num parts:", len(parts))
for p in parts:
    insts = p.getInstruments(returnDefault=False)
    inst_names = [i.instrumentName for i in insts]
    mm = p.recurse().getElementsByClass('MetronomeMark')
    ts = p.recurse().getElementsByClass('TimeSignature')
    dur = p.duration.quarterLength
    print(f"part id={p.id!r} instruments={inst_names} mm={[m.number for m in mm]} ts={[str(t) for t in ts]} quarterLength={dur}")
