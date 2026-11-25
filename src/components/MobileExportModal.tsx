import { Check, GitBranch, Smartphone, X } from 'lucide-react';

interface MobileExportModalProps {
  open: boolean;
  onClose: () => void;
}

export function MobileExportModal({ open, onClose }: MobileExportModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-guide-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/55 backdrop-blur-xs sm:items-center sm:p-4"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white dark:bg-slate-900 p-6 sm:rounded-2xl sm:p-8 border border-slate-200 dark:border-slate-800">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700 sm:hidden" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Smartphone className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                English Lesson · Android & iOS · Stockage local
              </p>
              <h2
                id="mobile-guide-title"
                className="font-display text-xl font-bold text-slate-900 dark:text-slate-100"
              >
                Release GitHub & Téléchargement APK
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Toutes vos données (niveaux, histoires, badges, mode sombre et nouveaux mots téléchargés)
          sont enregistrées localement sur votre téléphone. Le workflow GitHub Actions est prêt à
          publier automatiquement l’APK dès votre prochain commit.
        </p>

        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <GitBranch className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span>1. Release automatique sur le dernier commit</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Le workflow{' '}
              <code className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-slate-800 dark:text-slate-200">
                .github/workflows/release-apk.yml
              </code>{' '}
              se déclenche automatiquement à chaque push sur{' '}
              <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-slate-800 dark:text-slate-200">
                main
              </code>{' '}
              (ou sur un tag <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono">v*</code>) et publie{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                English-Lesson.apk
              </span>{' '}
              dans l’onglet Releases de votre dépôt GitHub.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>2. Fonctionnement hors ligne & en ligne</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Si le téléphone est connecté, le dictionnaire peut télécharger de nouveaux mots
              anglais gratuits et les garder en mémoire locale. Hors connexion, tout le parcours,
              les histoires et les mots enregistrés restent utilisables sans erreur.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-slate-900 dark:bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-700 sm:w-auto"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
