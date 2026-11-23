import React from 'react';
import { BookOpen, CalendarDays, ShoppingCart } from 'lucide-react';

export type AppTab = 'recipes' | 'planner' | 'grocery';

interface NavigationProps {
  currentTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  recipesCount: number;
  groceryPendingCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onChangeTab,
  recipesCount,
  groceryPendingCount,
}) => {
  const tabs = [
    {
      id: 'recipes' as AppTab,
      label: 'Recettes',
      icon: BookOpen,
      badge: recipesCount > 0 ? recipesCount : undefined,
    },
    {
      id: 'planner' as AppTab,
      label: 'Planning Semaine',
      icon: CalendarDays,
      badge: undefined,
    },
    {
      id: 'grocery' as AppTab,
      label: 'Liste de Courses',
      icon: ShoppingCart,
      badge: groceryPendingCount > 0 ? groceryPendingCount : undefined,
    },
  ];

  return (
    <>
      {/* Desktop / PC Top Tabs (Visible on md and up) */}
      <div className="hidden md:block bg-white border-b border-slate-200/60 sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onChangeTab(tab.id)}
                  className={`
                    py-4 px-1 inline-flex items-center gap-2 border-b-2 text-sm font-semibold transition-all relative
                    ${
                      isActive
                        ? 'border-orange-600 text-orange-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`
                        text-xs font-bold px-2 py-0.5 rounded-full
                        ${
                          isActive
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-100 text-slate-600'
                        }
                      `}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* iOS & Mobile Bottom Navigation Bar (Fixed bottom with safe area padding) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 pb-safe shadow-lg">
        <div className="grid grid-cols-3 h-16 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`
                  flex flex-col items-center justify-center gap-1 relative transition-colors active:scale-95
                  ${isActive ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'}
                `}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-3 min-w-4 h-4 px-1 bg-orange-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[11px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {tab.label.split(' ')[0]}
                </span>
                {isActive && (
                  <span className="absolute top-0 w-8 h-0.5 bg-orange-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
