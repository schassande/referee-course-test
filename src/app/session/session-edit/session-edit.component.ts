import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, ModalController, NavController } from '@ionic/angular';
import { ParticipantQuestionAnswer } from 'functions/src/model';
import * as moment from 'moment';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Observable, of } from 'rxjs';
import { flatMap, map } from 'rxjs/operators';
import { logSession } from 'src/app/logging-config';
import { Course, Session, SessionParticipant, SharedWith, User } from 'src/app/model/model';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { CourseService } from 'src/app/service/CourseService';
import { DateService } from 'src/app/service/DateService';
import { ParticipantQuestionAnswerService } from 'src/app/service/ParticipantQuestionAnswerService';
import { Response, ResponseWithData } from 'src/app/service/response';
import { SessionService } from 'src/app/service/SessionService';
import { UserService } from 'src/app/service/UserService';
import { Category } from 'typescript-logging';
import { UserSelectorComponent } from './../../main/widget/user-selector-component';


const logger = new Category('edit', logSession);

@Component({
  selector: 'app-session-edit',
  templateUrl: './session-edit.component.html',
  styleUrls: ['./session-edit.component.scss'],
})
export class SessionEditComponent implements OnInit {
  readonly toastCfg = { timeOut: 3000, positionClass: 'toast-bottom-right-custom' };
  loading = false;
  sessionId: string;
  session: Session;
  course: Course;
  courses: Course[];
  readonly = false;
  isTeacher = false;
  isAdmin = false;
  math = Math;
  forceNoRandom = false;

  constructor(
    public alertCtrl: AlertController,
    private connectedUserService: ConnectedUserService,
    private courseService: CourseService,
    private dateService: DateService,
    private modalController: ModalController,
    private navController: NavController,
    private participantQuestionAnswerService: ParticipantQuestionAnswerService,
    private route: ActivatedRoute,
    private sessionService: SessionService,
    private toastrService: ToastrService,
    private userService: UserService
    ) {
  }

  get startDate(): string {
    return this.dateService.datetime2string(this.session.startDate);
  }
  set startDate(dateStr: string) {
    this.session.startDate = moment(dateStr).toDate();
  }
  get expireDate(): string {
    return this.dateService.datetime2string(this.session.expireDate);
  }
  set expireDate(dateStr: string) {
    this.session.expireDate = moment(dateStr).toDate();
  }

  ngOnInit() {
    this.isAdmin = this.connectedUserService.getCurrentUser().role === 'ADMIN';
    console.log('role=', this.connectedUserService.getCurrentUser().role);
    this.loadParams().pipe(
      flatMap(() => this.loadCourses()),
      flatMap(() => this.loadSession())
    ).subscribe();
  }

  loadParams(): Observable<any> {
    return this.route.paramMap.pipe(map((params) => this.sessionId = params.get('id')));
  }

  loadCourses(): Observable<any> {
    return this.courseService.all().pipe(
      map((rcourses) => {
        if (rcourses.data) {
          // filter to keep only enabled courses
          this.courses = rcourses.data.filter((course) => course.enabled);
        }
      })
    );
  }

  loadSession(): Observable<any> {
    return this.sessionId ? this.loadSessionFromId() : this.createNewSession();
  }

  private loadSessionFromId(): Observable<any> {
    logger.debug(() => 'load session by id: ' + this.sessionId);
    this.loading = true;
    return this.sessionService.get(this.sessionId).pipe(
      map((rses) => {
        this.session = rses.data;
        const currentUserId: string = this.connectedUserService.getCurrentUser().id;
        this.isTeacher = this.connectedUserService.getCurrentUser().role !== 'LEARNER'
          && this.session.teachers.filter(t => t.personId === currentUserId).length > 0;
        this.readonly = !this.isTeacher;
      }),
      // load course
      flatMap(() => this.courseService.get(this.session.courseId)),
      map(() => this.course = this.courses.find((course) => course.id === this.session.courseId)),
      map(() => this.loading = false)
    );
  }

  private createNewSession(): Observable<any> {
    this.course = this.courses && this.courses.length ? this.courses[0] : null;
    const teacher: User = this.connectedUserService.getCurrentUser();
    this.session = this.sessionService.newSession(this.course, teacher, teacher.dataRegion);
    this.readonly = false;
    this.isTeacher = true;
    return of({ error: null, data: this.session});
  }


  saveNback() {
    if (this.readonly) {
      this.navController.navigateRoot('/session');
    } else {
      this.save(false).pipe(
        map((rses) => {
          if (!rses.error) {
            this.navController.navigateRoot('/session');
          }
        })).subscribe();
    }
  }

  save(canNavigation: boolean = true): Observable<ResponseWithData<Session>> {
    const sid = this.session.id;
    return this.sessionService.save(this.session).pipe(
      map((rses) => {
        if (!rses.error) {
          this.session = rses.data;
        }
        logger.debug(() => 'Session saved: ' + this.session);
        if (canNavigation && !sid && this.session.id) {
          // the session has been created, then move to edit page
          this.navController.navigateRoot(`/session/edit/${this.session.id}`);
        }
        return rses;
      }));
  }

  async addXXX() {
    this.alertCtrl.create({
      message: 'Do you want to add teaches or learners?',
      buttons: [
        { text: 'Learner', handler: () => this.addLearner() },
        { text: 'Teacher', handler: () => this.addTeacher() },
        { text: 'Cancel', role: 'cancel'}
      ]
    }).then( (alert) => alert.present() );
  }

  onForceNoRandom() {
    logger.debug(() => 'onForceNoRandom(): forceNoRandom=' + this.forceNoRandom);
    this.sessionService.selectQuestions(this.session, this.course, this.forceNoRandom);
    this.save().subscribe();
  }

  async add(role: string = 'Learner') {
    const modal = await this.modalController.create({ component: UserSelectorComponent});
    modal.onDidDismiss().then( (data) => {
      const sharedWith: SharedWith = data.data as SharedWith;
      if (sharedWith) {
        if (role === 'Learner') {
          sharedWith.users.forEach((user) => {
            const participant = this.session.participants.find(p => p.person.personId === user.id);
            if (!participant) {
              this.session.participants.push({
                person: this.userService.userToPersonRef(user),
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
              this.session.participantIds.push(user.id);
            }
          });
        } else if (role === 'Teacher') {
          sharedWith.users.forEach((user) => {
            const teacher = this.session.teachers.find(p => p.personId === user.id);
            if (!teacher) {
              this.session.teachers.push(this.userService.userToPersonRef(user));
              this.session.teacherIds.push(user.id);
            }
          });
        }
        this.save().subscribe();
      }
    });
    modal.present();
  }

  addLearner(){
    this.add('Learner');
  }
  addTeacher(){
    this.add('Teacher');
  }

  onCourseIdChange(event) {
    const newCourseId = event.target.value;
    if (newCourseId) {
      this.course = this.courses.find(c => c.id === newCourseId);
    } else {
      this.course = null;
    }
    if (this.sessionService.changeCourse(this.session, this.course, this.forceNoRandom)) {
      logger.debug(() => 'onCourseIdChange(): ' + this.session.courseName);
      this.save().subscribe();
    }
  }

  deleteTeacher(teacher: User, index: number) {
    this.session.teachers.splice(index, 1);
    this.session.teacherIds.splice(index, 1);
  }
  deleteLearner(learner: User, index: number) {
    this.session.participants.splice(index, 1);
    this.session.participantIds.splice(index, 1);
  }
  start() {
    this.session.status = 'STARTED';
    this.session.startDate = new Date();
    this.session.expireDate = this.sessionService.computeExpireDate(
      this.session.startDate,
      this.course.test.duration,
      this.course.test.durationUnit);
    this.save(true).subscribe(() => this.toastrService.success('The exam has been started.', '', this.toastCfg));
    }
  stop() {
    this.session.status = 'STOPPED';
    this.session.expireDate = new Date();
    this.save(true).subscribe(() => this.toastrService.success('The exam has been stopped.', '', this.toastCfg));
  }
  correction() {
    this.session.status = 'CORRECTION';
    this.sessionService.computeLearnerScores(this.session, this.course).pipe(
      flatMap(() => this.save(true)),
      flatMap(() => this.sessionService.sendCertificateAll(this.session)),
      map(() => this.toastrService.success('Marking step of the exam.', '', this.toastCfg))
    ).subscribe();
  }
  computeScores() {
    this.sessionService.computeLearnerScores(this.session, this.course).pipe(
      flatMap(() => this.save(true)),
      map(() => this.toastrService.success('Scores have been computed.', '', this.toastCfg))
    ).subscribe();
  }
  close() {
    this.session.status = 'CLOSED';
    this.save(true).subscribe(() => this.toastrService.success('The exam has been closed.', '', this.toastCfg));
  }
  delete() {
    this.alertCtrl.create({
      message: 'Do you reaaly want to delete this session?',
      buttons: [
        { text: 'Cancel', role: 'cancel'},
        {
          text: 'Delete',
          handler: () => {
            this.sessionService.delete(this.session.id)
              .subscribe(() => this.navController.navigateRoot('/session'));
          }
        }
      ]
    }).then( (alert) => alert.present() );
  }
  exportResults() {
    const sep = ',';
    const content = this.session.participants.map(p => {
      return p.person.firstName + sep + p.person.lastName + sep + (p.pass ? 'PASS' : 'FAIL') + sep + p.percent + '%' + sep + p.score;
    }).join('\n');
    const oMyBlob = new Blob([content], {type : 'text/csv'});
    const url = URL.createObjectURL(oMyBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RefereeExamResult_${this.course.name.replace(' ', '_')}_${this.dateService.date2string(this.session.startDate)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

  }
  reload() {
    // TODO
  }
  onSwipe(event) {
    if (event.direction === 4) {
      this.navController.navigateRoot(`/session`);
    }
  }

  sendCertificate(learner: SessionParticipant, index: number) {
    this.toastrService.info('Sending certificate by email...', '', this.toastCfg);
    this.sessionService.sendCertificate(learner.person.personId, this.session).subscribe((response: Response) => {
      if (response.error) {
        this.toastrService.error('Certificate error.', '', this.toastCfg);
        logger.error('Certificate error: ' + response.error, null);
      } else {
        this.toastrService.info('Certificate sent.', '', this.toastCfg);
        logger.info('Certificate sent.');
      }
    });
  }

  rawExport() {
    const raw = {
      course: this.course,
      session: this.session,
      participantAnswers: []
    };
    const obs: Observable<any>[] = this.session.participantIds.map(pid =>
      this.participantQuestionAnswerService.findMyAnwsers(this.sessionId, pid).pipe(
        map(ranswers => {
          raw.participantAnswers.push({ participantId: pid, answers: ranswers.data});
        })
      )
    );
    if (obs.length === 0) {
      obs.push(of(''))
    }
    forkJoin(obs).subscribe(() => {
      console.log(raw.participantAnswers.length);
      const content = JSON.stringify(raw, null, 2);
      const oMyBlob = new Blob([content], {type : 'text/json'});
      const url = URL.createObjectURL(oMyBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RefereeExamResult_${this.course.name.replace(' ', '_')}_${this.dateService.date2string(this.session.startDate)}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    });
  }
}
