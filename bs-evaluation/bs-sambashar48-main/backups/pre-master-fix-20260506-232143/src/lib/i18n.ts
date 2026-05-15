import { translations, type Language } from './translations';

export type TranslationKey = keyof typeof translations.ar;

export function useTranslation(lang?: Language) {
  const currentLang = lang || 'ar';
  const t = translations[currentLang];

  return {
    t,
    lang: currentLang,
    dir: currentLang === 'ar' ? 'rtl' as const : 'ltr' as const,
    isRTL: currentLang === 'ar',
    setLanguage: (newLang: Language) => {
      if (typeof window !== 'undefined') {
        const settings = JSON.parse(localStorage.getItem('bs-evaluation-settings') || '{}');
        settings.language = newLang;
        localStorage.setItem('bs-evaluation-settings', JSON.stringify(settings));
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = newLang;
        window.location.reload();
      }
    },
  };
}

export function getTranslation(key: TranslationKey, lang: Language = 'ar'): string {
  return translations[lang][key] || translations.ar[key] || key;
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
  const saved = JSON.parse(localStorage.getItem('bs-evaluation-settings') || '{}');
  return {
    language: saved.language || 'ar',
    units: saved.units || { dimension: 'cm', area: 'm²', load: 'ton', stress: 'kg/cm²', density: 'kg/m³' },
  };
}
