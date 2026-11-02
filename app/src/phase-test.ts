import { gradeAnswer, shuffle } from './grading';
import type { Answer, Level, Question } from './types';

/**
 * Cumulative test at the end of a learning phase. Rules and the reasons for the numbers are in docs/phase-test-spec.md.
 */
export const PASS_SCORE = 7; // out of 10: the test is mixed and harder than one lesson (80% there), so 70% shows a solid grasp
export const WEAK_BELOW = 0.6; // a topic answered below 60% is flagged as not solid yet, even when the test is passed
export const MIN_QUESTIONS = 20; // fewer items make the score too noisy
export const MAX_QUESTIONS = 40; // more than ~40 minutes tires a 14-15 year old
export const SECONDS_PER_QUESTION = 60;

export interface PhaseLesson { lesson_id: string; topic_code: string; ord: number; title: string; tags: string[] }
export interface Blueprint { questions: number; timeLimitS: number; passScore: number }

/** About one question per lesson, kept between 20 and 40; one minute per question. */
export function blueprint(lessonCount: number): Blueprint {
  const questions = Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, lessonCount));
  return { questions, timeLimitS: questions * SECONDS_PER_QUESTION, passScore: PASS_SCORE };
}

/** End-of-topic test: two questions per lesson (at least MIN_QUESTIONS), so every lesson of the topic is asked. */
export function topicBlueprint(lessonCount: number): Blueprint {
  const questions = Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, lessonCount * 2));
  return { questions, timeLimitS: questions * SECONDS_PER_QUESTION, passScore: PASS_SCORE };
}

export type TestUnit = 'giai đoạn' | 'chủ điểm';

export interface PhaseProgress { total: number; practiced: number; unlocked: boolean }

/** The test opens once every lesson of the phase has been practised at least once. */
export function phaseProgress(lessonIds: string[], progress: { lesson_id: string; attempts_count: number }[]): PhaseProgress {
  const done = new Set(progress.filter((p) => p.attempts_count >= 1).map((p) => p.lesson_id));
  const practiced = lessonIds.filter((id) => done.has(id)).length;
  return { total: lessonIds.length, practiced, unlocked: lessonIds.length > 0 && practiced === lessonIds.length };
}

/** Split `total` questions over topics in proportion to their lesson counts (largest remainder). */
export function allocateByTopic(lessonsPerTopic: Record<string, number>, total: number): Record<string, number> {
  const topics = Object.keys(lessonsPerTopic);
  const sum = topics.reduce((s, t) => s + lessonsPerTopic[t], 0);
  const out: Record<string, number> = {};
  if (sum === 0) return out;
  const raw = topics.map((t) => ({ t, exact: (lessonsPerTopic[t] / sum) * total }));
  for (const r of raw) out[r.t] = Math.floor(r.exact);
  let left = total - Object.values(out).reduce((a, b) => a + b, 0);
  for (const r of [...raw].sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)))) {
    if (left <= 0) break;
    out[r.t]++;
    left--;
  }
  return out;
}

export interface PickInput {
  lessons: PhaseLesson[];
  /** lesson_id -> questions that belong to that lesson (same topic, overlapping tags). */
  pools: Map<string, Question[]>;
  /** Lessons not yet mastered: they are asked first when not every lesson fits. */
  weakLessonIds: Set<string>;
  /** Questions from earlier attempts: avoided while fresh ones remain. */
  seenIds: Set<string>;
  total: number;
}

const LEVEL_SHARE: Record<Level, number> = { Recognition: 0.5, Comprehension: 0.3, Application: 0.2 };

/**
 * Random questions for the test: topics get a fair share, lessons within a topic are covered evenly
 * (weak lessons first, then those least seen before, when some must be left out), fresh questions are preferred over ones seen in earlier
 * attempts, and the 50/30/20 level mix is followed. The result is shuffled so topics are interleaved.
 */
export function pickTestQuestions(inp: PickInput, rng: () => number = Math.random): Question[] {
  const byTopic = new Map<string, PhaseLesson[]>();
  for (const l of inp.lessons) byTopic.set(l.topic_code, [...(byTopic.get(l.topic_code) ?? []), l]);
  const quota = allocateByTopic(Object.fromEntries([...byTopic].map(([t, ls]) => [t, ls.length])), inp.total);

  const chosen: Question[] = [];
  const used = new Set<string>();
  const levelCount: Record<Level, number> = { Recognition: 0, Comprehension: 0, Application: 0 };

  const take = (candidates: Question[]): Question | null => {
    const free = shuffle(candidates.filter((q) => !used.has(q.question_id)), rng);
    if (free.length === 0) return null;
    const fresh = free.filter((q) => !inp.seenIds.has(q.question_id));
    const from = fresh.length > 0 ? fresh : free;
    // follow the level mix: pick from the level that is furthest below its share
    const target = (l: Level): number => LEVEL_SHARE[l] * inp.total - levelCount[l];
    const best = [...from].sort((a, b) => target(b.cognitive_level) - target(a.cognitive_level))[0];
    used.add(best.question_id);
    levelCount[best.cognitive_level]++;
    chosen.push(best);
    return best;
  };

  for (const [topic, lessons] of byTopic) {
    const q = quota[topic] ?? 0;
    // Asked first: weak lessons, then lessons whose questions were seen least in earlier attempts (so the lessons
    // left out last time are asked now and every lesson is covered within two attempts), then random.
    const seenIn = (l: PhaseLesson): number => (inp.pools.get(l.lesson_id) ?? []).filter((x) => inp.seenIds.has(x.question_id)).length;
    const key = (l: PhaseLesson): [number, number] => [inp.weakLessonIds.has(l.lesson_id) ? 0 : 1, seenIn(l)];
    const order = shuffle(lessons, rng).sort((a, b) => key(a)[0] - key(b)[0] || key(a)[1] - key(b)[1]);
    const base = Math.floor(q / order.length);
    const extra = q % order.length;
    let shortfall = 0;
    order.forEach((l, i) => {
      const want = base + (i < extra ? 1 : 0);
      for (let k = 0; k < want; k++) if (!take(inp.pools.get(l.lesson_id) ?? [])) shortfall++;
    });
    // a lesson with a small bank: top up from the other lessons of the same topic until nothing more is available
    while (shortfall > 0) {
      let gained = false;
      for (const l of order) {
        if (shortfall <= 0) break;
        if (take(inp.pools.get(l.lesson_id) ?? [])) {
          shortfall--;
          gained = true;
        }
      }
      if (!gained) break;
    }
  }
  return shuffle(chosen, rng).slice(0, inp.total);
}

export interface Graded { question: Question; answer: Answer | undefined; correct: boolean }

/** Unanswered questions count as wrong. */
export function gradeTest(questions: Question[], answers: Record<string, Answer | undefined>): Graded[] {
  return questions.map((q) => {
    const a = answers[q.question_id];
    return { question: q, answer: a, correct: a !== undefined && gradeAnswer(q, a) };
  });
}

export interface TopicScore { topic_code: string; correct: number; total: number }
export interface WeakLesson { lesson_id: string; title: string; ord: number; topic_code: string; missed: number; of: number }
export interface TestResult { total: number; correct: number; score: number; passed: boolean; topics: TopicScore[]; weakTopics: string[]; weakLessons: WeakLesson[] }

/** Topics answered below WEAK_BELOW (at least 2 questions asked), weakest first. */
export function weakTopicsOf(topics: TopicScore[]): string[] {
  return topics.filter((t) => t.total >= 2 && t.correct / t.total < WEAK_BELOW).sort((a, b) => a.correct / a.total - b.correct / b.total).map((t) => t.topic_code);
}

export function summarize(graded: Graded[], lessons: PhaseLesson[]): TestResult {
  const total = graded.length;
  const correct = graded.filter((g) => g.correct).length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 100) / 10;

  const topicMap = new Map<string, TopicScore>();
  const lessonMap = new Map<string, WeakLesson>();
  for (const g of graded) {
    const t = topicMap.get(g.question.topic_code) ?? { topic_code: g.question.topic_code, correct: 0, total: 0 };
    t.total++;
    if (g.correct) t.correct++;
    topicMap.set(t.topic_code, t);
    const tags = g.question.tags ?? [];
    for (const l of lessons) {
      if (l.topic_code !== g.question.topic_code || !l.tags.some((x) => tags.includes(x))) continue;
      const w = lessonMap.get(l.lesson_id) ?? { lesson_id: l.lesson_id, title: l.title, ord: l.ord, topic_code: l.topic_code, missed: 0, of: 0 };
      w.of++;
      if (!g.correct) w.missed++;
      lessonMap.set(l.lesson_id, w);
    }
  }
  const topics = [...topicMap.values()];
  return {
    total,
    correct,
    score,
    passed: score >= PASS_SCORE,
    topics,
    weakTopics: weakTopicsOf(topics),
    weakLessons: [...lessonMap.values()].filter((w) => w.missed > 0).sort((a, b) => b.missed - a.missed || a.ord - b.ord).slice(0, 5),
  };
}

export interface Feedback { headline: string; praise: string; advice: string; short: string }

const lessonLabel = (w: WeakLesson, topicName: (code: string) => string): string => `Bài ${w.ord} · ${w.title} (${topicName(w.topic_code)})`;

/** Encouragement, what is still weak even if the test is passed, and what to do next. */
export function feedbackFor(r: TestResult, topicName: (code: string) => string, previousScore: number | null, unit: TestUnit = 'giai đoạn'): Feedback {
  const headline =
    r.score >= 9 ? 'Xuất sắc!' : r.score >= 8 ? 'Rất tốt!' : r.passed ? 'Đạt rồi, giỏi lắm!' : r.score >= 5 ? 'Gần đạt rồi, cố thêm chút nữa nhé!' : 'Không sao, bài này giúp em biết cần ôn gì';

  let praise = r.passed
    ? `Em đã vượt qua bài kiểm tra với ${r.score.toFixed(1)}/10 (đúng ${r.correct}/${r.total} câu). Sự cố gắng của em thật đáng khen.`
    : `Em làm đúng ${r.correct}/${r.total} câu. Mỗi lần làm bài là một lần nhớ lâu hơn, em đang đi đúng hướng.`;
  if (previousScore !== null) {
    const diff = Math.round((r.score - previousScore) * 10) / 10;
    if (diff > 0) praise += ` Điểm cao hơn lần trước ${diff} điểm, em đang tiến bộ rõ rệt!`;
    else if (diff < 0) praise += ` Lần này thấp hơn lần trước ${Math.abs(diff)} điểm, không sao, ôn chỗ yếu rồi thử lại nhé.`;
    else praise += ' Điểm bằng lần trước, em giữ phong độ rất ổn định.';
  }

  const list = r.weakLessons.slice(0, 4).map((w) => lessonLabel(w, topicName)).join('; ');
  let advice: string;
  if (r.weakLessons.length > 0) {
    advice = r.passed
      ? `Dù đã đạt, em vẫn còn chỗ chưa thật vững: ${list}. Em nên học lại các bài này rồi làm lại bài kiểm tra để chắc hơn.`
      : `Em nên học lại các bài sau rồi làm lại bài kiểm tra: ${list}.`;
  } else if (r.passed) {
    advice = unit === 'chủ điểm'
      ? 'Em nắm vững cả chủ điểm này. Em có thể sang chủ điểm tiếp theo, và làm lại bài kiểm tra bất cứ lúc nào để ôn.'
      : 'Em nắm vững cả giai đoạn này. Em có thể sang giai đoạn tiếp theo, và làm lại bài kiểm tra bất cứ lúc nào để ôn.';
  } else {
    advice = 'Các câu sai rải rác ở nhiều bài. Em xem lại lý thuyết từng bài, luyện thêm rồi làm lại bài kiểm tra nhé.';
  }

  const short = r.weakTopics.length > 0 ? `Cần ôn: ${r.weakTopics.map(topicName).join(', ')}` : r.passed ? `Vững cả ${unit}` : 'Câu sai rải rác ở nhiều bài';
  return { headline, praise, advice, short };
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return m === 0 ? `${s} giây` : `${m} phút ${String(s % 60).padStart(2, '0')} giây`;
}

export const remainingSeconds = (deadlineMs: number, nowMs: number): number => Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
