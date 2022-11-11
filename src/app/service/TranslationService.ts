import { ResponseWithData } from './response';
import { map, mergeMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AppSettingsService } from './AppSettingsService';
import { Firestore } from '@angular/fire/firestore';
import { AlertController, ToastController } from '@ionic/angular';
import { ConnectedUserService } from './ConnectedUserService';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { Translation, Translatable, DataRegion } from './../model/model';

@Injectable({
  providedIn: 'root'
})
export class TranslationService extends RemotePersistentDataService<Translation> {

  constructor(
      readonly db: Firestore,
      toastController: ToastController,
      appSettingsService: AppSettingsService,
      private connectedUserService: ConnectedUserService,
      private alertCtrl: AlertController,
    ) {
      super(appSettingsService, db, toastController);
  }

  getLocalStoragePrefix(): string {
      return 'Translation';
  }

  getPriority(): number {
      return 1;
  }

  protected adjustFieldOnLoad(item: Translation) {
  }

  public getTranslationId(key: string, lang): string {
    return key + '.' + lang.toLowerCase();
  }

  public getTranslation(key: string, lang: string): Observable<Translation> {
    return this.get(this.getTranslationId(key, lang)).pipe(map(rt => rt.data));
  }

  public translate(item: Translatable, lang: string = null): Observable<string> {
    if (!lang) {
      lang = this.connectedUserService.getLang();
    }
    return this.get(this.getTranslationId(item.key, lang)).pipe(
      map((rtrad) => {
        item.text = rtrad.data ? rtrad.data.text : item.key;
        this.logger.debug(() => 'translate(' + item.key + '=' + item.text + ')');
        return item.text;
      })
    );
  }
  public setTranslation(item: Translatable, lang: string, text: string, dataRegion: DataRegion): Observable<ResponseWithData<Translation>> {
    const id = this.getTranslationId(item.key, lang);
    return this.getTranslation(item.key, lang).pipe(
      mergeMap((trad: Translation) => {
        if (trad) {
          trad.text = text;
        } else {
          trad = {
            id,
            creationDate: new Date(),
            lastUpdate: new Date(),
            dataRegion,
            dataStatus: 'NEW',
            text,
            version: new Date().getTime(),
          };
        }
        return this.save(trad);
      }),
      map((res) => {
        item.text = text;
        return res;
      })
    );
  }
}
