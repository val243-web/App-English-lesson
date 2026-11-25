import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  FlipHorizontal,
  Layers,
  Mic,
  Play,
  RotateCcw,
  Turtle,
  Volume2,
  XCircle,
} from 'lucide-react';
import { LEVELS } from '../data/curriculum';
import { DICTIONARY_ENTRIES } from '../data/dictionary';
import { AccentMode, DictionaryEntry, QuizQuestion, UserProgress } from '../types/learning';
import { playFeedbackTone, speakText } from '../utils/speech';

interface RevisionViewProps {
  progress: UserProgress;
  onChangeAccent: (accent: AccentMode) => void;
  onMarkMastered: (wordId: string, mastered: boolean) => void;
  onCompleteRevisionSprint: (score: number, total: number, earnedXp: number) => void;
  onSendToCoach: (word: string, syllables?: string, tipFr?: string, ipa?: string) => void;
}

export function RevisionView({
  progress,
  onChangeAccent,
  onMarkMastered,
  onCompleteRevisionSprint,
  onSendToCoach,
}: RevisionViewProps) {
  const [mode, setMode] = useState<'flashcards' | 'sprint'>('flashcards');
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filterScope, setFilterScope] = useState<'all' | 'to-review' | 'online'>('all');

  // Sprint state
  const [sprintActive, setSprintActive] = useState(false);
  const [sprintIndex, setSprintIndex] = useState(0);
  const [sprintSelected, setSprintSelected] = useState<number | null>(null);
  const [sprintScore, setSprintScore] = useState(0);
  const [sprintFinished, setSprintFinished] = useState(false);

  const allDictionary: DictionaryEntry[] = useMemo(() => {
    return [...progress.cachedOnlineWords, ...DICTIONARY_ENTRIES];
  }, [progress.cachedOnlineWords]);

  const deck = useMemo(() => {
    const filtered = allDictionary.filter((entry) => {
      if (filterScope === 'online') return entry.source === 'online';
      if (filterScope === 'to-review') return !progress.masteredRevisionIds.includes(entry.id);
      return true;
    });
    return filtered.length > 0 ? filtered : allDictionary;
  }, [allDictionary, filterScope, progress.masteredRevisionIds]);

  const safeCardIndex = cardIndex % Math.max(deck.length, 1);
  const currentCard = deck[safeCardIndex];
  const isCardMastered = currentCard ? progress.masteredRevisionIds.includes(currentCard.id) : false;

  // Build 6-question revision sprint prioritizing weak questions + varied unlocked questions
  const sprintQuestions: QuizQuestion[] = useMemo(() => {
    const allQuestions = LEVELS.flatMap((l) => l.parts.flatMap((p) => p.questions));
    const weakSet = new Set(progress.weakQuestionIds);
    const weak = allQuestions.filter((q) => weakSet.has(q.id));
    const others = allQuestions.filter((q) => !weakSet.has(q.id));
    const combined = [...weak, ...others.sort((a, b) => a.id.localeCompare(b.id))];
    return combined.slice(0, 6);
  }, [progress.weakQuestionIds, sprintActive]);

  const startSprint = () => {
    setSprintActive(true);
    setSprintIndex(0);
    setSprintSelected(null);
    setSprintScore(0);
    setSprintFinished(false);
  };

  const handleSprintAnswer = (idx: number) => {
    if (sprintSelected !== null) return;
    setSprintSelected(idx);
    const currentQ = sprintQuestions[sprintIndex];
    if (idx === currentQ.correctIndex) {
      playFeedbackTone('correct', progress.soundEffects);
      setSprintScore((s) => s + 1);
    } else {
      playFeedbackTone('wrong', progress.soundEffects);
    }
  };

  const handleNextSprintQuestion = () => {
    if (sprintIndex + 1 >= sprintQuestions.length) {
      const earnedXp = sprintScore * 15 + 30;
      playFeedbackTone('complete', progress.soundEffects);
      onCompleteRevisionSprint(sprintScore, sprintQuestions.length, earnedXp);
      setSprintFinished(true);
      return;
    }
    setSprintIndex((i) => i + 1);
    setSprintSelected(null);
  };

  const masteredCount = progress.masteredRevisionIds.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Mode révision · {masteredCount} cartes maîtrisées · {progress.revisionSessionsCompleted} sessions terminées
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
              Consolidez votre vocabulaire et vos acquis
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => setMode('flashcards')}
                className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  mode === 'flashcards'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Cartes mémoire
              </button>
              <button
                type="button"
                onClick={() => setMode('sprint')}
                className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  mode === 'sprint'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Sprint quiz (6 questions)
              </button>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              {(['en-US', 'en-GB'] as AccentMode[]).map((acc) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => onChangeAccent(acc)}
                  className={`min-h-[38px] rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    progress.accent === acc
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {acc === 'en-US' ? 'US' : 'UK'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {mode === 'flashcards' && currentCard ? (
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Deck Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {(
                [
                  ['all', `Toutes (${allDictionary.length})`],
                  ['to-review', 'À revoir'],
                  ['online', `En ligne (${progress.cachedOnlineWords.length})`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setFilterScope(id);
                    setCardIndex(0);
                    setFlipped(false);
                  }}
                  className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    filterScope === id
                      ? 'bg-slate-900 dark:bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              Carte {safeCardIndex + 1} / {deck.length}
            </span>
          </div>

          {/* Flashcard Surface */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>
                Niveau {currentCard.level} · {currentCard.category}
                {isCardMastered ? ' · Acquis' : ''}
              </span>
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
              >
                <FlipHorizontal className="h-4 w-4" aria-hidden="true" />
                <span>{flipped ? 'Voir le mot anglais' : 'Révéler la traduction'}</span>
              </button>
            </div>

            <div className="my-8 text-center">
              {!flipped ? (
                <>
                  <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                    {currentCard.word}
                  </h2>
                  <p className="mt-2 font-mono text-sm text-slate-500 dark:text-slate-400">
                    {progress.accent === 'en-US' ? currentCard.ipaUS : currentCard.ipaUK} ·{' '}
                    {currentCard.syllables}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    {currentCard.word}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-blue-600 dark:text-blue-400 sm:text-3xl">
                    {currentCard.translationFr}
                  </h2>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {currentCard.definitionFr}
                  </p>
                  <p className="mx-auto mt-3 max-w-lg rounded-xl bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-700 dark:text-slate-300">
                    « {currentCard.exampleEn} »
                  </p>
                </>
              )}
            </div>

            {/* Audio + Coach Actions */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-5">
              <button
                type="button"
                onClick={() => speakText(currentCard.word, { accent: progress.accent, rate: 0.95 })}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span>Écouter</span>
              </button>
              <button
                type="button"
                onClick={() => speakText(currentCard.word, { accent: progress.accent, rate: 0.6 })}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Turtle className="h-4 w-4" aria-hidden="true" />
                <span>Voix lente</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onSendToCoach(
                    currentCard.word,
                    currentCard.syllables,
                    currentCard.pronunciationTipFr,
                    progress.accent === 'en-US' ? currentCard.ipaUS : currentCard.ipaUK
                  )
                }
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                <span>Prononcer</span>
              </button>
            </div>
          </div>

          {/* Card Navigation & Self-Assessment */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                onMarkMastered(currentCard.id, false);
                setFlipped(false);
                setCardIndex((i) => (i + 1) % deck.length);
              }}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span>À revoir plus tard</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onMarkMastered(currentCard.id, true);
                setFlipped(false);
                setCardIndex((i) => (i + 1) % deck.length);
              }}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>Je maîtrise · Suivante</span>
            </button>
          </div>
        </div>
      ) : (
        /* Sprint Quiz Mode */
        <div className="mx-auto max-w-2xl">
          {!sprintActive ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center sm:p-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Layers className="h-7 w-7" aria-hidden="true" />
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                Sprint de révision ciblée
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                6 questions rapides mélangeant vos points à revoir et des rappels de vocabulaire, grammaire et audio.
              </p>
              <button
                type="button"
                onClick={startSprint}
                className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>Démarrer la session</span>
              </button>
            </div>
          ) : sprintFinished ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center sm:p-10">
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                Révision terminée !
              </h2>
              <p className="mt-2 font-mono text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {sprintScore} / {sprintQuestions.length} · +{sprintScore * 15 + 30} XP
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Votre mémoire à long terme se renforce à chaque session.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={startSprint}
                  className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>Nouvelle série</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Sprint de révision</span>
                <span className="font-mono tabular-nums">
                  {sprintIndex + 1} / {sprintQuestions.length}
                </span>
              </div>

              <h3 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {sprintQuestions[sprintIndex].promptFr}
              </h3>

              {(sprintQuestions[sprintIndex].kind === 'audio-choice' ||
                sprintQuestions[sprintIndex].kind === 'pronounce') && (
                <button
                  type="button"
                  onClick={() =>
                    speakText(sprintQuestions[sprintIndex].targetEn, {
                      accent: progress.accent,
                      rate: 0.92,
                    })
                  }
                  className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  <span>Écouter l’audio</span>
                </button>
              )}

              <div className="mt-5 space-y-2.5">
                {sprintQuestions[sprintIndex].options.map((opt, idx) => {
                  const answered = sprintSelected !== null;
                  const isRight = idx === sprintQuestions[sprintIndex].correctIndex;
                  const isPicked = idx === sprintSelected;
                  let cls =
                    'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 hover:border-blue-400';

                  if (answered) {
                    if (isRight) {
                      cls =
                        'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100';
                    } else if (isPicked) {
                      cls =
                        'border-red-500 bg-red-50 dark:bg-red-950/50 text-red-950 dark:text-red-100';
                    } else {
                      cls =
                        'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400';
                    }
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={answered}
                      onClick={() => handleSprintAnswer(idx)}
                      className={`flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left text-sm font-medium ${cls}`}
                    >
                      <span>{opt}</span>
                      {answered && isRight && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      )}
                      {answered && isPicked && !isRight && (
                        <XCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>

              {sprintSelected !== null && (
                <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {sprintQuestions[sprintIndex].explanationFr}
                  </p>
                  <button
                    type="button"
                    onClick={handleNextSprintQuestion}
                    className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-slate-900 dark:bg-blue-600 px-5 py-2 text-sm font-semibold text-white"
                  >
                    {sprintIndex + 1 >= sprintQuestions.length ? 'Terminer' : 'Suivante'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
