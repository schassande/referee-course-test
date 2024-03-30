import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { SupportedLanguages } from '../model/settings';
import { AppSettingsService } from './AppSettingsService';
import { map } from 'rxjs';

@Injectable()
export class I18NService {
    constructor(
        private appSettingService: AppSettingsService,
        private i18n: TranslateService) {}
    public initlang() {
        this.appSettingService.getPreferedLanguage().pipe(
            map(lang=>{
                console.log('PreferedLanguage from settings: '+lang);
                this.i18n.use(lang);
            })
        ).subscribe();
    }
    public switchTo(lang: SupportedLanguages) {
        this.i18n.use(lang);
        this.appSettingService.setPreferedLanguage(lang).subscribe();
    }
}
