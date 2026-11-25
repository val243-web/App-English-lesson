import { useEffect, useState } from 'react';
import { Award, X } from 'lucide-react';
import { DictionaryView } from './components/DictionaryView';
import { AppTab, HeaderNav } from './components/HeaderNav';
import { LevelPathView } from './components/LevelPathView';
import { MobileExportModal } from './components/MobileExportModal';
import { CoachTarget, PronunciationCoachView } from './components/PronunciationCoachView';
import { QuizGameView } from './components/QuizGameView';
import { RevisionView } from './components/RevisionView';
import { SettingsView } from './components/SettingsView';
import { StoryReaderView } from './components/StoryReaderView';
import { BADGES, evaluateUnlockedBadges } from './data/badges';
import { LEVELS } from './data/curriculum';
import { DICTIONARY_ENTRIES } from './data/dictionary';
import {
  AccentMode,
  DictionaryEntry,
  LevelPart,
  PartId,
  StoryDefinition,
  StoryId,
  ThemeMode,
  UserProgress,
} from './types/learning';
import { stopSpeaking } from './utils/speech';
import {
  calculateStars,
  getDefaultProgress,
  loadProgress,
  saveProgress,
} from './utils/storage';

export function App() {
  const [progress, setProgress] = useState<UserProgress>(() => loadProgress());
  const [activeTab, setActiveTab] = useState<AppTab>('path');
  const [activeQuizPart, setActiveQuizPart] = useState<LevelPart | null>(null);
  const [activeStory, setActiveStory] = useState<StoryDefinition | null>(null);
  const [coachTarget, setCoachTarget] = useState<CoachTarget | null>(null);
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [newlyUnlockedBadgeId, setNewlyUnlockedBadgeId] = useState<string | null>(null);

  // Sync dark mode class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', progress.theme === 'dark');
  }, [progress.theme]);

  // Persist to localStorage and evaluate badges on progress updates
  useEffect(() => {
    const nextBadges = evaluateUnlockedBadges(progress);
    if (nextBadges.length > progress.unlockedBadges.length) {
      const latest = nextBadges.find((id) => !progress.unlockedBadges.includes(id)) ?? null;
      if (latest) {
        setNewlyUnlockedBadgeId(latest);
      }
      setProgress((prev) => ({
        ...prev,
        unlockedBadges: nextBadges,
      }));
      return;
    }
    saveProgress(progress);
  }, [progress]);

  const handleSelectTab = (tab: AppTab) => {
    stopSpeaking();
    setActiveQuizPart(null);
    setActiveStory(null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartPart = (part: LevelPart) => {
    stopSpeaking();
    setActiveStory(null);
    setActiveQuizPart(part);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartStory = (story: StoryDefinition) => {
    stopSpeaking();
    setActiveQuizPart(null);
    setActiveStory(story);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPartById = (partId: PartId) => {
    const found = LEVELS.flatMap((l) => l.parts).find((p) => p.id === partId);
    if (found) {
      handleStartPart(found);
    }
  };

  const handleCompleteStory = (
    storyId: StoryId,
    score: number,
    total: number,
    earnedXp: number
  ) => {
    setProgress((prev) => {
      const existing = prev.stories[storyId];
      const firstCompletion = !existing.completed;
      return {
        ...prev,
        xp: prev.xp + (firstCompletion ? earnedXp : 20),
        stories: {
          ...prev.stories,
          [storyId]: {
            completed: true,
            bestScore: Math.max(existing.bestScore, score),
            totalQuestions: total,
          },
        },
      };
    });
  };

  const handleCompletePart = (
    partId: PartId,
    score: number,
    total: number,
    passed: boolean,
    earnedXp: number,
    missedQuestionIds: string[]
  ) => {
    const stars = calculateStars(score, total);
    setProgress((prev) => {
      const existing = prev.parts[partId];
      const mergedWeak = Array.from(new Set([...prev.weakQuestionIds, ...missedQuestionIds])).slice(
        -24
      );
      return {
        ...prev,
        xp: prev.xp + earnedXp,
        weakQuestionIds: mergedWeak,
        parts: {
          ...prev.parts,
          [partId]: {
            completed: existing.completed || passed,
            bestScore: Math.max(existing.bestScore, score),
            totalQuestions: total,
            stars: Math.max(existing.stars, stars) as 0 | 1 | 2 | 3,
            attempts: existing.attempts + 1,
          },
        },
      };
    });
  };

  const handleChangeAccent = (accent: AccentMode) => {
    setProgress((prev) => ({ ...prev, accent }));
  };

  const handleChangeTheme = (theme: ThemeMode) => {
    setProgress((prev) => ({ ...prev, theme }));
  };

  const handleToggleTheme = () => {
    setProgress((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const handleToggleFavorite = (wordId: string) => {
    setProgress((prev) => {
      const exists = prev.favoriteWordIds.includes(wordId);
      return {
        ...prev,
        favoriteWordIds: exists
          ? prev.favoriteWordIds.filter((id) => id !== wordId)
          : [...prev.favoriteWordIds, wordId],
      };
    });
  };

  const handleAddOnlineWords = (words: DictionaryEntry[]) => {
    setProgress((prev) => {
      const existingIds = new Set(prev.cachedOnlineWords.map((w) => w.id));
      const newOnes = words.filter((w) => !existingIds.has(w.id));
      if (newOnes.length === 0) return prev;
      return {
        ...prev,
        xp: prev.xp + newOnes.length * 10,
        cachedOnlineWords: [...newOnes, ...prev.cachedOnlineWords],
      };
    });
  };

  const handleSendToCoach = (
    word: string,
    syllables?: string,
    tipFr?: string,
    ipa?: string
  ) => {
    stopSpeaking();
    const allDict = [...progress.cachedOnlineWords, ...DICTIONARY_ENTRIES];
    const matched = allDict.find((e) => e.word.toLowerCase() === word.toLowerCase());
    setCoachTarget({
      word,
      syllables: syllables ?? matched?.syllables,
      tipFr: tipFr ?? matched?.pronunciationTipFr,
      ipa:
        ipa ??
        (matched
          ? progress.accent === 'en-US'
            ? matched.ipaUS
            : matched.ipaUK
          : undefined),
    });
    setActiveQuizPart(null);
    setActiveStory(null);
    setActiveTab('coach');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRecordPractice = (word: string, score: number) => {
    const key = word.toLowerCase();
    setProgress((prev) => {
      const best = prev.practicedWords[key] ?? 0;
      const isFirstSuccess = best < 70 && score >= 70;
      return {
        ...prev,
        xp: isFirstSuccess ? prev.xp + 15 : prev.xp,
        practicedWords: {
          ...prev.practicedWords,
          [key]: Math.max(best, score),
        },
      };
    });
  };

  const handleMarkRevisionMastered = (wordId: string, mastered: boolean) => {
    setProgress((prev) => {
      const exists = prev.masteredRevisionIds.includes(wordId);
      if (mastered && !exists) {
        return {
          ...prev,
          xp: prev.xp + 5,
          masteredRevisionIds: [...prev.masteredRevisionIds, wordId],
        };
      }
      if (!mastered && exists) {
        return {
          ...prev,
          masteredRevisionIds: prev.masteredRevisionIds.filter((id) => id !== wordId),
        };
      }
      return prev;
    });
  };

  const handleCompleteRevisionSprint = (
    _score: number,
    _total: number,
    earnedXp: number
  ) => {
    setProgress((prev) => ({
      ...prev,
      xp: prev.xp + earnedXp,
      revisionSessionsCompleted: prev.revisionSessionsCompleted + 1,
    }));
  };

  const unlockedBadgeObj = newlyUnlockedBadgeId
    ? BADGES.find((b) => b.id === newlyUnlockedBadgeId)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <HeaderNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenMobileGuide={() => setMobileModalOpen(true)}
      />

      {/* Badge Unlocked Notification */}
      {unlockedBadgeObj && (
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Nouveau badge débloqué : {unlockedBadgeObj.titleFr}
                </span>{' '}
                <span className="text-slate-600 dark:text-slate-300">
                  · {unlockedBadgeObj.descriptionFr}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNewlyUnlockedBadgeId(null)}
              aria-label="Fermer la notification de badge"
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-500 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 sm:py-8 md:pb-12">
        {activeStory ? (
          <StoryReaderView
            story={activeStory}
            accent={progress.accent}
            soundEffects={progress.soundEffects}
            onChangeAccent={handleChangeAccent}
            onCompleteStory={handleCompleteStory}
            onPracticeWord={(word, phonetic) => handleSendToCoach(word, undefined, undefined, phonetic)}
            onExit={() => {
              stopSpeaking();
              setActiveStory(null);
            }}
          />
        ) : activeQuizPart ? (
          <QuizGameView
            part={activeQuizPart}
            accent={progress.accent}
            soundEffects={progress.soundEffects}
            onChangeAccent={handleChangeAccent}
            onCompletePart={handleCompletePart}
            onSelectPartById={handleSelectPartById}
            onExit={() => {
              stopSpeaking();
              setActiveQuizPart(null);
            }}
            onPracticeWord={(word) => handleSendToCoach(word)}
          />
        ) : activeTab === 'path' ? (
          <LevelPathView
            progress={progress}
            onStartPart={handleStartPart}
            onStartStory={handleStartStory}
            onToggleTheme={handleToggleTheme}
            onOpenRevision={() => handleSelectTab('revision')}
          />
        ) : activeTab === 'revision' ? (
          <RevisionView
            progress={progress}
            onChangeAccent={handleChangeAccent}
            onMarkMastered={handleMarkRevisionMastered}
            onCompleteRevisionSprint={handleCompleteRevisionSprint}
            onSendToCoach={handleSendToCoach}
          />
        ) : activeTab === 'dictionary' ? (
          <DictionaryView
            accent={progress.accent}
            favoriteWordIds={progress.favoriteWordIds}
            cachedOnlineWords={progress.cachedOnlineWords}
            onChangeAccent={handleChangeAccent}
            onToggleFavorite={handleToggleFavorite}
            onAddOnlineWords={handleAddOnlineWords}
            onSendToCoach={handleSendToCoach}
          />
        ) : activeTab === 'coach' ? (
          <PronunciationCoachView
            accent={progress.accent}
            initialTarget={coachTarget}
            practicedWords={progress.practicedWords}
            onChangeAccent={handleChangeAccent}
            onRecordPractice={handleRecordPractice}
          />
        ) : (
          <SettingsView
            progress={progress}
            onChangeAccent={handleChangeAccent}
            onChangeTheme={handleChangeTheme}
            onToggleSoundEffects={() =>
              setProgress((prev) => ({ ...prev, soundEffects: !prev.soundEffects }))
            }
            onToggleUnlockAll={() =>
              setProgress((prev) => ({
                ...prev,
                unlockAllPreview: !prev.unlockAllPreview,
              }))
            }
            onResetProgress={() => setProgress(getDefaultProgress())}
            onOpenWordInCoach={handleSendToCoach}
          />
        )}
      </main>

      <MobileExportModal
        open={mobileModalOpen}
        onClose={() => setMobileModalOpen(false)}
      />
    </div>
  );
}

export default App;
