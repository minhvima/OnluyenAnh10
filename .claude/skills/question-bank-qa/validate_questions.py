#!/usr/bin/env python3
"""Validate grammar question bank JSON (list of question objects, or {"questions": [...]})."""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

TOPICS = {
    "TENSES", "PASSIVE_VOICE", "CONDITIONALS", "REPORTED_SPEECH", "RELATIVE_CLAUSES",
    "COMPARISONS", "GERUNDS_INFINITIVES", "PREPOSITIONS_CONJUNCTIONS", "WISH_SENTENCES",
    "WORD_FORMS", "ARTICLES_PRONOUNS", "PHRASAL_VERBS_COLLOCATIONS",
    "SENTENCE_STRUCTURES", "MODALS_QUANTIFIERS", "COMMUNICATION",
}
LEVELS = {"Recognition", "Comprehension", "Application"}
TYPES = {
    "multiple_choice", "fill_in_blank", "matching",
    "error_identification", "sentence_transformation", "sentence_combination",
}
MCQ_LIKE = {"multiple_choice", "error_identification", "sentence_transformation", "sentence_combination"}
ID_RE = re.compile(r"^Q_[A-Z_]+_\d{3,}$")


def load(path: Path):
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    return data["questions"] if isinstance(data, dict) else data


def norm(text: str) -> str:
    text = re.sub(r"\[[^\]]*\]", " ", text.lower())
    text = re.sub(r"\b(19|20)\d{2}\b", "<y>", text)
    return re.sub(r"[^a-z0-9<>_ ]+", " ", text).split()


def trigrams(tokens):
    return {tuple(tokens[i:i + 3]) for i in range(max(len(tokens) - 2, 1))}


def check(q, errors, warns):
    qid = q.get("question_id", "<no id>")

    def err(msg): errors.append(f"{qid}: {msg}")
    def warn(msg): warns.append(f"{qid}: {msg}")

    for f in ("question_id", "topic_code", "cognitive_level", "question_type", "prompt", "correct_answer", "explanation"):
        if not q.get(f):
            err(f"thiếu trường '{f}'")
    if q.get("question_id") and not ID_RE.match(q["question_id"]):
        err("question_id sai định dạng Q_<TOPIC>_<NNN>")
    if q.get("topic_code") not in TOPICS:
        err(f"topic_code không hợp lệ: {q.get('topic_code')}")
    if q.get("cognitive_level") and q["cognitive_level"].split(" ")[0] not in LEVELS:
        err(f"cognitive_level không hợp lệ: {q.get('cognitive_level')}")
    qtype = q.get("question_type")
    if qtype not in TYPES:
        err(f"question_type không hợp lệ: {qtype}")
        return

    opts = q.get("options") or []
    if qtype in MCQ_LIKE:
        ids = [o.get("id") for o in opts]
        if ids != ["A", "B", "C", "D"]:
            err(f"MCQ cần đúng 4 phương án A-D, hiện có {ids}")
        texts = [str(o.get("text", "")).strip().lower() for o in opts]
        if len(set(texts)) != len(texts):
            err("có phương án trùng nội dung")
        if q.get("correct_answer") not in ids:
            err(f"correct_answer '{q.get('correct_answer')}' không thuộc phương án")
        if qtype == "multiple_choice" and "_____" not in q.get("prompt", ""):
            warn("prompt MCQ không có chỗ trống ____ (có thể là dạng chọn câu đồng nghĩa/sửa lỗi)")
    elif qtype == "fill_in_blank":
        if opts:
            warn("fill_in_blank nên có options rỗng")
        if not isinstance(q.get("correct_answer"), (str, list)):
            err("correct_answer của fill_in_blank phải là chuỗi hoặc mảng")
    else:  # matching
        if len(opts) < 2 or not all("left" in o and "right" in o for o in opts):
            err("matching cần >= 2 cặp {left,right}")
        else:
            if len({o["left"] for o in opts}) != len(opts) or len({o["right"] for o in opts}) != len(opts):
                err("matching có vế trùng, ghép không duy nhất")

    if len(str(q.get("explanation", ""))) > 600:
        warn("lời giải dài (>600 ký tự), nên rút gọn ≤ 3 câu")
    # đại từ lệch thường gặp ở câu sinh từ template
    prompt = q.get("prompt", "")
    if re.search(r"\b(Lan|Her sister|Mai|Hoa)\b[^.]*\bhe\b", prompt):
        warn("nghi lệch đại từ: chủ ngữ nữ nhưng dùng 'he'")
    if re.search(r"\b(Mr\. Nam|My brother|Minh)\b[^.]*\bshe\b", prompt):
        warn("nghi lệch đại từ: chủ ngữ nam nhưng dùng 'she'")


def main():
    if hasattr(sys.stdout, "reconfigure"):  # console Windows mặc định không phải UTF-8
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--strict", action="store_true", help="coi cảnh báo là lỗi")
    args = ap.parse_args()

    p = Path(args.path)
    files = sorted(p.rglob("*.json")) if p.is_dir() else [p]
    questions = []
    for f in files:
        try:
            questions += load(f)
        except Exception as e:  # noqa: BLE001
            print(f"[LỖI] không đọc được {f}: {e}")
            return 2

    errors, warns = [], []
    ids = Counter(q.get("question_id") for q in questions)
    for qid, n in ids.items():
        if n > 1:
            errors.append(f"{qid}: id bị trùng {n} lần")
    for q in questions:
        check(q, errors, warns)

    # trùng / gần trùng prompt (theo từng chủ điểm)
    by_topic = {}
    for q in questions:
        by_topic.setdefault(q.get("topic_code"), []).append(q)
    for topic, qs in by_topic.items():
        def sig(q):  # matching dùng chung prompt → so sánh theo nội dung các cặp
            text = q.get("prompt", "")
            if q.get("question_type") == "matching":
                text += " " + " ".join(f"{o.get('left', '')} {o.get('right', '')}" for o in q.get("options", []))
            elif q.get("question_type") in MCQ_LIKE and "____" not in text and "<u>" not in text:
                # prompt chung như "Which sentence is correct?" → danh tính nằm ở các phương án
                text += " " + " ".join(str(o.get("text", "")) for o in q.get("options", []))
            return text
        grams = [(q.get("question_id"), trigrams(norm(sig(q)))) for q in qs]
        for i in range(len(grams)):
            for j in range(i + 1, len(grams)):
                a, b = grams[i][1], grams[j][1]
                if not a or not b:
                    continue
                sim = len(a & b) / len(a | b)
                if sim >= 0.90:
                    errors.append(f"{grams[i][0]} ~ {grams[j][0]}: trùng {sim:.2f}")
                elif sim >= 0.75:
                    warns.append(f"{grams[i][0]} ~ {grams[j][0]}: gần trùng {sim:.2f}")

    # thống kê
    total = len(questions)
    print(f"Tổng số câu: {total}")
    for title, key in (("Chủ điểm", "topic_code"), ("Mức độ", "cognitive_level"), ("Dạng", "question_type")):
        c = Counter((q.get(key) or "?").split(" ")[0] if key == "cognitive_level" else q.get(key) for q in questions)
        print(f"{title}: " + ", ".join(f"{k}={v} ({v / total:.0%})" for k, v in sorted(c.items(), key=lambda x: str(x[0]))) if total else "")
    mc = Counter(q.get("correct_answer") for q in questions if q.get("question_type") in MCQ_LIKE)
    if mc:
        print("Phân bố đáp án MCQ: " + ", ".join(f"{k}={mc[k]}" for k in sorted(mc)))

    print(f"\nLỗi: {len(errors)} | Cảnh báo: {len(warns)}")
    for e in errors[:100]:
        print("  [LỖI]", e)
    for w in warns[:100]:
        print("  [CẢNH BÁO]", w)
    if len(errors) > 100 or len(warns) > 100:
        print("  … (đã cắt bớt, chỉ hiện 100 mục đầu mỗi loại)")
    return 1 if errors or (args.strict and warns) else 0


if __name__ == "__main__":
    sys.exit(main())
