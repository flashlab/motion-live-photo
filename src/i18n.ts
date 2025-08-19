/* eslint-disable @typescript-eslint/no-floating-promises */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import enJSON from './lang/en.json'
import zhJSON from './lang/zh-hans.json'
i18n.use(LanguageDetector).use(initReactI18next).init({
  supportedLngs: ['zh', 'en'],
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, 
  },
  detection: {
    order: ['path', 'cookie', 'localStorage', 'navigator'],
    caches: ['cookie', 'localStorage'],
  },
  resources: {
    en: { translation: enJSON },
    zh: { translation: zhJSON },
  },
});