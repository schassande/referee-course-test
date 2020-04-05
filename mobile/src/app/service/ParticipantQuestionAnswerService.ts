import { AppSettingsService } from './AppSettingsService';
import { AngularFirestore } from '@angular/fire/firestore';
import { AlertController, ToastController } from '@ionic/angular';
import { ConnectedUserService } from './ConnectedUserService';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { ParticipantQuestionAnswer } from './../model/model';

@Injectable({
  providedIn: 'root'
})
export class ParticipantQuestionAnswerService extends RemotePersistentDataService<ParticipantQuestionAnswer> {

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
      return 'ParticipantQuestionAnswer';
  }

  getPriority(): number {
      return 1;
  }

  protected adjustFieldOnLoad(item: ParticipantQuestionAnswer) {
  }
}
