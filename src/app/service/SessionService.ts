import { DateService } from 'src/app/service/DateService';
import { ResponseWithData } from 'src/app/service/response';
import { Observable } from 'rxjs';
import { AppSettingsService } from './AppSettingsService';
import { AngularFirestore, Query } from '@angular/fire/firestore';
import { AlertController, ToastController } from '@ionic/angular';
import { ConnectedUserService } from './ConnectedUserService';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { Session } from '../model/model';

@Injectable({
  providedIn: 'root'
})
export class SessionService extends RemotePersistentDataService<Session> {

  constructor(
      readonly db: AngularFirestore,
      toastController: ToastController,
      appSettingsService: AppSettingsService,
      private connectedUserService: ConnectedUserService,
      private dateService: DateService,
      private alertCtrl: AlertController,
    ) {
      super(appSettingsService, db, toastController);
  }

  getLocalStoragePrefix(): string {
      return 'Session';
  }

  getPriority(): number {
      return 1;
  }

  protected adjustFieldOnLoad(item: Session) {
    item.creationDate = this.adjustDate(item.creationDate, this.dateService);
    item.lastUpdate = this.adjustDate(item.lastUpdate, this.dateService);
    item.startDate = this.adjustDate(item.startDate, this.dateService);
    item.expireDate = this.adjustDate(item.expireDate, this.dateService);
  }

  /** Query basis for course limiting access to the session of the region */
  private getBaseQuery(): Query {
    return this.getCollectionRef().where('dataRegion', '==', this.connectedUserService.getCurrentUser().dataRegion);
  }

  public all(options: 'default' | 'server' | 'cache' = 'default'): Observable<ResponseWithData<Session[]>> {
    return this.query(this.getBaseQuery(), options);
  }

  public search(text: string, options: 'default' | 'server' | 'cache' = 'default'): Observable<ResponseWithData<Session[]>> {
    const str = text !== null && text && text.trim().length > 0 ? text.trim() : null;
    return str ?
        super.filter(this.all(options), (session: Session) => {
            return this.stringContains(str, session.keyCode);
        })
        : this.all(options);
  }
}
