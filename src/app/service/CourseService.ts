import { logCourse } from 'src/app/logging-config';
import { Category } from 'typescript-logging';
import { Question, QuestionSerie } from 'src/app/model/model';
import { DateService } from './DateService';
import { map } from 'rxjs/operators';
import { Observable, forkJoin } from 'rxjs';
import { AppSettingsService } from './AppSettingsService';
import { Firestore, query, Query, QueryConstraint, where } from '@angular/fire/firestore';
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

  private readonly answerLetters: string[]  = ['A', 'B', 'C', 'D', 'E', 'F'];
  private readonly questionIdPrefix: string = 'Q';

  constructor(
      readonly db: Firestore,
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
  public getBaseQuery(): Query<Course> {
    return query(super.getBaseQuery(), where('dataRegion', '==', this.connectedUserService.getCurrentUser().dataRegion));
  }

  public all(options: 'default' | 'server' | 'cache' = 'default'): Observable<ResponseWithData<Course[]>> {
    return this.query(this.getBaseQuery(), options);
  }

  public findAllowedAlone(options: 'default' | 'server' | 'cache' = 'default'): Observable<ResponseWithData<Course[]>> {
    return this.query(query(this.getBaseQuery(), where('allowedAlone', '==', true)), options);
  }

  public search(text: string, options: 'default' | 'server' | 'cache' = 'default'): Observable<ResponseWithData<Course[]>> {
    const str = text !== null && text && text.trim().length > 0 ? text.trim() : null;
    return str ?
        super.filter(this.all(options), (course: Course) => {
            return this.stringContains(str, course.name);
        })
        : this.all(options);
  }

  private getKeyPrefix(course: Course): string {
    if (!course.translationPrefix || course.translationPrefix.trim().length === 0) {
      course.translationPrefix = course.name.trim().toLowerCase().replace(/\s/g, '');
    }
    return course.translationPrefix;
  }

  public generateQuestions(course: Course) {
    const keyPrefix: string = this.getKeyPrefix(course);
    for (let i = 0; i < course.test.nbQuestion; i++) {
      const questionId = this.questionIdPrefix + (i + 1);
      const questionKey = keyPrefix + '.' + questionId;
      const question: Question = this.generateQuestion(questionId, questionKey);
      logger.debug(() => 'Adding question ' + questionId + ' (' + questionKey + ') to the course ' + course.name);
      course.test.series[0].questions.push(question);
    }
  }

  public setNbAnswer(question: Question, newNb: number): void {
    if (newNb < 2 || newNb > 20) {
      return;
    }
    const delta = newNb - question.answers.length;

    if (delta < 0) {
      question.answers.splice(newNb, Math.abs(delta));

    } else if (delta > 0) {
      for (let i = 0; i < delta; i++) {
        const letter = this.answerLetters[question.answers.length];
        // {answerId: 'A', point: 1, key: questionKey + '.A', text: 'Answer A', right: true},
        question.answers.push({
          answerId: letter,
          point: 0,
          key: question.key + '.' + letter,
          text: 'Answer ' + letter,
          right: false,
        });
      }
    }
  }
  public toQuestionId(question: Question): number {
    return Number.parseInt(question.questionId.substring(this.questionIdPrefix.length), 10);
  }
  public addQuestion(course: Course, serie: QuestionSerie) {
    // find the missing question id
    const newQuestionIdNb: number = serie.questions.length === 0 ? 1 :
      serie.questions
        .map((q) => this.toQuestionId(q))
        .sort((a, b) => a - b)
        .reduce((prev, cur) => prev + 1 === cur ? cur : prev, 0) + 1;
    const questionId = 'Q' + newQuestionIdNb;
    const questionKey = this.getKeyPrefix(course) + '.' + questionId;
    const question: Question = this.generateQuestion(questionId, questionKey);
    logger.debug(() => 'Adding question ' + questionId + ' (' + questionKey + ') to the course ' + course.name);
    serie.questions.push(question);
    // Sort the question by id
    serie.questions.sort((q1, q2) => this.toQuestionId(q1) - this.toQuestionId(q2));
    serie.nbQuestion = serie.questions.length;
    course.test.nbQuestion = course.test.series.map(s=> s.nbQuestion).reduce((a,b)=> a+b);
}

  private generateQuestion(questionId: string, questionKey: string): Question {
    const question: Question = {
      questionId,
      key: questionKey,
      questionType: 'UNIQUE',
      text: 'Question ' + questionId,
      enabled: true,
      required: false,
      answers: []
    };
    this.setNbAnswer(question, 4);
    question.answers[0].right = true;
    question.answers[0].point = 1;
    return question;
  }
  public getQuestion(questionId: string, course: Course): Question {
    let res: Question = null;
    course.test.series.forEach(serie => {
      if (!res) {
        res = serie.questions.find(question => question.questionId === questionId);
      }
    });
    return res;
  }

  public getLang(course: Course): string {
    const intersec = this.connectedUserService.getCurrentUser().speakingLanguages
      .filter(value => -1 !== course.test.supportedLanguages.indexOf(value));
    return intersec.length ? intersec[0] : course.test.supportedLanguages[0];
  }
  public generateTranslationPrefix(): string {
    let code = '';
    for (let i = 0; i < 5; i++) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
      const idx = (Math.random() * chars.length + Math.random() * chars.length) % chars.length;
      code = code + chars.charAt(idx);
    }
    return code;
  }

}
