import { useState } from 'react';
import { Award, Moon, RotateCcw, Star, Sun, Volume2, VolumeX } from 'lucide-react';
import { BADGES } from '../data/badges';
import { DICTIONARY_ENTRIES } from '../data/dictionary';
import { AccentMode, ThemeMode, UserProgress } from '../types/learning';
import { speakText } from '../utils/speech';

interface SettingsViewProps {
  progress: UserProgress;
  onChangeAccent: (accent: AccentMode) => void;
  onChangeTheme: (theme: ThemeMode) => void;
  onToggleSoundEffects: () => void;
  onToggleUnlockAll: () => void;
  onResetProgress: () => void;
  onOpenWordInCoach: (word: string, syllables?: string, tipFr?: string, ipa?: string) => void;
}

export function SettingsView({
  progress,
  onChangeAccent,
  onChangeTheme,
  onToggleSoundEffects,
  onToggleUnlockAll,
  onResetProgress,
  onOpenWordInCoach,
}: SettingsViewProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  const allEntries = [...progress.cachedOnlineWords, ...DICTIONARY_ENTRIES];
  const favoriteEntries = allEntries.filter((entry) =>
    progress.favoriteWordIds.includes(entry.id)
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Stockage 100 % local sur votre appareil · Sans compte requis
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          Réglages d’English Lesson
        </h1>

        <div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
          {/* Light / Dark Mode */}
          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Apparence de l’application
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choisissez le thème clair ou le mode sombre pour réviser confortablement le soir.
              </p>
            </div>
            <div className="flex items-center gap-1 self-start rounded-lg bg-slate-100 dark:bg-slate-800 p-1 sm:self-auto">
              <button
                type="button"
                onClick={() => onChangeTheme('light')}
                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  progress.theme === 'light'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clair</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeTheme('dark')}
                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  progress.theme === 'dark'
                    ? 'bg-slate-900 text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sombre</span>
              </button>
            </div>
          </div>

          {/* Accent Selection */}
          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Accent vocal par défaut
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Utilisé dans les histoires, quiz audio, le dictionnaire et le coach vocal.
              </p>
            </div>
            <div className="flex items-center gap-1 self-start rounded-lg bg-slate-100 dark:bg-slate-800 p-1 sm:self-auto">
              <button
                type="button"
                onClick={() => onChangeAccent('en-US')}
                className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  progress.accent === 'en-US'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Américain (US)
              </button>
              <button
                type="button"
                onClick={() => onChangeAccent('en-GB')}
                className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  progress.accent === 'en-GB'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Britannique (UK)
              </button>
            </div>
          </div>

          {/* Sound Effects */}
          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Effets sonores des quiz
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Brefs signaux sonores lors des bonnes réponses et fins de partie.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleSoundEffects}
              className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors ${
                progress.soundEffects
                  ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {progress.soundEffects ? (
                <>
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  <span>Activés</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4" aria-hidden="true" />
                  <span>Désactivés</span>
                </>
              )}
            </button>
          </div>

          {/* Unlock All Preview Toggle */}
          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Mode aperçu : débloquer toutes les étapes
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Accédez librement aux histoires et quiz des niveaux 2 et 3 pour tester.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleUnlockAll}
              className={`inline-flex min-h-[42px] shrink-0 items-center rounded-xl border px-4 py-2 text-xs font-semibold transition-colors ${
                progress.unlockAllPreview
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              {progress.unlockAllPreview ? 'Tout débloqué' : 'Progression normale'}
            </button>
          </div>

          {/* Reset Progress */}
          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Réinitialiser ma progression locale
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Efface vos points XP, badges, histoires et mots sauvegardés sur cet appareil.
              </p>
            </div>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex min-h-[42px] self-start items-center gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 sm:self-auto"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>Réinitialiser</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetProgress();
                    setConfirmReset(false);
                  }}
                  className="inline-flex min-h-[40px] items-center rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Confirmer
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Badges Section */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
          Badges débloqués ({progress.unlockedBadges.length} / {BADGES.length})
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {BADGES.map((badge) => {
            const unlocked = progress.unlockedBadges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`flex items-start gap-3 rounded-xl border p-3.5 ${
                  unlocked
                    ? 'border-amber-200 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 opacity-60'
                }`}
              >
                <Award
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    unlocked ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {badge.titleFr}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {badge.descriptionFr}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Saved Favorite Words */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
          Vos mots sauvegardés ({favoriteEntries.length})
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Réécoutez rapidement le vocabulaire ajouté depuis le dictionnaire.
        </p>

        {favoriteEntries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Aucun mot en favori pour le moment. Appuyez sur l’étoile d’un mot dans le dictionnaire pour le retrouver ici.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {favoriteEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
                    <span className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      {entry.word}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {progress.accent === 'en-US' ? entry.ipaUS : entry.ipaUK}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{entry.translationFr}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => speakText(entry.word, { accent: progress.accent, rate: 0.95 })}
                    aria-label={`Écouter ${entry.word}`}
                    className="flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800"
                  >
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenWordInCoach(
                        entry.word,
                        entry.syllables,
                        entry.pronunciationTipFr,
                        progress.accent === 'en-US' ? entry.ipaUS : entry.ipaUK
                      )
                    }
                    className="min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Pratiquer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
