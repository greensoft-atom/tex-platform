#!/usr/bin/env python3
"""Check that every blockquote excerpt in the notes occurs verbatim in the note's raw files.

Usage (from the repository root):
    python3 references/tools/verify_excerpts.py [note.md ...]

Whitespace, PDF page footers such as "— 6 —" and form feeds are ignored when comparing,
because PDF text extraction inserts them. A blockquote line that is only ">" separates
fragments that are checked separately (used for two-column PDF pages). "……" inside a
quote marks an omission; each side is checked separately.
"""
import glob, html, os, re, subprocess, sys

import yaml  # PyYAML

REF = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def norm(s):
    s = html.unescape(s)
    s = re.sub(r'[—－-]\s*\d{1,3}\s*[—－-]', '', s)
    s = s.replace('\f', '')
    return re.sub(r'\s+', '', s).replace('　', '').replace('\xa0', '')


_cache = {}


def raw_text(rel):
    if rel in _cache:
        return _cache[rel]
    path = os.path.join(REF, rel)
    text = None
    if os.path.exists(path):
        if path.endswith('.pdf'):
            text = subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True, text=True).stdout
        elif path.endswith(('.html', '.htm')):
            src = open(path, encoding='utf-8', errors='ignore').read()
            stripped = re.sub(r'(?is)<(script|style)[^>]*>.*?</\1>', ' ', src)
            text = re.sub(r'<[^>]+>', ' ', stripped) + '\n' + src
        elif path.endswith(('.txt', '.md')):
            text = open(path, encoding='utf-8', errors='ignore').read()
    _cache[rel] = norm(text) if text else None
    return _cache[rel]


def main(files):
    total = bad = 0
    for f in files:
        s = open(f, encoding='utf-8').read()
        m = re.match(r'^---\n(.*?)\n---\n', s, re.S)
        fm = yaml.safe_load(m.group(1)) if m else {}
        rv = str(fm.get('raw', '') or '')
        raws = [] if rv.strip().lower().startswith('none') else [x.strip() for x in rv.split(';') if x.strip()]
        for r in raws:
            if not os.path.exists(os.path.join(REF, r)):
                print('MISSING RAW', os.path.relpath(f, REF), r)
        texts = [t for t in (raw_text(r) for r in raws) if t]
        ex = re.search(r'^## Excerpts\n(.*?)(?=^## |\Z)', s, re.S | re.M)
        quotes, cur = [], []
        for line in (ex.group(1) if ex else '').split('\n'):
            q = re.match(r'^\s*>\s?(.*)$', line)
            if q and q.group(1).strip():
                cur.append(q.group(1))
            elif cur:
                quotes.append(' '.join(cur))
                cur = []
        if cur:
            quotes.append(' '.join(cur))
        for q in quotes:
            total += 1
            parts = [norm(p) for p in re.split(r'……|\[…\]', q) if norm(p)]
            if not parts or not all(any(p in t for t in texts) for p in parts):
                bad += 1
                print('NOT FOUND', os.path.relpath(f, REF), '::', q[:100])
    print('checked %d excerpts; %d not found' % (total, bad))
    return 1 if bad else 0


if __name__ == '__main__':
    args = sys.argv[1:] or sorted(glob.glob(os.path.join(REF, '*', '*.md')))
    sys.exit(main([a for a in args if '/raw/' not in a and '/tools/' not in a]))
