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
import { Session, Course, User, SharedWith } from 'src/app/model/model';
import { SessionService } from 'src/app/service/SessionService';
import { TranslationService } from 'src/app/service/TranslationService';
import * as moment from 'moment';

@Component({
  selector: 'app-session-edit',
  templateUrl: './session-edit.component.html',
  styleUrls: ['./session-edit.component.scss'],
})
export class SessionEditComponent implements OnInit {

  loading = false;
  private sessionId: string;
  private session: Session;
  private courseName: string;
  private courses: Course[];
  private users: Map<string, User> = new Map<string, User>();
  private readonly = false;

  constructor(
    public alertCtrl: AlertController,
    private changeDetectorRef: ChangeDetectorRef,
    private connectedUserService: ConnectedUserService,
    private courseService: CourseService,
    private dateService: DateService,
    // private helpService: helpService,
    private modalController: ModalController,
    private navController: NavController,
    private route: ActivatedRoute,
    private sessionService: SessionService,
    private translationService: TranslationService,
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
    // this.helpService.setHelp('course-list');
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
      map((rcourses) => this.courses = rcourses.data)
    );
  }

  loadSession(): Observable<any> {
    return this.sessionId ? this.loadSessionFromId() : this.createNewSession();
  }

  private loadSessionFromId(): Observable<any> {
    console.log('load session by id: ' + this.sessionId);
    this.loading = true;
    return this.sessionService.get(this.sessionId).pipe(
      map((rses) => {
        this.session = rses.data;
        this.readonly = this.session.teachers.indexOf(this.connectedUserService.getCurrentUser().id) >= 0;

      }),
      // load course
      flatMap(() => this.courseService.get(this.session.courseId)),
      map(() => {
        this.courseName = this.courses.find((course) => course.id === this.session.courseId).name;
      }),
      // load teachers and learners
      flatMap(() => {
        let usersToLoad: string[] = [];
        usersToLoad = usersToLoad.concat(this.session.teachers, this.session.participants.map(p => p.personId));
        const obs: Observable<any>[] = [];
        obs.push(of('')); // at least one
        usersToLoad.forEach(userId => {
          obs.push(this.userService.get(userId).pipe(
            map((ruser) => {
              if (ruser.data) {
                this.users.set(ruser.data.id, ruser.data);
              }
            }
          )));
        });
        return forkJoin(obs);
      }),
      map(() => this.loading = false),
    );
  }

  private createNewSession(): Observable<any> {
    console.log('Create new Session ');
    const now = moment();
    now.set('m', Math.round(now.get('m') / 5) * 5);
    const startDate = now.toDate();
    const expireDate = now.add(1, 'h').toDate();
    const teacher: User = this.connectedUserService.getCurrentUser();
    this.users.set(teacher.id, teacher);
    const course = this.courses && this.courses.length ? this.courses[0] : null;
    this.session = {
      id: '',
      dataRegion: 'Europe',
      creationDate: new Date(),
      lastUpdate: new Date(),
      dataStatus: 'NEW',
      version: new Date().getTime(),
      keyCode: this.generateKeyCode(),
      startDate,
      expireDate,
      teachers: [teacher.id],
      courseId: course ? course.id : null,
      courseName: course ? course.name : null,
      participants: []
    };
    this.readonly = false;
    return of({ error: null, data: this.session});
  }

  generateKeyCode(): string {
    let code = moment().format('YY-');
    for (let i = 0; i < 5; i++) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
      const idx = (Math.random() * chars.length + Math.random() * chars.length) % chars.length;
      code = code + chars.charAt(idx);
    }
    return code;
  }

  saveNback() {
    this.save().pipe(
      map((rses) => {
        if (!rses.error) {
          this.navController.navigateRoot('/session');
        }
      })).subscribe();
  }

  save(): Observable<ResponseWithData<Session>> {
    return this.sessionService.save(this.session).pipe(
      map((rses) => {
        if (!rses.error) {
          this.session = rses.data;
        }
        // console.log('Session saved: ', this.session);
        return rses;
      }));
  }

  async addXXX() {
    this.alertCtrl.create({
      message: 'Do you want to add teaches or learners?',
      buttons: [
        { text: 'Learner', handler: () => this.add('Learner') },
        { text: 'Teacher', handler: () => this.add('Teacher') },
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
            const participant = this.session.participants.find(p => p.personId === user.id);
            if (!participant) {
              this.session.participants.push({
                personId: user.id,
                questionAnswerIds: [],
                pass: false,
                score: -1
              });
            }
          });
        } else if (role === 'Teacher') {
          sharedWith.users.forEach((user) => {
            this.addToSet(user.id, this.session.teachers);
          });
        }
      }
    });
    modal.present();
  }

  private addToSet(item: string, list: string[]) {
    if (!list.includes(item)) {
      list.push(item);
    }
  }

  onCourseIdChange() {
    if (this.session.courseId) {
      const course = this.courses.find(c => c.id === this.session.courseId);
      this.session.courseName = course ? course.name : null;
    } else {
      this.session.courseName = null;
    }
    console.log('onCourseIdChange(): ', this.session.courseName);
  }
}
