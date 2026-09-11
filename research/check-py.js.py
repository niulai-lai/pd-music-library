import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
s = io.open(r'E:\zcode\pd-music-library\assets\js\pinyin.js', encoding='utf-8').read()
print('total length:', len(s))
print(s[:360])
print('...tail...')
print(s[-300:])
print('const PY_ count:', s.count('const PY_'))
