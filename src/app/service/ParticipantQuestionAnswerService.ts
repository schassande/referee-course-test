import { ResponseWithData } from './response';
import { Observable } from 'rxjs';
import { DateService } from './DateService';
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
      private dateService: DateService,
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
    item.responseTime = this.adjustDate(item.responseTime, this.dateService);
    item.creationDate = this.adjustDate(item.creationDate, this.dateService);
    item.lastUpdate = this.adjustDate(item.lastUpdate, this.dateService);
  }

  public findMyAnwsers(sessionId: string, learnerId: string): Observable<ResponseWithData<ParticipantQuestionAnswer[]>> {
    return this.query(this.getCollectionRef()
      .where('dataRegion', '==', this.connectedUserService.getCurrentUser().dataRegion)
      .where('sessionId', '==', sessionId)
      .where('learnerId', '==', learnerId),
      'default');
  }
  public getAnwser(sessionId: string, learnerId: string, questionId: string): Observable<ResponseWithData<ParticipantQuestionAnswer[]>> {
    return this.query(this.getCollectionRef()
      .where('dataRegion', '==', this.connectedUserService.getCurrentUser().dataRegion)
      .where('sessionId', '==', sessionId)
      .where('questionId', '==', questionId)
      .where('learnerId', '==', learnerId),
      'default');
  }
}
