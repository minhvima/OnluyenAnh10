#!/usr/bin/env python3
"""Collect every English word form shown to students (questions + lessons) for the glossary.

Writes data_bank/glossary/words.json (all forms) and chunk files words_XX.json for authoring.
With --missing, only lists forms not yet covered by data_bank/glossary/part_*.json.

  python tools/build_wordlist.py [--chunk 260] [--missing]
"""
import argparse
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLOS = os.path.join(ROOT, "data_bank", "glossary")
WORD = re.compile(r"[A-Za-z]+(?:'[a-z]+)?")
VI = re.compile(r"[à-ỹÀ-Ỹ]")  # no re.I: case folding would also match ASCII s/k
LESSON_EN_KEYS = {"en", "example", "wrong", "right", "pattern", "front", "back", "t"}
counts = {}


def add(text):
    text = re.sub(r"<[^>]+>", " ", text)
    for w in WORD.findall(text):
        counts[w.lower()] = counts.get(w.lower(), 0) + 1


def walk(x):
    if isinstance(x, str):
        if not VI.search(x) and "://" not in x:  # skip Vietnamese text and URLs (video ids look like words)
            add(x)
    elif isinstance(x, list):
        for i in x:
            walk(i)
    elif isinstance(x, dict):
        for k, v in x.items():
            if k in LESSON_EN_KEYS or isinstance(v, (list, dict)):
                walk(v)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chunk", type=int, default=260)
    ap.add_argument("--missing", action="store_true")
    args = ap.parse_args()

    for path in glob.glob(os.path.join(ROOT, "data_bank", "json", "topic_*.json")):
        for q in json.load(open(path, encoding="utf-8")):
            add(q["prompt"])
            for o in q["options"]:
                add(o.get("text", "") or (o.get("left", "") + " " + o.get("right", "")))
            if q["question_type"] == "fill_in_blank":
                add(q["correct_answer"])
    for path in glob.glob(os.path.join(ROOT, "data_bank", "lessons", "topic_*.json")):
        for lesson in json.load(open(path, encoding="utf-8")):
            walk(lesson)

    words = sorted(counts)
    os.makedirs(GLOS, exist_ok=True)
    if args.missing:
        have = set()
        for p in glob.glob(os.path.join(GLOS, "part_*.json")):
            have |= {e["w"] for e in json.load(open(p, encoding="utf-8"))}
        miss = [w for w in words if w not in have]
        print(len(miss), "missing:", " ".join(miss[:80]))
        json.dump(miss, open(os.path.join(GLOS, "words_missing.json"), "w", encoding="utf-8"), ensure_ascii=False)
        return
    json.dump(words, open(os.path.join(GLOS, "words.json"), "w", encoding="utf-8"), ensure_ascii=False)
    n = 0
    for i in range(0, len(words), args.chunk):
        n += 1
        json.dump(words[i:i + args.chunk], open(os.path.join(GLOS, f"words_{n:02d}.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(len(words), "word forms in", n, "chunks")


if __name__ == "__main__":
    main()
