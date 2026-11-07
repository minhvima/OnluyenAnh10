#!/usr/bin/env python3
"""Validate lesson extension files (annotated examples, formula cases, rule tables).

  python tools/validate_lesson_ext.py data_bank/lessons_ext/ext_tenses_A.json [...]

Exit code 1 if any problem is found. Schema (per lesson):
  lesson_id, formula[{form,label,parts[{t,r}],note?,examples[{parts,vi}]}],
  rules[{title,rows[{case,rule,examples[{en,vi}]}]}], examples[{use,parts,vi}]
"""
import json
import re
import sys

ROLES = {"S", "V", "Aux", "O", "C", "Adj", "Adv", "Prep", "Conj"}
problems = []


def bad(where, msg):
    problems.append(f"{where}: {msg}")


def check_parts(where, parts, sentence=True):
    if not isinstance(parts, list) or not parts:
        return bad(where, "parts must be a non-empty list")
    for i, p in enumerate(parts):
        if not isinstance(p, dict) or set(p) != {"t", "r"}:
            bad(where, f"part {i} must have exactly keys t and r")
            continue
        if not p["t"].strip() or p["t"] != p["t"].strip():
            bad(where, f"part {i} text empty or has outer spaces: {p['t']!r}")
        if p["r"] not in ROLES:
            bad(where, f"part {i} role {p['r']!r} not in {sorted(ROLES)}")
        if re.search(r"[à-ỹÀ-Ỹ]", p["t"]):
            bad(where, f"part {i} contains Vietnamese: {p['t']!r}")
    if sentence:
        text = " ".join(p["t"] for p in parts if isinstance(p, dict) and "t" in p)
        if not re.search(r"[.?!]$", text):
            bad(where, f"sentence should end with . ? or !: {text!r}")


def main(paths):
    for path in paths:
        data = json.load(open(path, encoding="utf-8"))
        for les in data:
            lid = les.get("lesson_id", "?")
            if not (isinstance(les.get("formula"), list) and les["formula"]):
                bad(lid, "formula missing")
            for k, f in enumerate(les.get("formula", [])):
                w = f"{lid} formula[{k}]"
                if not f.get("form") or not f.get("label"):
                    bad(w, "form and label required")
                check_parts(w + " pattern", f.get("parts"), sentence=False)
                if len(f.get("examples", [])) < 2:
                    bad(w, "need >= 2 examples")
                for j, e in enumerate(f.get("examples", [])):
                    check_parts(f"{w} ex[{j}]", e.get("parts"))
                    if not e.get("vi"):
                        bad(f"{w} ex[{j}]", "vi missing")
            for k, t in enumerate(les.get("rules", [])):
                for j, row in enumerate(t.get("rows", [])):
                    w = f"{lid} rules[{k}].rows[{j}]"
                    if not row.get("case") or not row.get("rule"):
                        bad(w, "case and rule required")
                    exs = row.get("examples", [])
                    if not exs:
                        bad(w, "needs >= 1 example")
                    for e in exs:
                        if not e.get("en"):
                            bad(w, "example needs en")
            c = les.get("concept")
            if c is not None:
                if not (isinstance(c.get("lines"), list) and c["lines"]):
                    bad(lid, "concept.lines must be a non-empty list")
                for j, e in enumerate(c.get("examples", [])):
                    if not e.get("en") or not e.get("vi"):
                        bad(f"{lid} concept.examples[{j}]", "en and vi required")
            allowed = {"objective", "observe", "signals", "common_mistakes", "mnemonic", "flashcards", "story", "formula", "comparison_tables"}
            for k in les.get("overrides", {}):
                if k not in allowed:
                    bad(lid, f"override {k!r} not allowed")
            ex = les.get("examples", [])
            if len(ex) < 8:
                bad(lid, f"needs >= 8 examples, has {len(ex)}")
            uses = {}
            for j, e in enumerate(ex):
                w = f"{lid} examples[{j}]"
                check_parts(w, e.get("parts"))
                if not e.get("use") or not e.get("vi"):
                    bad(w, "use and vi required")
                uses[e.get("use")] = uses.get(e.get("use"), 0) + 1
            if len(uses) < 2:
                bad(lid, "examples should cover >= 2 different uses")
        print(f"{path}: {len(data)} lessons checked")
    if problems:
        print(f"{len(problems)} problem(s):")
        for p in problems[:60]:
            print(" -", p)
        sys.exit(1)
    print("OK")


if __name__ == "__main__":
    main(sys.argv[1:])
