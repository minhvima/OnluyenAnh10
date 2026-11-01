#!/usr/bin/env python3
"""Import approved questions and lessons from data_bank/ into Supabase (PostgREST).

Dry-run by default. Needs env vars (never commit them):
  SUPABASE_URL          e.g. https://abcd1234.supabase.co
  SUPABASE_SERVICE_KEY  service_role key (bypasses RLS) -- keep it on this machine only

Usage:
  python tools/import_to_supabase.py                 # dry-run, prints what would be sent
  python tools/import_to_supabase.py --apply         # insert new rows, never overwrite existing ones
  python tools/import_to_supabase.py --apply --overwrite   # also overwrite existing rows (resets admin edits!)
"""
import argparse
import glob
import json
import os
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUESTION_COLS = [
    "question_id", "topic_code", "cognitive_level", "question_type", "prompt", "options",
    "correct_answer", "accepted_answers", "explanation", "hint", "tags", "media", "source",
    "status", "version",
]
LESSON_META = {"lesson_id", "topic_code", "order", "title", "estimated_minutes", "status"}
BATCH = 200


def load(pattern):
    for path in sorted(glob.glob(os.path.join(ROOT, pattern))):
        with open(path, encoding="utf-8") as f:
            yield path, json.load(f)


def question_rows():
    for _, qs in load("data_bank/json/topic_*.json"):
        for q in qs:
            row = {c: q.get(c) for c in QUESTION_COLS if c in q}
            row.setdefault("version", 1)
            row["accepted_answers"] = q.get("accepted_answers") or []
            row["tags"] = q.get("tags") or []
            yield row


def lesson_rows():
    for _, ls in load("data_bank/lessons/topic_*.json"):
        for l in ls:
            yield {
                "lesson_id": l["lesson_id"],
                "topic_code": l["topic_code"],
                "ord": l["order"],
                "title": l["title"],
                "estimated_minutes": l.get("estimated_minutes", 5),
                "status": l.get("status", "draft"),
                "content": {k: v for k, v in l.items() if k not in LESSON_META},
            }


def post(url, key, table, rows, overwrite, conflict):
    resolution = "merge-duplicates" if overwrite else "ignore-duplicates"
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        req = urllib.request.Request(
            f"{url}/rest/v1/{table}?on_conflict={conflict}",
            data=json.dumps(chunk).encode("utf-8"),
            method="POST",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": f"resolution={resolution},return=minimal",
            },
        )
        try:
            urllib.request.urlopen(req, timeout=60).read()
        except urllib.error.HTTPError as e:
            sys.exit(f"{table}: HTTP {e.code} at rows {i}-{i + len(chunk)}: {e.read().decode('utf-8', 'replace')[:500]}")
        print(f"  {table}: sent {i + len(chunk)}/{len(rows)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--overwrite", action="store_true")
    args = ap.parse_args()

    questions, lessons = list(question_rows()), list(lesson_rows())
    ids = [q["question_id"] for q in questions]
    if len(ids) != len(set(ids)):
        sys.exit("Duplicate question_id in data_bank/json -- run tools/validate_questions.py first.")
    print(f"questions: {len(questions)}  lessons: {len(lessons)} (lesson status kept as in files)")

    if not args.apply:
        print("Dry-run only. Add --apply to send.")
        return
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.")
    url = url.rstrip("/")
    post(url, key, "lessons", lessons, args.overwrite, "lesson_id")        # lessons first (FK)
    post(url, key, "questions", questions, args.overwrite, "question_id")
    print("Done.")


if __name__ == "__main__":
    main()
