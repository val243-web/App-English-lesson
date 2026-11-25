import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Heart,
  RotateCcw,
  Star,
  Turtle,
  Volume2,
  X,
  XCircle,
} from 'lucide-react';
import { AccentMode, LevelPart, PartId } from '../types/learning';
import { playFeedbackTone, speakText, stopSpeaking } from '../utils/speech';
import { calculateStars, getNextPartId } from '../utils/storage';

interface QuizGameViewProps {
  part: LevelPart;
  accent: AccentMode;
  soundEffects: boolean;
  onChangeAccent: (accent: AccentMode) => void;
  onCompletePart: (
    partId: PartId,
    score: number,
    total: number,
    passed: boolean,
    earnedXp: number,
    missedQuestionIds: string[]
  ) => void;
  onSelectPartById: (partId: PartId) => void;
  onExit: () => void;
  onPracticeWord: (word: string) => void;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  choice: 'Vocabulaire & Traduction',
  'audio-choice': 'Compréhension orale',
  'fill-blank': 'Phrase à compléter',
  pronounce: 'Défi prononciation',
};

export function QuizGameView({
  part,
  accent,
  soundEffects,
  onChangeAccent,
  onCompletePart,
  onSelectPartById,
  onExit,
  onPracticeWord,
}: QuizGameViewProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hearts, setHearts] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [missedIds, setMissedIds] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [quizState, setQuizState] = useState<'playing' | 'failed' | 'finished'>('playing');

  const question = part.questions[questionIndex];
  const totalQuestions = part.questions.length;

  useEffect(() => {
    setQuestionIndex(0);
    setSelectedOption(null);
    setHearts(3);
    setCorrectCount(0);
    setMissedIds([]);
    setStreak(0);
    setQuizState('playing');
    stopSpeaking();
    return () => stopSpeaking();
  }, [part.id]);

  useEffect(() => {
    if (quizState === 'playing' && question?.kind === 'audio-choice') {
      const timer = setTimeout(() => {
        speakText(question.targetEn, {
          accent,
          rate: 0.92,
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [questionIndex, part.id, quizState, accent, question?.kind, question?.targetEn]);

  const handlePlayAudio = (rate: number) => {
    speakText(question.targetEn, {
      accent,
      rate,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);

    const isCorrect = idx === question.correctIndex;
    if (isCorrect) {
      playFeedbackTone('correct', soundEffects);
      setCorrectCount((prev) => prev + 1);
      setStreak((prev) => prev + 1);
    } else {
      playFeedbackTone('wrong', soundEffects);
      setStreak(0);
      setMissedIds((prev) => [...prev, question.id]);
      setHearts((prev) => Math.max(0, prev - 1));
    }
  };

  const handleNext = () => {
    stopSpeaking();
    if (hearts === 0) {
      setQuizState('failed');
      return;
    }

    if (questionIndex + 1 >= totalQuestions) {
      const percent = Math.round((correctCount / totalQuestions) * 100);
      const passed = percent >= part.passingScorePercent;
      const earnedXp = passed ? part.xpReward + correctCount * 10 : correctCount * 10;
      playFeedbackTone('complete', soundEffects);
      onCompletePart(part.id, correctCount, totalQuestions, passed, earnedXp, missedIds);
      setQuizState('finished');
      return;
    }

    setQuestionIndex((prev) => prev + 1);
    setSelectedOption(null);
  };

  const handleRestart = () => {
    stopSpeaking();
    setQuestionIndex(0);
    setSelectedOption(null);
    setHearts(3);
    setCorrectCount(0);
    setMissedIds([]);
    setStreak(0);
    setQuizState('playing');
  };

  if (quizState === 'failed') {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
          <Heart className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          Vous n’avez plus de vies
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Pas d’inquiétude : chaque tentative renforce votre mémoire. Réécoutez bien les phrases et retentez cette partie !
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Recommencer la partie</span>
          </button>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Retour au parcours
          </button>
        </div>
      </div>
    );
  }

  if (quizState === 'finished') {
    const percent = Math.round((correctCount / totalQuestions) * 100);
    const passed = percent >= part.passingScorePercent;
    const stars = calculateStars(correctCount, totalQuestions);
    const earnedXp = passed ? part.xpReward + correctCount * 10 : correctCount * 10;
    const nextPartId = getNextPartId(part.id);

    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center sm:p-10">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
            passed
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
          }`}
        >
          <Award className="h-7 w-7" aria-hidden="true" />
        </div>

        <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          Niveau {part.levelId} · Partie {part.partNumber} sur 2
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          {passed ? 'Partie validée !' : 'Presque validé'}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {passed
            ? part.partNumber === 1 && nextPartId
              ? 'Bravo, vous avez débloqué la Partie 2 de ce niveau.'
              : 'Bravo ! L’histoire finale de ce niveau est maintenant accessible.'
            : `Il faut au moins ${part.passingScorePercent} % de bonnes réponses pour débloquer la suite.`}
        </p>

        <div className="mt-6 flex items-center justify-center gap-2">
          {[1, 2, 3].map((idx) => (
            <Star
              key={idx}
              className={`h-8 w-8 ${
                idx <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 border-y border-slate-100 dark:border-slate-800 py-5">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Score</p>
            <p className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {correctCount}/{totalQuestions}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Précision</p>
            <p className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {percent}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">XP gagnés</p>
            <p className="mt-1 font-mono text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
              +{earnedXp}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {passed && part.partNumber === 1 && nextPartId && (
            <button
              type="button"
              onClick={() => onSelectPartById(nextPartId)}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <span>Partie suivante</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Rejouer</span>
          </button>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Parcours
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(
    ((questionIndex + (selectedOption !== null ? 1 : 0)) / totalQuestions) * 100
  );
  const isAnswered = selectedOption !== null;
  const isCurrentCorrect = selectedOption === question.correctIndex;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            stopSpeaking();
            onExit();
          }}
          aria-label="Quitter le quiz"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">
              Niv. {part.levelId} · {part.titleFr}
            </span>
            <span className="font-mono tabular-nums shrink-0 ml-2">
              {questionIndex + 1} / {totalQuestions}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" aria-label={`${hearts} vies restantes`}>
          {[1, 2, 3].map((idx) => (
            <Heart
              key={idx}
              className={`h-5 w-5 ${
                idx <= hearts ? 'fill-red-500 text-red-500' : 'text-slate-300 dark:text-slate-700'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            {QUESTION_TYPE_LABELS[question.kind] ?? 'Question'}
            {streak >= 2 ? ` · Série de ${streak}` : ''}
          </p>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => onChangeAccent('en-US')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
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
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                accent === 'en-GB'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              UK
            </button>
          </div>
        </div>

        <h2 className="mt-4 font-display text-xl font-bold leading-snug text-slate-900 dark:text-slate-100 sm:text-2xl">
          {question.promptFr}
        </h2>

        {(question.kind === 'audio-choice' || question.kind === 'pronounce') && (
          <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            {question.kind === 'pronounce' && (
              <div className="mb-3">
                <p className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {question.targetEn}
                </p>
                {question.phonetic && (
                  <p className="mt-0.5 font-mono text-sm text-slate-500 dark:text-slate-400">
                    {question.phonetic}
                  </p>
                )}
              </div>
            )}

            {question.kind === 'audio-choice' && isAnswered && (
              <div className="mb-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Phrase entendue :
                </p>
                <p className="mt-0.5 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  {question.targetEn}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handlePlayAudio(0.95)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span>{isSpeaking ? 'Lecture en cours…' : 'Écouter'}</span>
              </button>
              <button
                type="button"
                onClick={() => handlePlayAudio(0.62)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Turtle className="h-4 w-4" aria-hidden="true" />
                <span>Voix lente</span>
              </button>
              {question.kind === 'pronounce' && (
                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    onPracticeWord(question.targetEn);
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800"
                >
                  <span>Ouvrir dans le Coach vocal</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {question.options.map((option, idx) => {
            const letters = ['A', 'B', 'C', 'D'];
            const isSelected = selectedOption === idx;
            const isRightOption = idx === question.correctIndex;

            let optionStyle =
              'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/40 dark:hover:bg-blue-950/30';
            if (isAnswered) {
              if (isRightOption) {
                optionStyle =
                  'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100';
              } else if (isSelected && !isRightOption) {
                optionStyle =
                  'border-red-500 bg-red-50 dark:bg-red-950/50 text-red-950 dark:text-red-100';
              } else {
                optionStyle =
                  'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600';
              }
            }

            return (
              <button
                key={option}
                type="button"
                disabled={isAnswered}
                onClick={() => handleSelectOption(idx)}
                className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors sm:text-base ${optionStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-semibold ${
                      isAnswered && isRightOption
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : isAnswered && isSelected && !isRightOption
                          ? 'border-red-600 bg-red-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {letters[idx]}
                  </span>
                  <span>{option}</span>
                </div>

                {isAnswered && isRightOption && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                )}
                {isAnswered && isSelected && !isRightOption && (
                  <XCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div
            className={`mt-6 rounded-xl border p-4 ${
              isCurrentCorrect
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40'
                : 'border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-950/40'
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p
                  className={`flex items-center gap-1.5 text-sm font-bold ${
                    isCurrentCorrect
                      ? 'text-emerald-900 dark:text-emerald-200'
                      : 'text-red-900 dark:text-red-200'
                  }`}
                >
                  {isCurrentCorrect ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      <span>Exact !</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
                      <span>Pas tout à fait</span>
                    </>
                  )}
                </p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {question.explanationFr}
                </p>
                <button
                  type="button"
                  onClick={() => handlePlayAudio(0.95)}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                >
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Écouter « {question.targetEn} »</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-700"
              >
                <span>
                  {hearts === 0
                    ? 'Voir le bilan'
                    : questionIndex + 1 >= totalQuestions
                      ? 'Terminer la partie'
                      : 'Continuer'}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
