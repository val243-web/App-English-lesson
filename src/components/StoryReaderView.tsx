import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Languages,
  Mic,
  Square,
  Turtle,
  Volume2,
  XCircle,
} from 'lucide-react';
import { AccentMode, StoryDefinition, StoryId } from '../types/learning';
import { playFeedbackTone, speakText, stopSpeaking } from '../utils/speech';

interface StoryReaderViewProps {
  story: StoryDefinition;
  accent: AccentMode;
  soundEffects: boolean;
  onChangeAccent: (accent: AccentMode) => void;
  onCompleteStory: (storyId: StoryId, score: number, total: number, earnedXp: number) => void;
  onPracticeWord: (word: string, phonetic?: string) => void;
  onExit: () => void;
}

export function StoryReaderView({
  story,
  accent,
  soundEffects,
  onChangeAccent,
  onCompleteStory,
  onPracticeWord,
  onExit,
}: StoryReaderViewProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | 'all' | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setShowTranslation(false);
    setSpeakingIdx(null);
    setAnswers({});
    setSubmitted(false);
    stopSpeaking();
    return () => stopSpeaking();
  }, [story.id]);

  const handlePlayAll = (rate: number) => {
    const fullText = `${story.titleEn}. ${story.paragraphsEn.join(' ')}`;
    speakText(fullText, {
      accent,
      rate,
      onStart: () => setSpeakingIdx('all'),
      onEnd: () => setSpeakingIdx(null),
      onError: () => setSpeakingIdx(null),
    });
  };

  const handlePlayParagraph = (index: number, text: string) => {
    speakText(text, {
      accent,
      rate: 0.92,
      onStart: () => setSpeakingIdx(index),
      onEnd: () => setSpeakingIdx(null),
      onError: () => setSpeakingIdx(null),
    });
  };

  const allAnswered = story.questions.every((q) => typeof answers[q.id] === 'number');

  const handleValidateStory = () => {
    if (!allAnswered || submitted) return;
    const score = story.questions.reduce(
      (acc, q) => acc + (answers[q.id] === q.correctIndex ? 1 : 0),
      0
    );
    const total = story.questions.length;
    const passed = score >= 2;
    if (passed) {
      playFeedbackTone('complete', soundEffects);
    } else {
      playFeedbackTone('wrong', soundEffects);
    }
    setSubmitted(true);
    if (passed) {
      onCompleteStory(story.id, score, total, story.xpReward);
    }
  };

  const score = story.questions.reduce(
    (acc, q) => acc + (answers[q.id] === q.correctIndex ? 1 : 0),
    0
  );
  const passed = score >= 2;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            stopSpeaking();
            onExit();
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Retour au parcours</span>
        </button>

        <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => onChangeAccent('en-US')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              accent === 'en-US'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            US
          </button>
          <button
            type="button"
            onClick={() => onChangeAccent('en-GB')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              accent === 'en-GB'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            UK
          </button>
        </div>
      </div>

      {/* Story Card */}
      <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
        <div className="flex flex-col gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              Niveau {story.levelId} ·{' '}
              {story.position === 'start' ? 'Lecture d’ouverture' : 'Histoire finale'} ·{' '}
              {story.settingFr}
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
              {story.titleEn}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{story.titleFr}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {speakingIdx !== null ? (
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setSpeakingIdx(null);
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>Arrêter</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handlePlayAll(0.92)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  <span>Écouter l’histoire</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePlayAll(0.68)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Turtle className="h-4 w-4" aria-hidden="true" />
                  <span>Lent</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowTranslation((prev) => !prev)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                showTranslation
                  ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Languages className="h-4 w-4" aria-hidden="true" />
              <span>{showTranslation ? 'Masquer FR' : 'Traduction FR'}</span>
            </button>
          </div>
        </div>

        {/* Paragraphs */}
        <div className="mt-6 space-y-5">
          {story.paragraphsEn.map((para, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-4 transition-colors ${
                speakingIdx === idx
                  ? 'border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-base leading-relaxed text-slate-900 dark:text-slate-100 sm:text-lg">
                  {para}
                </p>
                <button
                  type="button"
                  onClick={() => handlePlayParagraph(idx, para)}
                  aria-label={`Écouter le paragraphe ${idx + 1}`}
                  className="flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800"
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {showTranslation && (
                <p className="mt-2.5 border-t border-slate-200/70 dark:border-slate-800 pt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {story.paragraphsFr[idx]}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Key Vocabulary from Story */}
        <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span>Mots-clés de l’histoire (cliquez pour écouter ou pratiquer)</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {story.keyVocabulary.map((vocab) => (
              <div
                key={vocab.word}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5"
              >
                <div>
                  <p className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    {vocab.word}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {vocab.translationFr} · <span className="font-mono">{vocab.phonetic}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => speakText(vocab.word, { accent, rate: 0.92 })}
                    aria-label={`Écouter ${vocab.word}`}
                    className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700"
                  >
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onPracticeWord(vocab.word, vocab.phonetic)}
                    aria-label={`Pratiquer ${vocab.word}`}
                    className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <Mic className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>

      {/* Story Comprehension Check */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Travail sur l’histoire · +{story.xpReward} XP
        </p>
        <h2 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
          Questions de compréhension
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Répondez correctement à au moins 2 questions sur 3 pour valider l’histoire et débloquer la suite.
        </p>

        <div className="mt-6 space-y-6">
          {story.questions.map((q, qIdx) => {
            const picked = answers[q.id];
            return (
              <div
                key={q.id}
                className="border-t border-slate-100 dark:border-slate-800 pt-5 first:border-t-0 first:pt-0"
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-base">
                  {qIdx + 1}. {q.promptFr}
                </p>
                <div className="mt-3 grid gap-2.5">
                  {q.options.map((opt, optIdx) => {
                    const isPicked = picked === optIdx;
                    const isRight = q.correctIndex === optIdx;
                    let cls =
                      'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 hover:border-blue-400';

                    if (!submitted && isPicked) {
                      cls =
                        'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-950 dark:text-blue-100';
                    } else if (submitted) {
                      if (isRight) {
                        cls =
                          'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100';
                      } else if (isPicked && !isRight) {
                        cls =
                          'border-red-500 bg-red-50 dark:bg-red-950/50 text-red-950 dark:text-red-100';
                      } else {
                        cls =
                          'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500';
                      }
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={submitted}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                        className={`flex min-h-[46px] items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition-colors ${cls}`}
                      >
                        <span>{opt}</span>
                        {submitted && isRight && (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        )}
                        {submitted && isPicked && !isRight && (
                          <XCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {submitted && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    {q.explanationFr}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {!submitted ? (
            <button
              type="button"
              disabled={!allAnswered}
              onClick={handleValidateStory}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
            >
              <span>Valider la compréhension</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Résultat : {score} / {story.questions.length} ·{' '}
                {passed
                  ? `Histoire validée (+${story.xpReward} XP)`
                  : 'Relisez l’histoire et réessayez'}
              </p>
              <div className="flex gap-3">
                {!passed && (
                  <button
                    type="button"
                    onClick={() => {
                      setAnswers({});
                      setSubmitted(false);
                    }}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100"
                  >
                    Réessayer
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    onExit();
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-700"
                >
                  <span>Continuer le parcours</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
