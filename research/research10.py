# -*- coding: utf-8 -*-
"""Research pass 10 (verification): exact metadata + HEAD check for every chosen file."""
import json, sys, io, subprocess, urllib.request, urllib.parse, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
OUT = 'E:/zcode/pd-music-library/research/'
UA = {'User-Agent': 'PDMusicLibrary/1.0 (static site research; contact: local)'}

def get_json(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code == 429 and i < tries - 1:
                print('  429, waiting 30s...')
                time.sleep(30)
                continue
            raise
    raise RuntimeError('unreachable')

AUDIO = [
    'File:Beethoven - Egmont Overture, Op. 84 (Musopen Symphony).flac',
    'File:Beethoven - Coriolan Overture, Op. 62 (Musopen Symphony).flac',
    'File:Beethoven - Symphony No. 3 in E flat major, Op. 55 \'Eroica\' - I. Allegro con brio (Musopen Symphony).flac',
    'File:Mozart - Le nozze di Figaro, K492 - Overture (Musopen Symphony).flac',
    'File:Mozart - Symphony No. 40 in G minor, K550 - II. Andante (Musopen Symphony).flac',
    'File:Grieg - Peer Gynt Suite No. 1, Op. 46 - I. Morning Mood (Musopen Symphony).flac',
    'File:Grieg - Peer Gynt Suite No. 1, Op. 46 - IV. In the Hall of the Mountain King (Musopen Symphony).flac',
    'File:Smetana - Má Vlast - Vltava (Musopen Symphony).flac',
    'File:Prelude Op. 28 no. 15.mp3',
    'File:Chopin - Nocturne No. 20 in C-sharp minor, B. 49 (Frank Levy).flac',
    'File:Satie Gymnopedie No 1 performed by Michael Laucke.flac',
    'File:Clair de Lune - Wright Brass - United States Air Force Band of Flight.mp3',
    'File:Canon (2004) - Strolling Strings - United States Air Force Band.mp3',
    'File:Bach - Orchestral Suite No. 3 in D major, BWV 1068 - Air (Menuhin).flac',
    'File:PDP-CH - Adolf Busch Chamber Players - Adolf Busch - Suite No. 3 in D major, BWV 1068 - Air - Bach - Hmv-db3019-2ea3895.flac',
    'File:PDP-CH - The Melachrino Orchestra - George Melachrino - Orchestral Suite No. 3 in D major, BWV 1068 - Air on the G String - Johann Sebastian Bach - Hmv-c3775-2ea12475.flac',
    'File:PDP-CH - Philadelphia Orchestra - Leopold Stokowski - Nutcracker Suite, Opus 71A - Tchaikovsky - Chinese Dance - Dance of the Flutes - Hmv-db2541-2a87003.flac',
    'File:PDP-CH - National Symphony Orchestra of London - Malcolm Sargent, conductor - Symphony No. 5 in C minor, Op. 67 - 3rd Movement - Allegro - Beethoven - Decca-k1128-ar8994.flac',
    'File:PDP-CH - Leonid Kreutzer, piano - Piano Sonata No. 11 in A major, K 331-300i - Mozart - Gramophone-95178-b27304.flac',
    'File:遊龍戲鳳 = Yu lung hsi fêng (Wandering Dragon Plays with Phoenix), Part One of Twelve, 41-41a (scy 2768-2769).mp3',
    'File:大香山 = Ta hsiang shan (Great Fragrant Mountain), Part Ten of Ten, 72-72a (scy 2829-2830).mp3',
    'File:Shanghainese popular song, possibly Part Three of Five, 127-127a (scy 2921-2922).mp3',
    'File:Chinese flute Hulusi.wav',
]
IMAGES = [
    'File:义勇军进行曲手稿.jpg',
    'File:March of the Volunteers (Pathe Records - 1935).jpg',
    'File:Jasmine barrow.svg',
    'File:Molihua1877.jpg',
    'File:Lyrics of the song Mo Li Hua 1832 01.jpg',
    'File:Lyrics of the song Mo Li Hua 1832 02.jpg',
    'File:Sheet music and Gongche notation of Gong Jinou.jpg',
    'File:Bach1sa2.PNG',
]

def fetch_meta(titles):
    out = []
    for i in range(0, len(titles), 5):
        batch = titles[i:i + 5]
        url = ('https://commons.wikimedia.org/w/api.php?action=query&format=json'
               '&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiextmetadatafilter=LicenseShortName|UsageTerms|Artist|Credit|ImageDescription|DateTimeOriginal|LicenseUrl'
               '&titles=' + urllib.parse.quote('|'.join(batch)) + '&redirects=1')
        d = get_json(url)
        for p in (d.get('query') or {}).get('pages', {}).values():
            ii = (p.get('imageinfo') or [{}])[0]
            em = ii.get('extmetadata') or {}
            def gv(k):
                v = em.get(k) or {}
                return (v.get('value') or '').strip()
            out.append({
                'title': p.get('title'),
                'url': (ii.get('url') or '').split('?')[0],
                'mime': ii.get('mime'), 'bytes': ii.get('size'),
                'sizeMB': round((ii.get('size') or 0) / 1e6, 2),
                'license': gv('LicenseShortName'), 'usage': gv('UsageTerms'),
                'licenseUrl': gv('LicenseUrl'),
                'artist': gv('Artist').replace('\n', ' ')[:200],
                'date': gv('DateTimeOriginal')[:120],
                'desc': gv('ImageDescription').replace('\n', ' ')[:500],
            })
        time.sleep(2)
    return out

def head(url):
    r = subprocess.run(['curl', '-s', '-I', '-L', '-m', '30', '-A', 'Mozilla/5.0 (research)', url],
                       capture_output=True)
    out = r.stdout.decode('utf-8', errors='replace')
    status = '?'
    clen, cors, ctype = '', '', ''
    for line in out.split('\n'):
        l = line.strip().lower()
        if l.startswith('http/'): status = line.strip()
        if l.startswith('content-length:'): clen = line.split(':', 1)[1].strip()
        if l.startswith('access-control-allow-origin:'): cors = line.split(':', 1)[1].strip()
        if l.startswith('content-type:'): ctype = line.split(':', 1)[1].strip()
    return {'status': status, 'len': clen, 'cors': cors, 'type': ctype}

print('===== AUDIO META =====')
meta = fetch_meta(AUDIO)
print('===== IMAGE META =====')
meta += fetch_meta(IMAGES)

print('===== HEAD CHECKS =====')
for m in meta:
    h = head(m['url'])
    m['head'] = h
    print(json.dumps({'title': m['title'][:60], 'status': h['status'], 'cors': h['cors'],
                      'type': h['type'], 'sizeMB': m['sizeMB'], 'license': m['license'],
                      'date': m['date'][:50]}, ensure_ascii=False))
    time.sleep(0.3)

json.dump(meta, open(OUT + 'verified.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('SAVED verified.json')
