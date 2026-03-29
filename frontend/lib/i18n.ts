import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "@/public/locales/en.json";
import ne from "@/public/locales/ne.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ne: { translation: ne },
    },
    fallbackLng: "en",
    defaultNS: "translation",
    detection: {
      // Persist chosen language in localStorage
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "routeflow_lang",
    },
    interpolation: {
      escapeValue: false, // React handles XSS
    },
  });

export default i18n;
