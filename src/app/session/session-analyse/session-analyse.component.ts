import { TranslationService } from 'src/app/service/TranslationService';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, ModalController, NavController } from '@ionic/angular';
import { forkJoin, Observable, of, NEVER } from 'rxjs';
import { flatMap, map } from 'rxjs/operators';
import { logSession } from 'src/app/logging-config';
import { Course, Question, Session, User, PersonRef } from 'src/app/model/model';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { CourseService } from 'src/app/service/CourseService';
import { DateService } from 'src/app/service/DateService';
import { SessionService } from 'src/app/service/SessionService';
import { UserService } from 'src/app/service/UserService';
import { Category } from 'typescript-logging';

const logger = new Category('analyse', logSession);

interface FailedQuestion {
  question: Question;
  learners: PersonRef[];
}

@Component({
  selector: 'app-session-analyse',
  templateUrl: './session-analyse.component.html',
  styleUrls: ['./session-analyse.component.scss'],
})
export class SessionAnalyseComponent implements OnInit {

  /** The letter to use as visible identifier of the answers */
  answerLetters: string[] = ['A', 'B', 'C', ' D', 'E', 'F', 'G', 'H', 'I', 'J'];

  readonly toastCfg = { timeOut: 3000, positionClass: 'toast-bottom-right-custom' };
  /** Indicate if the data are loading. The value is the name of the data. Null means nothing is loading. */
  loading: string = null;
  /** The identifier of the session */
  sessionId: string;
  /** The session of course */
  session: Session;
  /** the course */
  course: Course;
  /** The language to use for the question */
  lang: string;
  failedQuestions: FailedQuestion[];

  constructor(
    public alertCtrl: AlertController,
    private connectedUserService: ConnectedUserService,
    private courseService: CourseService,
    private navController: NavController,
    private route: ActivatedRoute,
    private sessionService: SessionService,
    private translationService: TranslationService,
    ) {
  }
  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = 'Loading the session ...';
    // load params
    this.route.paramMap.pipe(
      map((params) => this.sessionId = params.get('id')),

      // load session
      flatMap(() => this.sessionService.get(this.sessionId)),
      flatMap((rses) => {
        this.session = rses.data;
        return this.checkSession();
      }),

      flatMap(() => { // load course
        this.loading = 'Loading the course ...';
        return this.courseService.get(this.session.courseId);
      }),
      map((rcourse) => {
        this.course = rcourse.data;
        this.lang = this.courseService.getLang(this.course);
      }),

      flatMap(() => { // Analysis failed questions
        this.loading = 'Analysing failed questions ...';
        return this.analyseFailedQuestions();
      }),


      // load translationService
      flatMap(() => {
        this.loading = 'Loading the translations ...';
        return this.loadTranslation();
      }),
    ).subscribe(() => this.loading = null);
  }

  private checkSession(): Observable<any> {
    let errorMsg = null;
    let newRoute = null;
    const currentUser: User = this.connectedUserService.getCurrentUser();
    if (!this.session) {
      errorMsg = 'The session does not exist.';
      newRoute = '/home';
    } else if (this.session.status !== 'CORRECTION' && this.session.status !== 'CLOSED') {
      errorMsg = 'The session cannot yet being analysed.';
      newRoute = '/session/edit/' + this.sessionId;
    } else if (currentUser.role !== 'ADMIN' && this.session.teacherIds.indexOf(currentUser.id) < 0) {
        errorMsg = 'You are not a teacher of this session';
        newRoute = '/session/edit/' + this.sessionId;
    }

    if (newRoute) {
      this.navController.navigateRoot(newRoute);
    }
    if (errorMsg) {
      this.alertCtrl.create({ message: errorMsg}).then((a) => a.present());
    }
    return newRoute ? NEVER : of(this.session);
  }

  private analyseFailedQuestions(): Observable<any> {
    this.failedQuestions = [];
    const qId2FailedQuestion: Map<string, FailedQuestion> = new Map<string, FailedQuestion>();
    this.session.participants.forEach((participant) => {
      participant.failedQuestionIds.forEach((questionId) =>{
        let fq: FailedQuestion = qId2FailedQuestion.get(questionId);
        if (!fq) {
          fq = {
            question: this.courseService.getQuestion(questionId, this.course),
            learners: []
          };
          qId2FailedQuestion.set(questionId, fq);
          this.failedQuestions.push(fq);
        }
        if (!fq.learners.find(learner => learner.personId === participant.person.personId)) {
          fq.learners.push(participant.person);
        }
      });
    });
    this.failedQuestions = this.failedQuestions
      .filter(fq => fq.learners.length > 1)
      .sort((fq1, fq2) => fq2.learners.length - fq1.learners.length);
    return of(this.failedQuestions);
  }

  private loadTranslation(): Observable<any> {
    const obs: Observable<any>[] = [];
    this.failedQuestions.forEach(failedQuestion => {
      obs.push(this.translationService.translate(failedQuestion.question, this.lang));
      failedQuestion.question.answers.forEach(answer => {
        obs.push(this.translationService.translate(answer, this.lang));
      });
    });
    return forkJoin(obs);
  }
}