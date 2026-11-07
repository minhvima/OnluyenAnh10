import { supabase } from './lib/supabase';
import { applyReview, recordWrong, type MistakeRow } from './mistake-book';
import type { Question } from './types';

function db() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

const COLS = 'question_id,topic_code,wrong_count,stage,next_review_at,mastered,last_wrong_at,reviews_count,last_reviewed_at';

/** The signed-in student's whole book (row-level security keeps it to their own rows). */
export async function fetchMistakes(): Promise<MistakeRow[]> {
  const { data, error } = await db().from('mistake_book').select(COLS).range(0, 4999);
  if (error) throw error;
  return (data ?? []) as MistakeRow[];
}

async function upsertRows(userId: string, rows: MistakeRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await db().from('mistake_book').upsert(rows.map((r) => ({ ...r, user_id: userId })));
  if (error) throw error;
}

/**
 * Put wrongly answered questions in the book (practice, lesson test, topic/phase test all call this).
 * Never throws: the book is a bonus on top of saving the result, so a failure must not break the screen.
 */
export async function recordMistakes(userId: string, wrong: { question_id: string; topic_code: string }[], now = new Date()): Promise<boolean> {
  const uniq = [...new Map(wrong.map((w) => [w.question_id, w] as const)).values()];
  if (uniq.length === 0) return true;
  try {
    const { data, error } = await db().from('mistake_book').select(COLS).in('question_id', uniq.map((w) => w.question_id));
    if (error) throw error;
    const have = new Map(((data ?? []) as MistakeRow[]).map((r) => [r.question_id, r] as const));
    await upsertRows(userId, uniq.map((w) => recordWrong(have.get(w.question_id), w, now)));
    return true;
  } catch (e) {
    console.error('mistake_book: could not record wrong answers', e);
    return false;
  }
}

/** Save the result of one review answer; returns the updated row. */
export async function saveReviewAnswer(userId: string, row: MistakeRow, correct: boolean, now = new Date()): Promise<MistakeRow> {
  const next = applyReview(row, correct, now);
  await upsertRows(userId, [next]);
  return next;
}

/** Save a question that was sent back to stage 0 because its answer was looked at (see peekLapse). */
export async function saveLapse(userId: string, row: MistakeRow): Promise<void> {
  await upsertRows(userId, [row]);
}

const QUESTION_COLS = 'question_id,topic_code,cognitive_level,question_type,prompt,options,correct_answer,accepted_answers,explanation,hint,tags';

/** Questions by id, in small batches so the request address stays short. */
export async function fetchQuestionsByIds(ids: string[]): Promise<Question[]> {
  const out: Question[] = [];
  for (let i = 0; i < ids.length; i += 40) {
    const part = ids.slice(i, i + 40);
    const run = (cols: string) => db().from('questions').select(cols).in('question_id', part);
    let { data, error } = await run(`${QUESTION_COLS},why_wrong`);
    if (error) ({ data, error } = await run(QUESTION_COLS)); // why_wrong column may not exist yet
    if (error) throw error;
    out.push(...((data ?? []) as unknown as Question[]));
  }
  return out;
}
