import { Category } from 'typescript-logging';
import { ToastrService } from 'ngx-toastr';
import { UserService } from 'src/app/service/UserService';
import { UserSelectorComponent } from './../../main/widget/user-selector-component';
import { ActivatedRoute } from '@angular/router';
import { AlertController, NavController, ModalController } from '@ionic/angular';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { map, flatMap } from 'rxjs/operators';
import { Observable, of, forkJoin } from 'rxjs';

import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { CourseService } from 'src/app/service/CourseService';
import { DateService } from 'src/app/service/DateService';
import { ResponseWithData } from 'src/app/service/response';
import { Session, Course, User, SharedWith, SessionParticipant } from 'src/app/model/model';
import { SessionService, CertificateResponse } from 'src/app/service/SessionService';
import * as moment from 'moment';
import { logSession } from 'src/app/logging-config';

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
  math = Math;

  constructor(
    public alertCtrl: AlertController,
    private connectedUserService: ConnectedUserService,
    private courseService: CourseService,
    private dateService: DateService,
    private modalController: ModalController,
    private navController: NavController,
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
          this.navController.navigateRoot(`/session/edit/{this.session.id}`);
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
                percent: -1,
                answeredQuestions: 0,
                seriesResult: []
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

  private addToSet(item: string, list: string[]) {
    if (!list.includes(item)) {
      list.push(item);
    }
  }

  onCourseIdChange() {
    if (this.session.courseId) {
      this.course = this.courses.find(c => c.id === this.session.courseId);
      this.session.courseName = this.course ? this.course.name : null;
    } else {
      this.session.courseName = null;
      this.course = null;
    }
    logger.debug(() => 'onCourseIdChange(): ' + this.session.courseName);
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
    this.sessionService.sendCertificate(learner.person.personId, this.session).subscribe((response: CertificateResponse) => {
      if (response.error) {
        logger.error('Error Certificate generation: ' + response.error, null);
      } else {
        logger.info('Certificate available: ' + response.url);
      }
    })
  }
}
