import { logCourse } from 'src/app/logging-config';
import { Category } from 'typescript-logging';
import { Question } from 'src/app/model/model';
import { DateService } from './DateService';
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

const logger = new Category('course-service', logCourse);

@Injectable({
  providedIn: 'root'
})
export class CourseService extends RemotePersistentDataService<Course> {

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
      return 'Course';
  }

  getPriority(): number {
      return 1;
  }

  protected adjustFieldOnLoad(item: Course) {
    item.creationDate = this.adjustDate(item.creationDate, this.dateService);
    item.lastUpdate = this.adjustDate(item.lastUpdate, this.dateService);
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

  public generateQuestions(course: Course) {
    const keyPrefix: string = course.name.trim().toLowerCase().replace(/\s/g, '');
    for (let i = 0; i < course.test.nbQuestion; i++) {
      const questionId = 'Q' + (i + 1);
      const questionKey = keyPrefix + '.' + questionId;
      const question: Question = {
        questionId,
        key: questionKey,
        questionType: 'UNIQUE',
        text: 'Question ' + questionId,
        enabled: true,
        required: false,
        answers: [
          {answerId: 'A', point: 1, key: questionKey + '.A', text: 'Answer A', right: true},
          {answerId: 'B', point: 0, key: questionKey + '.B', text: 'Answer B', right: false},
          {answerId: 'C', point: 0, key: questionKey + '.C', text: 'Answer C', right: false}
        ]
      };
      logger.debug(() => 'Adding question ' + questionId + ' (' + questionKey + ') to the course ' + course.name);
      course.test.series[0].questions.push(question);
    }
  }
}
