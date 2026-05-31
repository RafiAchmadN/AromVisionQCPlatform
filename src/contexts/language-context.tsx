'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { createT, type Lang, type TranslationKey } from '@/lib/i18n';

interface LanguageCtx {
  lang: Lang;
  toggle: () => void;
  t: (key: TranslationKey) => string;
}

const Ctx = createContext<LanguageCtx>({
  lang: 'id',
  toggle: () => {},
  t: createT('id'),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('id');

  useEffect(() => {
    const saved = localStorage.getItem('arom_lang') as Lang | null;
    if (saved === 'en' || saved === 'id') setLang(saved);
  }, []);

  const toggle = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === 'id' ? 'en' : 'id';
      localStorage.setItem('arom_lang', next);
      return next;
    });
  }, []);

  const t = useCallback((key: TranslationKey) => createT(lang)(key), [lang]);

  return <Ctx.Provider value={{ lang, toggle, t }}>{children}</Ctx.Provider>;
}

export function useLanguage() {
  return useContext(Ctx);
}
