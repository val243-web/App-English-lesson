import { useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  Lock,
  Moon,
  Play,
  Star,
  Sun,
} from 'lucide-react';
import { BADGES } from '../data/badges';
import { LEVELS } from '../data/curriculum';
import { LevelPart, PartId, StoryDefinition, StoryId, UserProgress } from '../types/learning';
import { getCurrentLearnerTier, isPartUnlocked, isStoryUnlocked } from '../utils/storage';

interface LevelPathViewProps {
  progress: UserProgress;
  onStartPart: (part: LevelPart) => void;
  onStartStory: (story: StoryDefinition) => void;
  onToggleTheme: () => void;
  onOpenRevision: () => void;
}

function LevelIllustration({ src, alt, fallbackTitle }: { src: string; alt: string; fallbackTitle: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 p-6 text-center text-slate-500 dark:text-slate-400">
        <Compass className="mb-2 h-8 w-8 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{fallbackTitle}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}

export function LevelPathView({
  progress,
  onStartPart,
  onStartStory,
  onToggleTheme,
  onOpenRevision,
}: LevelPathViewProps) {
  const completedParts = Object.values(progress.parts).filter((p) => p.completed).length;
  const completedStories = Object.values(progress.stories).filter((s) => s.completed).length;
  const currentTierLabel = getCurrentLearnerTier(progress);

  // Recommend next chronological step: opening story -> part 1 -> part 2 -> closing story
  let nextLabel = 'Lire l’histoire d’ouverture (Niv. 1)';
  let triggerNext = () => onStartStory(LEVELS[0].openingStory);

  for (const lvl of LEVELS) {
    if (!progress.stories[lvl.openingStory.id].completed && isStoryUnlocked(lvl.openingStory.id, progress)) {
      nextLabel = `Histoire d’ouverture · Niv. ${lvl.id}`;
      triggerNext = () => onStartStory(lvl.openingStory);
      break;
    }
    const incompletePart = lvl.parts.find(
      (p) => !progress.parts[p.id].completed && isPartUnlocked(p.id, progress)
    );
    if (incompletePart) {
      nextLabel = `Continuer : Quiz ${incompletePart.levelId}.${incompletePart.partNumber}`;
      triggerNext = () => onStartPart(incompletePart);
      break;
    }
    if (!progress.stories[lvl.closingStory.id].completed && isStoryUnlocked(lvl.closingStory.id, progress)) {
      nextLabel = `Histoire finale · Niv. ${lvl.id}`;
      triggerNext = () => onStartStory(lvl.closingStory);
      break;
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero Summary + Workspace Quick Controls */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              English Lesson · Stockage local sur votre téléphone · 3 niveaux · 6 histoires · 60 questions
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl [text-wrap:balance]">
              Lisez une histoire, relevez les quiz et maîtrisez chaque niveau
            </h1>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
              Chaque palier débute par une histoire à écouter et comprendre, se poursuit avec deux
              parties de quiz, et s’achève par un récit de clôture.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col shrink-0">
            <button
              type="button"
              onClick={triggerNext}
              className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              <span className="whitespace-nowrap">{nextLabel}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenRevision}
                className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <span>Mode révision</span>
              </button>

              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={progress.theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {progress.theme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
                    <span>Clair</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-slate-600" aria-hidden="true" />
                    <span>Sombre</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 4-Column Metric Strip */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6 sm:grid-cols-4 sm:gap-6">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Palier actuel</p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              {currentTierLabel}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Expérience totale</p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {progress.xp} XP
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Histoires & Quiz</p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {completedStories}/6 · {completedParts}/6
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Badges gagnés</p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {progress.unlockedBadges.length} / {BADGES.length}
            </p>
          </div>
        </div>
      </section>

      {/* 3 Levels Progression */}
      <section aria-label="Niveaux de langue" className="space-y-6">
        {LEVELS.map((level) => {
          const openingUnlocked = isStoryUnlocked(level.openingStory.id as StoryId, progress);
          const openingDone = progress.stories[level.openingStory.id].completed;
          const closingUnlocked = isStoryUnlocked(level.closingStory.id as StoryId, progress);
          const closingDone = progress.stories[level.closingStory.id].completed;
          const levelCompleted =
            openingDone &&
            progress.parts[level.parts[0].id].completed &&
            progress.parts[level.parts[1].id].completed &&
            closingDone;

          return (
            <article
              key={level.id}
              className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <div className="grid lg:grid-cols-12 lg:items-stretch">
                {/* Level Overview */}
                <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 lg:col-span-4 lg:border-b-0 lg:border-r">
                  <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <LevelIllustration
                      src={level.imageUrl}
                      alt={level.imageAlt}
                      fallbackTitle={`Niveau ${level.id} · ${level.cefr}`}
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>Niveau {level.id}</span>
                        <span aria-hidden="true">·</span>
                        <span>{level.cefr}</span>
                        {levelCompleted && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Maîtrisé
                            </span>
                          </>
                        )}
                      </div>
                      <h2 className="mt-1.5 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                        {level.titleFr}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {level.descriptionFr}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 Ordered Stages: Opening Story -> Part 1 -> Part 2 -> Closing Story */}
                <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800 lg:col-span-8">
                  {/* Step 1: Opening Story */}
                  <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        Étape 1 · Histoire d’ouverture {openingDone ? '· Validée' : ''}
                      </p>
                      <h3 className="mt-0.5 font-display text-base font-bold text-slate-900 dark:text-slate-100">
                        {level.openingStory.titleEn}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {level.openingStory.titleFr} · +{level.openingStory.xpReward} XP
                      </p>
                    </div>

                    {openingUnlocked ? (
                      <button
                        type="button"
                        onClick={() => onStartStory(level.openingStory)}
                        className={`inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                          openingDone
                            ? 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        <BookOpen className="h-4 w-4" aria-hidden="true" />
                        <span>{openingDone ? 'Relire l’histoire' : 'Lire et travailler'}</span>
                      </button>
                    ) : (
                      <span className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Terminez le niveau précédent</span>
                      </span>
                    )}
                  </div>

                  {/* Step 2 & 3: Quiz Parts 1 and 2 */}
                  <div className="grid divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                    {level.parts.map((part) => {
                      const unlocked = isPartUnlocked(part.id as PartId, progress);
                      const stats = progress.parts[part.id];

                      return (
                        <div
                          key={part.id}
                          className={`flex flex-col justify-between p-5 sm:p-6 ${
                            unlocked ? '' : 'bg-slate-50/70 dark:bg-slate-950/40'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                Étape {part.partNumber + 1} · Quiz Partie {part.partNumber}
                              </span>
                              <div className="flex items-center gap-0.5" aria-label={`${stats.stars} étoiles sur 3`}>
                                {[1, 2, 3].map((starIdx) => (
                                  <Star
                                    key={starIdx}
                                    className={`h-4 w-4 ${
                                      starIdx <= stats.stars
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-slate-200 dark:text-slate-700'
                                    }`}
                                    aria-hidden="true"
                                  />
                                ))}
                              </div>
                            </div>

                            <h3 className="mt-1.5 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                              {part.titleFr}
                            </h3>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                              {part.subtitleFr}
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                              <span>{part.focusTopicFr}</span>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">{part.questions.length} questions</span>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">+{part.xpReward} XP</span>
                            </div>
                          </div>

                          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                            {stats.attempts > 0 && (
                              <p className="mb-2.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                                Meilleur score :{' '}
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  {stats.bestScore} / {stats.totalQuestions}
                                </span>{' '}
                                {stats.completed ? '· Validé' : `· Objectif ${part.passingScorePercent}%`}
                              </p>
                            )}

                            {unlocked ? (
                              <button
                                type="button"
                                onClick={() => onStartPart(part)}
                                className={`inline-flex min-h-[44px] w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                                  stats.completed
                                    ? 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    : 'bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700'
                                }`}
                              >
                                <span>{stats.completed ? 'Rejouer ce quiz' : 'Lancer le quiz'}</span>
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                              </button>
                            ) : (
                              <div className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/50 px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                                <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>Validez l’étape précédente</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Step 4: Closing Story */}
                  <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        Étape 4 · Histoire finale {closingDone ? '· Niveau validé' : ''}
                      </p>
                      <h3 className="mt-0.5 font-display text-base font-bold text-slate-900 dark:text-slate-100">
                        {level.closingStory.titleEn}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {level.closingStory.titleFr} · +{level.closingStory.xpReward} XP
                      </p>
                    </div>

                    {closingUnlocked ? (
                      <button
                        type="button"
                        onClick={() => onStartStory(level.closingStory)}
                        className={`inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                          closingDone
                            ? 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        <BookOpen className="h-4 w-4" aria-hidden="true" />
                        <span>{closingDone ? 'Relire l’histoire finale' : 'Lire l’histoire finale'}</span>
                      </button>
                    ) : (
                      <span className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Terminez la Partie 2</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Badges Summary Strip */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              Vos badges de réussite ({progress.unlockedBadges.length} / {BADGES.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Débloquez des distinctions en terminant les histoires, les quiz, la révision et le coach vocal.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {BADGES.map((badge) => {
            const unlocked = progress.unlockedBadges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`rounded-xl border p-3.5 transition-colors ${
                  unlocked
                    ? 'border-amber-200 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 opacity-65'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Award
                    className={`h-4 w-4 shrink-0 ${
                      unlocked
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {badge.titleFr}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                  {badge.descriptionFr}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
