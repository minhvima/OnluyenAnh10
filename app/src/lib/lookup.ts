import { loadGlossary, lookupWord, type Glossary } from '../glossary';
import { splitWords } from '../text';
import { h } from './dom';

/**
 * Click-a-word dictionary. Elements marked data-lk="en" (all English) or data-lk="mixed"
 * (Vietnamese text with English words) get their English words wrapped in .w spans.
 * Words inside answer options only open the popup while "Tra từ" mode is on.
 */
const SKIP = 'i,kbd,.key,.mark,.sign,.w,.lk-ui,input,select,textarea';
let popup: HTMLElement | null = null;
let lastTrigger: HTMLElement | null = null;
let lookupOn = false;
let ready = false;
const modeButtons = new Set<HTMLButtonElement>();

const MSG_OFF = 'Bấm vào từ tiếng Anh để xem nghĩa. Bật “Tra từ” để tra cả trong đáp án.';
const MSG_ON = 'Đang tra từ: bấm từ nào cũng chỉ hiện nghĩa, chưa chọn đáp án.';

function speak(word: string): void {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-GB';
  u.rate = 0.85;
  const v = speechSynthesis.getVoices().find((x) => x.lang === 'en-GB');
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

function closePopup(): void {
  if (!popup || popup.hidden) return;
  popup.hidden = true;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  lastTrigger?.focus?.();
}

function place(anchor: HTMLElement, el: HTMLElement): void {
  const r = anchor.getBoundingClientRect();
  let x = r.left + window.scrollX;
  let y = r.bottom + window.scrollY + 8;
  x = Math.min(x, window.scrollX + document.documentElement.clientWidth - el.offsetWidth - 12);
  if (r.bottom + el.offsetHeight + 16 > window.innerHeight) y = r.top + window.scrollY - el.offsetHeight - 8;
  el.style.left = `${Math.max(12, x)}px`;
  el.style.top = `${Math.max(8, y)}px`;
}

async function openFor(word: string, anchor: HTMLElement): Promise<void> {
  ensure();
  const el = popup as HTMLElement;
  lastTrigger = anchor;
  const g: Glossary = await loadGlossary();
  const e = lookupWord(g, word);
  const nodes: (Node | null)[] = [
    h('button', { class: 'pop-x', 'aria-label': 'Đóng', onclick: closePopup }, '✕'),
    h('div', { class: 'pop-head' }, h('span', { class: 'pop-word' }, word), e?.pos ? h('span', { class: 'pos' }, e.pos) : null),
    e && (e.note || (e.lemma && e.lemma !== word.toLowerCase())) ? h('div', { class: 'form' }, e.note || `dạng của ${e.lemma}`) : null,
    e
      ? h('div', { class: 'ipa' },
          h('span', {}, e.ipa),
          'speechSynthesis' in window ? h('button', { class: 'spk', 'aria-label': `Nghe đọc từ ${word}`, onclick: () => speak(word) }, '🔊') : null)
      : null,
    h('div', { class: 'mean' }, e ? e.vi : 'Chưa có từ này trong từ điển.'),
    e && e.ex ? h('div', { class: 'pex' }, h('b', {}, 'VD: '), e.ex, h('span', { class: 'vi' }, e.exvi)) : null,
  ];
  el.replaceChildren(...nodes.filter((n): n is Node => n !== null));
  el.hidden = false;
  place(anchor, el);
  (el.querySelector('.pop-x') as HTMLElement | null)?.focus();
}

function ensure(): void {
  if (!popup) {
    popup = h('div', { id: 'pop', role: 'dialog', 'aria-label': 'Tra từ' });
    popup.hidden = true;
    document.body.append(popup);
  }
  if (ready) return;
  ready = true;
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const w = target.closest<HTMLElement>('.w');
    if (w) {
      if (w.closest('.opt') && !lookupOn) return; // in answer options a click means "choose"
      e.preventDefault();
      e.stopPropagation();
      void openFor(w.dataset.w ?? w.textContent ?? '', w);
      return;
    }
    if (popup && !popup.contains(target)) closePopup();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePopup();
    const typing = (e.target as HTMLElement).closest?.('input,textarea,select');
    if (!typing && e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setLookupMode(!lookupOn);
      e.stopImmediatePropagation();
    }
  }, true);
}

function setLookupMode(on: boolean): void {
  lookupOn = on;
  document.body.classList.toggle('lookup', on);
  for (const b of modeButtons) {
    b.setAttribute('aria-pressed', String(on));
    const msg = b.closest('.lk-ui')?.querySelector('.lk-msg');
    if (msg) msg.textContent = on ? MSG_ON : MSG_OFF;
  }
}

/** The "Tra từ" toolbar: mode toggle (key T), hint text, and a box to type a word (keyboard route). */
export function lookupBar(): HTMLElement {
  ensure();
  const input = h('input', { type: 'text', class: 'lk-input', 'aria-label': 'Gõ từ tiếng Anh cần tra', placeholder: 'Gõ từ để tra…', autocomplete: 'off', spellcheck: 'false' }) as HTMLInputElement;
  const toggle = h('button', { class: 'toggle', type: 'button', 'aria-pressed': String(lookupOn), onclick: () => setLookupMode(!lookupOn) }, 'Tra từ ', h('kbd', {}, 'T')) as HTMLButtonElement;
  modeButtons.add(toggle);
  const bar = h('div', { class: 'lk-ui lk-bar' },
    toggle,
    h('form', {
      class: 'lk-form',
      onsubmit: (e: Event) => {
        e.preventDefault();
        const w = input.value.trim();
        if (/^[A-Za-z]+(?:'[A-Za-z]+)?$/.test(w)) void openFor(w, input);
      },
    }, input),
    h('span', { class: 'hint lk-msg' }, lookupOn ? MSG_ON : MSG_OFF));
  return bar;
}

/** Wrap English words inside every [data-lk] element under root so they can be clicked. */
export async function makeLookable(root: ParentNode): Promise<void> {
  ensure();
  const targets = [...root.querySelectorAll<HTMLElement>('[data-lk]')].filter((t) => !t.dataset.lkDone);
  if (targets.length === 0) return;
  const mixed = targets.some((t) => t.dataset.lk === 'mixed');
  const g = mixed ? await loadGlossary() : null;
  for (const t of targets) {
    t.dataset.lkDone = '1';
    const walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (!n.nodeValue?.trim() || n.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const n of nodes) {
      const pieces = splitWords(n.nodeValue ?? '');
      if (!pieces.some((p) => p.word)) continue;
      const frag = document.createDocumentFragment();
      for (const p of pieces) {
        // In Vietnamese text only wrap plain-ASCII words (>= 3 letters) that the glossary knows.
        const ok = p.word && (t.dataset.lk === 'en' || (p.text.length >= 3 && /^[A-Za-z']+$/.test(p.text) && g && lookupWord(g, p.text)));
        if (ok) {
          const s = h('span', { class: 'w' }, p.text);
          s.dataset.w = p.text.toLowerCase();
          frag.append(s);
        } else frag.append(p.text);
      }
      n.replaceWith(frag);
    }
  }
}
