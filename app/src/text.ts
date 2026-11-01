export interface Segment { text: string; underline: boolean }

/**
 * Split a prompt into plain and underlined segments. Only <u>...</u> is understood;
 * every other tag is dropped, so stored text can never inject markup.
 */
export function parseUnderline(html: string): Segment[] {
  const out: Segment[] = [];
  const re = /<u>(.*?)<\/u>/gs;
  let last = 0;
  const push = (raw: string, underline: boolean): void => {
    const text = raw.replace(/<[^>]*>/g, '');
    if (text) out.push({ text, underline });
  };
  for (let m = re.exec(html); m; m = re.exec(html)) {
    push(html.slice(last, m.index), false);
    push(m[1], true);
    last = m.index + m[0].length;
  }
  push(html.slice(last), false);
  return out;
}

export interface Piece { text: string; word: boolean }

const WORD = /([A-Za-z]+(?:'[A-Za-z]+)?)/;

/** Split text into word and non-word pieces so each English word can be made clickable. */
export function splitWords(text: string): Piece[] {
  return text
    .split(WORD)
    .map((t, i) => ({ text: t, word: i % 2 === 1 }))
    .filter((p) => p.text !== '');
}
