import { fetchLessonsWithTags, fetchProgress, fetchRuns, fetchThreshold, fetchTopicQuestions, fetchTopics, type LessonRef, type PhaseRun, type Progress } from './api';
import { blueprint, phaseProgress, pickTestQuestions, type Blueprint, type PhaseLesson, type PhaseProgress } from './phase-test';
import type { Question, Topic } from './types';

export interface PhaseSummary extends PhaseProgress {
  phase: number;
  attempts: number;
  best: number | null;
  passed: boolean; // any attempt reached the pass score
  last: PhaseRun | null;
  plan: Blueprint;
}

/** Per-phase status for the home page: unlocked or not, attempts, best score. Pure, so it can be tested. */
export function phaseSummaries(topics: Topic[], refs: Pick<LessonRef, 'lesson_id' | 'topic_code'>[], progress: Progress[], runs: PhaseRun[], phases: readonly number[]): PhaseSummary[] {
  return phases.map((phase) => {
    const codes = new Set(topics.filter((t) => t.phase === phase).map((t) => t.topic_code));
    const ids = refs.filter((r) => codes.has(r.topic_code)).map((r) => r.lesson_id);
    const mine = runs.filter((r) => r.phase === phase).sort((a, b) => b.finished_at.localeCompare(a.finished_at));
    return {
      phase,
      ...phaseProgress(ids, progress),
      attempts: mine.length,
      best: mine.length ? Math.max(...mine.map((r) => r.score)) : null,
      passed: mine.some((r) => r.passed),
      last: mine[0] ?? null,
      plan: blueprint(ids.length),
    };
  });
}

export interface PhaseData {
  phase: number;
  topics: Topic[];
  lessons: PhaseLesson[];
  progress: PhaseProgress;
  unpractised: PhaseLesson[];
  weakLessonIds: Set<string>;
  plan: Blueprint;
  runs: PhaseRun[]; // newest first
  runsError: boolean; // the history table is missing or unreachable
  topicName: (code: string) => string;
}

export async function loadPhase(phase: number): Promise<PhaseData> {
  const [topics, allLessons, progressRows, threshold] = await Promise.all([fetchTopics(), fetchLessonsWithTags(), fetchProgress(), fetchThreshold()]);
  const mineTopics = topics.filter((t) => t.phase === phase).sort((a, b) => a.sort_order - b.sort_order);
  const codes = new Set(mineTopics.map((t) => t.topic_code));
  const lessons: PhaseLesson[] = allLessons
    .filter((l) => codes.has(l.topic_code))
    .map((l) => ({ lesson_id: l.lesson_id, topic_code: l.topic_code, ord: l.ord, title: l.title, tags: l.tags }));
  let runs: PhaseRun[] = [];
  let runsError = false;
  try {
    runs = await fetchRuns(phase);
  } catch {
    runsError = true;
  }
  const byLesson = new Map(progressRows.map((p) => [p.lesson_id, p]));
  const practised = new Set(progressRows.filter((p) => p.attempts_count >= 1).map((p) => p.lesson_id));
  const names = new Map(topics.map((t) => [t.topic_code, t.name_vi]));
  return {
    phase,
    topics: mineTopics,
    lessons,
    progress: phaseProgress(lessons.map((l) => l.lesson_id), progressRows),
    unpractised: lessons.filter((l) => !practised.has(l.lesson_id)),
    weakLessonIds: new Set(lessons.filter((l) => (byLesson.get(l.lesson_id)?.best_score ?? 0) < threshold * 100).map((l) => l.lesson_id)),
    plan: blueprint(lessons.length),
    runs,
    runsError,
    topicName: (code) => names.get(code) ?? code,
  };
}

/** Every approved question of the phase's topics, by topic. */
export async function loadBank(topics: Topic[]): Promise<Map<string, Question[]>> {
  const perTopic = await Promise.all(topics.map((t) => fetchTopicQuestions(t.topic_code)));
  return new Map(topics.map((t, i) => [t.topic_code, perTopic[i]]));
}

/** Draw a new test: links each topic's questions to lessons by tag, then picks. */
export async function buildTest(data: PhaseData, bank?: Map<string, Question[]>): Promise<Question[]> {
  const questionsByTopic = bank ?? (await loadBank(data.topics));
  const pools = new Map<string, Question[]>();
  for (const l of data.lessons) {
    pools.set(l.lesson_id, (questionsByTopic.get(l.topic_code) ?? []).filter((q) => (q.tags ?? []).some((t) => l.tags.includes(t))));
  }
  // avoid what the last two attempts asked, so a retake brings fresh questions
  const seenIds = new Set(data.runs.slice(0, 2).flatMap((r) => r.answers.map((a) => a.question_id)));
  return pickTestQuestions({ lessons: data.lessons, pools, weakLessonIds: data.weakLessonIds, seenIds, total: data.plan.questions });
}
