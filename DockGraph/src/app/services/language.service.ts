import { Injectable, signal, WritableSignal } from '@angular/core';
import { DICTIONARIES, TranslationDictionary, EN } from '../i18n/dictionaries';

@Injectable({
    providedIn: 'root'
})
export class LanguageService {
    private readonly LANGUAGE_KEY = 'app-language';

    // Expose current dictionary as a signal
    public dictionary: WritableSignal<TranslationDictionary>;

    // Expose current language code
    public currentLang: WritableSignal<string>;

    constructor() {
        // Get stored language or default to 'en'
        const storedLang = localStorage.getItem(this.LANGUAGE_KEY) || 'en';

        // Validate that the stored language exists in our dictionaries, otherwise fallback to 'en'
        const validLang = DICTIONARIES[storedLang] ? storedLang : 'en';

        this.currentLang = signal(validLang);
        this.dictionary = signal(DICTIONARIES[validLang]);
    }

    /**
     * Change the application language.
     * This saves the preference and reloads the page to ensure clear state application.
     * @param lang 'en' or 'es'
     */
    setLanguage(lang: string): void {
        if (DICTIONARIES[lang]) {
            localStorage.setItem(this.LANGUAGE_KEY, lang);
            window.location.reload();
        }
    }

    get availableLanguages(): { code: string, label: string }[] {
        return [
            { code: 'en', label: 'English' },
            { code: 'es', label: 'Español' }
        ];
    }
}
