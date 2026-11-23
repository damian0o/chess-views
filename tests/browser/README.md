# Browser checks

Playwright scripts that drive the served page the way a person would, on a
phone-sized viewport with the CPU throttled four times, and assert what is
on screen. They complement `node --test`, which covers the pure modules.

Run them against a local copy:

```
python3 -m http.server 8080            # in the repo root
python3 tests/browser/run.py http://localhost:8080/
```

or against the live site:

```
python3 tests/browser/run.py https://damian0o.github.io/chess-views/
```

`run.py` runs every `*_check.py` here, prints one line per check and exits
non-zero if any failed. Pass part of a name to run a subset:
`python3 tests/browser/run.py http://localhost:8080/ lessons engine`.

Requirements: Python 3.9+, `pip install playwright`, `playwright install
chromium`. The checks need no other dependencies and write no files.

`common.py` holds the shared helpers (a throttled phone session, `check`,
`finish`); newer checks use it, the older ones are self-contained.
