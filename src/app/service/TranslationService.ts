import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AppSettingsService } from './AppSettingsService';
import { AngularFirestore } from '@angular/fire/firestore';
import { AlertController, ToastController } from '@ionic/angular';
import { ConnectedUserService } from './ConnectedUserService';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { Translation, Translatable } from './../model/model';

@Injectable({
  providedIn: 'root'
})
export class TranslationService extends RemotePersistentDataService<Translation> {

  constructor(
      readonly db: AngularFirestore,
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

  public translate(item: Translatable): Observable<string> {
    return this.get(item.key + '.' + this.connectedUserService.getLang().toLowerCase()).pipe(
      map((rtrad) => {
        item.text = rtrad.data ? rtrad.data.text : item.key;
        // console.log('translate(' + item.key + '=' + item.text);
        return item.text;
      })
    );
  }
}
