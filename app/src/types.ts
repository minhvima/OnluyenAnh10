export type QuestionType =
  | 'multiple_choice'
  | 'fill_in_blank'
  | 'matching'
  | 'error_identification'
  | 'sentence_transformation'
  | 'sentence_combination';

export interface ChoiceOption { id: string; text: string }
export interface MatchPair { left: string; right: string }

export interface Question {
  question_id: string;
  topic_code: string;
  cognitive_level: 'Recognition' | 'Comprehension' | 'Application';
  question_type: QuestionType;
  prompt: string;
  options: ChoiceOption[] | MatchPair[];
  correct_answer: string;
  accepted_answers: string[];
  explanation: string;
  hint: string | null;
}

/** Answer shape depends on type: option id, typed text, or right-index per left item. */
export type Answer = string | number[];
