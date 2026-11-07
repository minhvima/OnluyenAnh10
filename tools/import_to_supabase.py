#!/usr/bin/env python3
"""Import approved questions and lessons from data_bank/ into Supabase (PostgREST).

Dry-run by default. Needs env vars (never commit them):
  SUPABASE_URL          e.g. https://abcd1234.supabase.co
  SUPABASE_SERVICE_KEY  service_role key (bypasses RLS) -- keep it on this machine only

Usage:
  python tools/import_to_supabase.py                 # dry-run, prints what would be sent
  python tools/import_to_supabase.py --apply         # insert new rows, never overwrite existing ones
  python tools/import_to_supabase.py --apply --overwrite   # also overwrite existing rows (resets admin edits!)
  python tools/import_to_supabase.py --apply --update-lesson-content --topic SENTENCE_STRUCTURES
                                                     # refresh content of one topic's lessons, status kept
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
    "status", "version", "why_wrong",
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


def auth_headers(key, resolution):
    headers = {
        "apikey": key,
        "Content-Type": "application/json",
        "Prefer": f"resolution={resolution},return=minimal",
    }
    # New-style keys (sb_secret_...) are not JWTs and must only go in `apikey`;
    # legacy service_role keys are JWTs and also go in Authorization.
    if not key.startswith("sb_"):
        headers["Authorization"] = f"Bearer {key}"
    return headers


def post(url, key, table, rows, overwrite, conflict):
    resolution = "merge-duplicates" if overwrite else "ignore-duplicates"
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        req = urllib.request.Request(
            f"{url}/rest/v1/{table}?on_conflict={conflict}",
            data=json.dumps(chunk).encode("utf-8"),
            method="POST",
            headers=auth_headers(key, resolution),
        )
        try:
            urllib.request.urlopen(req, timeout=60).read()
        except urllib.error.HTTPError as e:
            sys.exit(f"{table}: HTTP {e.code} at rows {i}-{i + len(chunk)}: {e.read().decode('utf-8', 'replace')[:500]}")
        print(f"  {table}: sent {i + len(chunk)}/{len(rows)}")


def patch_lesson_content(url, key, lessons):
    """Update only title/estimated_minutes/content of lessons that already exist.

    Leaves `status` alone, so lessons the parent already approved stay approved."""
    for i, l in enumerate(lessons, 1):
        body = {"title": l["title"], "estimated_minutes": l["estimated_minutes"], "content": l["content"]}
        req = urllib.request.Request(
            f"{url}/rest/v1/lessons?lesson_id=eq.{l['lesson_id']}",
            data=json.dumps(body).encode("utf-8"),
            method="PATCH",
            headers=auth_headers(key, "merge-duplicates"),
        )
        try:
            urllib.request.urlopen(req, timeout=60).read()
        except urllib.error.HTTPError as e:
            sys.exit(f"lessons PATCH {l['lesson_id']}: HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:300]}")
    print(f"  lessons: updated content of {len(lessons)} lessons (status untouched)")


def patch_why_wrong(url, key, questions):
    """Update only `why_wrong` of questions that already exist (needs db/migrations/2026-11-03_why_wrong.sql)."""
    todo = [q for q in questions if q.get("why_wrong")]
    for q in todo:
        req = urllib.request.Request(
            f"{url}/rest/v1/questions?question_id=eq.{q['question_id']}",
            data=json.dumps({"why_wrong": q["why_wrong"]}).encode("utf-8"),
            method="PATCH",
            headers=auth_headers(key, "merge-duplicates"),
        )
        try:
            urllib.request.urlopen(req, timeout=60).read()
        except urllib.error.HTTPError as e:
            sys.exit(f"questions PATCH {q['question_id']}: HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:300]}"
                     " (If it says the column does not exist, run db/migrations/2026-11-03_why_wrong.sql first.)")
    print(f"  questions: updated why_wrong of {len(todo)} questions")


CONTENT_COLS = ["prompt", "options", "correct_answer", "accepted_answers", "explanation", "hint", "why_wrong"]


def changed_since(questions, backup_dir):
    """Questions whose content differs from the JSON files saved in backup_dir (e.g. before an ambiguity fix)."""
    old = {}
    for path in sorted(glob.glob(os.path.join(ROOT, backup_dir, "topic_*.json"))):
        with open(path, encoding="utf-8") as f:
            for q in json.load(f):
                old[q["question_id"]] = q
    out = []
    for q in questions:
        o = old.get(q["question_id"])
        if o is not None and any((o.get(c) or None) != (q.get(c) or None) for c in CONTENT_COLS if c != "why_wrong"):
            out.append(q)
    return out


def patch_question_content(url, key, questions):
    """Update only the text fields of existing questions; keeps `status`, `version` and other admin fields."""
    for q in questions:
        body = {c: q.get(c) for c in CONTENT_COLS if c in q}
        req = urllib.request.Request(
            f"{url}/rest/v1/questions?question_id=eq.{q['question_id']}",
            data=json.dumps(body).encode("utf-8"),
            method="PATCH",
            headers=auth_headers(key, "merge-duplicates"),
        )
        try:
            urllib.request.urlopen(req, timeout=60).read()
        except urllib.error.HTTPError as e:
            sys.exit(f"questions PATCH {q['question_id']}: HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:300]}")
    print(f"  questions: updated content of {len(questions)} questions (status untouched)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--update-questions", metavar="BACKUP_DIR",
                    help="refresh text fields (prompt, options, answers, explanation, why_wrong) of the questions "
                         "that differ from the JSON files in BACKUP_DIR, e.g. data_bank/review/backup_json_pre_ambig")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--overwrite", action="store_true")
    ap.add_argument("--update-why", action="store_true",
                    help="only refresh the wrong-answer reasons (why_wrong) of existing questions")
    ap.add_argument("--update-lesson-content", action="store_true",
                    help="only refresh lesson content (e.g. after merge_lesson_ext.py); keeps approval status")
    ap.add_argument("--topic", metavar="TOPIC_CODE",
                    help="with --update-lesson-content: only lessons of this topic, e.g. SENTENCE_STRUCTURES")
    args = ap.parse_args()

    questions, lessons = list(question_rows()), list(lesson_rows())
    if args.topic:
        lessons = [l for l in lessons if l["topic_code"] == args.topic]
        if not lessons:
            sys.exit(f"No lessons with topic_code {args.topic}.")
    ids = [q["question_id"] for q in questions]
    if len(ids) != len(set(ids)):
        sys.exit("Duplicate question_id in data_bank/json -- run tools/validate_questions.py first.")
    print(f"questions: {len(questions)}  lessons: {len(lessons)} (lesson status kept as in files)")

    if args.update_questions:
        print(f"  {len(changed_since(questions, args.update_questions))} questions differ from {args.update_questions}")
    if not args.apply:
        print("Dry-run only. Add --apply to send.")
        return
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.")
    url = url.rstrip("/")
    if args.update_questions:
        patch_question_content(url, key, changed_since(questions, args.update_questions))
        print("Done.")
        return
    if args.update_why:
        patch_why_wrong(url, key, questions)
        print("Done.")
        return
    if args.update_lesson_content:
        patch_lesson_content(url, key, lessons)
        print("Done.")
        return
    post(url, key, "lessons", lessons, args.overwrite, "lesson_id")        # lessons first (FK)
    post(url, key, "questions", questions, args.overwrite, "question_id")
    print("Done.")


if __name__ == "__main__":
    main()
