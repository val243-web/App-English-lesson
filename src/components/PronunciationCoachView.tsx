import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Headphones,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Square,
  Turtle,
  Volume2,
} from 'lucide-react';
import { DICTIONARY_ENTRIES } from '../data/dictionary';
import { AccentMode } from '../types/learning';
import {
  evaluatePronunciation,
  isSpeechRecognitionSupported,
  PronunciationEvaluation,
  speakGuidedCoachSequence,
  speakText,
  SpeechRecognitionHandle,
  startPronunciationCheck,
  stopSpeaking,
} from '../utils/speech';

export interface CoachTarget {
  word: string;
  syllables?: string;
  tipFr?: string;
  ipa?: string;
}

interface PronunciationCoachViewProps {
  accent: AccentMode;
  initialTarget: CoachTarget | null;
  practicedWords: Record<string, number>;
  onChangeAccent: (accent: AccentMode) => void;
  onRecordPractice: (word: string, score: number) => void;
}

const FEATURED_COACH_IDS = [
  'w-schedule',
  'w-comfortable',
  'w-through',
  'w-wednesday',
  'w-thankyou',
  'w-thorough',
  'w-queue',
  'w-knowledge',
  'w-breakfast',
  'w-recipe',
];

export function PronunciationCoachView({
  accent,
  initialTarget,
  practicedWords,
  onChangeAccent,
  onRecordPractice,
}: PronunciationCoachViewProps) {
  const featuredEntries = DICTIONARY_ENTRIES.filter((e) => FEATURED_COACH_IDS.includes(e.id));

  const [target, setTarget] = useState<CoachTarget>(
    initialTarget ?? {
      word: featuredEntries[0].word,
      syllables: featuredEntries[0].syllables,
      tipFr: featuredEntries[0].pronunciationTipFr,
      ipa: accent === 'en-US' ? featuredEntries[0].ipaUS : featuredEntries[0].ipaUK,
    }
  );
  const [customPhrase, setCustomPhrase] = useState('');
  const [coachStep, setCoachStep] = useState<'idle' | 'intro' | 'slow' | 'normal' | 'done'>('idle');
  const [isListening, setIsListening] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<PronunciationEvaluation | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [shadowPhase, setShadowPhase] = useState<'idle' | 'listen' | 'speak' | 'review'>('idle');
  const [shadowSeconds, setShadowSeconds] = useState(3);

  const cancelGuideRef = useRef<(() => void) | null>(null);
  const recognitionRef = useRef<SpeechRecognitionHandle | null>(null);
  const shadowTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialTarget) {
      setTarget(initialTarget);
      setSpokenTranscript(null);
      setEvaluation(null);
      setMicError(null);
    }
  }, [initialTarget]);

  useEffect(() => {
    return () => {
      cancelGuideRef.current?.();
      recognitionRef.current?.stop();
      if (shadowTimerRef.current) window.clearInterval(shadowTimerRef.current);
      stopSpeaking();
    };
  }, []);

  const speechRecSupported = isSpeechRecognitionSupported();

  const stopAllAudio = () => {
    cancelGuideRef.current?.();
    cancelGuideRef.current = null;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (shadowTimerRef.current) {
      window.clearInterval(shadowTimerRef.current);
      shadowTimerRef.current = null;
    }
    stopSpeaking();
    setCoachStep('idle');
    setIsListening(false);
    setShadowPhase('idle');
  };

  const handleSelectEntry = (entryId: string) => {
    const found = DICTIONARY_ENTRIES.find((e) => e.id === entryId);
    if (!found) return;
    stopAllAudio();
    setTarget({
      word: found.word,
      syllables: found.syllables,
      tipFr: found.pronunciationTipFr,
      ipa: accent === 'en-US' ? found.ipaUS : found.ipaUK,
    });
    setSpokenTranscript(null);
    setEvaluation(null);
    setMicError(null);
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = customPhrase.trim();
    if (!cleaned) return;
    stopAllAudio();
    setTarget({
      word: cleaned,
      syllables: cleaned.split(/\s+/).join(' · '),
      tipFr:
        'Écoutez d’abord le guide lent, repérez les syllabes accentuées puis répétez à voix haute.',
    });
    setSpokenTranscript(null);
    setEvaluation(null);
    setMicError(null);
  };

  const handleGuidedCoach = () => {
    stopAllAudio();
    cancelGuideRef.current = speakGuidedCoachSequence(
      target.word,
      target.syllables,
      accent,
      {
        onStep: (step) => {
          setCoachStep(step);
          if (step === 'done') {
            setTimeout(() => setCoachStep('idle'), 1200);
          }
        },
        onError: () => setCoachStep('idle'),
      }
    );
  };

  const handleStartMicTest = () => {
    stopAllAudio();
    setMicError(null);
    setSpokenTranscript(null);
    setEvaluation(null);
    setIsListening(true);

    recognitionRef.current = startPronunciationCheck(
      accent,
      (transcript) => {
        setSpokenTranscript(transcript);
        const evalResult = evaluatePronunciation(target.word, transcript);
        setEvaluation(evalResult);
        onRecordPractice(target.word, evalResult.score);

        const voiceReply =
          evalResult.tier === 'excellent'
            ? 'Bravo ! Votre prononciation est très claire.'
            : evalResult.tier === 'good'
              ? 'Bien joué, réessayez encore une fois en articulant lentement.'
              : 'Réessayons ensemble. Écoutez d’abord la vitesse lente.';

        speakText(voiceReply, { accent: 'fr-FR', rate: 1.0 });
      },
      (errFr) => {
        setMicError(errFr);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const handleStartShadowing = () => {
    stopAllAudio();
    setShadowPhase('listen');
    speakText(target.word, {
      accent,
      rate: 0.72,
      onEnd: () => {
        setShadowPhase('speak');
        setShadowSeconds(3);
        let remaining = 3;
        shadowTimerRef.current = window.setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            if (shadowTimerRef.current) window.clearInterval(shadowTimerRef.current);
            shadowTimerRef.current = null;
            setShadowPhase('review');
            onRecordPractice(target.word, 85);
            speakText(target.word, { accent, rate: 0.95 });
          } else {
            setShadowSeconds(remaining);
          }
        }, 1000);
      },
      onError: () => setShadowPhase('idle'),
    });
  };

  const bestPracticeScore = practicedWords[target.word.toLowerCase()];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Studio d’entraînement oral · Guidage français & anglais
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
              Coach vocal pour apprendre à bien prononcer
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Voix modèle :
            </span>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
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
        </div>

        <form onSubmit={handleApplyCustom} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={customPhrase}
            onChange={(e) => setCustomPhrase(e.target.value)}
            placeholder="Entrez n’importe quel mot ou phrase en anglais à travailler…"
            className="min-h-[48px] flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
          <button
            type="submit"
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl bg-slate-900 dark:bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-700"
          >
            Travailler ce mot
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
            Mots clés :
          </span>
          {featuredEntries.map((entry) => {
            const active = target.word.toLowerCase() === entry.word.toLowerCase();
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => handleSelectEntry(entry.id)}
                className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {entry.word}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
        <section className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 lg:col-span-7">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>
                Modèle sonore · {accent === 'en-US' ? 'Anglais américain' : 'Anglais britannique'}
              </span>
              {typeof bestPracticeScore === 'number' && (
                <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  Meilleur essai : {bestPracticeScore}%
                </span>
              )}
            </div>

            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
              {target.word}
            </h2>

            {target.ipa && (
              <p className="mt-2 font-mono text-base text-slate-500 dark:text-slate-400">
                {target.ipa}
              </p>
            )}

            {target.syllables && (
              <div className="mt-5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Découpage rythmique
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {target.syllables.split('·').map((syl, index) => (
                    <span
                      key={`${syl}-${index}`}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 font-display text-base font-semibold text-slate-800 dark:text-slate-200"
                    >
                      {syl.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {target.tipFr && (
              <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Conseil d’articulation
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {target.tipFr}
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleGuidedCoach}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Headphones className="h-4 w-4" aria-hidden="true" />
                <span>
                  {coachStep === 'intro'
                    ? 'Consigne vocale…'
                    : coachStep === 'slow'
                      ? 'Prononciation lente…'
                      : coachStep === 'normal'
                        ? 'Rythme naturel…'
                        : 'Lancer le guide vocal complet'}
                </span>
              </button>

              {coachStep !== 'idle' && (
                <button
                  type="button"
                  onClick={stopAllAudio}
                  aria-label="Arrêter la lecture"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                  <span>Stop</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  stopAllAudio();
                  speakText(target.word, { accent, rate: 0.95 });
                }}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Volume2 className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span>Écouter (1.0x)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopAllAudio();
                  speakText(target.word, { accent, rate: 0.58 });
                }}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Turtle className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span>Très lent (0.6x)</span>
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 lg:col-span-5">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Mise en pratique à voix haute
            </p>
            <h3 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              Prononcez et vérifiez votre accent
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Testez votre prononciation avec le microphone ou suivez l’exercice de répétition chronométrée.
            </p>

            <div className="mt-6">
              {speechRecSupported ? (
                <button
                  type="button"
                  onClick={isListening ? stopAllAudio : handleStartMicTest}
                  className={`flex min-h-[56px] w-full items-center justify-center gap-3 rounded-xl px-5 py-3.5 text-sm font-semibold transition-colors ${
                    isListening
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-5 w-5" aria-hidden="true" />
                      <span>Écoute en cours… Appuyez pour arrêter</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5" aria-hidden="true" />
                      <span>Parler maintenant</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  La détection micro directe n’est pas disponible sur ce navigateur. Utilisez le mode{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Répétition guidée
                  </span>{' '}
                  ci-dessous.
                </div>
              )}
            </div>

            {micError && (
              <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
                {micError}
              </div>
            )}

            {evaluation && (
              <div
                className={`mt-5 rounded-xl border p-4 ${
                  evaluation.tier === 'excellent'
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40'
                    : evaluation.tier === 'good'
                      ? 'border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40'
                      : 'border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {evaluation.verdictFr}
                  </span>
                  <span className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {evaluation.score}%
                  </span>
                </div>
                {spokenTranscript && (
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Entendu :{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      « {spokenTranscript} »
                    </span>
                  </p>
                )}
                <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {evaluation.adviceFr}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Exercice de répétition guidée (Shadowing)
              </span>
              {shadowPhase !== 'idle' && (
                <button
                  type="button"
                  onClick={stopAllAudio}
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            {shadowPhase === 'idle' && (
              <button
                type="button"
                onClick={handleStartShadowing}
                className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Play className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span>Écouter puis répéter (cycle 3 s)</span>
              </button>
            )}

            {shadowPhase === 'listen' && (
              <div className="mt-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-4 text-center">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  1. Écoutez le modèle lentement…
                </p>
              </div>
            )}

            {shadowPhase === 'speak' && (
              <div className="mt-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-center">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  2. À vous ! Prononcez « {target.word} » à voix haute
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {shadowSeconds}s
                </p>
              </div>
            )}

            {shadowPhase === 'review' && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <span>Comparez avec la voix normale</span>
                </div>
                <button
                  type="button"
                  onClick={handleStartShadowing}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Refaire</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
