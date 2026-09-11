# -*- coding: utf-8 -*-
"""Research pass 11: exact durations via HTTP range probes (FLAC/WAV/MP3)."""
import json, sys, io, struct, subprocess, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
UA = 'PDMusicLibrary/1.0 (duration probe; one-off)'

def fetch_range(url, start, end):
    r = subprocess.run(['curl', '-s', '-L', '-m', '40', '-A', UA, '--retry', '2',
                        '-r', f'{start}-{end}', url], capture_output=True)
    return r.stdout

def flac_duration(url, size):
    head = fetch_range(url, 0, 65535)
    if head[:4] != b'fLaC':
        return None
    pos = 4
    total_samples = None
    sample_rate = None
    for _ in range(8):
        if pos + 4 > len(head): break
        hdr = head[pos]; pos += 1
        btype = hdr & 0x7f
        last = hdr & 0x80
        blen = int.from_bytes(head[pos:pos + 3], 'big'); pos += 3
        if btype == 0 and pos + blen <= len(head):
            info = head[pos:pos + blen]
            # STREAMINFO: 10 bytes block/frame sizes, then 8 bytes packed
            packed = int.from_bytes(info[10:18], 'big')
            sample_rate = (packed >> 44) & 0xFFFFF
            total_samples = (packed >> 0) & 0xFFFFFFFFF
            break
        pos += blen
        if last: break
    if total_samples and sample_rate:
        return round(total_samples / sample_rate)
    return None

def wav_duration(url, size):
    head = fetch_range(url, 0, 4096)
    if head[:4] != b'RIFF' or head[8:12] != b'WAVE':
        return None
    pos = 12
    byte_rate = None
    data_size = None
    while pos + 8 <= len(head):
        cid = head[pos:pos + 4]; csz = int.from_bytes(head[pos + 4:pos + 8], 'little'); pos += 8
        if cid == b'fmt ':
            byte_rate = int.from_bytes(head[pos + 8:pos + 12], 'little')
        if cid == b'data':
            data_size = csz if csz > 0 else (size - pos)
            break
        pos += csz + (csz % 2)
    if byte_rate and data_size:
        return round(data_size / byte_rate)
    return None

MP3_BR = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, None]
MP3_SR = [44100, 48000, 32000, None]

def mp3_duration(url, size):
    head = fetch_range(url, 0, 65535)
    # skip ID3v2
    pos = 0
    if head[:3] == b'ID3' and len(head) > 10:
        sz = (head[6] << 21) | (head[7] << 14) | (head[8] << 7) | head[9]
        pos = 10 + sz
    # find first frame sync
    while pos < len(head) - 4:
        if head[pos] == 0xFF and (head[pos + 1] & 0xE0) == 0xE0:
            break
        pos += 1
    if pos >= len(head) - 4:
        return None
    b1, b2 = head[pos + 1], head[pos + 2]
    version = (b1 >> 3) & 0x03   # 3=MPEG1, 2=MPEG2
    layer = (b1 >> 1) & 0x03     # 1=Layer III
    br_idx = (b2 >> 4) & 0x0F
    sr_idx = (b2 >> 2) & 0x03
    if version != 3 or layer != 1 or MP3_BR[br_idx] in (None, 0) or sr_idx >= 3:
        return None
    bitrate = MP3_BR[br_idx] * 1000
    sample_rate = MP3_SR[sr_idx]
    samples_per_frame = 1152
    # Xing/Info header?
    off = pos + 4 + 32 if version == 3 else pos + 4 + 17
    if off + 12 <= len(head) and head[off:off + 4] in (b'Xing', b'Info'):
        flags = int.from_bytes(head[off + 4:off + 8], 'big')
        if flags & 0x01:
            frames = int.from_bytes(head[off + 8:off + 12], 'big')
            return round(frames * samples_per_frame / sample_rate)
    # CBR 估算
    return round(size * 8 / bitrate)

meta = json.load(open('E:/zcode/pd-music-library/research/verified.json', encoding='utf-8'))
out = {}
for m in meta:
    if not str(m.get('mime', '')).startswith('audio'):
        continue
    url, size = m['url'], m['bytes']
    try:
        if url.endswith('.flac'):
            d = flac_duration(url, size)
        elif url.endswith('.wav'):
            d = wav_duration(url, size)
        elif url.endswith('.mp3'):
            d = mp3_duration(url, size)
        else:
            d = None
    except Exception as e:
        print('ERR', m['title'][:50], e)
        d = None
    out[m['title']] = d
    print(f"{m['title'][:66]:66s} -> {d}s" if d else f"{m['title'][:66]:66s} -> ?")
    time.sleep(1.5)

json.dump(out, open('E:/zcode/pd-music-library/research/durations.json', 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print('SAVED durations.json')
