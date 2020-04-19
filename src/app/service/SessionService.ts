import { UserService } from 'src/app/service/UserService';
import { map } from 'rxjs/operators';
import { ParticipantQuestionAnswerService } from 'src/app/service/ParticipantQuestionAnswerService';
import { DurationUnit, Course, ParticipantQuestionAnswer, Question, User } from 'src/app/model/model';
import { ParticipantResult, SessionParticipant, TestParticipantResult, DataRegion } from './../model/model';
import { DateService } from 'src/app/service/DateService';
import { ResponseWithData } from 'src/app/service/response';
import { Observable, of, forkJoin } from 'rxjs';
import { AppSettingsService } from './AppSettingsService';
import { AngularFirestore, Query } from '@angular/fire/firestore';
import { AlertController, ToastController } from '@ionic/angular';
import { ConnectedUserService } from './ConnectedUserService';
import { Injectable } from '@angular/core';
import { RemotePersistentDataService } from './RemotePersistentDataService';
import { Session } from '../model/model';
import * as moment from 'moment';

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
      private participantQuestionAnswerService: ParticipantQuestionAnswerService,
      private userService: UserService,
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

  public sortSessionByStartDate(sessions: Session[], reverse: boolean = false): Session[] {
    if (sessions) {
      sessions.sort((s1, s2) => (s1.startDate.getTime() - s2.startDate.getTime()) * (reverse ? -1 : 1));
    }
    return sessions;
  }

  public findTeacherSessions(): Observable<ResponseWithData<Session[]>> {
    return this.query(this.getBaseQuery()
      .where('teacherIds', 'array-contains', this.connectedUserService.getCurrentUser().id), 'default');
  }
  public findLearnerSessions(): Observable<ResponseWithData<Session[]>> {
    return this.query(this.getBaseQuery()
      .where('participantIds', 'array-contains', this.connectedUserService.getCurrentUser().id), 'default');
  }

  public computeLearnerScores(session: Session, course: Course): Observable<any> {
    const obs: Observable<any>[] = [of('')];
    session.participants.forEach(participant => {
      obs.push(this.computeLearnerScoresOfParticipant(session, course, participant));
    });
    return forkJoin(obs);
  }

  public computeLearnerScoresOfParticipant(session: Session,
                                           course: Course,
                                           participant: SessionParticipant): Observable<any> {
    return this.participantQuestionAnswerService.findMyAnwsers(session.id, participant.person.personId).pipe(
      map((ranswers) => {
        const learnerAnswers: Map<string, ParticipantQuestionAnswer> = new Map<string, ParticipantQuestionAnswer>();
        ranswers.data.forEach((answer) => learnerAnswers.set(answer.questionId, answer));
        this.computeParticipantResult(course, session, learnerAnswers, participant);
        return participant;
      })
    );
  }

  public computeParticipantResult(course: Course,
                                  session: Session,
                                  learnerAnswers: Map<string, ParticipantQuestionAnswer>,
                                  testResult: TestParticipantResult = null): TestParticipantResult {
    if (!testResult) {
      testResult = {
        score: 0,
        requiredScore: 0,
        percent: 0,
        pass: true,
        seriesResult: []
      };
    } else {
      testResult.score = 0;
      testResult.requiredScore = course.test.requiredScore;
      testResult.percent = 0;
      testResult.pass = true;
      testResult.seriesResult = [];
    }
    course.test.series.forEach(serie => {
      const serieResult: ParticipantResult = {
        score: 0,
        requiredScore: serie.requiredScore,
        percent: 0,
        pass: true,
      };
      serie.questions.forEach(question => {
        if (session.questionIds.indexOf(question.questionId) >= 0) {
          // the question of the serie has been selected.
          const pa = learnerAnswers.get(question.questionId);
          if (pa) {
            const rightAnswer = question.answers.filter(answer => answer.right);
            if (rightAnswer && rightAnswer.length && rightAnswer[0].answerId === pa.answerId) {
              if (pa.responseTime.getTime() < session.expireDate.getTime()) {
                // this.logger.debug(() => 'answer ' + pa.answerId + ' is good and on time');
                serieResult.score += rightAnswer[0].point;
              } else {
                // this.logger.debug(() => 'answer ' + pa.answerId + ' is good but late');
              }
            } else {
              // this.logger.debug(() => 'answer ' + pa.answerId + ' is wrong');
            }
          } else {
            // this.logger.debug(() => 'computeNbRightAnswer: no response for question ' + question.questionId);
          }
        } else {
          // this.logger.debug(() => 'The question ' + question.questionId + ' has not been selected');
        }
      });
      serieResult.pass = serieResult.score >= serie.requiredScore;
      serieResult.percent = Math.round(serieResult.score * 100 / serie.questions.length);

      testResult.score += serieResult.score;
      testResult.pass = testResult.pass && (serie.passRequired || serieResult.pass);
    });
    testResult.pass = testResult.pass && (testResult.score >= course.test.requiredScore);
    testResult.percent = Math.round(testResult.score * 100 / course.test.nbQuestion);
    return testResult;
  }

  public getByKeyCode(keyCode: string): Observable<ResponseWithData<Session>> {
    return this.queryOne(this.getBaseQuery().where('keyCode', '==', keyCode), 'default');
  }

  public newSession(course: Course, teacher: User, dataRegion: DataRegion): Session {
    const now = moment();
    now.set('m', Math.round(now.get('m') / 5) * 5);
    const startDate = now.toDate();
    const expireDate = this.computeExpireDate(startDate, course.test.duration, course.test.durationUnit);
    const session: Session = {
      id: '',
      dataRegion,
      status: 'REGISTRATION',
      creationDate: new Date(),
      lastUpdate: new Date(),
      dataStatus: 'NEW',
      version: new Date().getTime(),
      keyCode: this.generateKeyCode(),
      startDate,
      expireDate,
      teachers: [this.userService.userToPersonRef(teacher)],
      teacherIds: [teacher.id],
      courseId: course ? course.id : null,
      courseName: course ? course.name : null,
      participants: [],
      participantIds: [],
      questionIds: []
    };
    this.randomizeQuestions(session, course);
    return session;
  }

  private randomizeQuestions(session: Session, course: Course) {
    // for each serie extract the required number of question
    course.test.series.forEach(serie => {
        if (!serie.selectionMode) {
          serie.selectionMode = 'RANDOM';
        }
        if (serie.selectionMode === 'RANDOM') {
        // extract required questions
        const retainQuestionIds: string[] = serie.questions
          .filter(question => question.required)
          .map(question => question.questionId);
        // this.logger.debug(() => retainQuestionIds.length + ' questions required from serie ');
        if (serie.nbQuestion > retainQuestionIds.length) {
          // there is not enough questions => look for the not required questions
          const othersQuestions: string[] = serie.questions
            .filter(question => !question.required)
            .map(question => question.questionId);
          // add the missing questions to reach the number
          while (serie.nbQuestion > retainQuestionIds.length) {
            const idx = (Math.random() * 100000) % othersQuestions.length;
            const retainQuestionId: string = othersQuestions.splice(idx, 1)[0];
            // this.logger.debug(() => 'Add question ' + retainQuestionId);
            retainQuestionIds.push(retainQuestionId);
          }
        }
        retainQuestionIds.forEach(qId => session.questionIds.push(qId));
        // this.logger.debug(() => retainQuestionIds.length + ' questions retains for the serie ');
        this.shuffleArray(session.questionIds);
      } else if (serie.selectionMode === 'ALL') {
        serie.questions.forEach(question => session.questionIds.push(question.questionId));
      }
    });
  }
  /** Shuffle the content of an array */
  public shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const rand = Math.floor(Math.random() * (i + 1));
        [array[i], array[rand]] = [array[rand], array[i]];
    }
  }

  public computeExpireDate(d: Date, duration: number, durationUnit: DurationUnit): Date {
    return moment(d).add(duration, durationUnit).toDate();
  }

  private generateKeyCode(): string {
    let code = moment().format('YY-');
    for (let i = 0; i < 5; i++) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
      const idx = (Math.random() * chars.length + Math.random() * chars.length) % chars.length;
      code = code + chars.charAt(idx);
    }
    return code;
  }

  public addLearner(session: Session, learner: User) {
    session.participants.push({
      person: this.userService.userToPersonRef(learner),
      questionAnswerIds: [],
      pass: false,
      score: -1,
      requiredScore: -1,
      percent: -1,
      seriesResult: []
    });
    session.participantIds.push(learner.id);
  }
}
