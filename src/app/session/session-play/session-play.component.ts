import { ModalController, NavController, AlertController } from '@ionic/angular';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
import { Course, QuestionSerie, Question, Session, Translation, ParticipantQuestionAnswer } from 'src/app/model/model';

@Component({
  selector: 'app-session-play',
  templateUrl: './session-play.component.html',
  styleUrls: ['./session-play.component.scss'],
})
export class SessionPlayComponent implements OnInit {

  loading = false;
  private sessionId: string;
  private session: Session;
  private course: Course;
  private lang: string;

  private serieIdx = 0;
  private serie: QuestionSerie = null;
  private questionIdx = 0;
  private question: Question = null;
  private answerLetters: string[] = ['A', 'B', 'C', ' D', 'E', 'F', 'G', 'H', 'I', 'J'];
  private answerValue = '';
  learnerAnswers: Map<string, ParticipantQuestionAnswer> = new Map<string, ParticipantQuestionAnswer>();
  private nbQuestion = 0;
  private sessionExpired = false;

  constructor(
    private alertCtrl: AlertController,
    private changeDetectorRef: ChangeDetectorRef,
    private connectedUserService: ConnectedUserService,
    private courseService: CourseService,
    private dateService: DateService,
    private modalController: ModalController,
    private navController: NavController,
    private route: ActivatedRoute,
    private sessionService: SessionService,
    private translationService: TranslationService,
    private participantQuestionAnswerService: ParticipantQuestionAnswerService,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.loading = true;
    // load params
    this.route.paramMap.pipe(
      map((params) => this.sessionId = params.get('id')),

      // load session
      flatMap(() => this.sessionService.get(this.sessionId)),
      flatMap((rses) => {
        this.session = rses.data;
        this.sessionExpired = this.session.expireDate.getTime() < new Date().getTime();
        return this.checkSession();
      }),

      // load course
      flatMap(() => this.courseService.get(this.session.courseId)),
      map((rcourse) => {
        this.course = rcourse.data;
        this.nbQuestion = 0;
        this.course.test.series.forEach(s => this.nbQuestion += s.questions.length);
        // this.connectedUserService.getCurrentUser().speakingLanguages
        this.lang = this.course.test.supportedLanguages[0];
        this.setQuestion();
      }),

      // load translationService
      flatMap(() => this.loadTranslation()),
      // load participant answers
      flatMap(() => this.loadAnswers()),
      map(() => this.loading = false)
    ).subscribe();
  }

  private checkSession(): Observable<any> {
    let errorMsg = null;
    let newRoute = null;
    if (!this.session) {
      errorMsg = 'The session does not exist.';
      newRoute = '/home';
    } else if (this.session.status !== 'STARTED') {
      errorMsg = 'The session is not started.';
      newRoute = '/session/edit/' + this.sessionId;
    } else if (this.session.participantIds.indexOf(this.connectedUserService.getCurrentUser().id) < 0
        && this.session.teacherIds.indexOf(this.connectedUserService.getCurrentUser().id) < 0) {
      errorMsg = 'You are not registered to this session';
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

  private setQuestion() {
    if (this.course) {
      const sIdx = Math.min(this.serieIdx, this.course.test.series.length);
      this.serie = this.course.test.series[sIdx];
      if (this.serie) {
        const qIdx = Math.min(this.questionIdx, this.serie.questions.length);
        this.question = this.serie.questions[qIdx];
      }
    }
  }

  nextNoAnswerQuestion() {
    console.log('nextNoAnswerQuestion()', this.nbQuestion, this.learnerAnswers.size, this.answerValue);
    if (this.nbQuestion > this.learnerAnswers.size) {
      while (this.answerValue !== '') {
        this.incQuestionIdx();
        console.log('nextNoAnswerQuestion() questionIdx=' + this.questionIdx + ', answerValue=' + this.answerValue);
      }
    }
  }
  incQuestionIdx() {
    // increase question
    this.questionIdx ++;
    if (this.questionIdx >= this.serie.questions.length) {
      // It is the last question of the current serie
      // => set to the first question
      this.questionIdx = 0;

      // try to move to next serie
      this.serieIdx ++;
      if (this.serieIdx >= this.course.test.series.length) {
        this.serieIdx = 0;
      }
    }
    this.serie = this.course.test.series[this.serieIdx];
    this.question = this.serie.questions[this.questionIdx];
    this.updateAnswer();
  }

  decQuestionIdx() {
    // decrease question
    this.questionIdx --;
    if (this.questionIdx < 0 ) {
      // It is the last question of the current serie

      // try to move to previous serie
      this.serieIdx --;
      if (this.serieIdx < 0) {
        this.serieIdx =  this.course.test.series.length - 1;
      }
      this.serie = this.course.test.series[this.serieIdx];
        // => set to the last question of the serie
      this.questionIdx = this.serie.questions.length - 1;
    }
    this.question = this.serie.questions[this.questionIdx];
    this.updateAnswer();
  }

  private loadTranslation(): Observable<any> {
    const obs: Observable<any>[] = [];
    this.course.test.series.forEach(series => {
      series.questions.forEach(question => {
        obs.push(this.translationService.translate(question, this.lang));
        question.answers.forEach(answer => {
          obs.push(this.translationService.translate(answer, this.lang));
        });
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
            // console.log('loadAnswers(): ', pa.questionId, pa);
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
    // console.log('answerSelected:', index);
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
    // console.log('updateAnswer(): ', this.getAnswerKey(), pa, this.answerValue);
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
}
