
export interface LocalAppSettings {
    serverUrl: string;
    forceOffline?: boolean;
    lastUserEmail: string;
    lastUserPassword: string;
    applicationVersion?: string;
    apiKey?: string;
    nbPeriod?: number;
    preferedLanguage: SupportedLanguages;
}
export type SupportedLanguages = 'fr' | 'en';
export type NetworkConnection = 'UNKNOWN' | 'NONE'| '3G' | '4G' | 'WIFI' | 'WIRED';
