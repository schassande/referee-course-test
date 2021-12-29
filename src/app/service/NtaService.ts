import { AppSettingsService } from './AppSettingsService';
import { Firestore } from '@angular/fire/firestore';
import { AlertController, ToastController } from '@ionic/angular';
import { ConnectedUserService } from './ConnectedUserService';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { Nta } from './../model/model';

@Injectable({
  providedIn: 'root'
})
export class NtaService extends RemotePersistentDataService<Nta> {

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
      return 'Nta';
  }

  getPriority(): number {
      return 1;
  }

  protected adjustFieldOnLoad(item: Nta) {
  }
}
