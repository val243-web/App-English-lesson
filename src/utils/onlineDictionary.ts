import { DictionaryEntry, LevelId } from '../types/learning';

const FREE_DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

interface ApiPhonetic {
  text?: string;
  audio?: string;
}

interface ApiDefinition {
  definition: string;
  example?: string;
}

interface ApiMeaning {
  partOfSpeech: string;
  definitions: ApiDefinition[];
}

interface ApiEntry {
  word: string;
  phonetic?: string;
  phonetics?: ApiPhonetic[];
  meanings?: ApiMeaning[];
}

const DISCOVERY_WORD_POOLS: { word: string; hintFr: string; level: LevelId }[] = [
  { word: 'journey', hintFr: 'Voyage / Trajet', level: 1 },
  { word: 'library', hintFr: 'Bibliothèque', level: 1 },
  { word: 'neighbor', hintFr: 'Voisin / Voisine', level: 1 },
  { word: 'weather', hintFr: 'Météo', level: 1 },
  { word: 'evening', hintFr: 'Soirée', level: 1 },
  { word: 'kitchen', hintFr: 'Cuisine', level: 1 },
  { word: 'holiday', hintFr: 'Vacances / Jour férié', level: 1 },
  { word: 'curious', hintFr: 'Curieux', level: 2 },
  { word: 'adventure', hintFr: 'Aventure', level: 2 },
  { word: 'achieve', hintFr: 'Accomplir / Réussir', level: 2 },
  { word: 'improve', hintFr: 'Améliorer', level: 2 },
  { word: 'confident', hintFr: 'Confiant', level: 2 },
  { word: 'essential', hintFr: 'Essentiel', level: 2 },
  { word: 'challenge', hintFr: 'Défi', level: 2 },
  { word: 'opportunity', hintFr: 'Opportunité / Occasion', level: 2 },
  { word: 'strategy', hintFr: 'Stratégie', level: 3 },
  { word: 'eloquent', hintFr: 'Éloquent', level: 3 },
  { word: 'perspective', hintFr: 'Perspective / Point de vue', level: 3 },
  { word: 'innovative', hintFr: 'Innovant', level: 3 },
  { word: 'perseverance', hintFr: 'Persévérance', level: 3 },
  { word: 'phenomenon', hintFr: 'Phénomène', level: 3 },
  { word: 'ambiguous', hintFr: 'Ambigu', level: 3 },
  { word: 'collaborate', hintFr: 'Collaborer', level: 3 },
  { word: 'authentic', hintFr: 'Authentique', level: 3 },
];

function mapPartOfSpeech(pos: string): DictionaryEntry['partOfSpeech'] {
  switch (pos.toLowerCase()) {
    case 'noun':
      return 'nom';
    case 'verb':
      return 'verbe';
    case 'adjective':
      return 'adjectif';
    case 'adverb':
      return 'adverbe';
    default:
      return pos;
  }
}

function splitSyllablesHeuristic(word: string): string {
  const clean = word.trim();
  if (clean.length <= 4) return clean;
  const parts = clean.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy](?![aeiouy]))?/gi);
  if (!parts || parts.length <= 1) return clean;
  return parts.join(' · ');
}

export function isNavigatorOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

export async function fetchOnlineWord(
  rawWord: string,
  options: { hintFr?: string; level?: LevelId } = {}
): Promise<DictionaryEntry | null> {
  const clean = rawWord.trim().toLowerCase();
  if (!clean || !/^[a-zA-Z\s'-]+$/.test(clean)) return null;
  if (!isNavigatorOnline()) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const response = await fetch(`${FREE_DICTIONARY_API}/${encodeURIComponent(clean)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const payload = (await response.json()) as ApiEntry[];
    const first = payload?.[0];
    if (!first || !first.word) return null;

    const phoneticText =
      first.phonetic ||
      first.phonetics?.find((p) => p.text)?.text ||
      `/${first.word.toLowerCase()}/`;

    const audioUrl = first.phonetics?.find((p) => p.audio && p.audio.length > 0)?.audio;
    const primaryMeaning = first.meanings?.[0];
    const primaryDef = primaryMeaning?.definitions?.[0];
    const exampleWithSentence =
      primaryMeaning?.definitions?.find((d) => d.example)?.example ||
      `Try using "${first.word}" in a short daily sentence.`;

    const capitalized = first.word.charAt(0).toUpperCase() + first.word.slice(1);

    return {
      id: `online-${clean.replace(/\s+/g, '-')}`,
      word: capitalized,
      ipaUS: phoneticText,
      ipaUK: phoneticText,
      syllables: splitSyllablesHeuristic(capitalized),
      partOfSpeech: primaryMeaning ? mapPartOfSpeech(primaryMeaning.partOfSpeech) : 'nom',
      level: options.level ?? 2,
      category: 'En ligne',
      translationFr: options.hintFr ?? 'Entrée dictionnaire anglais (en ligne)',
      definitionFr: primaryDef?.definition ?? 'Définition récupérée depuis le dictionnaire libre.',
      pronunciationTipFr:
        'Écoutez attentivement l’audio natif puis utilisez la voix lente pour repérer l’accent tonique.',
      exampleEn: exampleWithSentence,
      exampleFr: 'Exemple authentique issu du dictionnaire anglais.',
      audioUrl,
      source: 'online',
    };
  } catch {
    return null;
  }
}

export async function fetchNewDiscoveryWordsBatch(
  existingWords: string[],
  count = 4
): Promise<{ words: DictionaryEntry[]; offline: boolean }> {
  if (!isNavigatorOnline()) {
    return { words: [], offline: true };
  }

  const existingSet = new Set(existingWords.map((w) => w.toLowerCase()));
  const candidates = DISCOVERY_WORD_POOLS.filter(
    (item) => !existingSet.has(item.word.toLowerCase())
  );

  // Pick a fresh slice (shuffled lightly for variety)
  const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, count);
  if (shuffled.length === 0) {
    return { words: [], offline: false };
  }

  const results = await Promise.all(
    shuffled.map((item) =>
      fetchOnlineWord(item.word, { hintFr: item.hintFr, level: item.level })
    )
  );

  const valid = results.filter((entry): entry is DictionaryEntry => entry !== null);
  return {
    words: valid,
    offline: valid.length === 0 && !isNavigatorOnline(),
  };
}
