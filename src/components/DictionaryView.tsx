import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CloudDownload,
  Globe,
  Mic,
  Search,
  Star,
  Turtle,
  Volume2,
  WifiOff,
  X,
} from 'lucide-react';
import { DICTIONARY_ENTRIES } from '../data/dictionary';
import { AccentMode, DictionaryCategory, DictionaryEntry, LevelId } from '../types/learning';
import {
  fetchNewDiscoveryWordsBatch,
  fetchOnlineWord,
  isNavigatorOnline,
} from '../utils/onlineDictionary';
import { speakText } from '../utils/speech';

interface DictionaryViewProps {
  accent: AccentMode;
  favoriteWordIds: string[];
  cachedOnlineWords: DictionaryEntry[];
  onChangeAccent: (accent: AccentMode) => void;
  onToggleFavorite: (wordId: string) => void;
  onAddOnlineWords: (words: DictionaryEntry[]) => void;
  onSendToCoach: (word: string, syllables?: string, tipFr?: string, ipa?: string) => void;
}

const CATEGORIES: ('Tous' | DictionaryCategory)[] = [
  'Tous',
  'Salutations',
  'Quotidien',
  'Voyage',
  'Travail',
  'Expressions',
  'Difficiles',
  'En ligne',
];

export function DictionaryView({
  accent,
  favoriteWordIds,
  cachedOnlineWords,
  onChangeAccent,
  onToggleFavorite,
  onAddOnlineWords,
  onSendToCoach,
}: DictionaryViewProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Tous' | DictionaryCategory>('Tous');
  const [selectedLevel, setSelectedLevel] = useState<'all' | LevelId>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [activeEntryId, setActiveEntryId] = useState<string>(DICTIONARY_ENTRIES[0].id);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [speakingTag, setSpeakingTag] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() => isNavigatorOnline());
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [onlineStatusMsg, setOnlineStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const allEntries = useMemo(() => {
    return [...cachedOnlineWords, ...DICTIONARY_ENTRIES];
  }, [cachedOnlineWords]);

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEntries.filter((entry) => {
      if (selectedCategory !== 'Tous' && entry.category !== selectedCategory) return false;
      if (selectedLevel !== 'all' && entry.level !== selectedLevel) return false;
      if (onlyFavorites && !favoriteWordIds.includes(entry.id)) return false;
      if (!q) return true;
      return (
        entry.word.toLowerCase().includes(q) ||
        entry.translationFr.toLowerCase().includes(q) ||
        entry.definitionFr.toLowerCase().includes(q)
      );
    });
  }, [allEntries, query, selectedCategory, selectedLevel, onlyFavorites, favoriteWordIds]);

  const activeEntry: DictionaryEntry | undefined =
    filteredEntries.find((e) => e.id === activeEntryId) ??
    allEntries.find((e) => e.id === activeEntryId) ??
    filteredEntries[0];

  const trimmedQuery = query.trim();
  const hasExactMatch =
    trimmedQuery.length > 0 &&
    allEntries.some((e) => e.word.toLowerCase() === trimmedQuery.toLowerCase());

  const playAudio = (text: string, rate: number, tag: string, audioUrl?: string) => {
    if (audioUrl && rate >= 0.9 && isOnline) {
      const audio = new Audio(audioUrl);
      setSpeakingTag(tag);
      audio.onended = () => setSpeakingTag(null);
      audio.onerror = () => {
        speakText(text, {
          accent,
          rate,
          onStart: () => setSpeakingTag(tag),
          onEnd: () => setSpeakingTag(null),
          onError: () => setSpeakingTag(null),
        });
      };
      void audio.play().catch(() => {
        speakText(text, {
          accent,
          rate,
          onStart: () => setSpeakingTag(tag),
          onEnd: () => setSpeakingTag(null),
          onError: () => setSpeakingTag(null),
        });
      });
      return;
    }

    speakText(text, {
      accent,
      rate,
      onStart: () => setSpeakingTag(tag),
      onEnd: () => setSpeakingTag(null),
      onError: () => setSpeakingTag(null),
    });
  };

  const handleDiscoverOnlineWords = async () => {
    setOnlineStatusMsg(null);
    setLoadingOnline(true);
    const existingWords = allEntries.map((e) => e.word);
    const { words, offline } = await fetchNewDiscoveryWordsBatch(existingWords, 4);
    setLoadingOnline(false);

    if (offline || !isNavigatorOnline()) {
      setOnlineStatusMsg(
        'Vous semblez hors ligne : votre dictionnaire local reste entièrement disponible.'
      );
      return;
    }

    if (words.length === 0) {
      setOnlineStatusMsg(
        'Tous les lots de découverte actuels sont déjà enregistrés localement.'
      );
      return;
    }

    onAddOnlineWords(words);
    setSelectedCategory('En ligne');
    setActiveEntryId(words[0].id);
    setOnlineStatusMsg(
      `${words.length} nouveaux mots récupérés et sauvegardés dans votre téléphone.`
    );
  };

  const handleLookupOnlineWord = async (wordToFetch: string) => {
    setOnlineStatusMsg(null);
    setLoadingOnline(true);
    const entry = await fetchOnlineWord(wordToFetch);
    setLoadingOnline(false);

    if (!entry) {
      setOnlineStatusMsg(
        isNavigatorOnline()
          ? `Mot introuvable dans le dictionnaire libre pour « ${wordToFetch} ». La voix reste active.`
          : 'Mode hors ligne : impossible de récupérer la définition en ligne pour le moment.'
      );
      return;
    }

    onAddOnlineWords([entry]);
    setActiveEntryId(entry.id);
    setMobileDetailOpen(true);
    setOnlineStatusMsg(`« ${entry.word} » ajouté et sauvegardé localement.`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Search Bar */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>
                Dictionnaire local ({allEntries.length} mots) · Voix US & UK
              </span>
              <span aria-hidden="true">·</span>
              {isOnline ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  Connecté (extensible en ligne)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                  <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                  Hors ligne (données locales actives)
                </span>
              )}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
              Dictionnaire vocal & enrichissement en ligne
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={loadingOnline || !isOnline}
              onClick={handleDiscoverOnlineWords}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-4 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CloudDownload className="h-4 w-4" aria-hidden="true" />
              <span>
                {loadingOnline ? 'Récupération…' : 'Télécharger de nouveaux mots'}
              </span>
            </button>

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

        {onlineStatusMsg && (
          <p className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300">
            {onlineStatusMsg}
          </p>
        )}

        {/* Search Input */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher un mot en anglais ou en français (ex: resilient, merci, adventure…)"
              className="min-h-[48px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-11 pr-10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOnlyFavorites((prev) => !prev)}
            className={`inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
              onlyFavorites
                ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Star
              className={`h-4 w-4 ${onlyFavorites ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`}
              aria-hidden="true"
            />
            <span>Favoris ({favoriteWordIds.length})</span>
          </button>
        </div>

        {/* Category & Level Filters */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-slate-900 dark:bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
                {cat === 'En ligne' && cachedOnlineWords.length > 0
                  ? ` (${cachedOnlineWords.length})`
                  : ''}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            {(['all', 1, 2, 3] as const).map((lvl) => (
              <button
                key={String(lvl)}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedLevel === lvl
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {lvl === 'all' ? 'Tous niveaux' : `Niv. ${lvl}`}
              </button>
            ))}
          </div>
        </div>

        {/* Instant Voice + Online Lookup for any typed English word */}
        {trimmedQuery.length >= 2 && !hasExactMatch && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                Mot non présent dans la base locale : « {trimmedQuery} »
              </p>
              <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
                Écoutez-le tout de suite ou récupérez sa fiche complète si vous êtes connecté à internet.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {isOnline && (
                <button
                  type="button"
                  disabled={loadingOnline}
                  onClick={() => handleLookupOnlineWord(trimmedQuery)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-700"
                >
                  <CloudDownload className="h-4 w-4" aria-hidden="true" />
                  <span>{loadingOnline ? 'Recherche…' : 'Chercher en ligne'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => playAudio(trimmedQuery, 0.95, 'custom-normal')}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span>{speakingTag === 'custom-normal' ? 'Lecture…' : 'Écouter'}</span>
              </button>
              <button
                type="button"
                onClick={() => onSendToCoach(trimmedQuery)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300"
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                <span>Pratiquer</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Master-Detail Split */}
      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <section
          aria-label="Résultats du dictionnaire"
          className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:col-span-5 ${
            mobileDetailOpen ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {filteredEntries.length} {filteredEntries.length > 1 ? 'mots trouvés' : 'mot trouvé'}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">Appuyez pour écouter</span>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                Aucun résultat local pour « {query} »
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Utilisez « Chercher en ligne » ci-dessus ou écoutez directement la prononciation vocale.
              </p>
            </div>
          ) : (
            <div className="max-h-[540px] divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto">
              {filteredEntries.map((entry) => {
                const isSelected = activeEntry?.id === entry.id;
                const isFav = favoriteWordIds.includes(entry.id);

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveEntryId(entry.id);
                        setMobileDetailOpen(true);
                      }}
                      className="flex min-h-[44px] flex-1 flex-col items-start justify-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                          {entry.word}
                        </span>
                        <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                          {accent === 'en-US' ? entry.ipaUS : entry.ipaUK}
                        </span>
                      </div>
                      <span className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                        {entry.translationFr} · Niv. {entry.level}
                        {entry.source === 'online' ? ' · En ligne' : ''}
                      </span>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => playAudio(entry.word, 0.95, `row-${entry.id}`, entry.audioUrl)}
                        aria-label={`Écouter ${entry.word}`}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-100/70 dark:hover:bg-slate-800"
                      >
                        <Volume2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(entry.id)}
                        aria-label={isFav ? `Retirer ${entry.word} des favoris` : `Ajouter ${entry.word} aux favoris`}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Star
                          className={`h-4 w-4 ${isFav ? 'fill-amber-400 text-amber-500' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Word Detail Studio */}
        {activeEntry && (
          <section
            aria-label="Fiche détaillée du mot"
            className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-8 lg:col-span-7 ${
              mobileDetailOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            <button
              type="button"
              onClick={() => setMobileDetailOpen(false)}
              className="mb-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Retour à la liste</span>
            </button>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Niveau {activeEntry.level} · {activeEntry.category} · {activeEntry.partOfSpeech}
                </p>
                <h2 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                  {activeEntry.word}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {accent === 'en-US' ? activeEntry.ipaUS : activeEntry.ipaUK}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    Syllabes :{' '}
                    <span className="text-slate-800 dark:text-slate-200">{activeEntry.syllables}</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleFavorite(activeEntry.id)}
                aria-label="Sauvegarder dans les favoris"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Star
                  className={`h-5 w-5 ${
                    favoriteWordIds.includes(activeEntry.id)
                      ? 'fill-amber-400 text-amber-500'
                      : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  playAudio(activeEntry.word, 0.95, 'detail-normal', activeEntry.audioUrl)
                }
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span>
                  {speakingTag === 'detail-normal'
                    ? 'Lecture en cours…'
                    : `Écouter (${accent === 'en-US' ? 'US' : 'UK'})`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => playAudio(activeEntry.word, 0.6, 'detail-slow')}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Turtle className="h-4 w-4" aria-hidden="true" />
                <span>{speakingTag === 'detail-slow' ? 'Lecture lente…' : 'Voix lente'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onSendToCoach(
                    activeEntry.word,
                    activeEntry.syllables,
                    activeEntry.pronunciationTipFr,
                    accent === 'en-US' ? activeEntry.ipaUS : activeEntry.ipaUK
                  )
                }
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-4 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-300 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/60"
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                <span>Aide à la prononciation</span>
              </button>
            </div>

            <div className="mt-7 space-y-5 border-t border-slate-100 dark:border-slate-800 pt-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Traduction & Définition
                </h3>
                <p className="mt-1.5 text-xl font-bold text-slate-900 dark:text-slate-100">
                  {activeEntry.translationFr}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {activeEntry.definitionFr}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Astuce du coach vocal pour bien prononcer
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {activeEntry.pronunciationTipFr}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                      Exemple en contexte
                    </h3>
                    <p className="mt-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
                      {activeEntry.exampleEn}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {activeEntry.exampleFr}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => playAudio(activeEntry.exampleEn, 0.92, 'detail-example')}
                    aria-label="Écouter la phrase d'exemple"
                    className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800"
                  >
                    <Volume2 className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
