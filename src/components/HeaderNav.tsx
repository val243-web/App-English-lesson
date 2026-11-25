import { BookOpen, Compass, Layers, Mic, Settings, Smartphone } from 'lucide-react';

export type AppTab = 'path' | 'revision' | 'dictionary' | 'coach' | 'settings';

interface HeaderNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenMobileGuide: () => void;
}

const NAV_ITEMS: { id: AppTab; labelDesktop: string; labelMobile: string; icon: typeof Compass }[] = [
  { id: 'path', labelDesktop: 'Parcours', labelMobile: 'Parcours', icon: Compass },
  { id: 'revision', labelDesktop: 'Révision', labelMobile: 'Révision', icon: Layers },
  { id: 'dictionary', labelDesktop: 'Dictionnaire', labelMobile: 'Dico', icon: BookOpen },
  { id: 'coach', labelDesktop: 'Coach vocal', labelMobile: 'Coach', icon: Mic },
  { id: 'settings', labelDesktop: 'Réglages', labelMobile: 'Options', icon: Settings },
];

export function HeaderNav({ activeTab, onSelectTab, onOpenMobileGuide }: HeaderNavProps) {
  return (
    <>
      {/* Top Header (non-sticky on mobile to respect 15% mobile sticky cap) */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 md:sticky md:top-0 md:z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          {/* Zone 1: Single-element Brand wordmark */}
          <button
            type="button"
            onClick={() => onSelectTab('path')}
            className="font-display shrink-0 whitespace-nowrap text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
          >
            English Lesson
          </button>

          {/* Zone 2: 5 single-line text nav links (Desktop) */}
          <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`shrink-0 whitespace-nowrap py-1.5 text-sm font-medium transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    active
                      ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {item.labelDesktop}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={onOpenMobileGuide}
              className="inline-flex min-h-[40px] shrink-0 whitespace-nowrap items-center gap-2 rounded-lg bg-slate-900 dark:bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Smartphone className="h-4 w-4" aria-hidden="true" />
              <span>Version Mobile</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Tab Bar */}
      <nav
        aria-label="Navigation mobile"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pb-safe md:hidden"
      >
        <div className="grid h-16 grid-cols-5 items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                <span className="text-[10px] font-medium tracking-tight leading-none whitespace-nowrap">
                  {item.labelMobile}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
