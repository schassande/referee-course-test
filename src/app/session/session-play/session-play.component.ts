import { logSession } from 'src/app/logging-config';
import { Category } from 'typescript-logging';
import { ToastrService } from 'ngx-toastr';
import { TestParticipantResult } from './../../model/model';
import { ResponseWithData } from 'src/app/service/response';
import { ModalController, NavController, AlertController } from '@ionic/angular';
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, forkJoin, NEVER, of } from 'rxjs';
import { map, flatMap } from 'rxjs/operators';

import { UserService } from 'src/app/service/UserService';
import { TranslationService } from 'src/app/service/TranslationService';
import { SessionService } from 'src/app/service/SessionService';
import { DateService } from 'src/app/service/DateService';
import { CourseService } from 'src/app/service/CourseService';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { ParticipantQuestionAnswerService } from 'src/app/service/ParticipantQuestionAnswerService';
import { Course, DurationUnit, QuestionSerie, Question, Session, Translation, ParticipantQuestionAnswer } from 'src/app/model/model';
import * as moment from 'moment';

const logger = new Category('play', logSession);

@Component({
  selector: 'app-session-play',
  templateUrl: './session-play.component.html',
  styleUrls: ['./session-play.component.scss'],
})
export class SessionPlayComponent implements OnInit, OnDestroy {
  readonly toastCfg = { timeOut: 3000, positionClass: 'toast-bottom-right-custom' };

  loading = false;
  sessionId: string;
  session: Session;
  course: Course;
  lang: string;

  questionIdx = 0;
  question: Question = null;
  questions: Question[] = [];
  answerLetters: string[] = ['A', 'B', 'C', ' D', 'E', 'F', 'G', 'H', 'I', 'J'];
  answerValue = '';
  learnerAnswers: Map<string, ParticipantQuestionAnswer> = new Map<string, ParticipantQuestionAnswer>();
  nbQuestion = 0;
  sessionExpired = false;
  showRightAnswer = false;
  intervalId;
  isTeacher = false;
  participantResult: TestParticipantResult = null;
  remainingTime: string;

  constructor(
    private alertCtrl: AlertController,
    private changeDetectorRef: ChangeDetectorRef,
    private connectedUserService: ConnectedUserService,
    private courseService: CourseService,
    public dateService: DateService,
    private navController: NavController,
    private route: ActivatedRoute,
    private sessionService: SessionService,
    private toastrService: ToastrService,
    private translationService: TranslationService,
    private participantQuestionAnswerService: ParticipantQuestionAnswerService
  ) { }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    // load params
    this.route.paramMap.pipe(
      map((params) => this.sessionId = params.get('id')),

      // load session
      flatMap(() => this.sessionService.get(this.sessionId)),
      flatMap((rses) => {
        this.session = rses.data;
        this.nbQuestion = this.session.questionIds.length;
        this.checkExpiration();
        this.intervalId = setInterval(this.checkExpiration.bind(this), 1000);
        return this.checkSession();
      }),

      // load course
      flatMap(() => this.courseService.get(this.session.courseId)),
      map((rcourse) => {
        this.course = rcourse.data;
        const intersec = this.connectedUserService.getCurrentUser().speakingLanguages
          .filter(value => -1 !== this.course.test.supportedLanguages.indexOf(value));
        this.lang = intersec.length ? intersec[0] : this.course.test.supportedLanguages[0];
        this.setQuestion();
      }),

      // load translationService
      flatMap(() => this.loadTranslation()),
      // load participant answers
      flatMap(() => this.loadAnswers()),
      map(() => {
        if (this.session.status === 'CORRECTION') {
          this.participantResult = this.sessionService.computeParticipantResult(this.course, this.session, this.learnerAnswers);
        }
      }),
      map(() => {
        if (this.session.autoPlay) {
          this.autoPlay();
        }
      }),
      map(() => this.loading = false)
    ).subscribe();
  }

  private autoPlay() {
    if (this.session.status === 'STARTED') {
    } else if (this.session.status === 'STOPPED') {
    }
  }
  public ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private checkExpiration() {
    this.sessionExpired = this.session.expireDate.getTime() < new Date().getTime()
      || this.session.status !== 'STARTED';
    this.remainingTime = Math.round(moment.duration(moment(this.session.expireDate).diff(moment())).asMinutes()) + 'min';
    if (this.session.autoPlay && this.sessionExpired && this.session.status !== 'CLOSED') {
      this.autoClose();
    }
  }

  autoClose() {
    logger.debug(() => 'Auto close');
    this.session.status = 'CLOSED';
    this.save().pipe(
      flatMap(() => this.sessionService.computeLearnerScores(this.session, this.course)),
      flatMap(() => this.save()),
      map(() => this.navController.navigateRoot('/session/edit/' + this.session.id))
    ).subscribe();
  }

  private checkSession(): Observable<any> {
    let errorMsg = null;
    let newRoute = null;
    if (!this.session) {
      errorMsg = 'The session does not exist.';
      newRoute = '/home';
    } else if (this.session.status !== 'STARTED'
        && this.session.status !== 'STOPPED'
        && this.session.status !== 'CORRECTION') {
      errorMsg = 'The session is not started.';
      newRoute = '/session/edit/' + this.sessionId;
    } else {
      const isLearner = this.session.participantIds.indexOf(this.connectedUserService.getCurrentUser().id) >= 0;
      this.isTeacher = this.session.teacherIds.indexOf(this.connectedUserService.getCurrentUser().id) >= 0;
      if (!isLearner && !this.isTeacher) {
        errorMsg = 'You are not registered to this session';
        newRoute = '/session/edit/' + this.sessionId;
      }
      this.showRightAnswer = this.isTeacher || this.session.status === 'CORRECTION';
    }

    if (newRoute) {
      this.navController.navigateRoot(newRoute);
    }
    if (errorMsg) {
      this.alertCtrl.create({ message: errorMsg}).then((a) => a.present());
    }
    return newRoute ? NEVER : of(this.session);
  }

  private setQuestion() {
    if (this.course) {
      // create a temp Map of questions
      const id2q: Map<string, Question> = new Map<string, Question>();
      this.course.test.series.forEach((series) => {
        series.questions.forEach((q) => id2q.set(q.questionId, q));
      });
      // extract the selected questions
      this.questions = this.session.questionIds.map(qId => id2q.get(qId));
      // set the current question
      this.question = this.questions[this.questionIdx];
    }
  }

  nextNoAnswerQuestion() {
    logger.debug(() => 'nextNoAnswerQuestion()' + this.nbQuestion + ' ' + this.learnerAnswers.size + ' ' + this.answerValue);
    if (this.nbQuestion > this.learnerAnswers.size) {
      while (this.answerValue !== '') {
        this.incQuestionIdx();
        logger.debug(() => 'nextNoAnswerQuestion() questionIdx=' + this.questionIdx + ', answerValue=' + this.answerValue);
      }
    }
  }
  incQuestionIdx() {
    this.questionIdx = (this.questionIdx + 1) % this.questions.length;
    this.question = this.questions[this.questionIdx];
    this.updateAnswer();
  }

  decQuestionIdx() {
    // decrease question
    this.questionIdx --;
    if (this.questionIdx < 0 ) {
      this.questionIdx = this.questions.length - 1;
    }
    this.question = this.questions[this.questionIdx];
    this.updateAnswer();
  }

  private loadTranslation(): Observable<any> {
    const obs: Observable<any>[] = [];
    this.questions.forEach(question => {
      obs.push(this.translationService.translate(question, this.lang));
      question.answers.forEach(answer => {
        obs.push(this.translationService.translate(answer, this.lang));
      });
    });
    return forkJoin(obs);
  }

  private loadAnswers(): Observable<any> {
    return this.participantQuestionAnswerService.findMyAnwsers(
      this.sessionId, this.connectedUserService.getCurrentUser().id).pipe(
        map((rpa) => {
          this.learnerAnswers.clear();
          rpa.data.forEach((pa) => {
            logger.debug(() => 'loadAnswers(): ' + pa.questionId + ' ' + pa);
            this.learnerAnswers.set(pa.questionId, pa);
          });
          this.updateAnswer();
        })
      );
  }

  getAnswerKey(): string {
    return this.question.questionId;
  }

  answerSelected(index) {
    if (this.sessionExpired) {
      return;
    }
    logger.debug(() => 'answerSelected:' + index);
    let pa: ParticipantQuestionAnswer = this.learnerAnswers.get(this.getAnswerKey());
    if (pa) {
      pa.answerId = this.question.answers[index].answerId;
      pa.responseTime = new Date();
      pa.lastUpdate = new Date();
    } else {
      pa = {
        id: '',
        version: 0,
        creationDate: new Date(),
        dataRegion: this.connectedUserService.getCurrentUser().dataRegion,
        dataStatus: 'NEW',
        lastUpdate: new Date(),
        responseTime: new Date(),
        answerId: this.question.answers[index].answerId,
        learnerId: this.connectedUserService.getCurrentUser().id,
        questionId: this.question.questionId,
        sessionId: this.sessionId,
      };
    }
    this.participantQuestionAnswerService.save(pa).subscribe((rpqa) => {
      this.learnerAnswers.set(this.getAnswerKey(), rpqa.data);
    });
  }

  updateAnswer() {
    const pa: ParticipantQuestionAnswer = this.learnerAnswers.get(this.getAnswerKey());
    if (pa) {
      this.answerValue = '' + this.question.answers.findIndex(a => a.answerId === pa.answerId);
    } else {
      this.answerValue = '';
    }
    this.changeDetectorRef.detectChanges();
    logger.debug(() => 'updateAnswer(): ' + this.getAnswerKey() + ' ' + pa + ' ' + this.answerValue);
  }

  onSwipe(event) {
    if (event.direction === 4) {
      this.navController.navigateRoot(`/home`);
    }
  }

  changeLanguage(newLang: string) {
    if (newLang === this.lang) {
      return;
    }
    this.lang = newLang;
    this.loadTranslation().subscribe();
  }
  start() {
    this.session.status = 'STARTED';
    this.session.startDate = new Date();
    this.session.expireDate = this.computeExpireDate(
      this.session.startDate,
      this.course.test.duration,
      this.course.test.durationUnit);
    this.save().subscribe(() => this.toastrService.success('The exam has been started.', '', this.toastCfg));
    }
  stop() {
    this.session.status = 'STOPPED';
    this.session.expireDate = new Date();
    this.save().subscribe(() => this.toastrService.success('The exam has been stopped.', '', this.toastCfg));
  }

  correction() {
    this.session.status = 'CORRECTION';
    this.sessionService.computeLearnerScores(this.session, this.course).pipe(
      flatMap(() => this.save())
    ).subscribe(() => this.toastrService.success('Marking step of the exam.', '', this.toastCfg));
  }

  close() {
    this.session.status = 'CLOSED';
    this.save().pipe(
      map(() => this.loadData())
    ).subscribe(() => this.toastrService.success('The exam has been closed.', '', this.toastCfg));
  }

  save(): Observable<ResponseWithData<Session>> {
    return this.sessionService.save(this.session).pipe(
      map((rses) => {
        if (!rses.error) {
          this.session = rses.data;
        }
        logger.debug(() => 'Session saved: ' + this.session);
        return rses;
      }));
  }
  private computeExpireDate(d: Date, duration: number, durationUnit: DurationUnit): Date {
    return moment(d).add(duration, durationUnit).toDate();
  }
}
