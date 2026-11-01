#!/usr/bin/env python3
"""Merge data_bank/glossary/part_*.json into app/public/glossary.json.

Each form is stored as [lemma, pos, ipa, vi, ex, exvi, note] to keep the download small.
Entries flagged "check": true are kept but counted, so the teacher review list is visible.

  python tools/build_glossary.py
"""
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "app", "public", "glossary.json")
REQUIRED = ("w", "lemma", "pos", "vi")


def main():
    merged, flagged, problems = {}, [], []
    for path in sorted(glob.glob(os.path.join(ROOT, "data_bank", "glossary", "part_*.json"))):
        for e in json.load(open(path, encoding="utf-8")):
            w = e.get("w", "").strip().lower()
            if any(not str(e.get(k, "")).strip() for k in REQUIRED):
                problems.append(f"{os.path.basename(path)}: {w or '?'} missing a required field")
                continue
            if w in merged:
                problems.append(f"{os.path.basename(path)}: duplicate {w}")
                continue
            merged[w] = [e["lemma"], e["pos"], e.get("ipa", ""), e["vi"], e.get("ex", ""), e.get("exvi", ""), e.get("note", "")]
            if e.get("check"):
                flagged.append(w)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    kb = os.path.getsize(OUT) / 1024
    print(f"{len(merged)} entries -> {OUT} ({kb:.0f} KB); {len(flagged)} flagged for teacher check")
    if problems:
        print(f"{len(problems)} problem(s):")
        for p in problems[:30]:
            print(" -", p)
        sys.exit(1)


if __name__ == "__main__":
    main()
