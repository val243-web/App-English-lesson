import { PartId, PartProgress, StoryId, StoryProgress, UserProgress } from '../types/learning';

const STORAGE_KEY = 'english_lesson_progress_v2';
const LEGACY_STORAGE_KEY = 'linguastep_progress_v1';

const PART_ORDER: PartId[] = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2'];

function createEmptyParts(): Record<PartId, PartProgress> {
  return {
    '1-1': { completed: false, bestScore: 0, totalQuestions: 10, stars: 0, attempts: 0 },
    '1-2': { completed: false, bestScore: 0, totalQuestions: 10, stars: 0, attempts: 0 },
    '2-1': { completed: false, bestScore: 0, totalQuestions: 10, stars: 0, attempts: 0 },
    '2-2': { completed: false, bestScore: 0, totalQuestions: 10, stars: 0, attempts: 0 },
    '3-1': { completed: false, bestScore: 0, totalQuestions: 10, stars: 0, attempts: 0 },
    '3-2': { completed: false, bestScore: 0, totalQuestions: 10, stars: 0, attempts: 0 },
  };
}

function createEmptyStories(): Record<StoryId, StoryProgress> {
  return {
    'story-1-start': { completed: false, bestScore: 0, totalQuestions: 3 },
    'story-1-end': { completed: false, bestScore: 0, totalQuestions: 3 },
    'story-2-start': { completed: false, bestScore: 0, totalQuestions: 3 },
    'story-2-end': { completed: false, bestScore: 0, totalQuestions: 3 },
    'story-3-start': { completed: false, bestScore: 0, totalQuestions: 3 },
    'story-3-end': { completed: false, bestScore: 0, totalQuestions: 3 },
  };
}

export function getDefaultProgress(): UserProgress {
  const today = new Date().toISOString().slice(0, 10);
  return {
    xp: 0,
    streak: 1,
    lastActiveDate: today,
    accent: 'en-US',
    theme: 'light',
    soundEffects: true,
    unlockAllPreview: false,
    parts: createEmptyParts(),
    stories: createEmptyStories(),
    favoriteWordIds: ['w-hello', 'w-schedule', 'w-through'],
    practicedWords: {},
    masteredRevisionIds: [],
    weakQuestionIds: [],
    cachedOnlineWords: [],
    unlockedBadges: [],
    revisionSessionsCompleted: 0,
  };
}

export function loadProgress(): UserProgress {
  if (typeof window === 'undefined') return getDefaultProgress();
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return getDefaultProgress();
    const parsed = JSON.parse(raw) as Partial<UserProgress>;
    const defaults = getDefaultProgress();

    const today = new Date().toISOString().slice(0, 10);
    let streak = parsed.streak ?? 1;
    const lastDate = parsed.lastActiveDate ?? today;

    if (lastDate !== today) {
      const prev = new Date(lastDate);
      const curr = new Date(today);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak += 1;
      } else if (diffDays > 1) {
        streak = 1;
      }
    }

    return {
      ...defaults,
      ...parsed,
      streak,
      lastActiveDate: today,
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      parts: {
        ...defaults.parts,
        ...(parsed.parts ?? {}),
      },
      stories: {
        ...defaults.stories,
        ...(parsed.stories ?? {}),
      },
      favoriteWordIds: Array.isArray(parsed.favoriteWordIds)
        ? parsed.favoriteWordIds
        : defaults.favoriteWordIds,
      practicedWords: parsed.practicedWords ?? {},
      masteredRevisionIds: Array.isArray(parsed.masteredRevisionIds)
        ? parsed.masteredRevisionIds
        : [],
      weakQuestionIds: Array.isArray(parsed.weakQuestionIds) ? parsed.weakQuestionIds : [],
      cachedOnlineWords: Array.isArray(parsed.cachedOnlineWords) ? parsed.cachedOnlineWords : [],
      unlockedBadges: Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges : [],
      revisionSessionsCompleted: parsed.revisionSessionsCompleted ?? 0,
    };
  } catch {
    return getDefaultProgress();
  }
}

export function saveProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors
  }
}

export function isStoryUnlocked(storyId: StoryId, progress: UserProgress): boolean {
  if (progress.unlockAllPreview) return true;
  switch (storyId) {
    case 'story-1-start':
      return true;
    case 'story-1-end':
      return progress.parts['1-2'].completed;
    case 'story-2-start':
      return progress.stories['story-1-end'].completed;
    case 'story-2-end':
      return progress.parts['2-2'].completed;
    case 'story-3-start':
      return progress.stories['story-2-end'].completed;
    case 'story-3-end':
      return progress.parts['3-2'].completed;
    default:
      return false;
  }
}

export function isPartUnlocked(partId: PartId, progress: UserProgress): boolean {
  if (progress.unlockAllPreview) return true;
  switch (partId) {
    case '1-1':
      return progress.stories['story-1-start'].completed;
    case '1-2':
      return progress.parts['1-1'].completed;
    case '2-1':
      return progress.stories['story-2-start'].completed;
    case '2-2':
      return progress.parts['2-1'].completed;
    case '3-1':
      return progress.stories['story-3-start'].completed;
    case '3-2':
      return progress.parts['3-1'].completed;
    default:
      return false;
  }
}

export function getNextPartId(partId: PartId): PartId | null {
  const idx = PART_ORDER.indexOf(partId);
  if (idx === -1 || idx >= PART_ORDER.length - 1) return null;
  return PART_ORDER[idx + 1];
}

export function calculateStars(score: number, total: number): 0 | 1 | 2 | 3 {
  const ratio = score / Math.max(total, 1);
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.75) return 2;
  if (ratio >= 0.6) return 1;
  return 0;
}

export function getCurrentLearnerTier(progress: UserProgress): string {
  if (progress.stories['story-3-end'].completed) return 'Maîtrise C1-C2';
  if (progress.stories['story-2-end'].completed) return 'Niveau 3 · Avancé';
  if (progress.stories['story-1-end'].completed) return 'Niveau 2 · Intermédiaire';
  return 'Niveau 1 · Débutant';
}
