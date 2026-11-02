export type QuestionType =
  | 'multiple_choice'
  | 'fill_in_blank'
  | 'matching'
  | 'error_identification'
  | 'sentence_transformation'
  | 'sentence_combination';

export interface ChoiceOption { id: string; text: string }
export interface MatchPair { left: string; right: string }

export type Level = 'Recognition' | 'Comprehension' | 'Application';

export interface Question {
  question_id: string;
  topic_code: string;
  cognitive_level: Level;
  question_type: QuestionType;
  prompt: string;
  options: ChoiceOption[] | MatchPair[];
  correct_answer: string;
  accepted_answers: string[];
  explanation: string;
  /** Why each wrong answer is wrong: option id -> reason (choice types), typed wrong answer -> reason (fill in). */
  why_wrong?: Record<string, string>;
  hint: string | null;
  tags?: string[];
}

/** Answer shape depends on type: option id, typed text, or right-index per left item. */
export type Answer = string | number[];

/** Sentence-part roles used by annotated examples (see tools/validate_lesson_ext.py). */
export type Role = 'S' | 'V' | 'Aux' | 'O' | 'C' | 'Adj' | 'Adv' | 'Prep' | 'Conj';
export interface Part { t: string; r: Role }
export interface AnnotatedExample { parts: Part[]; vi: string }

export interface FormulaV2 {
  form: string;
  label: string;
  parts: Part[];
  note?: string;
  examples: AnnotatedExample[];
}
export interface RuleRow { case: string; rule: string; examples: { en: string; vi?: string }[] }
export interface RuleTable { title: string; rows: RuleRow[] }
export interface UseExample extends AnnotatedExample { use: string }

export interface LessonContent {
  objective?: string;
  story?: { title: string; lines: { en: string; vi: string }[] };
  observe?: string[];
  formula?: { form: string; pattern: string; example: string }[];
  signals?: string[];
  comparison_tables?: { title: string; rows: string[][] }[];
  common_mistakes?: { wrong: string; right: string; why: string }[];
  mnemonic?: string;
  flashcards?: { front: string; back: string }[];
  video?: { embed_url?: string; approved?: boolean } | null;
  practice_tags?: string[];
  // Added by tools/merge_lesson_ext.py
  formula_v2?: FormulaV2[];
  rules?: RuleTable[];
  examples?: UseExample[];
}

export interface Lesson {
  lesson_id: string;
  topic_code: string;
  ord: number;
  title: string;
  estimated_minutes: number;
  content: LessonContent;
}

export interface Topic {
  topic_code: string;
  name_vi: string;
  name_en: string;
  sort_order: number;
  phase: number;
  prereqs: string[];
}
