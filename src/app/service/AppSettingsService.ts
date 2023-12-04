import { Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { LocalAppSettings, SupportedLanguages } from './../model/settings';
import { Storage } from '@ionic/storage-angular';
import { Injectable } from '@angular/core';
import { LocalSingletonDataService } from './LocalSingletonDataService';
import { environment } from '../../environments/environment';

@Injectable()
export class AppSettingsService extends LocalSingletonDataService<LocalAppSettings> {

    public settings: LocalAppSettings = null;

    constructor(storage: Storage) {
        super(storage, 'LocalAppSettings');
        this.get().subscribe((las: LocalAppSettings) => {
            this.settings = las;
        });
    }

    public get(): Observable<LocalAppSettings> {
        return super.get().pipe(
            map((las: LocalAppSettings) => {
                let result: LocalAppSettings = las;
                if (!result) {
                    result = {
                        apiKey: environment.firebaseConfig.apiKey,
                        serverUrl: environment.firebaseConfig.databaseURL,
                        lastUserEmail: null,
                        lastUserPassword: null,
                        forceOffline: false,
                        nbPeriod: 2,
                        preferedLanguage: 'en'
                    };
                    super.save(result);
                }
                if (!result.nbPeriod) {
                    result.nbPeriod = 2;
                }
                if (!result.preferedLanguage) {
                    result.preferedLanguage = 'en';
                }
                this.settings = result;
                return result;
            })
        );
    }
    public setLastUser(email: string, password: string) {
        this.get().subscribe((setting: LocalAppSettings) => {
            setting.lastUserEmail = email;
            setting.lastUserPassword = password;
            this.settings = setting;
            this.save(setting).subscribe();
        });
    }
    public setLastUserObs(email: string, password: string): Observable<LocalAppSettings> {
        return this.get().pipe(
            mergeMap((setting: LocalAppSettings) => {
                setting.lastUserEmail = email;
                setting.lastUserPassword = password;
                this.settings = setting;
                return this.save(setting);
            })
        );
    }
    public setServerUrl(serverUrl: string) {
        this.get().subscribe((setting: LocalAppSettings) => {
            setting.serverUrl = serverUrl;
            this.settings = setting;
            this.save(setting).subscribe();
        });
    }
    public setApplicationVersion(applicationVersion: string) {
        this.get().subscribe((setting: LocalAppSettings) => {
            setting.applicationVersion = applicationVersion;
            this.settings = setting;
            this.save(setting).subscribe();
        });
    }
    public getPreferedLanguage(): Observable<string> {
        return this.get().pipe(map(s=> s.preferedLanguage))
    }
    public setPreferedLanguage(preferedLanguage: SupportedLanguages): Observable<any> {
        return this.get().pipe(
            mergeMap((setting: LocalAppSettings) => {
                setting.preferedLanguage = preferedLanguage;
                console.log(('Saving prefered language: ' + preferedLanguage));
                return this.save(this.settings);
            })
        );
    }
}
