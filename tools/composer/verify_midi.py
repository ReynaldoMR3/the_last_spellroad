import sys
import mido

path = sys.argv[1]
mid = mido.MidiFile(path)
print("type:", mid.type, "tracks:", len(mid.tracks), "ticks_per_beat:", mid.ticks_per_beat)
print("length(s):", mid.length)
for i, track in enumerate(mid.tracks):
    tempos = [m for m in track if m.type == 'set_tempo']
    note_ons = [m for m in track if m.type == 'note_on' and m.velocity > 0]
    names = [m.name for m in track if m.type == 'track_name']
    print(f"track {i}: name={names}, tempos_bpm={[round(mido.tempo2bpm(t.tempo),2) for t in tempos]}, note_on count={len(note_ons)}")
