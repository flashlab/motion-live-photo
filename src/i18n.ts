import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import enJSON from './lang/en.json'
import zhJSON from './lang/zh.json'
i18n.use(LanguageDetector).use(initReactI18next).init({
  supportedLngs: ['zh', 'en'],
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, 
  },
  resources: {
    en: { ...enJSON },
    zh: { ...zhJSON },
  },
  lng: "en",
});