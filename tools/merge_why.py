#!/usr/bin/env python3
"""Merge verified wrong-answer reasons into data_bank/json/topic_*.json as `why_wrong`.

Reads data_bank/why/verified_*.json: [{"question_id": ..., "why_wrong": {key: reason}}].
Only reasons that pass the checks below are kept; the rest are reported and left out.
Backs up the question files once to data_bank/review/backup_json_pre_why/.

  python tools/merge_why.py
"""
import glob
import json
import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_DIR = os.path.join(ROOT, "data_bank", "json")
BACKUP = os.path.join(ROOT, "data_bank", "review", "backup_json_pre_why")
CHOICE = {"multiple_choice", "error_identification", "sentence_transformation", "sentence_combination"}
MAX_WORDS = 26


def norm(s):
    return re.sub(r"\s+", " ", s.lower().replace("’", "'")).strip().rstrip(".!?").strip()


def check(q, key, reason):
    """Return a problem string, or None if the reason may be shown to students."""
    if not isinstance(reason, str) or not reason.strip() or reason.strip() == "??":
        return "empty or unsure"
    if len(reason.split()) > MAX_WORDS:
        return f"longer than {MAX_WORDS} words"
    if re.search(r"đáp án [A-D]\b", reason, re.I):
        return "refers to an option letter (order is shuffled)"
    t = q["question_type"]
    if t in CHOICE:
        ids = {o["id"] for o in q["options"]}
        if key not in ids or key == q["correct_answer"]:
            return "key is not a wrong option id"
    elif t == "fill_in_blank":
        right = {norm(q["correct_answer"])} | {norm(a) for a in q.get("accepted_answers", [])}
        if norm(key) in right:
            return "key is a correct answer"
    else:
        return "type has no wrong-answer reasons"
    return None


def main():
    verified = {}
    for path in sorted(glob.glob(os.path.join(ROOT, "data_bank", "why", "verified_*.json"))):
        for item in json.load(open(path, encoding="utf-8")):
            if item.get("replace"):
                verified[item["question_id"]] = {}  # a rewritten question: forget older reasons
            verified.setdefault(item["question_id"], {}).update(item.get("why_wrong", {}))  # later files add to earlier ones
    if not verified:
        print("no verified_*.json found")
        return
    kept = dropped = touched = 0
    problems = []
    for path in sorted(glob.glob(os.path.join(JSON_DIR, "topic_*.json"))):
        qs = json.load(open(path, encoding="utf-8"))
        if not any(q["question_id"] in verified for q in qs):
            continue
        os.makedirs(BACKUP, exist_ok=True)
        target = os.path.join(BACKUP, os.path.basename(path))
        if not os.path.exists(target):
            shutil.copy2(path, target)
        for q in qs:
            if q["question_id"] not in verified:
                continue
            good = {}
            for key, reason in verified[q["question_id"]].items():
                problem = check(q, key, reason)
                if problem:
                    dropped += 1
                    problems.append(f"{q['question_id']} [{key}]: {problem}")
                else:
                    good[key] = reason.strip()
            q["why_wrong"] = good
            kept += len(good)
            touched += 1
        json.dump(qs, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{touched} questions updated; {kept} reasons kept, {dropped} dropped")
    for p in problems[:40]:
        print(" -", p)


if __name__ == "__main__":
    main()
