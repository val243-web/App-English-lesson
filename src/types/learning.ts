export type LevelId = 1 | 2 | 3;

export type PartId = '1-1' | '1-2' | '2-1' | '2-2' | '3-1' | '3-2';

export type StoryId =
  | 'story-1-start'
  | 'story-1-end'
  | 'story-2-start'
  | 'story-2-end'
  | 'story-3-start'
  | 'story-3-end';

export type AccentMode = 'en-US' | 'en-GB';

export type ThemeMode = 'light' | 'dark';

export type QuestionKind = 'choice' | 'audio-choice' | 'fill-blank' | 'pronounce';

export interface QuizQuestion {
  id: string;
  kind: QuestionKind;
  promptFr: string;
  targetEn: string;
  phonetic?: string;
  options: string[];
  correctIndex: number;
  explanationFr: string;
  tipFr?: string;
}

export interface StoryVocabularyItem {
  word: string;
  translationFr: string;
  phonetic: string;
}

export interface StoryComprehensionQuestion {
  id: string;
  promptFr: string;
  options: string[];
  correctIndex: number;
  explanationFr: string;
}

export interface StoryDefinition {
  id: StoryId;
  levelId: LevelId;
  position: 'start' | 'end';
  titleFr: string;
  titleEn: string;
  settingFr: string;
  xpReward: number;
  paragraphsEn: string[];
  paragraphsFr: string[];
  keyVocabulary: StoryVocabularyItem[];
  questions: StoryComprehensionQuestion[];
}

export interface LevelPart {
  id: PartId;
  levelId: LevelId;
  partNumber: 1 | 2;
  titleFr: string;
  subtitleFr: string;
  focusTopicFr: string;
  xpReward: number;
  passingScorePercent: number;
  questions: QuizQuestion[];
}

export interface LevelDefinition {
  id: LevelId;
  cefr: string;
  titleFr: string;
  descriptionFr: string;
  imageUrl: string;
  imageAlt: string;
  openingStory: StoryDefinition;
  parts: [LevelPart, LevelPart];
  closingStory: StoryDefinition;
}

export type DictionaryCategory =
  | 'Salutations'
  | 'Quotidien'
  | 'Voyage'
  | 'Travail'
  | 'Expressions'
  | 'Difficiles'
  | 'En ligne';

export interface DictionaryEntry {
  id: string;
  word: string;
  ipaUS: string;
  ipaUK: string;
  syllables: string;
  partOfSpeech: 'nom' | 'verbe' | 'adjectif' | 'adverbe' | 'expression' | string;
  level: LevelId;
  category: DictionaryCategory;
  translationFr: string;
  definitionFr: string;
  pronunciationTipFr: string;
  exampleEn: string;
  exampleFr: string;
  audioUrl?: string;
  source?: 'local' | 'online';
}

export interface PartProgress {
  completed: boolean;
  bestScore: number;
  totalQuestions: number;
  stars: 0 | 1 | 2 | 3;
  attempts: number;
}

export interface StoryProgress {
  completed: boolean;
  bestScore: number;
  totalQuestions: number;
}

export interface BadgeDefinition {
  id: string;
  titleFr: string;
  descriptionFr: string;
  category: 'Progression' | 'Histoires' | 'Vocabulaire' | 'Pratique';
}

export interface UserProgress {
  xp: number;
  streak: number;
  lastActiveDate: string;
  accent: AccentMode;
  theme: ThemeMode;
  soundEffects: boolean;
  unlockAllPreview: boolean;
  parts: Record<PartId, PartProgress>;
  stories: Record<StoryId, StoryProgress>;
  favoriteWordIds: string[];
  practicedWords: Record<string, number>;
  masteredRevisionIds: string[];
  weakQuestionIds: string[];
  cachedOnlineWords: DictionaryEntry[];
  unlockedBadges: string[];
  revisionSessionsCompleted: number;
}
