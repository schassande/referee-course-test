import { map } from 'rxjs/operators';
import { Observable, forkJoin } from 'rxjs';
import { AppSettingsService } from './AppSettingsService';
import { AngularFirestore, Query } from '@angular/fire/firestore';
import { AlertController, ToastController } from '@ionic/angular';
import { ResponseWithData } from './response';
import { ConnectedUserService } from './ConnectedUserService';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { Course } from '../model/model';

@Injectable({
  providedIn: 'root'
})
export class CourseService extends RemotePersistentDataService<Course> {

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
      return 'Course';
  }

  getPriority(): number {
      return 1;
  }

  protected adjustFieldOnLoad(item: Course) {
  }

  /** Query basis for course limiting access to the course of the region */
  private getBaseQuery(): Query {
    return this.getCollectionRef().where('dataRegion', '==', this.connectedUserService.getCurrentUser().dataRegion);
  }

  public all(options: 'default' | 'server' | 'cache' = 'default'): Observable<ResponseWithData<Course[]>> {
    return this.query(this.getBaseQuery(), options);
  }

  public findAllowedAlone(options: 'default' | 'server' | 'cache' = 'default'): Observable<ResponseWithData<Course[]>> {
    return this.query(this.getBaseQuery().where('allowedAlone', '==', true), options);
  }

  public search(text: string, options: 'default' | 'server' | 'cache' = 'default'): Observable<ResponseWithData<Course[]>> {
    const str = text !== null && text && text.trim().length > 0 ? text.trim() : null;
    return str ?
        super.filter(this.all(options), (course: Course) => {
            return this.stringContains(str, course.name);
        })
        : this.all(options);
  }
}
