import { translations, type Language } from './translations';
import { useSettingsStore } from '@/stores';

export type TranslationKey = keyof typeof translations.ar;

/**
 * Reactive translation hook — reads language from Zustand store.
 * No page reload needed; language change is instant.
 */
export function useTranslation() {
  const language = useSettingsStore((s) => s.language);
  const t = translations[language];

  return {
    t,
    lang: language,
    dir: language === 'ar' ? 'rtl' as const : 'ltr' as const,
    isRTL: language === 'ar',
    setLanguage: (newLang: Language) => {
      // 1. Update zustand store (auto-persists to localStorage)
      useSettingsStore.getState().setLanguage(newLang);
      // 2. Update DOM direction immediately
      if (typeof window !== 'undefined') {
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = newLang;
      }
    },
  };
}

export function getTranslation(key: TranslationKey, lang: Language = 'ar'): string {
  return translations[lang][key] || translations.ar[key] || key;
}

/** Get current language from store (non-hook, for use outside React) */
export function getCurrentLanguage(): Language {
  if (typeof window === 'undefined') return 'ar';
  return useSettingsStore.getState().language;
}

export function getSettings(): {
  language: Language;
  units: {
    dimension: string;
    area: string;
    load: string;
    stress: string;
    density: string;
  };
} {
  if (typeof window === 'undefined') {
    return {
      language: 'ar',
      units: { dimension: 'cm', area: 'm²', load: 'ton', stress: 'kg/cm²', density: 'kg/m³' },
    };
  }
  const state = useSettingsStore.getState();
  return {
    language: state.language,
    units: state.units,
  };
}
