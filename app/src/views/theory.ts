import { h } from '../lib/dom';
import type { FormulaV2, Lesson, Part, Role } from '../types';

const ROLE_LABEL: Record<Role, string> = {
  S: 'Chủ ngữ', V: 'Động từ', Aux: 'Trợ động từ', O: 'Tân ngữ', C: 'Bổ ngữ',
  Adj: 'Tính từ', Adv: 'Trạng từ / cụm chỉ thời gian, nơi chốn', Prep: 'Giới từ', Conj: 'Liên từ',
};
const ROLE_ORDER: Role[] = ['S', 'V', 'Aux', 'O', 'C', 'Adj', 'Adv', 'Prep', 'Conj'];

function sec(color: string, title: string): HTMLElement {
  return h('div', { class: 'sec' }, h('span', { class: 'dot', style: `background:${color}` }), h('h3', {}, title));
}

/** A real sentence split into labelled parts: each word group shows its role as a letter label. */
export function sentence(parts: Part[]): HTMLElement {
  const el = h('div', { class: 'sent', 'data-lk': 'en' });
  for (const p of parts) el.append(h('span', { class: `tok ${p.r}` }, h('b', {}, p.t), h('i', {}, p.r)));
  return el;
}

/** A formula pattern such as S + V(s/es) + O: coloured chips without role letters. */
function pattern(parts: Part[]): HTMLElement {
  const el = h('div', { class: 'head' });
  parts.forEach((p, i) => {
    if (i > 0) el.append(h('span', { class: 'plus' }, '+'));
    el.append(h('span', { class: `tok ${p.r}` }, h('b', {}, p.t)));
  });
  return el;
}

function signFor(form: string): HTMLElement {
  const cls = form.includes('−') || form.includes('-') ? 'n' : form.includes('?') ? 'q' : 'p';
  return h('span', { class: `sign ${cls}` }, form);
}

function usedRoles(lesson: Lesson): Role[] {
  const c = lesson.content;
  const seen = new Set<Role>();
  for (const f of c.formula_v2 ?? []) {
    f.parts.forEach((p) => seen.add(p.r));
    f.examples.forEach((e) => e.parts.forEach((p) => seen.add(p.r)));
  }
  (c.examples ?? []).forEach((e) => e.parts.forEach((p) => seen.add(p.r)));
  return ROLE_ORDER.filter((r) => seen.has(r));
}

function legend(roles: Role[]): HTMLElement {
  const el = h('div', { class: 'legend', 'aria-label': 'Chú giải ký hiệu' });
  for (const r of roles) el.append(h('span', { class: 'leg' }, h('span', { class: `tok ${r}` }, h('i', {}, r)), ROLE_LABEL[r]));
  return el;
}

function formulaBlock(f: FormulaV2): HTMLElement {
  const box = h('div', {}, h('div', { class: 'head' }, signFor(f.form), h('b', {}, f.label), pattern(f.parts)));
  if (f.note) box.append(h('p', { class: 'note-line', 'data-lk': 'mixed' }, f.note));
  for (const e of f.examples) box.append(sentence(e.parts), h('span', { class: 'vi' }, e.vi));
  return box;
}

/** Left column: the micro-lesson. English elements carry data-lk so words can be looked up. */
export function renderTheory(lesson: Lesson): HTMLElement {
  const c = lesson.content;
  const root = h('section', { class: 'panel theory', 'aria-label': 'Lý thuyết' }, h('h2', {}, lesson.title));
  if (c.objective) root.append(h('p', { class: 'obj' }, c.objective));

  if (c.story) {
    root.append(sec('var(--c-primary)', 'Đọc thử một đoạn'));
    const story = h('div', { class: 'story' });
    for (const l of c.story.lines) story.append(h('p', { 'data-lk': 'en' }, l.en), h('span', { class: 'vi' }, l.vi));
    root.append(story);
  }
  if (c.observe?.length) {
    root.append(sec('var(--r-V)', 'Em nhận ra điều gì?'));
    root.append(h('ul', { class: 'observe', 'data-lk': 'mixed' }, ...c.observe.map((t) => h('li', {}, t))));
  }

  const roles = usedRoles(lesson);
  if (roles.length) root.append(sec('var(--r-S)', 'Các thành phần trong câu'), legend(roles));

  root.append(sec('var(--c-accent)', 'Công thức'));
  if (c.formula_v2?.length) {
    const box = h('div', { class: 'formula' });
    for (const f of c.formula_v2) box.append(formulaBlock(f));
    root.append(box);
  } else if (c.formula?.length) {
    const box = h('div', { class: 'formula' });
    for (const f of c.formula) box.append(h('div', {}, h('div', { class: 'head' }, signFor(f.form), h('b', { 'data-lk': 'en' }, f.pattern)), h('span', { 'data-lk': 'en' }, f.example)));
    root.append(box);
  }

  for (const t of c.rules ?? []) {
    root.append(sec('var(--r-Adj)', t.title));
    const body = h('tbody', {});
    for (const r of t.rows) {
      body.append(h('tr', {},
        h('td', {}, r.case),
        h('td', {}, h('span', { class: 'end' }, r.rule)),
        h('td', { 'data-lk': 'en' }, ...r.examples.map((e) => h('span', { class: 'ex-line' }, e.en, e.vi ? h('span', { class: 'vi' }, e.vi) : null)))));
    }
    root.append(h('table', { class: 'rule' }, h('thead', {}, h('tr', {}, h('th', {}, 'Trường hợp'), h('th', {}, 'Quy tắc'), h('th', {}, 'Ví dụ'))), body));
  }
  if (!c.rules?.length) {
    for (const t of c.comparison_tables ?? []) {
      root.append(sec('var(--r-Adj)', t.title));
      root.append(h('table', { class: 'rule' }, h('tbody', {}, ...t.rows.map((row) => h('tr', {}, ...row.map((cell) => h('td', { 'data-lk': 'mixed' }, cell)))))));
    }
  }

  if (c.examples?.length) {
    root.append(sec('var(--r-Prep)', 'Thêm ví dụ theo cách dùng'));
    const box = h('div', { class: 'ex' });
    for (const e of c.examples) box.append(h('div', {}, h('span', { class: 'tag' }, e.use), sentence(e.parts), h('span', { class: 'vi' }, e.vi)));
    root.append(box);
  }
  if (c.signals?.length) {
    root.append(sec('var(--r-Adv)', 'Dấu hiệu nhận biết'));
    root.append(h('div', { class: 'signals', 'data-lk': 'en' }, ...c.signals.map((s) => h('span', {}, s))));
  }
  for (const m of c.common_mistakes ?? []) {
    root.append(h('div', { class: 'mistake' },
      h('b', {}, 'Lỗi hay gặp: '), h('s', { 'data-lk': 'en' }, m.wrong), ' → ', h('em', { 'data-lk': 'en' }, m.right),
      h('br'), h('small', { 'data-lk': 'mixed' }, m.why)));
  }
  if (c.mnemonic) root.append(h('p', { class: 'obj', 'data-lk': 'mixed' }, h('b', {}, 'Mẹo nhớ: '), c.mnemonic));
  if (c.flashcards?.length) {
    root.append(sec('var(--c-primary)', 'Thẻ ghi nhớ'));
    for (const f of c.flashcards) root.append(h('details', { class: 'card-q' }, h('summary', {}, f.front), h('div', { 'data-lk': 'mixed' }, f.back)));
  }
  if (c.video?.embed_url && c.video.approved) {
    const id = c.video.embed_url.split('/embed/')[1]?.split('?')[0];
    if (id && /^[\w-]{6,20}$/.test(id)) {
      root.append(h('a', { class: 'video', href: `https://www.youtube.com/watch?v=${id}`, target: '_blank', rel: 'noopener noreferrer' }, 'Xem video bài này (mở YouTube trong tab mới)'));
    }
  }
  return root;
}
