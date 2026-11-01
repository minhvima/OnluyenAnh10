import { supabase } from './lib/supabase';
import type { Lesson, Question, Topic } from './types';

function db() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export interface LessonRef { lesson_id: string; topic_code: string; ord: number; title: string; estimated_minutes: number }

export async function fetchTopics(): Promise<Topic[]> {
  const { data, error } = await db().from('topics').select('topic_code,name_vi,name_en,sort_order,phase,prereqs').eq('active', true).order('sort_order');
  if (error) throw error;
  return (data ?? []) as Topic[];
}

/** Approved lessons only (row-level security hides drafts from students). */
export async function fetchLessonRefs(): Promise<LessonRef[]> {
  const { data, error } = await db().from('lessons').select('lesson_id,topic_code,ord,title,estimated_minutes').order('topic_code').order('ord');
  if (error) throw error;
  return (data ?? []) as LessonRef[];
}

export async function fetchLesson(id: string): Promise<Lesson | null> {
  const { data, error } = await db().from('lessons').select('lesson_id,topic_code,ord,title,estimated_minutes,content').eq('lesson_id', id).maybeSingle();
  if (error) throw error;
  return (data as Lesson | null) ?? null;
}

/** Questions of a topic that share at least one practice tag with the lesson. */
export async function fetchPool(topic: string, tags: string[]): Promise<Question[]> {
  if (tags.length === 0) return [];
  const { data, error } = await db()
    .from('questions')
    .select('question_id,topic_code,cognitive_level,question_type,prompt,options,correct_answer,accepted_answers,explanation,hint,tags')
    .eq('topic_code', topic)
    .overlaps('tags', tags);
  if (error) throw error;
  return (data ?? []) as Question[];
}

export interface Progress { lesson_id: string; status: 'in_progress' | 'mastered'; best_score: number | null; last_score: number | null; attempts_count: number }

export async function fetchProgress(): Promise<Progress[]> {
  const { data, error } = await db().from('lesson_progress').select('lesson_id,status,best_score,last_score,attempts_count');
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, best_score: r.best_score === null ? null : Number(r.best_score), last_score: r.last_score === null ? null : Number(r.last_score) })) as Progress[];
}

export async function fetchThreshold(): Promise<number> {
  try {
    const { data } = await db().from('app_settings').select('value').eq('key', 'mastery_threshold').maybeSingle();
    const v = Number(data?.value);
    return v > 0 && v <= 1 ? v : 0.8;
  } catch {
    return 0.8;
  }
}

export interface AnswerRecord { question_id: string; answer: string; correct: boolean; time_ms: number }

/** Save one practice session: every answer, plus the lesson's best/last score and mastery. */
export async function saveSession(
  userId: string,
  lesson: { lesson_id: string; topic_code: string },
  records: AnswerRecord[],
  threshold: number,
): Promise<{ score: number; mastered: boolean }> {
  const client = db();
  const correct = records.filter((r) => r.correct).length;
  const score = records.length === 0 ? 0 : Math.round((correct / records.length) * 1000) / 10;

  const { data: prev } = await client.from('lesson_progress').select('best_score,attempts_count,status,mastered_at').eq('user_id', userId).eq('lesson_id', lesson.lesson_id).maybeSingle();
  const wasMastered = prev?.status === 'mastered';
  const mastered = wasMastered || score >= threshold * 100;

  const { error: e1 } = await client.from('attempts').insert(
    records.map((r) => ({
      user_id: userId, question_id: r.question_id, topic_code: lesson.topic_code, lesson_id: lesson.lesson_id,
      context: 'practice', answer: r.answer, is_correct: r.correct, time_ms: r.time_ms,
    })),
  );
  if (e1) throw e1;

  const { error: e2 } = await client.from('lesson_progress').upsert({
    user_id: userId,
    lesson_id: lesson.lesson_id,
    status: mastered ? 'mastered' : 'in_progress',
    best_score: Math.max(Number(prev?.best_score ?? 0), score),
    last_score: score,
    attempts_count: (prev?.attempts_count ?? 0) + 1,
    mastered_at: wasMastered ? prev?.mastered_at : mastered ? new Date().toISOString() : null,
    last_activity: new Date().toISOString(),
  });
  if (e2) throw e2;
  return { score, mastered };
}
