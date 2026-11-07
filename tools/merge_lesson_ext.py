#!/usr/bin/env python3
"""Merge annotated examples from data_bank/lessons_ext/ext_*.json into data_bank/lessons/topic_*.json.

Adds three fields to each lesson: formula_v2, rules, examples. The original `formula` is kept.
Optional per lesson: `concept` (plain-language definition shown first) and `overrides`
(a dict of base fields such as objective/observe/signals/common_mistakes that replace the originals).
Safe to re-run. The first run backs the lesson files up to data_bank/lessons/backup_pre_ext/.

  python tools/merge_lesson_ext.py
"""
import glob
import json
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LESSONS = os.path.join(ROOT, "data_bank", "lessons")


def main():
    ext = {}
    for path in sorted(glob.glob(os.path.join(ROOT, "data_bank", "lessons_ext", "ext_*.json"))):
        for item in json.load(open(path, encoding="utf-8")):
            ext[item["lesson_id"]] = item
    backup = os.path.join(LESSONS, "backup_pre_ext")
    merged = 0
    for path in sorted(glob.glob(os.path.join(LESSONS, "topic_*.json"))):
        lessons = json.load(open(path, encoding="utf-8"))
        if not any(l["lesson_id"] in ext for l in lessons):
            continue
        if not os.path.isdir(backup):
            os.makedirs(backup)
        target = os.path.join(backup, os.path.basename(path))
        if not os.path.exists(target):
            shutil.copy2(path, target)
        for l in lessons:
            e = ext.get(l["lesson_id"])
            if e:
                l["formula_v2"] = e["formula"]
                l["rules"] = e.get("rules", [])
                l["examples"] = e["examples"]
                if e.get("concept"):
                    l["concept"] = e["concept"]
                for k, v in e.get("overrides", {}).items():
                    l[k] = v
                merged += 1
        json.dump(lessons, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"merged {merged} of {len(ext)} extension lessons")


if __name__ == "__main__":
    main()
