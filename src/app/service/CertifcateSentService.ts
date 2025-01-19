import { ResponseWithData } from './response';
import { AppSettingsService } from './AppSettingsService';
import { Firestore, query, Query, where } from '@angular/fire/firestore';
import { ToastController } from '@ionic/angular';
import { ConnectedUserService } from './ConnectedUserService';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { CertifcateSent } from '../model/model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CertifcateSentService extends RemotePersistentDataService<CertifcateSent> {

  constructor(
      readonly db: Firestore,
      toastController: ToastController,
      appSettingsService: AppSettingsService,
      private connectedUserService: ConnectedUserService
    ) {
      super(appSettingsService, db, toastController);
  }

  getLocalStoragePrefix(): string {
      return 'CertifcateSent';
  }

  getPriority(): number {
      return 2;
  }

  protected adjustFieldOnLoad(item: CertifcateSent) {
  }

  /** Query basis for course limiting access to the session of the region */
  public getBaseQuery(): Query<CertifcateSent> {
    return query(
      super.getBaseQuery(), 
      where('dataRegion', '==', this.connectedUserService.getCurrentUser().dataRegion));
  }
  public getCertificateSentsBySession(sessionId: string): Observable<ResponseWithData<CertifcateSent[]>> {
    return this.query(query(this.getBaseQuery(), where('sessionId', '==', sessionId)));
  }
}
