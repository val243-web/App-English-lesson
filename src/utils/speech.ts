import { AccentMode } from '../types/learning';

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

function pickBestVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = loadVoices();
  if (voices.length === 0) return null;

  const exact = voices.filter((v) => v.lang.toLowerCase() === lang.toLowerCase());
  const prefix = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(lang.split('-')[0].toLowerCase())
  );

  const pool = exact.length > 0 ? exact : prefix;
  if (pool.length === 0) return null;

  const preferred = pool.find(
    (v) =>
      v.name.includes('Natural') ||
      v.name.includes('Google') ||
      v.name.includes('Samantha') ||
      v.name.includes('Daniel') ||
      v.name.includes('Enhanced')
  );
  return preferred ?? pool[0];
}

export interface SpeakOptions {
  accent?: AccentMode | 'fr-FR';
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

export function speakText(text: string, options: SpeakOptions = {}): void {
  if (!isSpeechSynthesisSupported() || !text.trim()) {
    options.onError?.();
    return;
  }

  const { accent = 'en-US', rate = 0.95, pitch = 1.0, onStart, onEnd, onError } = options;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = accent;
  utterance.rate = rate;
  utterance.pitch = pitch;

  const voice = pickBestVoice(accent);
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onError?.();

  window.speechSynthesis.speak(utterance);
}

/**
 * Guided voice coaching sequence:
 * Speaks a short French cue, then plays the English phrase slowly, then at natural speed.
 */
export function speakGuidedCoachSequence(
  englishTarget: string,
  syllables: string | undefined,
  accent: AccentMode,
  callbacks: {
    onStep?: (step: 'intro' | 'slow' | 'normal' | 'done') => void;
    onError?: () => void;
  } = {}
): () => void {
  if (!isSpeechSynthesisSupported()) {
    callbacks.onError?.();
    return () => {};
  }

  let cancelled = false;
  window.speechSynthesis.cancel();

  const introText = syllables
    ? `Écoutez bien les syllabes : ${syllables.replace(/·/g, ', ')}. Répétez après moi.`
    : `Écoutez attentivement, puis répétez après moi.`;

  const uIntro = new SpeechSynthesisUtterance(introText);
  uIntro.lang = 'fr-FR';
  uIntro.rate = 1.0;
  const frVoice = pickBestVoice('fr-FR');
  if (frVoice) uIntro.voice = frVoice;

  const uSlow = new SpeechSynthesisUtterance(englishTarget);
  uSlow.lang = accent;
  uSlow.rate = 0.62;
  const enVoice = pickBestVoice(accent);
  if (enVoice) uSlow.voice = enVoice;

  const uNormal = new SpeechSynthesisUtterance(englishTarget);
  uNormal.lang = accent;
  uNormal.rate = 0.95;
  if (enVoice) uNormal.voice = enVoice;

  uIntro.onstart = () => {
    if (!cancelled) callbacks.onStep?.('intro');
  };
  uIntro.onend = () => {
    if (!cancelled) window.speechSynthesis.speak(uSlow);
  };
  uSlow.onstart = () => {
    if (!cancelled) callbacks.onStep?.('slow');
  };
  uSlow.onend = () => {
    if (!cancelled) {
      setTimeout(() => {
        if (!cancelled) window.speechSynthesis.speak(uNormal);
      }, 380);
    }
  };
  uNormal.onstart = () => {
    if (!cancelled) callbacks.onStep?.('normal');
  };
  uNormal.onend = () => {
    if (!cancelled) callbacks.onStep?.('done');
  };
  uIntro.onerror = () => {
    if (!cancelled) callbacks.onError?.();
  };

  window.speechSynthesis.speak(uIntro);

  return () => {
    cancelled = true;
    window.speechSynthesis.cancel();
  };
}

export interface SpeechRecognitionHandle {
  stop: () => void;
}

interface BrowserSpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export function startPronunciationCheck(
  accent: AccentMode,
  onResult: (transcript: string, confidence: number) => void,
  onError: (messageFr: string) => void,
  onEnd: () => void
): SpeechRecognitionHandle | null {
  const Recognition = getSpeechRecognitionConstructor();
  if (!Recognition) {
    onError(
      "La reconnaissance vocale directe n'est pas disponible sur ce navigateur. Utilisez le mode Répétition guidée ci-dessous."
    );
    return null;
  }

  try {
    const recognition = new Recognition();
    recognition.lang = accent;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    let receivedResult = false;

    recognition.onresult = (event) => {
      receivedResult = true;
      const result = event.results?.[0]?.[0];
      if (result) {
        onResult(result.transcript, result.confidence ?? 0.85);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        onError("L'accès au microphone a été refusé. Autorisez le micro dans votre navigateur.");
      } else if (event.error === 'no-speech') {
        onError('Aucune voix détectée. Rapprochez-vous du micro et parlez clairement.');
      } else {
        onError('Impossible de capter le son pour le moment. Réessayez.');
      }
    };

    recognition.onend = () => {
      if (!receivedResult) {
        onEnd();
      } else {
        onEnd();
      }
    };

    recognition.start();
    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {
          // ignore stop errors
        }
      },
    };
  } catch {
    onError("Impossible de démarrer l'écoute du microphone.");
    return null;
  }
}

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,!?;:'"’\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

export interface PronunciationEvaluation {
  score: number;
  verdictFr: string;
  adviceFr: string;
  tier: 'excellent' | 'good' | 'retry';
}

export function evaluatePronunciation(
  target: string,
  spoken: string
): PronunciationEvaluation {
  const normTarget = normalizeText(target);
  const normSpoken = normalizeText(spoken);

  if (!normSpoken) {
    return {
      score: 0,
      verdictFr: 'Aucun mot reconnu',
      adviceFr: 'Parlez distinctement juste après avoir appuyé sur le bouton micro.',
      tier: 'retry',
    };
  }

  if (normTarget === normSpoken) {
    return {
      score: 100,
      verdictFr: 'Prononciation excellente !',
      adviceFr: 'Votre articulation correspond parfaitement au modèle anglais.',
      tier: 'excellent',
    };
  }

  const dist = levenshtein(normTarget, normSpoken);
  const maxLen = Math.max(normTarget.length, normSpoken.length, 1);
  const ratio = Math.max(0, Math.round((1 - dist / maxLen) * 100));

  if (ratio >= 80) {
    return {
      score: ratio,
      verdictFr: 'Très bonne prononciation !',
      adviceFr: `Presque parfait ("${spoken}"). Réécoutez à vitesse lente pour affiner la fin du mot.`,
      tier: 'excellent',
    };
  }

  if (ratio >= 55) {
    return {
      score: ratio,
      verdictFr: 'En bonne voie',
      adviceFr: `Compris comme "${spoken}". Accentuez bien la syllabe forte et réessayez lentement.`,
      tier: 'good',
    };
  }

  return {
    score: ratio,
    verdictFr: 'À retravailler ensemble',
    adviceFr: `Le micro a entendu "${spoken}". Écoutez le coach en vitesse lente puis répétez syllabe par syllabe.`,
    tier: 'retry',
  };
}

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  return audioCtx;
}

export function playFeedbackTone(type: 'correct' | 'wrong' | 'complete', enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const now = ctx.currentTime;

    if (type === 'correct') {
      [523.25, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.11, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.22);
      });
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.linearRampToValueAtTime(190, now + 0.18);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.1, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } else {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.001, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.1, now + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.3);
      });
    }
  } catch {
    // Ignore audio context errors on restricted devices
  }
}
