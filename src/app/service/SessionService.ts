import { UserService } from 'src/app/service/UserService';
import { map } from 'rxjs/operators';
import { ParticipantQuestionAnswerService } from 'src/app/service/ParticipantQuestionAnswerService';
import { DurationUnit, Course, ParticipantQuestionAnswer, Question, User, QuestionSerie } from 'src/app/model/model';
import { ParticipantResult, SessionParticipant, TestParticipantResult, DataRegion } from './../model/model';
import { DateService } from 'src/app/service/DateService';
import { ResponseWithData } from 'src/app/service/response';
import { Observable, of, forkJoin } from 'rxjs';
import { AppSettingsService } from './AppSettingsService';
import { AngularFirestore, Query } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
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
      private functions: AngularFireFunctions,
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

  private computeLearnerScoresOfParticipant(session: Session,
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

  private computeParticipantResult(course: Course,
                                   session: Session,
                                   learnerAnswers: Map<string, ParticipantQuestionAnswer>,
                                   testResult: SessionParticipant = null): TestParticipantResult {
    testResult.score = 0;
    testResult.maxScore = 0;
    testResult.requiredScore = course.test.requiredScore;
    testResult.percent = 0;
    testResult.pass = true;
    testResult.answeredQuestions = 0;
    testResult.seriesResult = [];
    testResult.failedQuestionIds = [];
    course.test.series.forEach(serie => {
      const serieResult: ParticipantResult = {
        score: 0,
        requiredScore: serie.requiredScore,
        maxScore: 0,
        percent: 0,
        answeredQuestions: 0,
        pass: true,
      };
      let nbSelectedQuestion = 0;
      serie.questions.forEach(question => {
        if (this.checkQuestionAnswer(course, session, question, learnerAnswers,
                                     serieResult, testResult.failedQuestionIds).questionSelected) {
          nbSelectedQuestion ++;
        }
      });
      serieResult.pass = serieResult.score >= serie.requiredScore;
      serieResult.percent = Math.round(serieResult.score * 100 / serieResult.maxScore);
      this.logger.debug(() => 'Serie result: score=' + serieResult.score + ', pass=' + serieResult.pass
        + ', percent=' + serieResult.percent + ', requiredScore=' + serie.requiredScore);

      testResult.score += serieResult.score;
      testResult.maxScore += serieResult.maxScore;
      testResult.pass = testResult.pass && (!serie.passRequired || serieResult.pass);
      testResult.answeredQuestions += serieResult.answeredQuestions;
      this.logger.debug(() => 'Test result: score=' + testResult.score + ', pass=' + testResult.pass
        + ', answeredQuestions=' + testResult.answeredQuestions);
    });
    testResult.pass = testResult.pass && (testResult.score >= course.test.requiredScore);
    testResult.percent = Math.round(testResult.score * 100 / session.questionIds.length);
    this.logger.debug(() => '=> Test result: score=' + testResult.score + ', pass=' + testResult.pass
      + ', percent=' + testResult.percent);
    return testResult;
  }

  /**
   *
   * @return true if the question has been selected and if the question has answer(s).
   */
  public checkQuestionAnswer(course: Course,
                             session: Session,
                             question: Question,
                             learnerAnswers: Map<string, ParticipantQuestionAnswer>,
                             serieResult: ParticipantResult,
                             failedQuestionIds: string[]): AnswerCheck {
    const ac: AnswerCheck = {
      questionId: question.questionId,
      questionSelected: true,
      success: true,
      failCode: 200,
      answerIds: [],
      lateDelay: 0
    };
    if (session.questionIds.indexOf(question.questionId) < 0) {
      this.logger.debug(() => 'The question ' + question.questionId + ' has not been selected');
      ac.failCode = 100;
      ac.questionSelected = false,
      ac.success = false;
      return ac;
    }
    // the question of the serie has been selected.
    serieResult.maxScore += question.answers.map(a => a.right ? a.point : 0).reduce((p, c) => p + c);
    const pa = learnerAnswers.get(question.questionId);
    if (!pa) {
      this.logger.debug(() => 'The participant did not answer to the question ' + question.questionId);
      failedQuestionIds.push(question.questionId);
      ac.failCode = 101;
      ac.success = false;
      return ac;
    }
    const rightAnswers = question.answers.filter(answer => answer.right);
    if (!rightAnswers || !rightAnswers.length) {
      this.logger.debug(() => 'No right answer to the question ' + question.questionId);
      ac.failCode = 102;
      ac.success = false;
      return ac;
    }
    this.logger.debug(() => 'Checking the participant answer of the question ' + question.questionId
      + ': answerIds=' + pa.answerIds + ', answerId=' + pa.answerId);
    serieResult.answeredQuestions++;

    if (pa.answerId && (!pa.answerIds || pa.answerIds.length === 0)) {
      this.logger.debug(() => 'Set pa.answerId (' + pa.answerId + ') into pa.answerIds');
      pa.answerIds = [pa.answerId];
    }
    ac.answerIds = pa.answerIds;
    if (pa.responseTime.getTime() > session.expireDate.getTime()) {
      this.logger.debug(() => 'Participant answer of the question '  + question.questionId + ' is late');
      ac.failCode = 103;
      ac.success = false;
      ac.lateDelay = pa.responseTime.getTime() - session.expireDate.getTime();
      return ac;
    }
    let points = 0;
    let error = false;
    rightAnswers.forEach((rightAnswer, idx) => {
      const found: boolean = pa.answerIds.indexOf(rightAnswer.answerId) >= 0;
      if (found) {
        points += rightAnswer.point;
        this.logger.debug(() => 'Right answer ' + rightAnswer.answerId + ' has been found, points=' + points);
      } else {
        error = true;
        this.logger.debug(() => 'Right answer ' + rightAnswer.answerId + '  has not been found among participant answers.');
      }
    });
    if (error || points === 0) {
      this.logger.debug(() => 'Wrong answer to the question ' + question.questionId);
      failedQuestionIds.push(question.questionId);
      ac.failCode = 104;
      ac.success = false;
    } else if (rightAnswers.length === pa.answerIds.length) {
      serieResult.score += points;
      this.logger.debug(() => 'Right answer(s) to the question ' + question.questionId + ', score=' + serieResult.score);
      ac.failCode = 200;
      ac.success = true;
    } else {
      this.logger.debug(() => 'More answer than expected to the question ' + question.questionId);
      failedQuestionIds.push(question.questionId);
      ac.failCode = 105;
      ac.success = false;
    }
    return ac;
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
    this.selectQuestions(session, course);
    return session;
  }

  public changeCourse(session: Session, course: Course, forceNoRandom = false): boolean {
    if (course) {
      if (session.courseId !== course.id) {
        session.courseId = course.id;
        session.courseName = course.name;
        this.selectQuestions(session, course, forceNoRandom);
        return true;
      }
    }  else {
      session.courseId = null;
      session.courseName = null;
      session.questionIds = [];
      return true;
    }
    return false;
  }
  public selectQuestions(session: Session, course: Course, forceNoRandom = false) {
    session.questionIds = [];
    // for each serie extract the required number of question
    course.test.series.forEach((serie, serieIdx) => {
      this.logger.debug(() => 'Looking for ' + serie.nbQuestion + ' question in the serie '
        + serieIdx + ' with mode ' + serie.selectionMode + '. Nb question available: ' + serie.questions.length);
      if (!serie.selectionMode) {
        serie.selectionMode = 'RANDOM';
      }
      if (serie.selectionMode === 'RANDOM' && !forceNoRandom) {
        this.selectRamdomQuestionsSerie(session, serie);

      } else if (serie.selectionMode === 'ALL' || forceNoRandom) {
        serie.questions.forEach((question, index) => {
          if (serie.nbQuestion < 1 || index < serie.nbQuestion) { // limit to the number of questions if defined
            this.logger.debug(() => 'Add question ' + question.questionId);
            session.questionIds.push(question.questionId);
          }
        });
      }
    });
    this.logger.debug(() => 'Session has ' + session.questionIds.length  + ' questions.');
  }
  private selectRamdomQuestionsSerie(session: Session, serie: QuestionSerie) {
    // extract required questions
    const retainQuestionIds: string[] = serie.questions
      .filter(question => question.required)
      .map(question => question.questionId);
    this.logger.debug(() => retainQuestionIds.length + ' questions required from serie ');
    if (serie.nbQuestion > retainQuestionIds.length) {
      // there is not enough questions => look for the not required questions
      const othersQuestions: string[] = serie.questions
        .filter(question => !question.required)
        .map(question => question.questionId);
      // add the missing questions to reach the number
      while (serie.nbQuestion > retainQuestionIds.length) {
        const idx = (Math.random() * 100000) % othersQuestions.length;
        const retainQuestionId: string = othersQuestions.splice(idx, 1)[0];
        this.logger.debug(() => 'Add question ' + retainQuestionId);
        retainQuestionIds.push(retainQuestionId);
      }
    }
    retainQuestionIds.forEach((qId, index) => {
      if (serie.nbQuestion < 1 || index < serie.nbQuestion) { // limit to the number of questions if defined
        session.questionIds.push(qId);
      }
    });
    this.logger.debug(() => retainQuestionIds.length + ' questions retains for the serie ');
    this.shuffleArray(session.questionIds);
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
      maxScore: 0,
      percent: -1,
      answeredQuestions: 0,
      seriesResult: [],
      failedQuestionIds: []
    });
    session.participantIds.push(learner.id);
  }

  public sendCertificate(learnerId: string, session: Session): Observable<CertificateResponse> {
    if (!session || (session.status !== 'CORRECTION' && session.status !== 'CLOSED')) {
      return of({error: 1});
    }
    const learners = session.participants.filter(participant => participant.person.personId === learnerId);
    if (learners.length === 0 || learners[0].score <= 0 || !learners[0].pass) {
      return of({error: 2});
    }
    this.logger.debug(() => 'sendCertificate(sessionId=' + session.id + ', learnerId=' + learnerId + ')');
    const callable = this.functions.httpsCallable('sendCertificate');
    return callable({ sessionId: session.id, learnerId });
  }
}

export interface CertificateResponse {
  url?: string;
  error?: number;
}
export interface AnswerCheck {
  questionId: string;
  success: boolean;
  questionSelected: boolean;
  failCode: FailReasonCode;
  answerIds: string[];
  lateDelay: number;
}
export type FailReasonCode =
  // The question has not been selected
  100 |
  // The participant did not answer to the question
  101 |
  // No right answer to the question
  102 |
  // Participant answer of the question is late
  103 |
  // Wrong answer to the question
  104 |
  // More answer than expected to the question
  105 |
  // Right answer(s) to the question
  200;
