#!/usr/bin/env python3
"""Build extra questions for one topic from tools/content_src/<dir>/lNN.py (each defines TAG and ITEMS).

Usage: python tools/build_ext_questions.py TENSES tenses_ext 201 data_bank/review/tenses_ext.json
Output questions have status "draft": run tools/validate_questions.py and the QA pass before merging into data_bank/json.
"""
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools' / 'content_src'))
from ext_dsl import LV  # noqa: E402

LETTERS = 'ABCD'


def build_one(it, topic, qid, tags, pos):
    q = dict(question_id=qid, topic_code=topic, cognitive_level=LV[it['lv']], hint=it.get('hint'), media=None, tags=tags,
             source='original', status='draft', explanation=it['expl'], question_type=it['kind'])
    k = it['kind']
    if k in ('multiple_choice', 'sentence_transformation', 'sentence_combination'):
        texts = list(it['wrongs'])
        texts.insert(pos, it['ans'])
        assert len(texts) == 4 and len(it['whys']) == 3, qid
        whys = iter(it['whys'])
        q.update(prompt=it['prompt'], options=[{'id': LETTERS[i], 'text': t} for i, t in enumerate(texts)], correct_answer=LETTERS[pos], accepted_answers=[],
                 why_wrong={LETTERS[i]: next(whys) for i in range(4) if i != pos})
    elif k == 'fill_in_blank':
        q.update(prompt=it['prompt'], options=[], correct_answer=it['ans'], accepted_answers=it['acc'], why_wrong=it['whys'])
    elif k == 'error_identification':
        parts, bad = it['parts'], it['bad']
        body = ' '.join(f'<u>({LETTERS[i]}) {p}</u>' for i, p in enumerate(parts))
        q.update(prompt=f"Choose the underlined part that needs correcting: {it['pre']}{body}{it['post']}", options=[{'id': LETTERS[i], 'text': p} for i, p in enumerate(parts)],
                 correct_answer=LETTERS[bad], accepted_answers=[],
                 why_wrong={LETTERS[i]: f"Phần này đúng: '{p}' dùng đúng; lỗi nằm ở '{parts[bad]}'." for i, p in enumerate(parts) if i != bad})
    elif k == 'matching':
        n = len(it['pairs'])
        q.update(prompt='Match each item on the left with the correct item on the right.', options=[{'left': a, 'right': b} for a, b in it['pairs']],
                 correct_answer=' | '.join(f'Left {i} -> Right {i}' for i in range(1, n + 1)), accepted_answers=[], why_wrong={})
    else:
        raise ValueError(k)
    return q


def main():
    topic, folder, start, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), Path(sys.argv[4])
    qid, res, mcseq = start, [], 0
    for f in sorted((ROOT / 'tools' / 'content_src' / folder).glob('l*.py')):
        spec = importlib.util.spec_from_file_location(f.stem, f)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        no = int(f.stem[1:])
        for it in m.ITEMS:
            pos = mcseq % 4  # rotate the correct letter over the choice-type questions so A-D stay balanced
            if it['kind'] in ('multiple_choice', 'sentence_transformation', 'sentence_combination'):
                mcseq += 1
            res.append(build_one(it, topic, f'Q_{topic}_{qid:03d}', [m.TAG, f't{no}'], pos))
            qid += 1
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'{len(res)} questions -> {out}')


if __name__ == '__main__':
    main()
