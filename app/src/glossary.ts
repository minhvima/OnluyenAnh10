export interface Entry {
  lemma: string;
  pos: string;
  ipa: string;
  vi: string;
  ex: string;
  exvi: string;
  note: string;
}

/** glossary.json stores each form as [lemma, pos, ipa, vi, ex, exvi, note] to keep the file small. */
export type GlossaryFile = Record<string, string[]>;
export type Glossary = Map<string, Entry>;

export function parseGlossary(raw: GlossaryFile): Glossary {
  const g: Glossary = new Map();
  for (const [w, a] of Object.entries(raw)) {
    g.set(w, { lemma: a[0] ?? w, pos: a[1] ?? '', ipa: a[2] ?? '', vi: a[3] ?? '', ex: a[4] ?? '', exvi: a[5] ?? '', note: a[6] ?? '' });
  }
  return g;
}

/** Find an entry for a clicked word: exact form first, then without a possessive 's. */
export function lookupWord(g: Glossary, word: string): Entry | null {
  const w = word.toLowerCase().replace(/[‘’]/g, "'");
  return g.get(w) ?? g.get(w.replace(/'s$/, '')) ?? null;
}

let pending: Promise<Glossary> | null = null;

/** Download the glossary once, on first use. Resolves to an empty glossary if it cannot be loaded. */
export function loadGlossary(url = `${import.meta.env.BASE_URL}glossary.json`): Promise<Glossary> {
  if (!pending) {
    pending = fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<GlossaryFile>) : Promise.reject(new Error(String(r.status)))))
      .then(parseGlossary)
      .catch(() => {
        pending = null;
        return new Map() as Glossary;
      });
  }
  return pending;
}
