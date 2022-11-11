import { UserService } from 'src/app/service/UserService';
import { FailReasonCode } from './../../service/SessionService';
import { ParticipantQuestionAnswerService } from 'src/app/service/ParticipantQuestionAnswerService';
import { map, mergeMap } from 'rxjs/operators';
import { Observable, forkJoin, of, NEVER } from 'rxjs';
import { TranslationService } from 'src/app/service/TranslationService';
import { SessionService, AnswerCheck } from 'src/app/service/SessionService';
import { ActivatedRoute } from '@angular/router';
import { CourseService } from 'src/app/service/CourseService';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { AlertController, NavController } from '@ionic/angular';
import { Session, Course, Question, PersonRef, User, ParticipantQuestionAnswer, ParticipantResult } from 'src/app/model/model';
import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';

interface FailedQuestion {
  question: Question;
  analysis: AnswerCheck;
  failReason: string;
}

@Component({
  selector: 'app-session-learner-analyse',
  templateUrl: './session-learner-analyse.component.html',
  styleUrls: ['./session-learner-analyse.component.scss'],
})
export class SessionLearnerAnalyseComponent implements OnInit {

  moment = moment;
  
  /** The letter to use as visible identifier of the answers */
  answerLetters: string[] = ['A', 'B', 'C', ' D', 'E', 'F', 'G', 'H', 'I', 'J'];

  loading: string = null;
  /** The identifier of the session */
  sessionId: string;
  /** The identifier of the learner */
  learnerId: string;
  /** The session of course */
  session: Session;
  /** the course */
  course: Course;
  /** The language to use for the question */
  lang: string;
  learner: User;
  learnerAnswers: Map<string, ParticipantQuestionAnswer>;
  failedQuestions: FailedQuestion[] = [];

  constructor(
    public alertCtrl: AlertController,
    private connectedUserService: ConnectedUserService,
    private courseService: CourseService,
    private navController: NavController,
    private participantQuestionAnswerService: ParticipantQuestionAnswerService,
    private route: ActivatedRoute,
    private sessionService: SessionService,
    private translationService: TranslationService,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = 'Loading the session ...';
    // load params
    this.route.paramMap.pipe(
      map((params) => {
        this.sessionId = params.get('sessionId');
        this.learnerId = params.get('learnerId');
      }),

      mergeMap(() => { // load session
        this.loading = 'Loading the session ...';
        return this.sessionService.get(this.sessionId);
      }),
      mergeMap((rses) => {
        this.session = rses.data;
        return this.checkSession();
      }),

      mergeMap(() => { // load learner
        this.loading = 'Loading the learner ...';
        return this.userService.get(this.learnerId);
      }),
      map((ruser) => {
        this.learner = ruser.data;
        return this.learner;
      }),

      mergeMap(() => { // load course
        this.loading = 'Loading the course ...';
        return this.courseService.get(this.session.courseId);
      }),
      map((rcourse) => {
        this.course = rcourse.data;
        this.lang = this.courseService.getLang(this.course);
      }),

      mergeMap(() => {
        this.loading = 'Loading the learner answers ...';
        return this.loadLearnerAnswers();
      }),

      mergeMap(() => {
        this.loading = 'Analysis the learner answers ...';
        return this.analyseFailedQuestions();
      }),

      // mergeMap(() => {
      //  this.loading = 'Loading the translations ...';
      //  return this.loadTranslation();
      // }),
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
    } else if (this.session.participantIds.indexOf(this.learnerId) < 0) {
      errorMsg = 'The specified participant does not belong the session';
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

  private loadLearnerAnswers(): Observable<any> {
    return this.participantQuestionAnswerService.findMyAnwsers(this.sessionId, this.learnerId).pipe(
      map((ranswers) => {
        this.learnerAnswers = new Map<string, ParticipantQuestionAnswer>();
        ranswers.data.forEach((answer) => this.learnerAnswers.set(answer.questionId, answer));
      })
    );
  }

  private analyseFailedQuestions(): Observable<any> {
    this.course.test.series.forEach(serie => {
      const serieResult: ParticipantResult = {
        score: 0,
        requiredScore: serie.requiredScore,
        maxScore: 0,
        percent: 0,
        answeredQuestions: 0,
        pass: true,
      };
      this.failedQuestions = [];
      serie.questions.forEach(question => {
        const fq: FailedQuestion = {
          question,
          analysis: this.sessionService.checkQuestionAnswer(
            this.course, this.session, question, this.learnerAnswers, serieResult, []),
          failReason: ''
        };
        fq.failReason = this.getFailReason(fq.analysis.failCode);
        if (fq.analysis.questionSelected && !fq.analysis.success) {
          this.failedQuestions.push(fq);
        }
      });
    });
    return of(this.failedQuestions);
  }

  private getFailReason(failCode: FailReasonCode) {
    switch (failCode){
      case 100: return 'The question has not been selected';
      case 101: return 'The participant did not answer to the question';
      case 102: return 'No right answer to the question';
      case 103: return 'Participant answer of the question is late';
      case 104: return 'Wrong answer to the question';
      case 105: return 'More answer than expected to the question';
      case 200: return 'Right answer(s) to the question';
      default: return '' + failCode;
    }
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
