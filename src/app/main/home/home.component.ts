import { UserService } from 'src/app/service/UserService';
import { Component, OnInit, LOCALE_ID, Inject } from '@angular/core';
import { NavController, AlertController } from '@ionic/angular';
import { map } from 'rxjs/operators';
import { Session, User, Course, SessionParticipant } from 'src/app/model/model';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { CourseService } from 'src/app/service/CourseService';
import { DateService } from 'src/app/service/DateService';
import { SessionService } from 'src/app/service/SessionService';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {

  readonly applicationLanguages = ['en', 'fr'];

  currentUser: User = null;
  showInstallBtn = false;
  deferredPrompt;
  sessionCode: string;
  learnerSessions: Session[] = [];
  teacherSessions: Session[] = [];
  courses: Course[] = [];
  courseId: string;
  teachers: User[] = [];
  teacherId: string;

  constructor(
      private alertCtrl: AlertController,
      private connectedUserService: ConnectedUserService,
      private courseService: CourseService,
      public dateService: DateService,
      private navController: NavController,
      private sessionService: SessionService,
      private userService: UserService,
      @Inject(LOCALE_ID) public localeId: string) {
  }

  public isLevelAdmin() {
      return this.currentUser && this.currentUser.role === 'ADMIN';
  }

  ngOnInit() {
    this.currentUser = this.connectedUserService.getCurrentUser();
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later on the button event.
      this.deferredPrompt = e;
    // Update UI by showing a button to notify the user they can add to home screen
      this.showInstallBtn = true;
    });
    window.addEventListener('appinstalled', (event) => console.log('App installed'));
    this.loadTeacherSessions();
    this.loadLearnerSessions();
    this.loadCourses().subscribe();
    this.loadTeachers().subscribe();
  }

  loadCourses(): Observable<any> {
    return this.courseService.all().pipe(
      map((rcourses) => {
        this.courses = rcourses.data;
        this.courseId = this.courses && this.courses.length ? this.courses[0].id : null;
        })
    );
  }
  loadTeachers(): Observable<any> {
    return this.userService.findTeachers(null, this.currentUser.dataRegion).pipe(
      map((rusers) => {
        this.teachers = rusers.data;
        this.teacherId = this.teachers && this.teachers.length ? this.teachers[0].id : null;
      })
    );
  }

  runInstantSession() {
    const course: Course = this.courses.find(c => c.id === this.courseId);
    const teacher: User = this.teachers.find(u => u.id === this.teacherId);
    if (!course && !teacher) {
      return;
    }
    const session: Session = this.sessionService.newSession(course, teacher, this.currentUser.dataRegion);
     // run immediately automatically
    session.autoPlay = true;
    session.status = 'STARTED';
    session.participantIds.push(this.currentUser.id);
    const participant: SessionParticipant = {
      person: this.userService.userToPersonRef(this.currentUser),
      questionAnswerIds: [],
      seriesResult: [],
      pass: false,
      score: -1,
      requiredScore: course.test.requiredScore,
      percent: -1
    };
    session.participants.push(participant);
    this.sessionService.save(session).subscribe((rsess) => {
      if (rsess.data) {
        this.navController.navigateRoot(`/session/play/${rsess.data.id}`);
      }
    });
  }
  getSessionResult(session: Session): string {
    const sIdx = session.participantIds.indexOf(this.currentUser.id);
    if (sIdx >= 0) {
      return session.participants[sIdx].percent + '% ' + (session.participants[sIdx].pass ? 'PASS' : 'FAIL');
    }
    return '?';
  }

   addToHome() {
    // hide our user interface that shows our button
    // Show the prompt
    this.deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    this.deferredPrompt.userChoice
      .then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the prompt');
        } else {
          console.log('User dismissed the prompt');
        }
        this.deferredPrompt = null;
      });
  }

  private loadTeacherSessions() {
    if (this.currentUser.role === 'TEACHER' || this.currentUser.role === 'ADMIN') {
      this.sessionService.findTeacherSessions().subscribe((rsess) => {
        this.teacherSessions = this.limitArray(this.sessionService.sortSessionByStartDate(rsess.data, true));
      });
    }
  }
  private limitArray(anArray: any[]): any[] {
    const limit = 3;
    return anArray && anArray.length > limit ? anArray.slice(0, limit) : anArray;
  }
  private loadLearnerSessions() {
    this.sessionService.findLearnerSessions().subscribe((rsess) => {
      this.learnerSessions = this.limitArray(this.sessionService.sortSessionByStartDate(rsess.data, true));
    });
  }
  registerToSession() {
    this.sessionService.getByKeyCode(this.sessionCode).subscribe((rsess) => {
      const session: Session = rsess.data;
      let error: string = null;
      if (!session) {
        error = 'The session code is wrong.';
      } else if (session.status === 'CORRECTION' || session.status === 'CLOSED') {
        error = 'It is too late to join this session.';
      }
      if (error) {
        this.alertCtrl.create({ message: error, buttons: [{ text: 'Ok'}]}).then(a => a.present());
        return;
      }
      const sIdx = session.participantIds.indexOf(this.currentUser.id);
      if (sIdx >= 0) {
        // already participant
        this.routeLearnerSession(rsess.data);
      } else {
        // add the learner
        this.sessionService.addLearner(session, this.currentUser);
        // save the session
        this.sessionService.save(session)
          // got to the session
          .subscribe((rsess2) => this.routeLearnerSession(rsess2.data));
      }
    });
  }
  routeLearnerSession(session) {
    if (session.status === 'REGISTRATION' || session.status === 'CLOSED') {
      this.navController.navigateRoot('/session/edit/' +  session.id);
    } else {
      this.navController.navigateRoot('/session/play/' +  session.id);
    }
  }
}
