import { AppSettingsService } from './AppSettingsService';
import { AngularFirestore } from '@angular/fire/firestore';
import { AlertController, ToastController } from '@ionic/angular';
import { ConnectedUserService } from './ConnectedUserService';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { Club } from './../model/model';

@Injectable({
  providedIn: 'root'
})
export class ClubService extends RemotePersistentDataService<Club> {

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
      return 'Club';
  }

  getPriority(): number {
      return 1;
  }

  protected adjustFieldOnLoad(item: Club) {
  }
}
