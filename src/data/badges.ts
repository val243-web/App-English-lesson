import { BadgeDefinition, UserProgress } from '../types/learning';

export const BADGES: BadgeDefinition[] = [
  {
    id: 'badge-first-story',
    titleFr: 'Lecteur curieux',
    descriptionFr: 'Lire et valider votre première histoire d’ouverture.',
    category: 'Histoires',
  },
  {
    id: 'badge-first-quiz',
    titleFr: 'Premier pas',
    descriptionFr: 'Réussir votre tout premier quiz de niveau.',
    category: 'Progression',
  },
  {
    id: 'badge-level-1',
    titleFr: 'Maître Débutant A1-A2',
    descriptionFr: 'Valider les 2 quiz et l’histoire finale du Niveau 1.',
    category: 'Progression',
  },
  {
    id: 'badge-level-2',
    titleFr: 'Explorateur B1-B2',
    descriptionFr: 'Terminer toutes les étapes et histoires du Niveau 2.',
    category: 'Progression',
  },
  {
    id: 'badge-level-3',
    titleFr: 'Sommet C1-C2',
    descriptionFr: 'Accomplir l’intégralité du Niveau 3 avancé.',
    category: 'Progression',
  },
  {
    id: 'badge-storyteller',
    titleFr: 'Collectionneur d’histoires',
    descriptionFr: 'Compléter les 6 histoires des trois niveaux.',
    category: 'Histoires',
  },
  {
    id: 'badge-perfect-score',
    titleFr: 'Sans faute',
    descriptionFr: 'Obtenir 100 % de bonnes réponses sur une partie de quiz.',
    category: 'Pratique',
  },
  {
    id: 'badge-voice-coach',
    titleFr: 'Voix assurée',
    descriptionFr: 'Travailler la prononciation de 5 mots ou plus dans le Coach vocal.',
    category: 'Pratique',
  },
  {
    id: 'badge-dict-explorer',
    titleFr: 'Dictionnaire vivant',
    descriptionFr: 'Enrichir votre dictionnaire local avec au moins 4 nouveaux mots en ligne.',
    category: 'Vocabulaire',
  },
  {
    id: 'badge-revision-pro',
    titleFr: 'Mémoire d’acier',
    descriptionFr: 'Compléter au moins 2 sessions en mode Révision.',
    category: 'Pratique',
  },
];

export function evaluateUnlockedBadges(progress: UserProgress): string[] {
  const unlocked = new Set(progress.unlockedBadges);

  const storiesCompletedCount = Object.values(progress.stories).filter((s) => s.completed).length;
  const partsCompletedCount = Object.values(progress.parts).filter((p) => p.completed).length;

  if (storiesCompletedCount >= 1) unlocked.add('badge-first-story');
  if (partsCompletedCount >= 1) unlocked.add('badge-first-quiz');

  if (
    progress.stories['story-1-start'].completed &&
    progress.parts['1-1'].completed &&
    progress.parts['1-2'].completed &&
    progress.stories['story-1-end'].completed
  ) {
    unlocked.add('badge-level-1');
  }

  if (
    progress.stories['story-2-start'].completed &&
    progress.parts['2-1'].completed &&
    progress.parts['2-2'].completed &&
    progress.stories['story-2-end'].completed
  ) {
    unlocked.add('badge-level-2');
  }

  if (
    progress.stories['story-3-start'].completed &&
    progress.parts['3-1'].completed &&
    progress.parts['3-2'].completed &&
    progress.stories['story-3-end'].completed
  ) {
    unlocked.add('badge-level-3');
  }

  if (storiesCompletedCount >= 6) unlocked.add('badge-storyteller');

  const hasPerfect = Object.values(progress.parts).some(
    (p) => p.completed && p.bestScore >= p.totalQuestions && p.totalQuestions > 0
  );
  if (hasPerfect) unlocked.add('badge-perfect-score');

  const practicedSuccessCount = Object.values(progress.practicedWords).filter((s) => s >= 70).length;
  if (practicedSuccessCount >= 5) unlocked.add('badge-voice-coach');

  if (progress.cachedOnlineWords.length >= 4) unlocked.add('badge-dict-explorer');
  if (progress.revisionSessionsCompleted >= 2) unlocked.add('badge-revision-pro');

  return Array.from(unlocked);
}
